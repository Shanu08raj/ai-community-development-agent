export const ROLES = {
  ADMIN: 'ADMIN',
};

export const ACTIVE_ROLES = [ROLES.ADMIN];

export const CATEGORIES = [
  'Water Supply',
  'Roads and Infrastructure',
  'Waste Management',
  'Drainage and Sanitation',
  'Streetlights',
  'Other',
];

export const AI_DETECTED_CATEGORIES = [...CATEGORIES, 'Out of Scope'];

export const PRIORITIES = ['High', 'Medium', 'Low'];

export const COMPLAINT_STATUSES = [
  'Submitted',
  'Verified',
  'Forwarded',
  'Acknowledged',
  'In Progress',
  'Reported Resolved',
  'Verified Resolved',
];

/**
 * Valid human-supervised lifecycle transitions.
 * Same-status transitions are allowed ONLY when accompanied by a supervisory note.
 * Backward regressions and premature skipping from Submitted directly to Resolved states are blocked.
 */
export const ALLOWED_STATUS_TRANSITIONS = {
  Submitted: ['Submitted', 'Verified', 'Forwarded', 'Acknowledged', 'In Progress'],
  Verified: ['Verified', 'Forwarded', 'Acknowledged', 'In Progress', 'Reported Resolved'],
  Forwarded: ['Forwarded', 'Acknowledged', 'In Progress', 'Reported Resolved'],
  Acknowledged: ['Acknowledged', 'In Progress', 'Reported Resolved'],
  'In Progress': ['In Progress', 'Reported Resolved', 'Verified Resolved'],
  'Reported Resolved': ['Reported Resolved', 'Verified Resolved', 'In Progress'],
  'Verified Resolved': ['Verified Resolved'],
};

export const CLUSTER_REVIEW_STATUSES = [
  'Pending Admin Review',
  'Forwarded to Department',
  'Awaiting Citizen Verification',
  'Verified & Closed',
];

export const AUDIT_ACTIONS = [
  'STATUS_UPDATE',
  'COMMUNITY_CLUSTER_FORWARDED',
  'CITIZEN_SUBMISSION',
  'AI_AUTO_CLASSIFY',
  'ADMIN_NOTE_APPENDED',
  'AUTHORITY_REASSIGNED',
  'DEMO_DATA_RESET',
];

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', rtl: false, implementation: 'implemented' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', rtl: false, implementation: 'implemented' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', rtl: false, implementation: 'implemented' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', rtl: false, implementation: 'implemented' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', rtl: false, implementation: 'planned_fallback' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', rtl: false, implementation: 'planned_fallback' },
  { code: 'as', name: 'Assamese', native: 'অসমীয়া', rtl: false, implementation: 'planned_fallback' },
  { code: 'mni', name: 'Manipuri (Meitei)', native: 'মৈতৈলোন্', rtl: false, implementation: 'planned_fallback' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', rtl: false, implementation: 'planned_fallback' },
  { code: 'brx', name: 'Bodo', native: 'बड़ो', rtl: false, implementation: 'planned_fallback' },
  { code: 'doi', name: 'Dogri', native: 'डोगरी', rtl: false, implementation: 'planned_fallback' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', rtl: false, implementation: 'planned_fallback' },
  { code: 'ks', name: 'Kashmiri', native: 'کٲشُر / कॉशुर', rtl: true, implementation: 'planned_fallback' },
  { code: 'kok', name: 'Konkani', native: 'कोंकणी', rtl: false, implementation: 'planned_fallback' },
  { code: 'mai', name: 'Maithili', native: 'मैथिली', rtl: false, implementation: 'planned_fallback' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', rtl: false, implementation: 'planned_fallback' },
  { code: 'ne', name: 'Nepali', native: 'नेपाली', rtl: false, implementation: 'planned_fallback' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ', rtl: false, implementation: 'planned_fallback' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', rtl: false, implementation: 'planned_fallback' },
  { code: 'sa', name: 'Sanskrit', native: 'संस्कृतम्', rtl: false, implementation: 'planned_fallback' },
  { code: 'sat', name: 'Santali', native: 'ᱥᱟᱱᱛᱟᱲᱤ', rtl: false, implementation: 'planned_fallback' },
  { code: 'sd', name: 'Sindhi', native: 'سنڌي / सिन्धी', rtl: true, implementation: 'planned_fallback' },
  { code: 'ur', name: 'Urdu', native: 'اردو', rtl: true, implementation: 'planned_fallback' },
];

export const LANGUAGE_NAMES = SUPPORTED_LANGUAGES.map((l) => l.name);
export const LANGUAGE_CODES = SUPPORTED_LANGUAGES.map((l) => l.code);
export const AI_LANGUAGE_CODES = [...LANGUAGE_CODES, 'und'];
export const AI_LANGUAGE_NAMES = [...LANGUAGE_NAMES, 'Undetermined'];

export const LANGUAGE_NAME_TO_CODE = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((l) => [l.name, l.code])
);

export const LANGUAGE_CODE_TO_NAME = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((l) => [l.code, l.name])
);

export const CATEGORY_AUTHORITY_MAP = {
  'Water Supply': {
    id: 'AUTH-01',
    name: 'Municipal Water Supply & Sewerage Board',
  },
  'Roads and Infrastructure': {
    id: 'AUTH-02',
    name: 'Public Works Department (PWD - Roads Wing)',
  },
  'Waste Management': {
    id: 'AUTH-03',
    name: 'Solid Waste Management & Sanitation Board',
  },
  Streetlights: {
    id: 'AUTH-04',
    name: 'Municipal City Electrical & Street Lighting Cell',
  },
  'Drainage and Sanitation': {
    id: 'AUTH-05',
    name: 'Drainage & Stormwater Infrastructure Wing',
  },
  Other: {
    id: 'AUTH-06',
    name: 'Department of Public Parks & Urban Horticulture',
  },
};

export const CATEGORY_CHART_COLORS = {
  'Water Supply': '#164DAA',
  'Roads and Infrastructure': '#2563EB',
  'Waste Management': '#3B82F6',
  'Drainage and Sanitation': '#60A5FA',
  Streetlights: '#93C5FD',
  Other: '#CBD5E1',
};

export const STATUS_CHART_COLORS = {
  Submitted: '#94A3B8',
  Verified: '#60A5FA',
  Forwarded: '#3B82F6',
  Acknowledged: '#2563EB',
  'In Progress': '#F59E0B',
  'Reported Resolved': '#10B981',
  'Verified Resolved': '#059669',
};

export const EMERGENCY_GUIDANCE_TEXT =
  'CRITICAL NOTICE: For immediate police, fire, or medical emergencies, please dial 112 directly. JanSetu AI is an independent community intelligence system and does NOT dispatch emergency services.';
