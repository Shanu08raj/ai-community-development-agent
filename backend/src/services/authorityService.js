import { CATEGORY_AUTHORITY_MAP } from '../config/constants.js';
import { Authority } from '../models/Authority.js';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listAuthorities(filters = {}) {
  const { department, search } = filters;
  const query = {};

  if (department && department !== 'All') {
    query.department = department;
  }

  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    query.$or = [{ name: rx }, { department: rx }, { jurisdiction: rx }, { nodalOfficer: rx }];
  }

  return Authority.find(query).sort({ id: 1 }).select('-__v').lean();
}

export async function resolveAuthorityForCategory(category, preferredAuthorityId = null) {
  if (preferredAuthorityId) {
    const byId = await Authority.findOne({ id: preferredAuthorityId }).lean();
    if (byId) return byId;
  }

  const mapped = CATEGORY_AUTHORITY_MAP[category] || CATEGORY_AUTHORITY_MAP.Other;
  const dbAuth =
    (await Authority.findOne({ id: mapped.id }).lean()) ||
    (await Authority.findOne({ department: category }).lean());

  if (dbAuth) return dbAuth;

  return {
    _id: null,
    id: mapped.id,
    name: mapped.name,
    department: category,
  };
}
