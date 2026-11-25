import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { ROLES } from '../config/constants.js';
import connectDB, { disconnectDB } from '../config/db.js';
import '../config/env.js';
import { Admin } from '../models/Admin.js';
import { hashSecret } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const MIN_PASSWORD_LENGTH = 8;
const MIN_TOKEN_LENGTH = 16;

function constantTimeTokenMatch(providedToken, expectedToken) {
  const providedDigest = crypto.createHash('sha256').update(String(providedToken)).digest();
  const expectedDigest = crypto.createHash('sha256').update(String(expectedToken)).digest();
  return crypto.timingSafeEqual(providedDigest, expectedDigest);
}

/**
 * Idempotently provisions or rotates the production ADMIN account when explicitly enabled.
 * Strictly gated by NODE_ENV=production, ADMIN_PROVISION_ENABLED=true, and constant-time
 * verification of ADMIN_PROVISION_CONFIRM_TOKEN against ADMIN_PROVISION_SERVER_TOKEN.
 *
 * Never logs or returns passwords, hashes, tokens, emails, JWT secrets, or database URIs.
 */
export async function provisionProductionAdmin({
  envVars = process.env,
  dbName,
  manageConnection = true,
  deps = {},
} = {}) {
  const nodeEnv = String(envVars.NODE_ENV || '').trim().toLowerCase();
  const enabled = String(envVars.ADMIN_PROVISION_ENABLED || '').trim().toLowerCase() === 'true';

  if (nodeEnv !== 'production') {
    return {
      provisioned: false,
      skipped: true,
      reason: 'non_production_environment',
    };
  }

  if (!enabled) {
    return {
      provisioned: false,
      skipped: true,
      reason: 'provisioning_disabled',
    };
  }

  const confirmToken = String(envVars.ADMIN_PROVISION_CONFIRM_TOKEN || '').trim();
  const serverToken = String(
    envVars.ADMIN_PROVISION_SERVER_TOKEN || envVars.ADMIN_PROVISION_EXPECTED_TOKEN || ''
  ).trim();

  if (
    !confirmToken ||
    !serverToken ||
    confirmToken.length < MIN_TOKEN_LENGTH ||
    serverToken.length < MIN_TOKEN_LENGTH ||
    !constantTimeTokenMatch(confirmToken, serverToken)
  ) {
    throw new Error(
      'Production admin provisioning rejected: missing or invalid confirmation token.'
    );
  }

  const normalizedEmail = String(envVars.SEED_ADMIN_EMAIL || '')
    .trim()
    .toLowerCase();
  if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
    throw new Error(
      'Production admin provisioning rejected: valid SEED_ADMIN_EMAIL is required.'
    );
  }

  const plainPassword = String(envVars.SEED_ADMIN_PASSWORD || '');
  if (!plainPassword || plainPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Production admin provisioning rejected: SEED_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`
    );
  }

  const fullName =
    String(envVars.ADMIN_PROVISION_FULL_NAME || 'JanSetu Production Administrator').trim() ||
    'JanSetu Production Administrator';
  if (fullName.length < 2 || fullName.length > 80) {
    throw new Error('ADMIN_PROVISION_FULL_NAME must be between 2 and 80 characters.');
  }

  const department =
    String(envVars.ADMIN_PROVISION_DEPARTMENT || 'Supervisory Desk').trim() ||
    'Supervisory Desk';

  const dbConnect = deps.connectDB || connectDB;
  const dbDisconnect = deps.disconnectDB || disconnectDB;
  const AdminModel = deps.Admin || Admin;
  const hashFn = deps.hashSecret || hashSecret;

  const passwordHash = await hashFn(plainPassword);

  if (manageConnection) {
    await dbConnect({ dbName, exitOnError: false });
  }

  try {
    const adminDoc = await AdminModel.findOneAndUpdate(
      { email: normalizedEmail },
      {
        $set: {
          email: normalizedEmail,
          passwordHash,
          fullName,
          role: ROLES.ADMIN,
          department,
          isActive: true,
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
        runValidators: true,
      }
    );

    return {
      provisioned: true,
      skipped: false,
      adminId: String(adminDoc._id),
      role: adminDoc.role,
      isActive: Boolean(adminDoc.isActive),
      fullName: adminDoc.fullName,
      department: adminDoc.department,
    };
  } finally {
    if (manageConnection) {
      await dbDisconnect();
    }
  }
}

/**
 * Safe server startup hook: runs provisioning only when explicitly enabled in production,
 * logs only non-sensitive metadata, and catches provisioning failures without leaking secrets.
 */
export async function runStartupAdminProvisioning({
  envVars = process.env,
  deps = {},
  log = logger,
} = {}) {
  try {
    const result = await provisionProductionAdmin({
      envVars,
      manageConnection: false,
      deps,
    });
    if (result.provisioned) {
      log.info('One-time production admin provisioning completed', {
        adminId: result.adminId,
        role: result.role,
        isActive: result.isActive,
        department: result.department,
      });
    }
    return result;
  } catch (err) {
    log.error('One-time production admin provisioning failed', {
      reason: err?.message || 'Unexpected provisioning error',
    });
    return {
      provisioned: false,
      skipped: false,
      failed: true,
      reason: err?.message || 'Unexpected provisioning error',
    };
  }
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  provisionProductionAdmin({ manageConnection: true })
    .then((summary) => {
      console.log('Production admin script finished:', JSON.stringify(summary));
      process.exit(0);
    })
    .catch((err) => {
      console.error('Production admin provisioning failed:', err.message);
      process.exit(1);
    });
}
