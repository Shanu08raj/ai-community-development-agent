import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { createLoginLimiter } from '../../src/middleware/rateLimiter.js';
import { Admin } from '../../src/models/Admin.js';
import { Complaint } from '../../src/models/Complaint.js';
import { CommunityIssue } from '../../src/models/CommunityIssue.js';
import { Authority } from '../../src/models/Authority.js';
import { AuditLog } from '../../src/models/AuditLog.js';
import { hashSecret, signAdminToken } from '../../src/utils/crypto.js';

/**
 * Controlled in-memory Mongoose store mock enabling deterministic integration tests
 * across every Express route, middleware, validator, service, and security rule
 * without touching or mutating live production MongoDB Atlas data.
 */
function setupInMemoryMongooseStore() {
  const store = {
    admins: [],
    authorities: [
      {
        _id: 'auth_obj_1',
        id: 'AUTH-01',
        name: 'Municipal Water Supply & Sewerage Board',
        department: 'Water Supply',
        jurisdiction: 'All Wards',
        nodalOfficer: 'Er. R. Deshmukh',
        contactPhone: '+91 20 2550 1200',
        contactEmail: 'water@sample.demo.org',
        officeHours: '09:30 AM - 05:30 PM',
        responseTimeAvg: '36 hours',
        activeIssuesCount: 2,
      },
      {
        _id: 'auth_obj_5',
        id: 'AUTH-05',
        name: 'Drainage & Stormwater Infrastructure Wing',
        department: 'Drainage and Sanitation',
        jurisdiction: 'Lowland Sectors',
        nodalOfficer: 'Er. S. Nambiar',
        contactPhone: '+91 20 2550 5670',
        contactEmail: 'drain@sample.demo.org',
        officeHours: '09:30 AM - 05:30 PM',
        responseTimeAvg: '48 hours',
        activeIssuesCount: 1,
      },
      {
        _id: 'auth_obj_6',
        id: 'AUTH-06',
        name: 'Department of Public Parks & Urban Horticulture',
        department: 'Other',
        jurisdiction: 'Civic Gardens',
        nodalOfficer: 'Ms. P. Verma',
        contactPhone: '+91 20 2550 6780',
        contactEmail: 'parks@sample.demo.org',
        officeHours: '09:00 AM - 05:00 PM',
        responseTimeAvg: '5 days',
        activeIssuesCount: 0,
      },
    ],
    clusters: [
      {
        _id: 'cluster_obj_101',
        id: 'CI-101',
        title: 'Severe low water pressure and contaminated supply in Ward 12',
        category: 'Water Supply',
        area: 'Ward 12, North Zone',
        relatedReportsCount: 5,
        priority: 'High',
        status: 'In Progress',
        lastUpdated: '2026-11-24',
        aiConfidence: 95,
        recommendedAuthorityId: 'auth_obj_1',
        recommendedAuthority: 'Municipal Water Supply & Sewerage Board',
        reviewStatus: 'Pending Admin Review',
        adminNotes: '',
        summary: 'Contaminated tap water and pipeline leak in Block B Ward 12.',
        impactZones: ['Block B'],
        memberComplaintIds: [],
        save: async function saveCluster() { return this; },
      },
    ],
    complaints: [],
    auditLogs: [],
  };

  function toPlain(item) {
    if (!item) return null;
    const base = typeof item.toObject === 'function' ? item.toObject() : { ...item };
    delete base.save;
    return JSON.parse(JSON.stringify(base));
  }

  function makeQuery(rowsPromise) {
    const state = { sortSpec: null, skipN: 0, limitN: 1000, selectSpec: '' };
    const q = {
      sort(s) { state.sortSpec = s; return q; },
      skip(n) { state.skipN = n; return q; },
      limit(n) { state.limitN = n; return q; },
      select(s) { state.selectSpec = s; return q; },
      populate() { return q; },
      lean() { return q._exec(true); },
      then(resolve, reject) { return q._exec(false).then(resolve, reject); },
      async _exec(asLean) {
        let list = await rowsPromise();
        if (state.sortSpec) {
          const [[field, dir]] = Object.entries(state.sortSpec);
          list = [...list].sort((a, b) => {
            const av = a[field] ?? '';
            const bv = b[field] ?? '';
            if (av < bv) return -1 * dir;
            if (av > bv) return 1 * dir;
            return 0;
          });
        }
        list = list.slice(state.skipN, state.skipN + state.limitN);
        return list.map((item) => {
          const clone = asLean ? toPlain(item) : item;
          if (state.selectSpec && asLean) {
            for (const tok of state.selectSpec.split(/\s+/)) {
              if (tok.startsWith('-')) {
                delete clone[tok.slice(1)];
              }
            }
          }
          return clone;
        });
      },
    };
    return q;
  }

  function makeSingleQuery(docPromise, defaultHiddenFields = []) {
    const state = { selectSpec: '', populated: false };
    const q = {
      select(s) { state.selectSpec = s; return q; },
      populate() { state.populated = true; return q; },
      lean() { return q._exec(true); },
      then(resolve, reject) { return q._exec(false).then(resolve, reject); },
      async _exec(asLean) {
        const doc = await docPromise();
        if (!doc) return null;
        if (!asLean) return doc;
        const clone = toPlain(doc);
        for (const hidden of defaultHiddenFields) {
          if (!state.selectSpec.includes(`+${hidden}`)) {
            delete clone[hidden];
          }
        }
        for (const tok of state.selectSpec.split(/\s+/)) {
          if (tok.startsWith('-')) delete clone[tok.slice(1)];
        }
        return clone;
      },
    };
    return q;
  }

  function matchesQuery(doc, query = {}) {
    for (const [k, v] of Object.entries(query)) {
      if (k === '$or') {
        if (!v.some((sub) => matchesQuery(doc, sub))) return false;
        continue;
      }
      if (v && typeof v === 'object' && !(v instanceof RegExp) && !Array.isArray(v)) {
        if ('$ne' in v && doc[k] === v.$ne) return false;
        if ('$in' in v && !v.$in.includes(doc[k])) return false;
        continue;
      }
      if (v instanceof RegExp) {
        if (!v.test(String(doc[k] ?? ''))) return false;
        continue;
      }
      if (k === 'aiAnalysis.isOutOfScope') {
        if ((doc.aiAnalysis?.isOutOfScope) !== v) return false;
        continue;
      }
      if (doc[k] !== v) return false;
    }
    return true;
  }

  // Mock Admin
  vi.spyOn(Admin, 'findOne').mockImplementation((query) =>
    makeSingleQuery(
      async () => store.admins.find((a) => matchesQuery(a, query)) || null,
      ['passwordHash']
    )
  );
  vi.spyOn(Admin, 'findById').mockImplementation((id) =>
    makeSingleQuery(async () => store.admins.find((a) => String(a._id) === String(id)) || null, ['passwordHash'])
  );

  // Mock Authority
  vi.spyOn(Authority, 'find').mockImplementation((query) =>
    makeQuery(async () => store.authorities.filter((a) => matchesQuery(a, query)))
  );
  vi.spyOn(Authority, 'findOne').mockImplementation((query) =>
    makeSingleQuery(async () => store.authorities.find((a) => matchesQuery(a, query)) || null)
  );
  vi.spyOn(Authority, 'countDocuments').mockImplementation(async (query = {}) =>
    store.authorities.filter((a) => matchesQuery(a, query)).length
  );

  // Mock CommunityIssue
  vi.spyOn(CommunityIssue, 'find').mockImplementation((query) =>
    makeQuery(async () => store.clusters.filter((c) => matchesQuery(c, query)))
  );
  vi.spyOn(CommunityIssue, 'findOne').mockImplementation((query) =>
    makeSingleQuery(async () => store.clusters.find((c) => matchesQuery(c, query)) || null)
  );
  vi.spyOn(CommunityIssue, 'countDocuments').mockImplementation(async (query = {}) =>
    store.clusters.filter((c) => matchesQuery(c, query)).length
  );
  vi.spyOn(CommunityIssue, 'updateOne').mockImplementation(async (filter, update) => {
    const c = store.clusters.find((x) => matchesQuery(x, filter));
    if (c) {
      if (update.$inc?.relatedReportsCount) c.relatedReportsCount += update.$inc.relatedReportsCount;
      if (update.$set) Object.assign(c, update.$set);
      if (update.$addToSet?.memberComplaintIds) {
        if (!c.memberComplaintIds.includes(update.$addToSet.memberComplaintIds)) {
          c.memberComplaintIds.push(update.$addToSet.memberComplaintIds);
        }
      }
    }
    return { modifiedCount: c ? 1 : 0 };
  });
  vi.spyOn(CommunityIssue, 'create').mockImplementation(async (doc) => {
    const created = { _id: `cl_${store.clusters.length + 1}`, ...doc, save: async function () { return this; } };
    store.clusters.push(created);
    return created;
  });

  // Mock Complaint
  vi.spyOn(Complaint, 'exists').mockImplementation(async (query) =>
    store.complaints.some((c) => matchesQuery(c, query)) ? { _id: '1' } : null
  );
  vi.spyOn(Complaint, 'find').mockImplementation((query) =>
    makeQuery(async () => store.complaints.filter((c) => matchesQuery(c, query)))
  );
  vi.spyOn(Complaint, 'findOne').mockImplementation((query) =>
    makeSingleQuery(async () => {
      const c = store.complaints.find((x) => matchesQuery(x, query)) || null;
      if (c && c.clusterRef) {
        c.clusterRefObj = store.clusters.find((cl) => String(cl._id) === String(c.clusterRef)) || null;
      }
      return c;
    }, ['trackingCodeHash', 'contactInfo'])
  );
  vi.spyOn(Complaint, 'countDocuments').mockImplementation(async (query = {}) =>
    store.complaints.filter((c) => matchesQuery(c, query)).length
  );
  vi.spyOn(Complaint, 'updateOne').mockImplementation(async (filter, update) => {
    const c = store.complaints.find((x) => matchesQuery(x, filter));
    if (c && update.$set) Object.assign(c, update.$set);
    return { modifiedCount: c ? 1 : 0 };
  });
  vi.spyOn(Complaint, 'aggregate').mockImplementation(async (pipeline) => {
    if (pipeline[0]?.$group?._id === '$category') {
      const counts = {};
      for (const c of store.complaints) counts[c.category] = (counts[c.category] || 0) + 1;
      return Object.entries(counts).map(([_id, count]) => ({ _id, count }));
    }
    if (pipeline[0]?.$group?._id === '$status') {
      const counts = {};
      for (const c of store.complaints) counts[c.status] = (counts[c.status] || 0) + 1;
      return Object.entries(counts).map(([_id, count]) => ({ _id, count }));
    }
    if (pipeline[0]?.$group?._id === '$priority') {
      const counts = {};
      for (const c of store.complaints) counts[c.priority] = (counts[c.priority] || 0) + 1;
      return Object.entries(counts).map(([_id, count]) => ({ _id, count }));
    }
    if (pipeline[0]?.$project?.ym) {
      const map = {};
      for (const c of store.complaints) {
        const ym = String(c.submittedDate || '').slice(0, 7);
        if (!map[ym]) map[ym] = { _id: ym, submitted: 0, resolved: 0 };
        map[ym].submitted += 1;
        if (['Reported Resolved', 'Verified Resolved'].includes(c.status)) map[ym].resolved += 1;
      }
      return Object.values(map);
    }
    return [];
  });
  vi.spyOn(Complaint.prototype, 'save').mockImplementation(async function saveComplaint() {
    if (!this._id) this._id = `cmp_${store.complaints.length + 1}`;
    this.updatedAt = new Date();
    const existingIdx = store.complaints.findIndex((c) => c.id === this.id);
    if (existingIdx === -1) {
      store.complaints.push(this);
    } else {
      store.complaints[existingIdx] = this;
    }
    return this;
  });

  // Mock AuditLog
  vi.spyOn(AuditLog, 'create').mockImplementation(async (doc) => {
    const entry = { _id: `log_${store.auditLogs.length + 1}`, createdAt: new Date(), ...doc };
    store.auditLogs.push(entry);
    return entry;
  });
  vi.spyOn(AuditLog, 'find').mockImplementation((query) =>
    makeQuery(async () => store.auditLogs.filter((l) => matchesQuery(l, query)))
  );
  vi.spyOn(AuditLog, 'countDocuments').mockImplementation(async (query = {}) =>
    store.auditLogs.filter((l) => matchesQuery(l, query)).length
  );

  return store;
}

describe('Backend API Integration & Security Suite', () => {
  let app;
  let store;
  let adminToken;

  beforeEach(async () => {
    vi.restoreAllMocks();
    store = setupInMemoryMongooseStore();

    const adminPasswordHash = await hashSecret('StrongDemoPass!1');
    const adminDoc = {
      _id: 'admin_obj_1',
      email: 'admin.demo@jansetu.local',
      passwordHash: adminPasswordHash,
      fullName: 'Admin Demo (Supervisor)',
      role: 'ADMIN',
      department: 'Supervisory Desk',
      isActive: true,
      lastLoginAt: null,
      save: async function () { return this; },
    };
    store.admins.push(adminDoc);
    adminToken = signAdminToken(adminDoc);

    // Mock AI service fetch dynamically
    vi.stubGlobal('fetch', vi.fn(async (_url, init) => {
      const body = JSON.parse(init.body);
      const text = `${body.title} ${body.description}`.toLowerCase();
      if (text.includes('police') || text.includes('robbery')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            complaintId: body.complaintId,
            analysis: {
              detectedLanguage: 'English',
              detectedLanguageCode: 'en',
              languageConfidence: 98,
              sanitizedSummary: body.title,
              classifiedCategory: 'Out of Scope',
              categoryConfidence: 98,
              priority: 'High',
              priorityReason: 'Emergency law enforcement event.',
              isDuplicate: false,
              suggestedClusterId: null,
              recommendedAuthority: null,
              isOutOfScope: true,
              outOfScopeReason: 'Police emergency excluded from municipal scope.',
              emergencyGuidance: 'CRITICAL NOTICE: Please dial 112 directly.',
            },
            meta: { engine: 'rule-fallback', processingTimeMs: 12 },
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          success: true,
          complaintId: body.complaintId,
          analysis: {
            detectedLanguage: body.language || 'English',
            detectedLanguageCode: body.language === 'Hindi' ? 'hi' : 'en',
            languageConfidence: 96,
            sanitizedSummary: body.title,
            classifiedCategory: body.submittedCategory || 'Water Supply',
            categoryConfidence: 94,
            priority: 'High',
            priorityReason: 'Contaminated water supply risk.',
            isDuplicate: true,
            suggestedClusterId: 'CI-101',
            clusterSimilarityScore: 0.85,
            recommendedAuthority: {
              id: 'AUTH-01',
              name: 'Municipal Water Supply & Sewerage Board',
              department: 'Water Supply',
            },
            isOutOfScope: false,
          },
          meta: { engine: 'rule-fallback', processingTimeMs: 15 },
        }),
      };
    }));

    app = createApp({
      rateLimiters: {
        loginLimiter: createLoginLimiter(100),
      },
    });
  });

  it('1. GET /api/v1/health returns service status and 404 handles unknown routes', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.service).toBe('jansetu-backend');

    const miss = await request(app).get('/api/v1/does-not-exist');
    expect(miss.status).toBe(404);
    expect(miss.body.success).toBe(false);
    expect(miss.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('2. Citizen submission creates complaint, hashes tracking code, preserves text, and associates cluster', async () => {
    const res = await request(app).post('/api/v1/complaints').send({
      title: 'Contaminated tap water in Block B Ward 12',
      description: 'Muddy contaminated drinking water leaking from main pipeline for 3 days.',
      category: 'Water Supply',
      area: 'Ward 12',
      preferredLanguage: 'Hindi',
      contactInfo: '9876543210',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toMatch(/^JS-2026-\d{4,5}$/);
    expect(res.body.data.trackingCode).toMatch(/^TRACK-[A-Z0-9]{6}$/);
    expect(res.body.data.status).toBe('Submitted');
    expect(res.body.data.clusterId).toBe('CI-101');
    expect(store.complaints).toHaveLength(1);
    // Tracking code must be hashed, never plaintext in DB
    expect(store.complaints[0].trackingCodeHash).not.toBe(res.body.data.trackingCode);
    expect(store.complaints[0].trackingCodeHash.startsWith('$2')).toBe(true);
    expect(store.auditLogs).toHaveLength(1);
    expect(store.auditLogs[0].action).toBe('CITIZEN_SUBMISSION');
  });

  it('3. Citizen submission validates bad inputs (422), malformed JSON (400), and handles emergency 112 guidance', async () => {
    const badRes = await request(app).post('/api/v1/complaints').send({
      title: 'ab',
      description: 'short',
      category: 'InvalidCat',
      area: '',
    });
    expect(badRes.status).toBe(422);
    expect(badRes.body.error.code).toBe('VALIDATION_ERROR');

    const malformed = await request(app)
      .post('/api/v1/complaints')
      .set('Content-Type', 'application/json')
      .send('{ bad json');
    expect(malformed.status).toBe(400);

    const emergencyRes = await request(app).post('/api/v1/complaints').send({
      title: 'Violent robbery in progress on street',
      description: 'People fighting and damaging stores right now, send police immediately.',
      category: 'Other',
      area: 'Ward 2',
    });
    expect(emergencyRes.status).toBe(201);
    expect(emergencyRes.body.data.aiAnalysis.isOutOfScope).toBe(true);
    expect(emergencyRes.body.data.aiAnalysis.emergencyGuidance).toContain('112');
  });

  it('4. Complaint tracking requires dual credentials and hides tracking hashes and contactInfo', async () => {
    const created = await request(app).post('/api/v1/complaints').send({
      title: 'Broken drainage gutter near Gate 2',
      description: 'Sewage overflow across road causing terrible odor for residents.',
      category: 'Drainage and Sanitation',
      area: 'Ward 3',
      contactInfo: '9988776655',
    });
    const { referenceId, trackingCode, priority, title, category, area } = created.body.data;
    expect(priority).toBeDefined();
    expect(title).toBe('Broken drainage gutter near Gate 2');
    expect(category).toBe('Drainage and Sanitation');
    expect(area).toBe('Ward 3');

    // Valid dual credentials
    const trackOk = await request(app).post('/api/v1/complaints/track').send({
      referenceId,
      trackingCode,
    });
    expect(trackOk.status).toBe(200);
    expect(trackOk.body.data.id).toBe(referenceId);
    expect(trackOk.body.data.trackingCode).toBeUndefined();
    expect(trackOk.body.data.trackingCodeHash).toBeUndefined();
    expect(trackOk.body.data.contactInfo).toBeUndefined();
    expect(trackOk.body.data.aiAnalysis).toBeDefined();
    expect(trackOk.body.data.aiAnalysis.detectedLanguage).toBeDefined();
    expect(trackOk.body.data.timeline.length).toBeGreaterThanOrEqual(1);
    expect(trackOk.body.data.timeline[0].updatedBy).toBeUndefined();

    // Wrong tracking code & non-existent ref ID must return identical 404 error without leaking
    const badCode = await request(app).post('/api/v1/complaints/track').send({
      referenceId,
      trackingCode: 'TRACK-WRONG1',
    });
    const badRef = await request(app).post('/api/v1/complaints/track').send({
      referenceId: 'JS-2026-0000',
      trackingCode: 'TRACK-WRONG1',
    });
    expect(badCode.status).toBe(404);
    expect(badRef.status).toBe(404);
    expect(badCode.body.error.code).toBe(badRef.body.error.code);
    expect(badCode.body.error.message).toBe(badRef.body.error.message);
  });

  it('5. Admin auth validates credentials, enforces single ADMIN role, and respects rate limiter', async () => {
    const badLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admin.demo@jansetu.local',
      password: 'WrongPassword',
    });
    expect(badLogin.status).toBe(401);
    expect(badLogin.body.error.code).toBe('INVALID_CREDENTIALS');

    const okLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admin.demo@jansetu.local',
      password: 'StrongDemoPass!1',
    });
    expect(okLogin.status).toBe(200);
    expect(okLogin.body.data.token).toBeTruthy();
    expect(okLogin.body.data.admin.role).toBe('ADMIN');
    expect(okLogin.body.data.admin.passwordHash).toBeUndefined();

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${okLogin.body.data.token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.role).toBe('ADMIN');

    // Test strict rate limiter (429)
    const strictApp = createApp({
      rateLimiters: { loginLimiter: createLoginLimiter(2) },
    });
    await request(strictApp).post('/api/v1/auth/login').send({ email: 'a@b.com', password: '1' });
    await request(strictApp).post('/api/v1/auth/login').send({ email: 'a@b.com', password: '1' });
    const limited = await request(strictApp).post('/api/v1/auth/login').send({ email: 'a@b.com', password: '1' });
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('TOO_MANY_LOGIN_ATTEMPTS');
  });

  it('6. Security: Admin routes reject unauthenticated, invalid JWT, and non-ADMIN tokens, and never leak tracking codes', async () => {
    const noAuth = await request(app).get('/api/v1/admin/complaints');
    expect(noAuth.status).toBe(401);

    const badJwt = await request(app)
      .get('/api/v1/admin/complaints')
      .set('Authorization', 'Bearer invalid.jwt.token');
    expect(badJwt.status).toBe(401);

    // Non-ADMIN role token must fail with 403
    const citizenToken = signAdminToken({
      _id: 'admin_obj_1',
      email: 'citizen@local',
      role: 'CITIZEN',
      fullName: 'Fake Role',
    });
    const forbiddenRes = await request(app)
      .get('/api/v1/admin/complaints')
      .set('Authorization', `Bearer ${citizenToken}`);
    expect(forbiddenRes.status).toBe(403);

    const sub = await request(app).post('/api/v1/complaints').send({
      title: 'Streetlights not turning on along Bypass',
      description: 'Five consecutive poles unlit after sunset causing dark stretch.',
      category: 'Streetlights',
      area: 'Ward 10',
    });
    const secretCode = sub.body.data.trackingCode;

    const adminList = await request(app)
      .get('/api/v1/admin/complaints')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminList.status).toBe(200);
    const serialized = JSON.stringify(adminList.body);
    expect(serialized).not.toContain(secretCode);
    expect(serialized).not.toContain('trackingCodeHash');
  });

  it('7. Admin complaint management, lifecycle status transitions, analytics, clusters, authorities, and audit logs work end-to-end', async () => {
    const created = await request(app).post('/api/v1/complaints').send({
      title: 'Muddy tap water in Block B Ward 12',
      description: 'Contaminated water pipeline problem persisted for three days.',
      category: 'Water Supply',
      area: 'Ward 12',
    });
    const cid = created.body.data.id;

    // Premature jump Submitted -> Verified Resolved must be rejected (422)
    const invalidJump = await request(app)
      .patch(`/api/v1/admin/complaints/${cid}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newStatus: 'Verified Resolved', note: 'Trying invalid jump' });
    expect(invalidJump.status).toBe(422);
    expect(invalidJump.body.error.code).toBe('INVALID_STATUS_TRANSITION');

    // Valid transition Submitted -> Verified
    const verifyRes = await request(app)
      .patch(`/api/v1/admin/complaints/${cid}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newStatus: 'Verified', note: 'Admin verified Ward 12 report.' });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.previousStatus).toBe('Submitted');
    expect(verifyRes.body.data.currentStatus).toBe('Verified');

    // Citizen tracking after admin status update sees updated timeline without internal updatedBy metadata
    const trackedAfterAdminUpdate = await request(app).post('/api/v1/complaints/track').send({
      referenceId: cid,
      trackingCode: created.body.data.trackingCode,
    });
    expect(trackedAfterAdminUpdate.status).toBe(200);
    expect(trackedAfterAdminUpdate.body.data.status).toBe('Verified');
    expect(trackedAfterAdminUpdate.body.data.timeline.every((e) => e.updatedBy === undefined)).toBe(true);

    // Public endpoints
    const pubIssues = await request(app).get('/api/v1/community-issues');
    expect(pubIssues.status).toBe(200);
    expect(pubIssues.body.data.length).toBeGreaterThanOrEqual(1);

    const pubStats = await request(app).get('/api/v1/analytics/stats');
    expect(pubStats.status).toBe(200);
    expect(pubStats.body.data.totalReports).toBe(1);

    // Admin analytics, authorities, cluster review, audit logs
    const adminAnalytics = await request(app)
      .get('/api/v1/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminAnalytics.status).toBe(200);
    expect(adminAnalytics.body.data.kpis.totalReports).toBe(1);
    expect(adminAnalytics.body.data.kpis.verifiedCount).toBe(1);

    const authDir = await request(app)
      .get('/api/v1/admin/authorities?department=Water%20Supply')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(authDir.status).toBe(200);
    expect(authDir.body.data[0].id).toBe('AUTH-01');

    const clusterRev = await request(app)
      .patch('/api/v1/admin/community-issues/CI-101/review')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        reviewStatus: 'Forwarded to Department',
        adminNotes: 'Assigned Water Board Executive Engineer.',
        assignedAuthorityId: 'AUTH-01',
      });
    expect(clusterRev.status).toBe(200);
    expect(clusterRev.body.data.reviewStatus).toBe('Forwarded to Department');

    const logsRes = await request(app)
      .get(`/api/v1/admin/audit-logs?complaintId=${cid}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(logsRes.status).toBe(200);
    expect(logsRes.body.data.some((l) => l.action === 'STATUS_UPDATE' && l.newStatus === 'Verified')).toBe(true);
  });

  it('8. AuditLog Mongoose schema enforces append-only immutability on updates and deletes', async () => {
    await expect(
      AuditLog.updateOne({ id: 'LOG-301' }, { $set: { note: 'Tampered note' } })
    ).rejects.toThrow(/immutable/i);

    await expect(AuditLog.findOneAndDelete({ id: 'LOG-301' })).rejects.toThrow(/immutable/i);
  });
});
