import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import connectDB, { disconnectDB } from '../src/config/db.js';
import { createApp } from '../src/app.js';
import { seedDatabase } from '../src/scripts/seed.js';
import { Complaint } from '../src/models/Complaint.js';
import { AuditLog } from '../src/models/AuditLog.js';

const RUN_ATLAS = process.env.RUN_ATLAS_TESTS === 'true';
const TEST_DB_NAME = 'community_development_test';

describe.skipIf(!RUN_ATLAS)('Real MongoDB Atlas Persistence & E2E Smoke Suite', () => {
  let app;
  let adminToken;
  let createdRefId;
  let createdTrackingCode;

  beforeAll(async () => {
    await connectDB({ dbName: TEST_DB_NAME, exitOnError: false });
    await mongoose.connection.dropDatabase();
    await seedDatabase({ dbName: TEST_DB_NAME });

    app = createApp();
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: process.env.SEED_ADMIN_EMAIL || 'admin.demo@jansetu.local',
      password: process.env.SEED_ADMIN_PASSWORD || 'demo123456',
    });
    expect(loginRes.status).toBe(200);
    adminToken = loginRes.body.data.token;
  }, 30000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
    }
    await disconnectDB();
  }, 20000);

  it('persists new complaint to Atlas, hashes tracking code, updates status, and aggregates analytics', async () => {
    const subRes = await request(app).post('/api/v1/complaints').send({
      title: 'Burst main water pipe near Ward 12 clinic',
      description: 'Clean drinking water overflowing across main junction for two days.',
      category: 'Water Supply',
      area: 'Ward 12',
      preferredLanguage: 'English',
    });

    expect(subRes.status).toBe(201);
    createdRefId = subRes.body.data.referenceId;
    createdTrackingCode = subRes.body.data.trackingCode;

    // Verify stored in MongoDB Atlas with hashed trackingCode
    const rawDoc = await Complaint.findOne({ id: createdRefId }).select('+trackingCodeHash').lean();
    expect(rawDoc).toBeTruthy();
    expect(rawDoc.trackingCodeHash).toBeTruthy();
    expect(rawDoc.trackingCodeHash).not.toBe(createdTrackingCode);

    // Track via dual credentials
    const trkRes = await request(app).post('/api/v1/complaints/track').send({
      referenceId: createdRefId,
      trackingCode: createdTrackingCode,
    });
    expect(trkRes.status).toBe(200);
    expect(trkRes.body.data.status).toBe('Submitted');

    // Admin updates status
    const patchRes = await request(app)
      .patch(`/api/v1/admin/complaints/${createdRefId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newStatus: 'Verified', note: 'Atlas smoke test verified.' });
    expect(patchRes.status).toBe(200);

    // Verify AuditLog persisted
    const auditEntry = await AuditLog.findOne({ complaintId: createdRefId, newStatus: 'Verified' }).lean();
    expect(auditEntry).toBeTruthy();

    // Verify Analytics counts updated
    const analyticsRes = await request(app)
      .get('/api/v1/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.body.data.kpis.totalReports).toBeGreaterThanOrEqual(9);
  }, 25000);
});
