import { describe, it, expect, vi } from 'vitest';
import { provisionProductionAdmin } from '../../src/scripts/provisionProductionAdmin.js';
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

describe('provisionProductionAdmin script', () => {
  it('1. Rejects execution unless NODE_ENV is strictly production', async () => {
    const deps = createMockDeps();

    for (const badEnv of [undefined, 'development', 'test', 'staging']) {
      await expect(
        provisionProductionAdmin({
          envVars: {
            NODE_ENV: badEnv,
            ADMIN_PROVISION_EMAIL: 'ops.admin@example.org',
            ADMIN_PROVISION_PASSWORD: 'StrongProdPassword!2026',
          },
          argv: ['--confirm'],
          deps,
        })
      ).rejects.toThrow(/NODE_ENV=production/i);
    }

    expect(deps.connectDB).not.toHaveBeenCalled();
    expect(deps.Admin.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('2. Requires explicit confirmation flag (--confirm or ADMIN_PROVISION_CONFIRM=true) before connecting to DB', async () => {
    const deps = createMockDeps();

    await expect(
      provisionProductionAdmin({
        envVars: {
          NODE_ENV: 'production',
          ADMIN_PROVISION_EMAIL: 'ops.admin@example.org',
          ADMIN_PROVISION_PASSWORD: 'StrongProdPassword!2026',
        },
        argv: [],
        deps,
      })
    ).rejects.toThrow(/Explicit confirmation is required/i);

    expect(deps.connectDB).not.toHaveBeenCalled();
    expect(deps.Admin.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('3. Rejects missing or invalid ADMIN_PROVISION_EMAIL and missing or short ADMIN_PROVISION_PASSWORD', async () => {
    const deps = createMockDeps();

    await expect(
      provisionProductionAdmin({
        envVars: {
          NODE_ENV: 'production',
          ADMIN_PROVISION_PASSWORD: 'StrongProdPassword!2026',
        },
        argv: ['--confirm'],
        deps,
      })
    ).rejects.toThrow(/ADMIN_PROVISION_EMAIL/i);

    await expect(
      provisionProductionAdmin({
        envVars: {
          NODE_ENV: 'production',
          ADMIN_PROVISION_EMAIL: 'not-an-email',
          ADMIN_PROVISION_PASSWORD: 'StrongProdPassword!2026',
        },
        argv: ['--confirm'],
        deps,
      })
    ).rejects.toThrow(/ADMIN_PROVISION_EMAIL/i);

    await expect(
      provisionProductionAdmin({
        envVars: {
          NODE_ENV: 'production',
          ADMIN_PROVISION_EMAIL: 'ops.admin@example.org',
        },
        argv: ['--confirm'],
        deps,
      })
    ).rejects.toThrow(/ADMIN_PROVISION_PASSWORD/i);

    await expect(
      provisionProductionAdmin({
        envVars: {
          NODE_ENV: 'production',
          ADMIN_PROVISION_EMAIL: 'ops.admin@example.org',
          ADMIN_PROVISION_PASSWORD: 'short',
        },
        argv: ['--confirm'],
        deps,
      })
    ).rejects.toThrow(/at least 8 characters/i);

    expect(deps.connectDB).not.toHaveBeenCalled();
  });

  it('4. Normalizes email, hashes password with hashSecret(), upserts only the matching Admin doc, and closes DB', async () => {
    const deps = createMockDeps();
    const rawPassword = 'StrongProdPassword!2026';

    const result = await provisionProductionAdmin({
      envVars: {
        NODE_ENV: 'production',
        ADMIN_PROVISION_EMAIL: '  Prod.Admin@JanSetu.Org  ',
        ADMIN_PROVISION_PASSWORD: rawPassword,
        ADMIN_PROVISION_FULL_NAME: 'Production Supervisor',
        ADMIN_PROVISION_DEPARTMENT: 'Civic Ops Desk',
      },
      argv: ['--confirm'],
      deps,
    });

    expect(deps.connectDB).toHaveBeenCalledTimes(1);
    expect(deps.Admin.findOneAndUpdate).toHaveBeenCalledTimes(1);

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

    // Summary never leaks sensitive credentials, hashes, or URIs
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(rawPassword);
    expect(serialized).not.toContain(update.$set.passwordHash);
    expect(result).toEqual({
      success: true,
      adminId: '67448831f1a23e9a99999999',
      role: 'ADMIN',
      isActive: true,
      fullName: 'Production Supervisor',
      department: 'Civic Ops Desk',
    });

    expect(deps.disconnectDB).toHaveBeenCalledTimes(1);
  });

  it('5. Supports ADMIN_PROVISION_CONFIRM=true and closes DB even if upsert fails', async () => {
    const deps = createMockDeps({
      Admin: {
        findOneAndUpdate: vi.fn().mockRejectedValue(new Error('Atlas write timeout')),
      },
    });

    await expect(
      provisionProductionAdmin({
        envVars: {
          NODE_ENV: 'production',
          ADMIN_PROVISION_CONFIRM: 'true',
          ADMIN_PROVISION_EMAIL: 'ops@jansetu.org',
          ADMIN_PROVISION_PASSWORD: 'AnotherStrongPass!2026',
        },
        argv: [],
        deps,
      })
    ).rejects.toThrow('Atlas write timeout');

    expect(deps.connectDB).toHaveBeenCalledTimes(1);
    expect(deps.disconnectDB).toHaveBeenCalledTimes(1);
  });
});
