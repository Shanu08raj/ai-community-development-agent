import {
  ALLOWED_STATUS_TRANSITIONS,
  EMERGENCY_GUIDANCE_TEXT,
  LANGUAGE_NAME_TO_CODE,
} from '../config/constants.js';
import { Authority } from '../models/Authority.js';
import { CommunityIssue } from '../models/CommunityIssue.js';
import { Complaint } from '../models/Complaint.js';
import { ApiError } from '../utils/ApiError.js';
import {
  compareSecret,
  generateReferenceId,
  generateTrackingCode,
  hashSecret,
} from '../utils/crypto.js';
import { formatDateYYYYMMDD, formatTimelineDate } from '../utils/date.js';
import { analyzeComplaint } from './aiClientService.js';
import { recordAuditLog } from './auditService.js';
import { resolveAuthorityForCategory } from './authorityService.js';
import { associateComplaintWithCluster } from './clusterService.js';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function createComplaint(payload, clientIp = '127.0.0.1') {
  const referenceId = await generateReferenceId(async (candidate) => {
    const exists = await Complaint.exists({ id: candidate });
    return Boolean(exists);
  });

  const plainTrackingCode = generateTrackingCode();
  const trackingCodeHash = await hashSecret(plainTrackingCode);

  const preferredLanguage = payload.preferredLanguage || 'English';
  const preferredLanguageCode = LANGUAGE_NAME_TO_CODE[preferredLanguage] || 'en';
  const submittedDate = formatDateYYYYMMDD();
  const timelineDate = formatTimelineDate();

  const candidateClusters = await CommunityIssue.find({
    category: payload.category,
    status: { $ne: 'Verified Resolved' },
  })
    .select('id title category area summary -_id')
    .limit(15)
    .lean();

  // Invoke AI service (with automatic degraded fallback if unreachable)
  const aiResult = await analyzeComplaint({
    complaintId: referenceId,
    title: payload.title,
    description: payload.description,
    submittedCategory: payload.category,
    ward: payload.area,
    district: payload.district || 'Pune',
    language: preferredLanguage,
    existingClusters: candidateClusters,
  });

  // Resolve advisory authority (never automatically forward or mark as verified)
  let authorityDoc = null;
  if (!aiResult.isOutOfScope) {
    const targetCategory = aiResult.classifiedCategory === 'Out of Scope'
      ? payload.category
      : aiResult.classifiedCategory;
    authorityDoc = await resolveAuthorityForCategory(
      targetCategory,
      aiResult.recommendedAuthority?.id || null
    );
  }

  const initialNote = aiResult.isOutOfScope
    ? `Complaint logged. Flagged outside municipal civic scope (${aiResult.outOfScopeReason || 'Requires manual triage'}).`
    : 'Complaint logged through JanSetu AI portal.';

  const complaint = new Complaint({
    id: referenceId,
    trackingCodeHash,
    title: payload.title,
    description: payload.description,
    category: payload.category,
    state: payload.state || 'Maharashtra',
    district: payload.district || 'Pune',
    area: payload.area,
    preferredLanguage,
    preferredLanguageCode,
    contactInfo: payload.contactInfo || 'Anonymous Citizen',
    priority: aiResult.priority || 'Medium',
    status: 'Submitted', // Always starts Submitted; AI cannot approve or advance status
    submittedDate,
    clusterId: null,
    clusterRef: null,
    assignedAuthorityId: null, // Strictly null until human admin assigns
    recommendedAuthority: authorityDoc?.name || (aiResult.isOutOfScope ? 'Out of Scope (Manual Review)' : ''),
    aiAnalysis: {
      confidence: aiResult.categoryConfidence,
      detectedLanguage: aiResult.detectedLanguage,
      detectedLanguageCode: aiResult.detectedLanguageCode,
      languageConfidence: aiResult.languageConfidence,
      detectedCategory: aiResult.classifiedCategory,
      detectedPriority: aiResult.priority,
      priorityReason: aiResult.priorityReason,
      recommendedAuthorityId: authorityDoc?._id || null,
      recommendedAuthorityCode: authorityDoc?.id || null,
      recommendedAuthorityName: authorityDoc?.name || '',
      isDuplicate: false,
      suggestedClusterId: aiResult.suggestedClusterId,
      sanitizedSummary: aiResult.sanitizedSummary,
      isOutOfScope: aiResult.isOutOfScope,
      outOfScopeReason: aiResult.outOfScopeReason,
      emergencyGuidance: aiResult.emergencyGuidance,
      engineUsed: aiResult.engineUsed,
      needsHumanReview: aiResult.needsHumanReview,
      evaluatedAt: new Date(),
    },
    timeline: [
      {
        status: 'Submitted',
        date: timelineDate,
        timestamp: new Date(),
        note: initialNote,
        updatedBy: 'Public Citizen Portal',
      },
    ],
  });

  await complaint.save();

  // Associate cluster only after complaint is saved cleanly
  const clusterMatch = await associateComplaintWithCluster(complaint, aiResult, authorityDoc);
  if (clusterMatch.clusterId) {
    complaint.clusterId = clusterMatch.clusterId;
    complaint.clusterRef = clusterMatch.clusterRef;
    complaint.aiAnalysis.isDuplicate = clusterMatch.isDuplicate;
    complaint.aiAnalysis.suggestedClusterId = clusterMatch.clusterId;
    complaint.aiAnalysis.relatedClusterId = clusterMatch.clusterRef;
    complaint.aiAnalysis.clusterReason = clusterMatch.clusterReason;
    await complaint.save();
  }

  await recordAuditLog({
    action: 'CITIZEN_SUBMISSION',
    complaintId: referenceId,
    previousStatus: 'None',
    newStatus: 'Submitted',
    adminUser: 'Public Citizen Portal',
    note: `New report registered in ${complaint.area}. AI engine: ${aiResult.engineUsed}.`,
    ipAddress: clientIp,
  });

  // Plaintext trackingCode is returned ONLY here during creation
  return {
    id: referenceId,
    referenceId,
    trackingCode: plainTrackingCode,
    status: complaint.status,
    priority: complaint.priority,
    title: complaint.title,
    category: complaint.category,
    state: complaint.state,
    district: complaint.district,
    area: complaint.area,
    preferredLanguage: complaint.preferredLanguage,
    preferredLanguageCode: complaint.preferredLanguageCode,
    submittedDate: complaint.submittedDate,
    clusterId: complaint.clusterId,
    aiAnalysis: {
      confidence: complaint.aiAnalysis.confidence,
      detectedLanguage: complaint.aiAnalysis.detectedLanguage,
      detectedLanguageCode: complaint.aiAnalysis.detectedLanguageCode,
      detectedCategory: complaint.aiAnalysis.detectedCategory,
      detectedPriority: complaint.aiAnalysis.detectedPriority,
      recommendedAuthority: complaint.aiAnalysis.recommendedAuthorityName || null,
      isOutOfScope: complaint.aiAnalysis.isOutOfScope,
      outOfScopeReason: complaint.aiAnalysis.outOfScopeReason,
      emergencyGuidance:
        complaint.aiAnalysis.emergencyGuidance ||
        (complaint.aiAnalysis.isOutOfScope && /112|police|emergency/i.test(complaint.aiAnalysis.outOfScopeReason || '')
          ? EMERGENCY_GUIDANCE_TEXT
          : null),
      engineUsed: complaint.aiAnalysis.engineUsed,
      needsHumanReview: complaint.aiAnalysis.needsHumanReview,
    },
    message: aiResult.isOutOfScope
      ? 'Complaint logged. Please note this issue has been flagged as outside the municipal civic scope.'
      : 'Complaint registered successfully. Store your Tracking Code confidentially to monitor lifecycle progress.',
  };
}

export async function trackComplaint(referenceId, trackingCode) {
  const refClean = String(referenceId || '').trim().toUpperCase();
  const codeClean = String(trackingCode || '').trim().toUpperCase();

  const complaint = await Complaint.findOne({ id: refClean })
    .select('+trackingCodeHash')
    .lean();

  const isMatch = await compareSecret(codeClean, complaint?.trackingCodeHash);

  if (!complaint || !isMatch) {
    throw new ApiError(
      404,
      'INVALID_TRACKING_CREDENTIALS',
      'No complaint found matching this Reference ID and Secret Tracking Code combination. Please verify your credentials.'
    );
  }

  // Strictly return non-sensitive public tracking view (never trackingCodeHash or contactInfo)
  return {
    id: complaint.id,
    referenceId: complaint.id,
    title: complaint.title,
    description: complaint.description,
    category: complaint.category,
    state: complaint.state,
    district: complaint.district,
    area: complaint.area,
    preferredLanguage: complaint.preferredLanguage,
    priority: complaint.priority,
    status: complaint.status,
    submittedDate: complaint.submittedDate,
    recommendedAuthority: complaint.recommendedAuthority || complaint.aiAnalysis?.recommendedAuthorityName || '',
    clusterId: complaint.clusterId || null,
    aiAnalysis: {
      confidence: complaint.aiAnalysis?.confidence ?? 0,
      detectedPriority: complaint.aiAnalysis?.detectedPriority || complaint.priority,
      detectedLanguage: complaint.aiAnalysis?.detectedLanguage || complaint.preferredLanguage,
      detectedLanguageCode: complaint.aiAnalysis?.detectedLanguageCode || complaint.preferredLanguageCode,
      isOutOfScope: Boolean(complaint.aiAnalysis?.isOutOfScope),
      outOfScopeReason: complaint.aiAnalysis?.outOfScopeReason || null,
      emergencyGuidance: complaint.aiAnalysis?.emergencyGuidance || null,
    },
    timeline: (complaint.timeline || []).map(({ status, date, note }) => ({
      status,
      date,
      note,
    })),
  };
}

export async function listAdminComplaints(filters = {}) {
  const {
    search,
    category,
    status,
    priority,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = filters;

  const query = {};
  if (category && category !== 'All') query.category = category;
  if (status && status !== 'All') query.status = status;
  if (priority && priority !== 'All') query.priority = priority;

  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    query.$or = [
      { id: rx },
      { title: rx },
      { area: rx },
      { category: rx },
      { description: rx },
    ];
  }

  const sortDir = sortOrder === 'asc' ? 1 : -1;
  const sortField = sortBy === 'submittedDate' ? { submittedDate: sortDir, createdAt: sortDir } : { [sortBy]: sortDir };
  const skip = (page - 1) * limit;

  const [rows, totalRecords] = await Promise.all([
    Complaint.find(query)
      .sort(sortField)
      .skip(skip)
      .limit(limit)
      .select('-trackingCodeHash -contactInfo -__v')
      .lean(),
    Complaint.countDocuments(query),
  ]);

  const items = rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    state: row.state,
    district: row.district,
    area: row.area,
    preferredLanguage: row.preferredLanguage,
    preferredLanguageCode: row.preferredLanguageCode,
    priority: row.priority,
    status: row.status,
    submittedDate: row.submittedDate,
    aiConfidence: row.aiAnalysis?.confidence ?? 0,
    recommendedAuthority: row.recommendedAuthority || row.aiAnalysis?.recommendedAuthorityName || '',
    clusterId: row.clusterId || null,
    aiAnalysis: row.aiAnalysis,
    humanReview: row.humanReview,
    timeline: row.timeline || [],
  }));

  const totalPages = Math.ceil(totalRecords / limit) || 1;
  return {
    items,
    pagination: {
      currentPage: page,
      pageSize: limit,
      totalRecords,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

export async function getAdminComplaintDetail(id) {
  const complaint = await Complaint.findOne({ id: id.toUpperCase() })
    .select('-trackingCodeHash -__v')
    .populate('clusterRef', 'id title relatedReportsCount area status')
    .lean();

  if (!complaint) {
    throw new ApiError(404, 'COMPLAINT_NOT_FOUND', `Complaint ${id} was not found.`);
  }

  return {
    id: complaint.id,
    title: complaint.title,
    description: complaint.description,
    category: complaint.category,
    state: complaint.state,
    district: complaint.district,
    area: complaint.area,
    priority: complaint.priority,
    status: complaint.status,
    submittedDate: complaint.submittedDate,
    preferredLanguage: complaint.preferredLanguage,
    preferredLanguageCode: complaint.preferredLanguageCode,
    recommendedAuthority: complaint.recommendedAuthority || complaint.aiAnalysis?.recommendedAuthorityName || '',
    aiConfidence: complaint.aiAnalysis?.confidence ?? 0,
    aiAnalysis: {
      confidence: complaint.aiAnalysis?.confidence ?? 0,
      detectedCategory: complaint.aiAnalysis?.detectedCategory || complaint.category,
      detectedPriority: complaint.aiAnalysis?.detectedPriority || complaint.priority,
      priorityReason: complaint.aiAnalysis?.priorityReason || '',
      recommendedAuthority: complaint.aiAnalysis?.recommendedAuthorityName || complaint.recommendedAuthority || '',
      recommendedAuthorityCode: complaint.aiAnalysis?.recommendedAuthorityCode || null,
      detectedLanguage: complaint.aiAnalysis?.detectedLanguage || complaint.preferredLanguage,
      detectedLanguageCode: complaint.aiAnalysis?.detectedLanguageCode || complaint.preferredLanguageCode,
      languageConfidence: complaint.aiAnalysis?.languageConfidence ?? 0,
      summary: complaint.aiAnalysis?.sanitizedSummary || '',
      isDuplicate: Boolean(complaint.aiAnalysis?.isDuplicate),
      clusterReason: complaint.aiAnalysis?.clusterReason || null,
      isOutOfScope: Boolean(complaint.aiAnalysis?.isOutOfScope),
      outOfScopeReason: complaint.aiAnalysis?.outOfScopeReason || null,
      emergencyGuidance: complaint.aiAnalysis?.emergencyGuidance || null,
      engineUsed: complaint.aiAnalysis?.engineUsed || 'rule-fallback',
      needsHumanReview: Boolean(complaint.aiAnalysis?.needsHumanReview),
    },
    humanReview: complaint.humanReview || {},
    cluster: complaint.clusterRef
      ? {
          id: complaint.clusterRef.id,
          title: complaint.clusterRef.title,
          totalClusterReports: complaint.clusterRef.relatedReportsCount,
        }
      : null,
    clusterId: complaint.clusterId || null,
    timeline: complaint.timeline || [],
  };
}

export async function updateComplaintStatus(id, payload, admin, clientIp = '127.0.0.1') {
  const complaint = await Complaint.findOne({ id: id.toUpperCase() }).select('-trackingCodeHash');
  if (!complaint) {
    throw new ApiError(404, 'COMPLAINT_NOT_FOUND', `Complaint ${id} was not found.`);
  }

  const previousStatus = complaint.status;
  const { newStatus, note = '', verifiedCategory, verifiedPriority, assignedAuthorityId } = payload;

  if (newStatus === previousStatus && !note.trim()) {
    throw new ApiError(
      422,
      'VALIDATION_ERROR',
      'Please select a new status or enter a supervisory update note.'
    );
  }

  const allowedTargets = ALLOWED_STATUS_TRANSITIONS[previousStatus] || [];
  if (!allowedTargets.includes(newStatus)) {
    throw new ApiError(
      422,
      'INVALID_STATUS_TRANSITION',
      `Transition from '${previousStatus}' to '${newStatus}' is not permitted.`
    );
  }

  complaint.status = newStatus;

  if (verifiedCategory) {
    complaint.category = verifiedCategory;
    complaint.humanReview.verifiedCategory = verifiedCategory;
  }
  if (verifiedPriority) {
    complaint.priority = verifiedPriority;
    complaint.humanReview.verifiedPriority = verifiedPriority;
  }
  if (assignedAuthorityId) {
    const auth = await Authority.findOne({ id: assignedAuthorityId.toUpperCase() }).lean();
    if (!auth) {
      throw new ApiError(404, 'AUTHORITY_NOT_FOUND', `Authority ${assignedAuthorityId} not found.`);
    }
    complaint.assignedAuthorityId = auth._id;
    complaint.recommendedAuthority = auth.name;
  }

  complaint.humanReview.reviewedBy = admin.id;
  complaint.humanReview.reviewedByName = admin.fullName;
  complaint.humanReview.reviewedAt = new Date();
  if (note.trim()) {
    complaint.humanReview.reviewNote = note.trim();
  }

  const timelineEntry = {
    status: newStatus,
    date: formatTimelineDate(),
    timestamp: new Date(),
    note: note.trim() || `Status updated from ${previousStatus} to ${newStatus} by ${admin.fullName}.`,
    updatedBy: admin.fullName,
  };
  complaint.timeline.push(timelineEntry);

  await complaint.save();

  const auditLog = await recordAuditLog({
    action: 'STATUS_UPDATE',
    complaintId: complaint.id,
    previousStatus,
    newStatus,
    adminUser: admin.fullName,
    adminId: admin.id,
    note: timelineEntry.note,
    ipAddress: clientIp,
  });

  const updatedView = await getAdminComplaintDetail(complaint.id);

  return {
    id: complaint.id,
    previousStatus,
    currentStatus: complaint.status,
    updatedAt: complaint.updatedAt.toISOString(),
    auditLogId: auditLog.id,
    complaint: updatedView,
  };
}
