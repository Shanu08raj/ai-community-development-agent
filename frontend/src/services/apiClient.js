const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

function normalizeBaseUrl(rawUrl) {
  const cleaned = String(rawUrl).replace(/\/+$/, '');
  if (cleaned.endsWith('/api')) {
    return `${cleaned}/v1`;
  }
  return cleaned;
}

export const API_BASE_URL = normalizeBaseUrl(RAW_API_URL);

export const TOKEN_KEY = 'jansetu_admin_token';
export const ADMIN_USER_KEY = 'jansetu_admin_user';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_USER_KEY);
}

export class ApiClientError extends Error {
  constructor(status, code, message, details = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest(path, options = {}) {
  const {
    method = 'GET',
    body,
    query,
    requiresAuth = false,
    onUnauthorized,
  } = options;

  let url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (query && typeof query === 'object') {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '' && value !== 'All') {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const headers = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (requiresAuth) {
    const token = getStoredToken();
    if (!token) {
      if (onUnauthorized) onUnauthorized();
      throw new ApiClientError(401, 'UNAUTHORIZED', 'Administrator sign-in is required.');
    }
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiClientError(
      0,
      'NETWORK_ERROR',
      'Unable to reach the JanSetu backend server. Please verify the backend service is running.'
    );
  }

  let json;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok || (json && json.success === false)) {
    const errCode = json?.error?.code || 'REQUEST_FAILED';
    const errMsg = json?.error?.message || `Request failed with status ${response.status}.`;
    const errDetails = json?.error?.details || [];

    if (response.status === 401 && requiresAuth) {
      clearAuthSession();
      if (onUnauthorized) onUnauthorized();
    }

    throw new ApiClientError(response.status, errCode, errMsg, errDetails);
  }

  return json;
}
