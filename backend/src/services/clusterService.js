import crypto from 'crypto';
import { Authority } from '../models/Authority.js';
import { CommunityIssue } from '../models/CommunityIssue.js';
import { Complaint } from '../models/Complaint.js';
import { ApiError } from '../utils/ApiError.js';
import { formatDateYYYYMMDD } from '../utils/date.js';
import { recordAuditLog } from './auditService.js';

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'near', 'from', 'that', 'this', 'have', 'been',
  'are', 'was', 'has', 'not', 'into', 'over', 'after', 'since', 'days', 'please',
  'issue', 'problem', 'report', 'complaint', 'ward', 'area', 'sector', 'block',
]);

export function extractWardKey(area = '') {
  const normalized = String(area).toLowerCase().trim();
  const wardMatch = normalized.match(/ward\s*[-#:]?\s*(\d+)/i);
  if (wardMatch) {
    return `ward ${wardMatch[1]}`;
  }
  return normalized.split(',')[0].trim();
}

export function tokenizeText(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
}

export function calculateSimilarity(textA, textB) {
  const tokensA = new Set(tokenizeText(textA));
  const tokensB = new Set(tokenizeText(textB));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let overlap = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) overlap += 1;
  }

  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 0 : overlap / union;
}

export async function listCommunityIssues(filters = {}, includeAdminFields = false) {
  const { category, priority, status, reviewStatus, page = 1, limit = 10 } = filters;
  const query = {};

  if (category && category !== 'All') query.category = category;
  if (priority && priority !== 'All') query.priority = priority;
  if (status && status !== 'All') query.status = status;
  if (reviewStatus && reviewStatus !== 'All') query.reviewStatus = reviewStatus;

  const skip = (page - 1) * limit;
  const projection = includeAdminFields
    ? '-__v'
    : '-__v -adminNotes -memberComplaintIds';

  const [items, totalRecords] = await Promise.all([
    CommunityIssue.find(query)
      .sort({ relatedReportsCount: -1, lastUpdated: -1 })
      .skip(skip)
      .limit(limit)
      .select(projection)
      .lean(),
    CommunityIssue.countDocuments(query),
  ]);

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

/**
 * Associates a new in-scope complaint with an existing CommunityIssue cluster if category,
 * geographic ward/area, and semantic text match; otherwise looks for unclustered sibling reports.
 * Never merges/deletes original complaints.
 */
export async function associateComplaintWithCluster(complaint, aiResult, authorityDoc) {
  if (aiResult?.isOutOfScope) {
    return {
      clusterId: null,
      clusterRef: null,
      isDuplicate: false,
      clusterReason: 'Excluded from clustering because complaint was flagged as Out of Scope.',
    };
  }

  const wardKey = extractWardKey(complaint.area);
  const complaintText = `${complaint.title} ${complaint.description}`;

  // 1. Check AI-suggested cluster ID first (only accept if category and ward also align!)
  if (aiResult?.suggestedClusterId) {
    const suggested = await CommunityIssue.findOne({ id: aiResult.suggestedClusterId });
    if (
      suggested &&
      suggested.category === complaint.category &&
      extractWardKey(suggested.area) === wardKey
    ) {
      await CommunityIssue.updateOne(
        { _id: suggested._id },
        {
          $addToSet: { memberComplaintIds: complaint._id },
          $inc: { relatedReportsCount: 1 },
          $set: { lastUpdated: formatDateYYYYMMDD() },
        }
      );
      return {
        clusterId: suggested.id,
        clusterRef: suggested._id,
        isDuplicate: true,
        clusterReason: `Matched existing cluster ${suggested.id} (${suggested.area}) sharing category '${complaint.category}' and semantic context.`,
      };
    }
  }

  // 2. Search existing active CommunityIssues in same category
  const candidates = await CommunityIssue.find({
    category: complaint.category,
    status: { $ne: 'Verified Resolved' },
  });

  let bestCluster = null;
  let bestScore = 0;

  for (const cluster of candidates) {
    const clusterWardKey = extractWardKey(cluster.area);
    if (!clusterWardKey || !wardKey || (clusterWardKey !== wardKey && !cluster.area.toLowerCase().includes(wardKey))) {
      continue;
    }
    const sim = calculateSimilarity(complaintText, `${cluster.title} ${cluster.summary}`);
    if (sim > bestScore) {
      bestScore = sim;
      bestCluster = cluster;
    }
  }

  if (bestCluster && bestScore >= 0.12) {
    await CommunityIssue.updateOne(
      { _id: bestCluster._id },
      {
        $addToSet: { memberComplaintIds: complaint._id },
        $inc: { relatedReportsCount: 1 },
        $set: { lastUpdated: formatDateYYYYMMDD() },
      }
    );
    return {
      clusterId: bestCluster.id,
      clusterRef: bestCluster._id,
      isDuplicate: true,
      clusterReason: `Grouped into ${bestCluster.id} (${bestCluster.area}) via matching ${complaint.category} domain and term overlap (${Math.round(bestScore * 100)}%).`,
    };
  }

  // 3. Check if an unclustered sibling complaint exists in the same ward & category with text overlap
  const siblingCandidates = await Complaint.find({
    id: { $ne: complaint.id },
    category: complaint.category,
    clusterId: null,
    'aiAnalysis.isOutOfScope': { $ne: true },
  })
    .sort({ createdAt: -1 })
    .limit(20);

  let matchedSibling = null;
  let siblingSim = 0;

  for (const sibling of siblingCandidates) {
    if (extractWardKey(sibling.area) !== wardKey) continue;
    const sim = calculateSimilarity(complaintText, `${sibling.title} ${sibling.description}`);
    if (sim >= 0.2 && sim > siblingSim) {
      siblingSim = sim;
      matchedSibling = sibling;
    }
  }

  if (matchedSibling) {
    const clusterNumber = crypto.randomInt(200, 999);
    const newClusterId = `CI-${clusterNumber}`;
    const newCluster = await CommunityIssue.create({
      id: newClusterId,
      title: `${complaint.category} cluster in ${complaint.area}`,
      category: complaint.category,
      area: complaint.area,
      relatedReportsCount: 2,
      priority: complaint.priority,
      status: 'Submitted',
      lastUpdated: formatDateYYYYMMDD(),
      aiConfidence: aiResult?.categoryConfidence || 85,
      recommendedAuthorityId: authorityDoc?._id || null,
      recommendedAuthority: authorityDoc?.name || complaint.recommendedAuthority || '',
      reviewStatus: 'Pending Admin Review',
      summary: `Recurring ${complaint.category.toLowerCase()} reports clustered in ${complaint.area} referencing similar disruption.`,
      impactZones: [complaint.area],
      memberComplaintIds: [matchedSibling._id, complaint._id],
    });

    await Complaint.updateOne(
      { _id: matchedSibling._id },
      {
        $set: {
          clusterId: newCluster.id,
          clusterRef: newCluster._id,
          'aiAnalysis.isDuplicate': true,
          'aiAnalysis.suggestedClusterId': newCluster.id,
          'aiAnalysis.relatedClusterId': newCluster._id,
          'aiAnalysis.clusterReason': `Clustered with ${complaint.id} in ${complaint.area}.`,
        },
      }
    );

    return {
      clusterId: newCluster.id,
      clusterRef: newCluster._id,
      isDuplicate: true,
      clusterReason: `Formed new cluster ${newCluster.id} with related report ${matchedSibling.id} in ${complaint.area}.`,
    };
  }

  return {
    clusterId: null,
    clusterRef: null,
    isDuplicate: false,
    clusterReason: 'No active matching neighborhood cluster found in this ward.',
  };
}

export async function reviewCluster(clusterId, payload, admin, clientIp = '127.0.0.1') {
  const cluster = await CommunityIssue.findOne({ id: clusterId.toUpperCase() });
  if (!cluster) {
    throw new ApiError(404, 'CLUSTER_NOT_FOUND', `Community issue cluster ${clusterId} was not found.`);
  }

  const prevReviewStatus = cluster.reviewStatus;
  cluster.reviewStatus = payload.reviewStatus;
  if (payload.adminNotes !== undefined) {
    cluster.adminNotes = payload.adminNotes;
  }

  if (payload.assignedAuthorityId) {
    const auth = await Authority.findOne({ id: payload.assignedAuthorityId.toUpperCase() }).lean();
    if (!auth) {
      throw new ApiError(404, 'AUTHORITY_NOT_FOUND', `Authority ${payload.assignedAuthorityId} was not found.`);
    }
    cluster.recommendedAuthorityId = auth._id;
    cluster.recommendedAuthority = auth.name;
  }

  cluster.lastUpdated = formatDateYYYYMMDD();
  await cluster.save();

  await recordAuditLog({
    action: 'COMMUNITY_CLUSTER_FORWARDED',
    complaintId: cluster.id,
    previousStatus: prevReviewStatus,
    newStatus: cluster.reviewStatus,
    adminUser: admin.fullName,
    adminId: admin.id,
    note: payload.adminNotes || `Cluster ${cluster.id} review status updated to ${cluster.reviewStatus}.`,
    ipAddress: clientIp,
  });

  return {
    id: cluster.id,
    reviewStatus: cluster.reviewStatus,
    assignedAuthorityId: payload.assignedAuthorityId || null,
    recommendedAuthority: cluster.recommendedAuthority,
    lastUpdated: cluster.lastUpdated,
  };
}
