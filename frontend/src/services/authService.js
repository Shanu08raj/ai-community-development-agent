import {
  ADMIN_USER_KEY,
  TOKEN_KEY,
  apiRequest,
  clearAuthSession,
  getStoredToken,
} from './apiClient';

export const authService = {
  async login(email, password, rememberMe = true) {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    const { token, admin } = res.data;
    clearAuthSession();

    const targetStorage = rememberMe ? localStorage : sessionStorage;
    targetStorage.setItem(TOKEN_KEY, token);
    targetStorage.setItem(ADMIN_USER_KEY, JSON.stringify(admin));

    return res.data;
  },

  async verifySession() {
    const res = await apiRequest('/auth/me', {
      method: 'GET',
      requiresAuth: true,
    });
    return res.data;
  },

  getToken() {
    return getStoredToken();
  },

  getStoredAdmin() {
    const raw =
      localStorage.getItem(ADMIN_USER_KEY) || sessionStorage.getItem(ADMIN_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    return Boolean(getStoredToken());
  },

  logout() {
    clearAuthSession();
  },
};
