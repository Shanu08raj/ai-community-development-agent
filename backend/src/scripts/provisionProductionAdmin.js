import path from 'path';
import { fileURLToPath } from 'url';
import { ROLES } from '../config/constants.js';
import connectDB, { disconnectDB } from '../config/db.js';
import '../config/env.js';
import { Admin } from '../models/Admin.js';
import { hashSecret } from '../utils/crypto.js';

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Safely creates or updates a single production ADMIN account without running dev demo seeds.
 * Never logs secrets, hashes, connection strings, or plaintext credentials.
 */
export async function provisionProductionAdmin({
  envVars = process.env,
  argv = process.argv.slice(2),
  dbName,
  deps = {},
} = {}) {
  const nodeEnv = String(envVars.NODE_ENV || '').trim().toLowerCase();
  if (nodeEnv !== 'production') {
    throw new Error(
      'Production admin provisioning is restricted strictly to NODE_ENV=production.'
    );
  }

  const confirmedByFlag = Array.isArray(argv) && argv.includes('--confirm');
  const confirmedByEnv = String(envVars.ADMIN_PROVISION_CONFIRM || '').trim().toLowerCase() === 'true';
  if (!confirmedByFlag && !confirmedByEnv) {
    throw new Error(
      'Explicit confirmation is required before modifying the production database. Pass --confirm or set ADMIN_PROVISION_CONFIRM=true.'
    );
  }

  const normalizedEmail = String(envVars.ADMIN_PROVISION_EMAIL || '')
    .trim()
    .toLowerCase();
  if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
    throw new Error(
      'Valid ADMIN_PROVISION_EMAIL environment variable is required.'
    );
  }

  const plainPassword = String(envVars.ADMIN_PROVISION_PASSWORD || '');
  if (!plainPassword || plainPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `ADMIN_PROVISION_PASSWORD environment variable is required and must be at least ${MIN_PASSWORD_LENGTH} characters.`
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

  await dbConnect({ dbName, exitOnError: false });
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
      success: true,
      adminId: String(adminDoc._id),
      role: adminDoc.role,
      isActive: Boolean(adminDoc.isActive),
      fullName: adminDoc.fullName,
      department: adminDoc.department,
    };
  } finally {
    await dbDisconnect();
  }
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  provisionProductionAdmin()
    .then((summary) => {
      console.log('Production admin provisioned successfully:', JSON.stringify(summary));
      process.exit(0);
    })
    .catch((err) => {
      console.error('Production admin provisioning failed:', err.message);
      process.exit(1);
    });
}
