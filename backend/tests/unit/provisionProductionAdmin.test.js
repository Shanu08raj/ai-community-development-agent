import { describe, it, expect, vi } from 'vitest';
import {
  provisionProductionAdmin,
  runStartupAdminProvisioning,
} from '../../src/scripts/provisionProductionAdmin.js';
import { compareSecret } from '../../src/utils/crypto.js';

function createMockDeps(overrides = {}) {
  const connectDB = vi.fn().mockResolvedValue(undefined);
  const disconnectDB = vi.fn().mockResolvedValue(undefined);
  const findOneAndUpdate = vi.fn(async (filter, update) => ({
    _id: '67448831f1a23e9a99999999',
    email: filter.email,
    fullName: update.$set.fullName,
    role: update.$set.role,
    department: update.$set.department,
    isActive: update.$set.isActive,
  }));

  return {
    connectDB,
    disconnectDB,
    Admin: { findOneAndUpdate },
    ...overrides,
  };
}

const VALID_TOKEN = 'prod_confirm_token_min_16_chars_secure';

describe('One-time production admin provisioning mechanism', () => {
  it('1. Skips cleanly in disabled mode or non-production environments without touching the database', async () => {
    const deps = createMockDeps();

    // Non-production even if ADMIN_PROVISION_ENABLED=true
    for (const badEnv of [undefined, 'development', 'test', 'staging']) {
      const res = await provisionProductionAdmin({
        envVars: {
          NODE_ENV: badEnv,
          ADMIN_PROVISION_ENABLED: 'true',
          ADMIN_PROVISION_CONFIRM_TOKEN: VALID_TOKEN,
          ADMIN_PROVISION_SERVER_TOKEN: VALID_TOKEN,
          SEED_ADMIN_EMAIL: 'ops.admin@example.org',
          SEED_ADMIN_PASSWORD: 'StrongProdPassword!2026',
        },
        deps,
      });
      expect(res).toEqual({
        provisioned: false,
        skipped: true,
        reason: 'non_production_environment',
      });
    }

    // Disabled in production
    for (const flag of [undefined, '', 'false', '0', 'no']) {
      const res = await provisionProductionAdmin({
        envVars: {
          NODE_ENV: 'production',
          ADMIN_PROVISION_ENABLED: flag,
          ADMIN_PROVISION_CONFIRM_TOKEN: VALID_TOKEN,
          ADMIN_PROVISION_SERVER_TOKEN: VALID_TOKEN,
          SEED_ADMIN_EMAIL: 'ops.admin@example.org',
          SEED_ADMIN_PASSWORD: 'StrongProdPassword!2026',
        },
        deps,
      });
      expect(res).toEqual({
        provisioned: false,
        skipped: true,
        reason: 'provisioning_disabled',
      });
    }

    expect(deps.connectDB).not.toHaveBeenCalled();
    expect(deps.Admin.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('2. Rejects missing or invalid SEED_ADMIN_EMAIL and missing or short SEED_ADMIN_PASSWORD', async () => {
    const deps = createMockDeps();

    await expect(
      provisionProductionAdmin({
        envVars: {
          NODE_ENV: 'production',
          ADMIN_PROVISION_ENABLED: 'true',
          ADMIN_PROVISION_CONFIRM_TOKEN: VALID_TOKEN,
          ADMIN_PROVISION_SERVER_TOKEN: VALID_TOKEN,
          SEED_ADMIN_PASSWORD: 'StrongProdPassword!2026',
        },
        deps,
      })
    ).rejects.toThrow(/SEED_ADMIN_EMAIL/i);

    await expect(
      provisionProductionAdmin({
        envVars: {
          NODE_ENV: 'production',
          ADMIN_PROVISION_ENABLED: 'true',
          ADMIN_PROVISION_CONFIRM_TOKEN: VALID_TOKEN,
          ADMIN_PROVISION_SERVER_TOKEN: VALID_TOKEN,
          SEED_ADMIN_EMAIL: 'invalid-email',
          SEED_ADMIN_PASSWORD: 'StrongProdPassword!2026',
        },
        deps,
      })
    ).rejects.toThrow(/SEED_ADMIN_EMAIL/i);

    await expect(
      provisionProductionAdmin({
        envVars: {
          NODE_ENV: 'production',
          ADMIN_PROVISION_ENABLED: 'true',
          ADMIN_PROVISION_CONFIRM_TOKEN: VALID_TOKEN,
          ADMIN_PROVISION_SERVER_TOKEN: VALID_TOKEN,
          SEED_ADMIN_EMAIL: 'ops.admin@example.org',
        },
        deps,
      })
    ).rejects.toThrow(/SEED_ADMIN_PASSWORD/i);

    await expect(
      provisionProductionAdmin({
        envVars: {
          NODE_ENV: 'production',
          ADMIN_PROVISION_ENABLED: 'true',
          ADMIN_PROVISION_CONFIRM_TOKEN: VALID_TOKEN,
          ADMIN_PROVISION_SERVER_TOKEN: VALID_TOKEN,
          SEED_ADMIN_EMAIL: 'ops.admin@example.org',
          SEED_ADMIN_PASSWORD: 'short',
        },
        deps,
      })
    ).rejects.toThrow(/at least 8 characters/i);

    expect(deps.connectDB).not.toHaveBeenCalled();
    expect(deps.Admin.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('3. Rejects missing, short, or mismatched ADMIN_PROVISION_CONFIRM_TOKEN without leaking tokens', async () => {
    const deps = createMockDeps();

    const badTokenPairs = [
      ['', VALID_TOKEN],
      [VALID_TOKEN, ''],
      ['too_short', 'too_short'],
      [VALID_TOKEN, 'completely_different_server_token_12345'],
    ];

    for (const [confirmTok, serverTok] of badTokenPairs) {
      let caught = null;
      try {
        await provisionProductionAdmin({
          envVars: {
            NODE_ENV: 'production',
            ADMIN_PROVISION_ENABLED: 'true',
            ADMIN_PROVISION_CONFIRM_TOKEN: confirmTok,
            ADMIN_PROVISION_SERVER_TOKEN: serverTok,
            SEED_ADMIN_EMAIL: 'ops.admin@example.org',
            SEED_ADMIN_PASSWORD: 'StrongProdPassword!2026',
          },
          deps,
        });
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeTruthy();
      expect(caught.message).toMatch(/confirmation token/i);
      if (confirmTok) expect(caught.message).not.toContain(confirmTok);
      if (serverTok) expect(caught.message).not.toContain(serverTok);
    }

    expect(deps.connectDB).not.toHaveBeenCalled();
    expect(deps.Admin.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('4. Normalizes email, hashes SEED_ADMIN_PASSWORD, upserts idempotently as ADMIN & isActive, and closes DB cleanly', async () => {
    const deps = createMockDeps();
    const rawPassword = 'StrongProdPassword!2026';

    const envVars = {
      NODE_ENV: 'production',
      ADMIN_PROVISION_ENABLED: 'true',
      ADMIN_PROVISION_CONFIRM_TOKEN: VALID_TOKEN,
      ADMIN_PROVISION_SERVER_TOKEN: VALID_TOKEN,
      SEED_ADMIN_EMAIL: '  Prod.Admin@JanSetu.Org  ',
      SEED_ADMIN_PASSWORD: rawPassword,
      ADMIN_PROVISION_FULL_NAME: 'Production Supervisor',
      ADMIN_PROVISION_DEPARTMENT: 'Civic Ops Desk',
    };

    const first = await provisionProductionAdmin({ envVars, manageConnection: true, deps });
    const second = await provisionProductionAdmin({ envVars, manageConnection: true, deps });

    expect(deps.connectDB).toHaveBeenCalledTimes(2);
    expect(deps.disconnectDB).toHaveBeenCalledTimes(2);
    expect(deps.Admin.findOneAndUpdate).toHaveBeenCalledTimes(2);

    const [filter, update, options] = deps.Admin.findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ email: 'prod.admin@jansetu.org' });
    expect(update.$set.email).toBe('prod.admin@jansetu.org');
    expect(update.$set.role).toBe('ADMIN');
    expect(update.$set.isActive).toBe(true);
    expect(update.$set.fullName).toBe('Production Supervisor');
    expect(update.$set.department).toBe('Civic Ops Desk');
    expect(update.$set.passwordHash).not.toBe(rawPassword);
    expect(await compareSecret(rawPassword, update.$set.passwordHash)).toBe(true);
    expect(options).toEqual({
      upsert: true,
      returnDocument: 'after',
      runValidators: true,
    });

    // Summary never leaks sensitive credentials, tokens, emails, hashes, or URIs
    const serialized = JSON.stringify({ first, second });
    expect(serialized).not.toContain(rawPassword);
    expect(serialized).not.toContain(update.$set.passwordHash);
    expect(serialized).not.toContain(VALID_TOKEN);
    expect(serialized).not.toContain('prod.admin@jansetu.org');
    expect(first).toEqual({
      provisioned: true,
      skipped: false,
      adminId: '67448831f1a23e9a99999999',
      role: 'ADMIN',
      isActive: true,
      fullName: 'Production Supervisor',
      department: 'Civic Ops Desk',
    });
  });

  it('5. Closes DB connection on write failure when managing connection', async () => {
    const deps = createMockDeps({
      Admin: {
        findOneAndUpdate: vi.fn().mockRejectedValue(new Error('Atlas write timeout')),
      },
    });

    await expect(
      provisionProductionAdmin({
        envVars: {
          NODE_ENV: 'production',
          ADMIN_PROVISION_ENABLED: 'true',
          ADMIN_PROVISION_CONFIRM_TOKEN: VALID_TOKEN,
          ADMIN_PROVISION_SERVER_TOKEN: VALID_TOKEN,
          SEED_ADMIN_EMAIL: 'ops@jansetu.org',
          SEED_ADMIN_PASSWORD: 'AnotherStrongPass!2026',
        },
        manageConnection: true,
        deps,
      })
    ).rejects.toThrow('Atlas write timeout');

    expect(deps.connectDB).toHaveBeenCalledTimes(1);
    expect(deps.disconnectDB).toHaveBeenCalledTimes(1);
  });

  it('6. Startup hook runs without closing active server DB connection, logs only sanitized fields, and handles errors safely', async () => {
    const deps = createMockDeps();
    const mockLogger = { info: vi.fn(), error: vi.fn() };
    const secretPassword = 'StartupSuperSecretPassword!99';

    // Success on startup keeps shared server DB connection open
    const okRes = await runStartupAdminProvisioning({
      envVars: {
        NODE_ENV: 'production',
        ADMIN_PROVISION_ENABLED: 'true',
        ADMIN_PROVISION_CONFIRM_TOKEN: VALID_TOKEN,
        ADMIN_PROVISION_SERVER_TOKEN: VALID_TOKEN,
        SEED_ADMIN_EMAIL: 'startup.admin@jansetu.org',
        SEED_ADMIN_PASSWORD: secretPassword,
      },
      deps,
      log: mockLogger,
    });

    expect(okRes.provisioned).toBe(true);
    expect(deps.connectDB).not.toHaveBeenCalled();
    expect(deps.disconnectDB).not.toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledTimes(1);
    const infoLog = JSON.stringify(mockLogger.info.mock.calls[0]);
    expect(infoLog).not.toContain(secretPassword);
    expect(infoLog).not.toContain(VALID_TOKEN);
    expect(infoLog).not.toContain('startup.admin@jansetu.org');

    // Failure on startup is caught safely and logged without leaking credentials
    const failDeps = createMockDeps({
      Admin: {
        findOneAndUpdate: vi.fn().mockRejectedValue(new Error('Simulated DB error')),
      },
    });
    const failRes = await runStartupAdminProvisioning({
      envVars: {
        NODE_ENV: 'production',
        ADMIN_PROVISION_ENABLED: 'true',
        ADMIN_PROVISION_CONFIRM_TOKEN: VALID_TOKEN,
        ADMIN_PROVISION_SERVER_TOKEN: VALID_TOKEN,
        SEED_ADMIN_EMAIL: 'startup.admin@jansetu.org',
        SEED_ADMIN_PASSWORD: secretPassword,
      },
      deps: failDeps,
      log: mockLogger,
    });

    expect(failRes.failed).toBe(true);
    expect(failRes.provisioned).toBe(false);
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    const errLog = JSON.stringify(mockLogger.error.mock.calls[0]);
    expect(errLog).not.toContain(secretPassword);
    expect(errLog).not.toContain(VALID_TOKEN);
  });
});
