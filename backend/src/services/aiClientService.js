import {
  AI_DETECTED_CATEGORIES,
  AI_LANGUAGE_CODES,
  AI_LANGUAGE_NAMES,
  CATEGORIES,
  CATEGORY_AUTHORITY_MAP,
  EMERGENCY_GUIDANCE_TEXT,
  LANGUAGE_CODE_TO_NAME,
  LANGUAGE_NAME_TO_CODE,
  PRIORITIES,
} from '../config/constants.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const EMERGENCY_KEYWORDS = [
  'police',
  'robbery',
  'murder',
  'assault',
  'fight',
  'vandaliz',
  'weapon',
  'knife',
  'gun',
  'ambulance',
  'heart attack',
  'medical emergency',
  'fire brigade',
  'house fire',
  'domestic violence',
  'kidnap',
];

const NON_CIVIC_OOS_KEYWORDS = [
  { term: 'land dispute', reason: 'Private land/property revenue dispute excluded from civic platform.' },
  { term: 'property dispute', reason: 'Private property boundary/tenancy dispute excluded from civic platform.' },
  { term: 'pension', reason: 'Government pension/welfare benefits query excluded from civic platform.' },
  { term: 'ration card', reason: 'Government welfare/ration scheme query excluded from civic platform.' },
  { term: 'school teacher', reason: 'Education staffing/curriculum matter excluded from civic platform.' },
  { term: 'hospital doctor', reason: 'Healthcare staffing/clinical care matter excluded from civic platform.' },
  { term: 'transformer blast', reason: 'High-voltage electricity grid distribution fault handled by state power utility.' },
  { term: 'electricity bill', reason: 'Electricity billing/grid utility issue excluded from MVP civic scope.' },
];

export function buildDegradedAnalysis(payload, reason = 'AI service unavailable') {
  const combined = `${payload.title || ''} ${payload.description || ''}`.toLowerCase();
  const isEmergency = EMERGENCY_KEYWORDS.some((kw) => combined.includes(kw));
  const nonCivicMatch = NON_CIVIC_OOS_KEYWORDS.find((entry) => combined.includes(entry.term));

  const langName = LANGUAGE_NAMES_OR_DEFAULT(payload.language);
  const langCode = LANGUAGE_NAME_TO_CODE[langName] || 'en';

  if (isEmergency) {
    return {
      detectedLanguage: langName,
      detectedLanguageCode: langCode,
      languageConfidence: 70,
      sanitizedSummary: payload.title.slice(0, 120),
      classifiedCategory: 'Out of Scope',
      categoryConfidence: 85,
      priority: 'High',
      priorityReason: 'Degraded safety triage detected emergency keywords. Human review required.',
      isDuplicate: false,
      suggestedClusterId: null,
      clusterSimilarityScore: null,
      recommendedAuthority: null,
      isOutOfScope: true,
      outOfScopeReason: 'Potential active emergency or law-enforcement matter excluded from municipal civic workflow.',
      emergencyGuidance: EMERGENCY_GUIDANCE_TEXT,
      engineUsed: 'backend-degraded-fallback',
      needsHumanReview: true,
      aiUnavailable: true,
      fallbackReason: reason,
    };
  }

  if (nonCivicMatch) {
    return {
      detectedLanguage: langName,
      detectedLanguageCode: langCode,
      languageConfidence: 70,
      sanitizedSummary: payload.title.slice(0, 120),
      classifiedCategory: 'Out of Scope',
      categoryConfidence: 78,
      priority: 'Medium',
      priorityReason: 'Degraded scope check identified an out-of-scope domain. Flagged for admin triage.',
      isDuplicate: false,
      suggestedClusterId: null,
      clusterSimilarityScore: null,
      recommendedAuthority: null,
      isOutOfScope: true,
      outOfScopeReason: nonCivicMatch.reason,
      emergencyGuidance: null,
      engineUsed: 'backend-degraded-fallback',
      needsHumanReview: true,
      aiUnavailable: true,
      fallbackReason: reason,
    };
  }

  const category = CATEGORIES.includes(payload.submittedCategory) ? payload.submittedCategory : 'Other';
  const authInfo = CATEGORY_AUTHORITY_MAP[category] || CATEGORY_AUTHORITY_MAP.Other;

  let priority = 'Medium';
  let priorityReason = `Degraded fallback analysis (${reason}). Advisory pending human admin verification.`;
  if (/(accident|overflow|sewage|contaminat|school|hospital|collapse|sparking|danger)/.test(combined)) {
    priority = 'High';
    priorityReason = 'Degraded fallback detected potential public safety or health hazard keywords.';
  }

  return {
    detectedLanguage: langName,
    detectedLanguageCode: langCode,
    languageConfidence: 65,
    sanitizedSummary: payload.title.slice(0, 120),
    classifiedCategory: category,
    categoryConfidence: 55,
    priority,
    priorityReason,
    isDuplicate: false,
    suggestedClusterId: null,
    clusterSimilarityScore: null,
    recommendedAuthority: {
      id: authInfo.id,
      name: authInfo.name,
      department: category,
    },
    isOutOfScope: false,
    outOfScopeReason: null,
    emergencyGuidance: null,
    engineUsed: 'backend-degraded-fallback',
    needsHumanReview: true,
    aiUnavailable: true,
    fallbackReason: reason,
  };
}

function LANGUAGE_NAMES_OR_DEFAULT(lang) {
  if (LANGUAGE_NAME_TO_CODE[lang]) return lang;
  if (LANGUAGE_CODE_TO_NAME[lang]) return LANGUAGE_CODE_TO_NAME[lang];
  return 'English';
}

function normalizeAiPayload(rawAnalysis, rawMeta, inputPayload) {
  if (!rawAnalysis || typeof rawAnalysis !== 'object') {
    return buildDegradedAnalysis(inputPayload, 'Invalid AI payload structure');
  }

  const detectedLanguageCode = AI_LANGUAGE_CODES.includes(rawAnalysis.detectedLanguageCode)
    ? rawAnalysis.detectedLanguageCode
    : LANGUAGE_NAME_TO_CODE[rawAnalysis.detectedLanguage] || 'und';

  const detectedLanguage = AI_LANGUAGE_NAMES.includes(rawAnalysis.detectedLanguage)
    ? rawAnalysis.detectedLanguage
    : LANGUAGE_CODE_TO_NAME[detectedLanguageCode] || 'Undetermined';

  const classifiedCategory = AI_DETECTED_CATEGORIES.includes(rawAnalysis.classifiedCategory)
    ? rawAnalysis.classifiedCategory
    : inputPayload.submittedCategory || 'Other';

  const priority = PRIORITIES.includes(rawAnalysis.priority) ? rawAnalysis.priority : 'Medium';

  const categoryConfidence =
    typeof rawAnalysis.categoryConfidence === 'number'
      ? Math.max(0, Math.min(100, Math.round(rawAnalysis.categoryConfidence)))
      : 50;

  const languageConfidence =
    typeof rawAnalysis.languageConfidence === 'number'
      ? Math.max(0, Math.min(100, Math.round(rawAnalysis.languageConfidence)))
      : 60;

  const isOutOfScope = Boolean(rawAnalysis.isOutOfScope || classifiedCategory === 'Out of Scope');

  let recommendedAuthority = null;
  if (!isOutOfScope) {
    if (rawAnalysis.recommendedAuthority?.id && rawAnalysis.recommendedAuthority?.name) {
      recommendedAuthority = {
        id: rawAnalysis.recommendedAuthority.id,
        name: rawAnalysis.recommendedAuthority.name,
        department: rawAnalysis.recommendedAuthority.department || classifiedCategory,
      };
    } else {
      const mapped = CATEGORY_AUTHORITY_MAP[classifiedCategory] || CATEGORY_AUTHORITY_MAP.Other;
      recommendedAuthority = { id: mapped.id, name: mapped.name, department: classifiedCategory };
    }
  }

  return {
    detectedLanguage,
    detectedLanguageCode,
    languageConfidence,
    sanitizedSummary: String(rawAnalysis.sanitizedSummary || inputPayload.title).slice(0, 300),
    classifiedCategory,
    categoryConfidence,
    priority,
    priorityReason: String(
      rawAnalysis.priorityReason || 'Advisory priority score computed during automated triage.'
    ).slice(0, 400),
    isDuplicate: Boolean(rawAnalysis.isDuplicate),
    suggestedClusterId: rawAnalysis.suggestedClusterId || null,
    clusterSimilarityScore:
      typeof rawAnalysis.clusterSimilarityScore === 'number'
        ? rawAnalysis.clusterSimilarityScore
        : null,
    recommendedAuthority,
    isOutOfScope,
    outOfScopeReason: isOutOfScope ? rawAnalysis.outOfScopeReason || 'Flagged outside civic MVP scope.' : null,
    emergencyGuidance: rawAnalysis.emergencyGuidance || null,
    engineUsed: rawMeta?.engine || 'rule-fallback',
    needsHumanReview: categoryConfidence < 70 || languageConfidence < 60 || isOutOfScope,
    aiUnavailable: false,
  };
}

export async function analyzeComplaint(payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${env.AI_SERVICE_URL}/api/v1/ai/analyze-complaint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': env.AI_SERVICE_INTERNAL_SECRET,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      logger.warn('AI service returned non-OK status, using degraded fallback', {
        status: response.status,
        complaintId: payload.complaintId,
      });
      return buildDegradedAnalysis(payload, `HTTP ${response.status}`);
    }

    const body = await response.json();
    if (!body?.success || !body?.analysis) {
      return buildDegradedAnalysis(payload, 'Malformed AI response body');
    }

    return normalizeAiPayload(body.analysis, body.meta, payload);
  } catch (error) {
    logger.warn('AI service unreachable or timed out, using degraded fallback', {
      complaintId: payload.complaintId,
      reason: error?.name === 'AbortError' ? 'Timeout' : error?.message,
    });
    return buildDegradedAnalysis(
      payload,
      error?.name === 'AbortError' ? 'AI service timeout' : 'AI service unreachable'
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
