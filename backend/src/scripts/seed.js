import path from 'path';
import { fileURLToPath } from 'url';
import { ROLES } from '../config/constants.js';
import connectDB, { disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { Admin } from '../models/Admin.js';
import { AuditLog } from '../models/AuditLog.js';
import { Authority } from '../models/Authority.js';
import { CommunityIssue } from '../models/CommunityIssue.js';
import { Complaint } from '../models/Complaint.js';
import { hashSecret } from '../utils/crypto.js';

const AUTHORITIES_SEED = [
  {
    id: 'AUTH-01',
    name: 'Municipal Water Supply & Sewerage Board',
    department: 'Water Supply',
    jurisdiction: 'Metro Municipal Corporation (All Wards)',
    nodalOfficer: 'Er. Rajesh K. Deshmukh',
    contactPhone: '+91 20 2550 1200 (Sample Demo)',
    contactEmail: 'water.cell@sample-civic.demo.org',
    officeHours: '09:30 AM - 05:30 PM (Mon-Sat)',
    responseTimeAvg: '36 hours',
    activeIssuesCount: 14,
  },
  {
    id: 'AUTH-02',
    name: 'Public Works Department (PWD - Roads Wing)',
    department: 'Roads and Infrastructure',
    jurisdiction: 'Central & Highway Division',
    nodalOfficer: 'Smt. Ananya Sharma',
    contactPhone: '+91 20 2550 2340 (Sample Demo)',
    contactEmail: 'pwd.roads@sample-civic.demo.org',
    officeHours: '10:00 AM - 06:00 PM (Mon-Fri)',
    responseTimeAvg: '72 hours',
    activeIssuesCount: 9,
  },
  {
    id: 'AUTH-03',
    name: 'Solid Waste Management & Sanitation Board',
    department: 'Waste Management',
    jurisdiction: 'North & East Municipal Zones',
    nodalOfficer: 'Dr. Vikramaditya Patil',
    contactPhone: '+91 20 2550 3450 (Sample Demo)',
    contactEmail: 'swm.sanitation@sample-civic.demo.org',
    officeHours: '07:00 AM - 04:00 PM (Daily)',
    responseTimeAvg: '18 hours',
    activeIssuesCount: 7,
  },
  {
    id: 'AUTH-04',
    name: 'Municipal City Electrical & Street Lighting Cell',
    department: 'Streetlights',
    jurisdiction: 'Metropolitan Grid Divisions',
    nodalOfficer: 'Shri Manoj Kulkarni',
    contactPhone: '+91 20 2550 4560 (Sample Demo)',
    contactEmail: 'lighting.cell@sample-civic.demo.org',
    officeHours: '09:00 AM - 05:00 PM (Mon-Sat)',
    responseTimeAvg: '24 hours',
    activeIssuesCount: 5,
  },
  {
    id: 'AUTH-05',
    name: 'Drainage & Stormwater Infrastructure Wing',
    department: 'Drainage and Sanitation',
    jurisdiction: 'Lowland & River Basin Sectors',
    nodalOfficer: 'Er. S. R. Nambiar',
    contactPhone: '+91 20 2550 5670 (Sample Demo)',
    contactEmail: 'drainage.wing@sample-civic.demo.org',
    officeHours: '09:30 AM - 05:30 PM (Mon-Sat)',
    responseTimeAvg: '48 hours',
    activeIssuesCount: 8,
  },
  {
    id: 'AUTH-06',
    name: 'Department of Public Parks & Urban Horticulture',
    department: 'Other',
    jurisdiction: 'Civic Gardens & Public Grounds',
    nodalOfficer: 'Ms. Preeti Verma',
    contactPhone: '+91 20 2550 6780 (Sample Demo)',
    contactEmail: 'parks.horticulture@sample-civic.demo.org',
    officeHours: '09:00 AM - 05:00 PM (Mon-Fri)',
    responseTimeAvg: '5 days',
    activeIssuesCount: 3,
  },
];

const CLUSTERS_SEED = [
  {
    id: 'CI-101',
    title: 'Severe low water pressure and shortage in Ward 12',
    category: 'Water Supply',
    area: 'Ward 12, North Zone',
    relatedReportsCount: 35,
    priority: 'High',
    status: 'In Progress',
    lastUpdated: '2026-11-24',
    aiConfidence: 96,
    recommendedAuthorityCode: 'AUTH-01',
    recommendedAuthority: 'Municipal Water Supply & Sewerage Board',
    reviewStatus: 'Pending Admin Review',
    summary: '35 citizen submissions over 72 hours reporting contaminated muddy water and negligible pressure during scheduled morning hours.',
    impactZones: ['Block A', 'Block B', 'Govind Marg'],
  },
  {
    id: 'CI-102',
    title: 'Extensive road damage and potholes along MG Road corridor',
    category: 'Roads and Infrastructure',
    area: 'Ward 8, Central Division',
    relatedReportsCount: 21,
    priority: 'High',
    status: 'Acknowledged',
    lastUpdated: '2026-11-23',
    aiConfidence: 93,
    recommendedAuthorityCode: 'AUTH-02',
    recommendedAuthority: 'Public Works Department (PWD - Roads Wing)',
    reviewStatus: 'Forwarded to Department',
    summary: 'Recurrent complaints regarding deep asphalt craters causing commuter vehicular damage and recurring traffic bottleneck.',
    impactZones: ['MG Road Cross #4', 'Post Office Junction'],
  },
  {
    id: 'CI-103',
    title: 'Uncollected community dumpster backlog near Sector 5 market',
    category: 'Waste Management',
    area: 'Ward 5, Market Area',
    relatedReportsCount: 18,
    priority: 'Medium',
    status: 'Reported Resolved',
    lastUpdated: '2026-11-22',
    aiConfidence: 90,
    recommendedAuthorityCode: 'AUTH-03',
    recommendedAuthority: 'Solid Waste Management & Sanitation Board',
    reviewStatus: 'Awaiting Citizen Verification',
    summary: 'Waste bin overflow spilling onto pedestrian walkways; municipal clearing vehicle reported dispatched for cleanup.',
    impactZones: ['Subzi Mandi Gate 2', 'Commercial Complex'],
  },
  {
    id: 'CI-104',
    title: 'Multiple non-operational streetlights along Outer Bypass',
    category: 'Streetlights',
    area: 'Ward 10, East Corridor',
    relatedReportsCount: 12,
    priority: 'Medium',
    status: 'In Progress',
    lastUpdated: '2026-11-21',
    aiConfidence: 95,
    recommendedAuthorityCode: 'AUTH-04',
    recommendedAuthority: 'Municipal City Electrical & Street Lighting Cell',
    reviewStatus: 'Pending Admin Review',
    summary: 'Consecutive dark stretch spanning 8 light poles creating safety concerns for night commuters and pedestrians.',
    impactZones: ['Poles 14-22', 'Ring Road Exit'],
  },
  {
    id: 'CI-105',
    title: 'Overflowing storm-drain backflow near Model High School',
    category: 'Drainage and Sanitation',
    area: 'Ward 3, Subhash Nagar',
    relatedReportsCount: 15,
    priority: 'High',
    status: 'Acknowledged',
    lastUpdated: '2026-11-24',
    aiConfidence: 91,
    recommendedAuthorityCode: 'AUTH-05',
    recommendedAuthority: 'Drainage & Stormwater Infrastructure Wing',
    reviewStatus: 'Pending Admin Review',
    summary: 'Stagnant sewage accumulation blocking school access path, raising public health concerns.',
    impactZones: ['School Road', 'Lane 4'],
  },
  {
    id: 'CI-106',
    title: 'Damaged community park boundary wall & exposed playground wiring',
    category: 'Other',
    area: 'Ward 14, Gandhi Nagar',
    relatedReportsCount: 7,
    priority: 'Low',
    status: 'Submitted',
    lastUpdated: '2026-11-19',
    aiConfidence: 85,
    recommendedAuthorityCode: 'AUTH-06',
    recommendedAuthority: 'Department of Public Parks & Urban Horticulture',
    reviewStatus: 'Pending Admin Review',
    summary: 'Broken brick masonry and exposed junction box near children swings requiring preventative maintenance.',
    impactZones: ['South Gate Lawn'],
  },
];

const COMPLAINTS_SEED = [
  {
    id: 'JS-2026-8901',
    trackingCodePlain: 'TRACK-901A',
    title: 'Contaminated tap water with foul smell in Block B',
    description: 'Since Monday morning, tap water delivered to households has visible suspended impurities and a strong sulfur odor.',
    category: 'Water Supply',
    state: 'Maharashtra',
    district: 'Pune',
    area: 'Ward 12',
    priority: 'High',
    status: 'In Progress',
    submittedDate: '2026-11-20',
    preferredLanguage: 'English',
    aiConfidence: 96,
    authorityCode: 'AUTH-01',
    clusterCode: 'CI-101',
    timeline: [
      { status: 'Submitted', date: '2026-11-20 09:30 AM', note: 'Complaint logged through JanSetu AI portal.', updatedBy: 'Public Citizen Portal' },
      { status: 'Verified', date: '2026-11-20 11:15 AM', note: 'Verified by Admin following AI clustering match.', updatedBy: 'Admin Demo (Supervisor)' },
      { status: 'Forwarded', date: '2026-11-21 10:00 AM', note: 'Advisory brief logged for municipal water board review.', updatedBy: 'Admin Demo (Supervisor)' },
      { status: 'Acknowledged', date: '2026-11-22 02:45 PM', note: 'Inspection team scheduled for pipeline review.', updatedBy: 'Admin Demo (Supervisor)' },
      { status: 'In Progress', date: '2026-11-23 09:00 AM', note: 'Pipeline flushing and sample collection underway.', updatedBy: 'Admin Demo (Supervisor)' },
    ],
  },
  {
    id: 'JS-2026-8902',
    trackingCodePlain: 'TRACK-902B',
    title: 'Deep crater pothole near Sector 4 intersection',
    description: 'A 2-foot wide crater has developed after heavy rain, forcing vehicles into oncoming traffic lane.',
    category: 'Roads and Infrastructure',
    state: 'Maharashtra',
    district: 'Pune',
    area: 'Ward 8',
    priority: 'High',
    status: 'Acknowledged',
    submittedDate: '2026-11-21',
    preferredLanguage: 'English',
    aiConfidence: 93,
    authorityCode: 'AUTH-02',
    clusterCode: 'CI-102',
    timeline: [
      { status: 'Submitted', date: '2026-11-21 08:20 AM', note: 'Complaint logged through JanSetu AI portal.', updatedBy: 'Public Citizen Portal' },
      { status: 'Verified', date: '2026-11-21 09:40 AM', note: 'High severity verified by Admin due to vehicular hazard.', updatedBy: 'Admin Demo (Supervisor)' },
      { status: 'Forwarded', date: '2026-11-22 11:30 AM', note: 'Included in Ward 8 road repair advisory batch.', updatedBy: 'Admin Demo (Supervisor)' },
      { status: 'Acknowledged', date: '2026-11-23 04:10 PM', note: 'Asphalt patching vehicle queued in schedule.', updatedBy: 'Admin Demo (Supervisor)' },
    ],
  },
  {
    id: 'JS-2026-8903',
    trackingCodePlain: 'TRACK-903C',
    title: 'Commercial waste bin overflow in Market Sector',
    description: 'Solid waste container not emptied for 4 consecutive days; waste piling on roadside footpath.',
    category: 'Waste Management',
    state: 'Maharashtra',
    district: 'Pune',
    area: 'Ward 5',
    priority: 'Medium',
    status: 'Reported Resolved',
    submittedDate: '2026-11-18',
    preferredLanguage: 'English',
    aiConfidence: 90,
    authorityCode: 'AUTH-03',
    clusterCode: 'CI-103',
    timeline: [
      { status: 'Submitted', date: '2026-11-18 10:00 AM', note: 'Complaint logged by shopkeepers association.', updatedBy: 'Public Citizen Portal' },
      { status: 'Verified', date: '2026-11-18 01:20 PM', note: 'Verified under priority sanitation zone.', updatedBy: 'Admin Demo (Supervisor)' },
      { status: 'Forwarded', date: '2026-11-19 09:30 AM', note: 'Shared with sanitation vehicle route coordinator.', updatedBy: 'Admin Demo (Supervisor)' },
      { status: 'Acknowledged', date: '2026-11-19 11:00 AM', note: 'Route reallocated for midday clearing.', updatedBy: 'Admin Demo (Supervisor)' },
      { status: 'In Progress', date: '2026-11-20 08:00 AM', note: 'Waste compacting truck arrived on site.', updatedBy: 'Admin Demo (Supervisor)' },
      { status: 'Reported Resolved', date: '2026-11-22 03:00 PM', note: 'Bins cleared and surrounding ground disinfected.', updatedBy: 'Admin Demo (Supervisor)' },
    ],
  },
  {
    id: 'JS-2026-8904',
    trackingCodePlain: 'TRACK-904D',
    title: '5 consecutive streetlights flickering and dark at night',
    description: 'Between pole 14 and pole 19 on Outer Bypass, no lights turn on after 7 PM.',
    category: 'Streetlights',
    state: 'Maharashtra',
    district: 'Pune',
    area: 'Ward 10',
    priority: 'Medium',
    status: 'In Progress',
    submittedDate: '2026-11-19',
    preferredLanguage: 'English',
    aiConfidence: 95,
    authorityCode: 'AUTH-04',
    clusterCode: 'CI-104',
    timeline: [
      { status: 'Submitted', date: '2026-11-19 07:45 PM', note: 'Evening commuter submission logged.', updatedBy: 'Public Citizen Portal' },
      { status: 'Verified', date: '2026-11-20 10:15 AM', note: 'Verified and grouped with street lighting reports.', updatedBy: 'Admin Demo (Supervisor)' },
      { status: 'Forwarded', date: '2026-11-21 02:00 PM', note: 'Underground cable line fault logged for lighting cell.', updatedBy: 'Admin Demo (Supervisor)' },
      { status: 'In Progress', date: '2026-11-23 10:30 AM', note: 'Electrical contractor checking junction breaker.', updatedBy: 'Admin Demo (Supervisor)' },
    ],
  },
  {
    id: 'JS-2026-8905',
    trackingCodePlain: 'TRACK-905E',
    title: 'Stormwater drain blockage near Subhash Nagar school',
    description: 'Drain blocked with plastic waste causing black water to pool outside school gate.',
    category: 'Drainage and Sanitation',
    state: 'Maharashtra',
    district: 'Pune',
    area: 'Ward 3',
    priority: 'High',
    status: 'Verified',
    submittedDate: '2026-11-22',
    preferredLanguage: 'English',
    aiConfidence: 91,
    authorityCode: 'AUTH-05',
    clusterCode: 'CI-105',
    timeline: [
      { status: 'Submitted', date: '2026-11-22 09:10 AM', note: 'Citizen submission logged.', updatedBy: 'Public Citizen Portal' },
      { status: 'Verified', date: '2026-11-22 11:30 AM', note: 'Verified by Admin as recurring high-priority health risk.', updatedBy: 'Admin Demo (Supervisor)' },
    ],
  },
  {
    id: 'JS-2026-8906',
    trackingCodePlain: 'TRACK-906F',
    title: 'Broken brick masonry on Gandhi Nagar park boundary',
    description: 'Part of park wall collapsed, leaving uneven bricks and open gap towards busy road.',
    category: 'Other',
    state: 'Maharashtra',
    district: 'Pune',
    area: 'Ward 14',
    priority: 'Low',
    status: 'Submitted',
    submittedDate: '2026-11-23',
    preferredLanguage: 'English',
    aiConfidence: 85,
    authorityCode: 'AUTH-06',
    clusterCode: 'CI-106',
    timeline: [
      { status: 'Submitted', date: '2026-11-23 04:00 PM', note: 'Complaint logged in portal.', updatedBy: 'Public Citizen Portal' },
    ],
  },
  {
    id: 'JS-2026-8907',
    trackingCodePlain: 'TRACK-907G',
    title: 'Low water pressure in 3rd floor apartments',
    description: 'Pumping line lacks requisite bar pressure to reach overhead tanks in the building complex.',
    category: 'Water Supply',
    state: 'Maharashtra',
    district: 'Pune',
    area: 'Ward 12',
    priority: 'Medium',
    status: 'Forwarded',
    submittedDate: '2026-11-21',
    preferredLanguage: 'Hindi',
    aiConfidence: 94,
    authorityCode: 'AUTH-01',
    clusterCode: 'CI-101',
    timeline: [
      { status: 'Submitted', date: '2026-11-21 07:15 AM', note: 'Complaint logged.', updatedBy: 'Public Citizen Portal' },
      { status: 'Verified', date: '2026-11-21 09:00 AM', note: 'Correlated with Ward 12 water shortage issue.', updatedBy: 'Admin Demo (Supervisor)' },
      { status: 'Forwarded', date: '2026-11-22 10:30 AM', note: 'Report noted for local ward water coordinator review.', updatedBy: 'Admin Demo (Supervisor)' },
    ],
  },
  {
    id: 'JS-2026-8908',
    trackingCodePlain: 'TRACK-908H',
    title: 'Uncovered manhole on main bazaar shopping street',
    description: 'Iron cover displaced near the main market intersection creating urgent hazard for pedestrians.',
    category: 'Roads and Infrastructure',
    state: 'Maharashtra',
    district: 'Pune',
    area: 'Ward 5',
    priority: 'High',
    status: 'Verified Resolved',
    submittedDate: '2026-11-15',
    preferredLanguage: 'English',
    aiConfidence: 97,
    authorityCode: 'AUTH-02',
    clusterCode: null,
    timeline: [
      { status: 'Submitted', date: '2026-11-15 08:30 AM', note: 'Urgent pedestrian safety hazard reported.', updatedBy: 'Public Citizen Portal' },
      { status: 'Verified', date: '2026-11-15 09:10 AM', note: 'Verified as high priority by Admin.', updatedBy: 'Admin Demo (Supervisor)' },
      { status: 'Forwarded', date: '2026-11-15 09:30 AM', note: 'Coordinated advisory with emergency road response.', updatedBy: 'Admin Demo (Supervisor)' },
      { status: 'Acknowledged', date: '2026-11-15 10:00 AM', note: 'Temporary barricade placed within 45 mins.', updatedBy: 'Admin Demo (Supervisor)' },
      { status: 'In Progress', date: '2026-11-15 01:00 PM', note: 'Permanent cover installation commenced.', updatedBy: 'Admin Demo (Supervisor)' },
      { status: 'Reported Resolved', date: '2026-11-16 11:00 AM', note: 'Concrete lid fitted and cured.', updatedBy: 'Admin Demo (Supervisor)' },
      { status: 'Verified Resolved', date: '2026-11-17 04:30 PM', note: 'Ward verification confirmed pedestrian safety restored.', updatedBy: 'Admin Demo (Supervisor)' },
    ],
  },
];

const AUDIT_LOGS_SEED = [
  {
    id: 'LOG-301',
    action: 'STATUS_UPDATE',
    complaintId: 'JS-2026-8901',
    previousStatus: 'Acknowledged',
    newStatus: 'In Progress',
    timestamp: '2026-11-24 14:15:22',
    adminUser: 'Admin Demo (Supervisor)',
    note: 'Inspection crew logged pipeline test samples on site.',
  },
  {
    id: 'LOG-302',
    action: 'COMMUNITY_CLUSTER_FORWARDED',
    complaintId: 'JS-2026-8902',
    previousStatus: 'Verified',
    newStatus: 'Acknowledged',
    timestamp: '2026-11-23 16:10:05',
    adminUser: 'Admin Demo (Supervisor)',
    note: 'Merged with Cluster CI-102 and logged dispatch recommendation for PWD.',
  },
  {
    id: 'LOG-303',
    action: 'STATUS_UPDATE',
    complaintId: 'JS-2026-8903',
    previousStatus: 'In Progress',
    newStatus: 'Reported Resolved',
    timestamp: '2026-11-22 15:00:10',
    adminUser: 'Admin Demo (Supervisor)',
    note: 'Marked reported resolved following cleanup photo confirmation.',
  },
  {
    id: 'LOG-304',
    action: 'STATUS_UPDATE',
    complaintId: 'JS-2026-8908',
    previousStatus: 'Reported Resolved',
    newStatus: 'Verified Resolved',
    timestamp: '2026-11-17 16:30:44',
    adminUser: 'Admin Demo (Supervisor)',
    note: 'Citizen confirmation threshold reached for safe closure.',
  },
];

export async function seedDatabase({ dbName } = {}) {
  if (env.NODE_ENV === 'production') {
    throw new Error('Development seed script must not be executed in production environment.');
  }

  await connectDB({ dbName, exitOnError: false });

  // 1. Seed single MVP Admin account cleanly
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin.demo@jansetu.local').toLowerCase().trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'demo123456';

  let admin = await Admin.findOne({ email: adminEmail });
  if (!admin) {
    const passwordHash = await hashSecret(adminPassword);
    admin = await Admin.create({
      email: adminEmail,
      passwordHash,
      fullName: 'Admin Demo (Supervisor)',
      role: ROLES.ADMIN,
      department: 'Supervisory Desk',
      isActive: true,
    });
  }

  // 2. Seed Authorities idempotently
  const authorityMap = {};
  for (const authData of AUTHORITIES_SEED) {
    const doc = await Authority.findOneAndUpdate(
      { id: authData.id },
      { $setOnInsert: authData },
      { upsert: true, returnDocument: 'after' }
    );
    authorityMap[doc.id] = doc;
  }

  // 3. Seed Community Issue Clusters idempotently
  const clusterMap = {};
  for (const clusterData of CLUSTERS_SEED) {
    const { recommendedAuthorityCode, ...rest } = clusterData;
    const authDoc = authorityMap[recommendedAuthorityCode] || null;
    const doc = await CommunityIssue.findOneAndUpdate(
      { id: rest.id },
      {
        $setOnInsert: {
          ...rest,
          recommendedAuthorityId: authDoc?._id || null,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );
    clusterMap[doc.id] = doc;
  }

  // 4. Seed Initial Complaints idempotently (hash tracking codes!)
  for (const item of COMPLAINTS_SEED) {
    const existing = await Complaint.findOne({ id: item.id });
    if (existing) continue;

    const authDoc = authorityMap[item.authorityCode] || null;
    const clusterDoc = item.clusterCode ? clusterMap[item.clusterCode] : null;
    const trackingCodeHash = await hashSecret(item.trackingCodePlain);

    const created = await Complaint.create({
      id: item.id,
      trackingCodeHash,
      title: item.title,
      description: item.description,
      category: item.category,
      state: item.state,
      district: item.district,
      area: item.area,
      preferredLanguage: item.preferredLanguage,
      contactInfo: 'Anonymous Demo Citizen',
      priority: item.priority,
      status: item.status,
      submittedDate: item.submittedDate,
      clusterId: clusterDoc?.id || null,
      clusterRef: clusterDoc?._id || null,
      assignedAuthorityId: item.status !== 'Submitted' ? authDoc?._id || null : null,
      recommendedAuthority: authDoc?.name || '',
      aiAnalysis: {
        confidence: item.aiConfidence,
        detectedLanguage: item.preferredLanguage,
        detectedLanguageCode: item.preferredLanguage === 'Hindi' ? 'hi' : 'en',
        languageConfidence: 96,
        detectedCategory: item.category,
        detectedPriority: item.priority,
        priorityReason: `Classified under ${item.category} triage rubric.`,
        recommendedAuthorityId: authDoc?._id || null,
        recommendedAuthorityCode: authDoc?.id || null,
        recommendedAuthorityName: authDoc?.name || '',
        isDuplicate: Boolean(clusterDoc),
        suggestedClusterId: clusterDoc?.id || null,
        relatedClusterId: clusterDoc?._id || null,
        sanitizedSummary: item.title,
        isOutOfScope: false,
        engineUsed: 'rule-fallback',
        needsHumanReview: item.status === 'Submitted',
        evaluatedAt: new Date(),
      },
      timeline: item.timeline,
    });

    if (clusterDoc) {
      await CommunityIssue.updateOne(
        { _id: clusterDoc._id },
        { $addToSet: { memberComplaintIds: created._id } }
      );
    }
  }

  // 5. Seed Audit Logs idempotently (using append-only create since AuditLog is immutable)
  for (const log of AUDIT_LOGS_SEED) {
    const exists = await AuditLog.exists({ id: log.id });
    if (!exists) {
      await AuditLog.create({
        ...log,
        adminId: admin._id,
      });
    }
  }

  return {
    adminEmail,
    authoritiesCount: await Authority.countDocuments(),
    clustersCount: await CommunityIssue.countDocuments(),
    complaintsCount: await Complaint.countDocuments(),
    auditLogsCount: await AuditLog.countDocuments(),
  };
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  seedDatabase()
    .then(async (summary) => {
      console.log('Seed completed cleanly:', JSON.stringify(summary));
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Seed failed:', err.message);
      await disconnectDB();
      process.exit(1);
    });
}
