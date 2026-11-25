import {
  CATEGORIES,
  CATEGORY_CHART_COLORS,
  COMPLAINT_STATUSES,
  PRIORITIES,
  STATUS_CHART_COLORS,
} from '../config/constants.js';
import { AuditLog } from '../models/AuditLog.js';
import { Authority } from '../models/Authority.js';
import { CommunityIssue } from '../models/CommunityIssue.js';
import { Complaint } from '../models/Complaint.js';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function getPublicStats() {
  const [totalReports, recurringIssues, inProgress, reportedResolutions] = await Promise.all([
    Complaint.countDocuments({}),
    CommunityIssue.countDocuments({}),
    Complaint.countDocuments({ status: { $in: ['Forwarded', 'Acknowledged', 'In Progress'] } }),
    Complaint.countDocuments({ status: { $in: ['Reported Resolved', 'Verified Resolved'] } }),
  ]);

  return {
    totalReports,
    recurringIssues,
    inProgress,
    reportedResolutions,
    growthRates: {
      totalReports: `${totalReports} logged reports`,
      recurringIssues: `${recurringIssues} AI cluster groups`,
      inProgress: 'Active civic tracking',
      reportedResolutions: totalReports > 0
        ? `${Math.round((reportedResolutions / totalReports) * 100)}% resolution rate`
        : '0% resolution rate',
    },
  };
}

export async function getAdminAnalytics() {
  const [
    totalReports,
    pendingTriage,
    verifiedCount,
    inProgress,
    reportedResolutions,
    recurringIssues,
    authoritiesCount,
    categoryAgg,
    statusAgg,
    priorityAgg,
    trendAgg,
    recentLogs,
  ] = await Promise.all([
    Complaint.countDocuments({}),
    Complaint.countDocuments({ status: { $in: ['Submitted', 'Verified'] } }),
    Complaint.countDocuments({ status: 'Verified' }),
    Complaint.countDocuments({ status: { $in: ['Forwarded', 'Acknowledged', 'In Progress'] } }),
    Complaint.countDocuments({ status: { $in: ['Reported Resolved', 'Verified Resolved'] } }),
    CommunityIssue.countDocuments({}),
    Authority.countDocuments({}),
    Complaint.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    Complaint.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Complaint.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
    Complaint.aggregate([
      {
        $project: {
          ym: { $substrBytes: ['$submittedDate', 0, 7] },
          isResolved: {
            $cond: [{ $in: ['$status', ['Reported Resolved', 'Verified Resolved']] }, 1, 0],
          },
        },
      },
      {
        $group: {
          _id: '$ym',
          submitted: { $sum: 1 },
          resolved: { $sum: '$isResolved' },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]),
    AuditLog.find({}).sort({ createdAt: -1 }).limit(5).select('-__v -ipAddress -metadata').lean(),
  ]);

  const catCountMap = Object.fromEntries(categoryAgg.map((c) => [c._id, c.count]));
  const categoryData = CATEGORIES.map((cat) => {
    const count = catCountMap[cat] || 0;
    const pct = totalReports > 0 ? Math.round((count / totalReports) * 100) : 0;
    return {
      name: cat === 'Roads and Infrastructure' ? 'Roads & Infra' : cat === 'Waste Management' ? 'Waste Mgmt' : cat === 'Drainage and Sanitation' ? 'Drainage' : cat,
      fullName: cat,
      value: pct,
      count,
      color: CATEGORY_CHART_COLORS[cat] || '#CBD5E1',
    };
  });

  const statusCountMap = Object.fromEntries(statusAgg.map((s) => [s._id, s.count]));
  const statusData = COMPLAINT_STATUSES.map((st) => ({
    status: st,
    count: statusCountMap[st] || 0,
    fill: STATUS_CHART_COLORS[st] || '#94A3B8',
  }));

  const priorityCountMap = Object.fromEntries(priorityAgg.map((p) => [p._id, p.count]));
  const priorityData = PRIORITIES.map((p) => ({
    priority: p,
    count: priorityCountMap[p] || 0,
  }));

  const trendData = trendAgg.map((entry) => {
    const parts = String(entry._id || '').split('-');
    const monthIndex = Number(parts[1]) - 1;
    const label = MONTH_NAMES[monthIndex] || entry._id;
    return {
      month: label,
      period: entry._id,
      submitted: entry.submitted,
      resolved: entry.resolved,
    };
  });

  return {
    kpis: {
      totalReports,
      pendingTriage,
      verifiedCount,
      inProgress,
      reportedResolutions,
      recurringIssues,
      authoritiesCount,
    },
    trendData,
    categoryData,
    statusData,
    priorityData,
    recentAuditActivity: recentLogs,
  };
}
