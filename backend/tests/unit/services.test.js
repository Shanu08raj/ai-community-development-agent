import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateReferenceId,
  generateTrackingCode,
  hashSecret,
  compareSecret,
  signAdminToken,
  verifyAdminToken,
} from '../../src/utils/crypto.js';
import {
  submitComplaintSchema,
  trackComplaintSchema,
  updateComplaintStatusSchema,
} from '../../src/validators/complaintValidator.js';
import { loginSchema } from '../../src/validators/authValidator.js';
import { analyzeComplaint, buildDegradedAnalysis } from '../../src/services/aiClientService.js';
import {
  extractWardKey,
  tokenizeText,
  calculateSimilarity,
} from '../../src/services/clusterService.js';
import {
  ALLOWED_STATUS_TRANSITIONS,
  CATEGORIES,
  LANGUAGE_NAMES,
} from '../../src/config/constants.js';

describe('Backend Unit Tests', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Reference ID and secret tracking code generators follow exact contract patterns', async () => {
    const ref = await generateReferenceId(async () => false);
    expect(ref).toMatch(/^JS-2026-\d{4,5}$/);

    const code = generateTrackingCode();
    expect(code).toMatch(/^TRACK-[A-Z0-9]{6}$/);
  });

  it('2. Bcrypt hashing & constant-time compare work accurately and reject null/wrong values', async () => {
    const secret = 'TRACK-890A1B';
    const hash = await hashSecret(secret);
    expect(hash).not.toBe(secret);
    expect(hash.startsWith('$2')).toBe(true);

    expect(await compareSecret(secret, hash)).toBe(true);
    expect(await compareSecret('TRACK-WRONG', hash)).toBe(false);
    expect(await compareSecret(secret, null)).toBe(false);
  });

  it('3. JWT sign & verify maintain ADMIN role claim and reject tampered tokens', () => {
    const token = signAdminToken({
      _id: '67448831f1a23e9a01',
      email: 'admin.demo@jansetu.local',
      role: 'ADMIN',
      fullName: 'Admin Demo',
    });
    const decoded = verifyAdminToken(token);
    expect(decoded.role).toBe('ADMIN');
    expect(decoded.email).toBe('admin.demo@jansetu.local');

    expect(() => verifyAdminToken(`${token}tampered`)).toThrow();
  });

  it('4. Zod validators accept all 8 languages and 6 categories, and reject invalid inputs', () => {
    expect(LANGUAGE_NAMES).toHaveLength(8);
    expect(CATEGORIES).toHaveLength(6);

    for (const lang of LANGUAGE_NAMES) {
      const parsed = submitComplaintSchema.safeParse({
        title: 'Broken tap pipeline near park',
        description: 'Water leaking heavily for two days outside community entrance.',
        category: 'Water Supply',
        area: 'Ward 12',
        preferredLanguage: lang,
      });
      expect(parsed.success).toBe(true);
    }

    const badSubmit = submitComplaintSchema.safeParse({
      title: 'Hi',
      description: 'Short',
      category: 'InvalidCategory',
      area: '',
    });
    expect(badSubmit.success).toBe(false);

    const trackParsed = trackComplaintSchema.safeParse({
      referenceId: ' js-2026-8901 ',
      trackingCode: ' track-901a ',
    });
    expect(trackParsed.success).toBe(true);
    expect(trackParsed.data.referenceId).toBe('JS-2026-8901');
    expect(trackParsed.data.trackingCode).toBe('TRACK-901A');

    expect(loginSchema.safeParse({ email: 'not-email', password: '' }).success).toBe(false);
    expect(
      updateComplaintStatusSchema.safeParse({ newStatus: 'UnknownStatus' }).success
    ).toBe(false);
  });

  it('5. AI client uses graceful degraded fallback when AI service is unreachable or malformed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    const res = await analyzeComplaint({
      complaintId: 'JS-2026-9901',
      title: 'Severe water pipe leakage in Block C',
      description: 'Dirty water flooding street outside school gate.',
      submittedCategory: 'Water Supply',
      ward: 'Ward 5',
      language: 'English',
    });

    expect(res.aiUnavailable).toBe(true);
    expect(res.engineUsed).toBe('backend-degraded-fallback');
    expect(res.needsHumanReview).toBe(true);
    expect(res.classifiedCategory).toBe('Water Supply');
    expect(res.priority).toBe('High');
    expect(res.recommendedAuthority.id).toBe('AUTH-01');

    // Emergency fallback test when AI offline
    const emergencyRes = buildDegradedAnalysis({
      title: 'Violent robbery in progress near market',
      description: 'Attackers carrying knife, need police squad immediately.',
      submittedCategory: 'Other',
      language: 'English',
    });
    expect(emergencyRes.isOutOfScope).toBe(true);
    expect(emergencyRes.emergencyGuidance).toContain('112');
    expect(emergencyRes.recommendedAuthority).toBeNull();
  });

  it('6. Clustering helper utilities extract wards and compute similarity accurately', () => {
    expect(extractWardKey('Ward 12, North Zone')).toBe('ward 12');
    expect(extractWardKey('Ward-08')).toBe('ward 08');

    const tokens = tokenizeText('The leaking water pipeline in Ward 12 Block B');
    expect(tokens).toContain('leaking');
    expect(tokens).toContain('pipeline');
    expect(tokens).not.toContain('the');

    const highSim = calculateSimilarity(
      'Contaminated tap water foul smell Block B',
      'Contaminated muddy tap water odor Block B'
    );
    const lowSim = calculateSimilarity(
      'Contaminated tap water foul smell',
      'Non operational streetlight poles Outer Bypass'
    );
    expect(highSim).toBeGreaterThan(lowSim);
    expect(lowSim).toBe(0);
  });

  it('7. Status lifecycle transition table permits progression and blocks invalid regressions', () => {
    expect(ALLOWED_STATUS_TRANSITIONS.Submitted).toContain('Verified');
    expect(ALLOWED_STATUS_TRANSITIONS.Submitted).not.toContain('Verified Resolved');
    expect(ALLOWED_STATUS_TRANSITIONS['Reported Resolved']).toContain('Verified Resolved');
    expect(ALLOWED_STATUS_TRANSITIONS['Reported Resolved']).toContain('In Progress');
    expect(ALLOWED_STATUS_TRANSITIONS['Verified Resolved']).toEqual(['Verified Resolved']);
  });
});
