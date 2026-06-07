import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config';

const ACCESS_KEY = 'bcim_access_token';
const REFRESH_KEY = 'bcim_refresh_token';

// Module-level handler called when a token refresh fails (signals AuthContext to sign out)
let _onUnauthorized = null;
export function setUnauthorizedHandler(handler) {
  _onUnauthorized = handler;
}

// Refresh lock — prevents multiple simultaneous refresh requests
let _refreshPromise = null;

async function tryRefreshTokens() {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token available');
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) throw new Error('Token refresh failed');
      const payload = await res.json();
      const newAccess = payload.accessToken || payload.token;
      const newRefresh = payload.refreshToken;
      await saveTokens(newAccess, newRefresh);
      return newAccess;
    } finally {
      _refreshPromise = null;
    }
  })();
  return _refreshPromise;
}

export async function saveTokens(accessToken, refreshToken) {
  if (accessToken) await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
  if (refreshToken) await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_KEY);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

function normalizePayload(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.data || payload?.items || payload?.projects || payload?.rows || payload || [];
}

export async function apiRequest(path, options = {}) {
  const token = await getAccessToken();
  const headers = {
    Accept: 'application/json',
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {})
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body && !(options.body instanceof FormData) ? JSON.stringify(options.body) : options.body
  });

  // Token expired — attempt silent refresh then retry once
  if (response.status === 401 && !options._skipRefresh) {
    try {
      await tryRefreshTokens();
      return apiRequest(path, { ...options, _skipRefresh: true });
    } catch (_) {
      await clearTokens();
      if (_onUnauthorized) _onUnauthorized();
      const err = new Error('Session expired. Please log in again.');
      err.status = 401;
      throw err;
    }
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (_) {
      payload = { message: text.slice(0, 180) };
    }
  }

  if (!response.ok) {
    const error = new Error(payload?.error || payload?.message || `Request failed: ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function login(email, password) {
  const payload = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password }
  });
  const accessToken = payload.accessToken || payload.token;
  const refreshToken = payload.refreshToken;
  await saveTokens(accessToken, refreshToken);
  return { user: payload.user, accessToken, refreshToken };
}

export async function logout() {
  const refreshToken = await getRefreshToken();
  try {
    if (refreshToken) {
      await apiRequest('/auth/logout', { method: 'POST', body: { refreshToken } });
    }
  } catch (_) {
    // Local logout should still happen even if the backend is unreachable.
  }
  await clearTokens();
}

export async function me() {
  return apiRequest('/auth/me');
}

export async function listProjects() {
  return normalizePayload(await apiRequest('/projects'));
}

export async function listByProject(path, projectId, extra = {}) {
  const params = new URLSearchParams({ project_id: projectId, ...extra });
  return normalizePayload(await apiRequest(`${path}?${params.toString()}`));
}

export async function getEssSummary(month, year) {
  const params = new URLSearchParams({ month, year });
  return apiRequest(`/ess/summary?${params.toString()}`);
}

export async function listEssAttendance(month, year) {
  const params = new URLSearchParams({ month, year });
  return normalizePayload(await apiRequest(`/ess/attendance?${params.toString()}`));
}

export async function submitAttendanceCorrection(data) {
  return apiRequest('/ess/attendance/corrections', { method: 'POST', body: data });
}

export async function listAttendanceCorrections() {
  return normalizePayload(await apiRequest('/ess/attendance/corrections'));
}

export async function listEssLeaveBalances(year) {
  const params = new URLSearchParams({ year });
  return normalizePayload(await apiRequest(`/ess/leave/balances?${params.toString()}`));
}

export async function listEssLeaveRequests() {
  return normalizePayload(await apiRequest('/ess/leave/requests'));
}

export async function submitEssLeaveRequest(data) {
  return apiRequest('/ess/leave/requests', { method: 'POST', body: data });
}

export async function cancelEssLeaveRequest(id) {
  return apiRequest(`/ess/leave/requests/${id}/cancel`, { method: 'PATCH' });
}

export async function listEssPayslips() {
  return normalizePayload(await apiRequest('/ess/payslips'));
}

export async function getEssPayslip(id) {
  return apiRequest(`/ess/payslips/${id}`);
}

export async function listEssNotifications() {
  return normalizePayload(await apiRequest('/ess/notifications'));
}

export async function listEssDocuments() {
  return normalizePayload(await apiRequest('/ess/documents'));
}

export async function uploadEssDocument(formData) {
  return apiRequest('/ess/documents', { method: 'POST', body: formData });
}

export async function listEssOnboarding() {
  return normalizePayload(await apiRequest('/ess/onboarding'));
}

export async function updateEssOnboardingItem(id, data = {}) {
  return apiRequest(`/ess/onboarding/${id}`, { method: 'PATCH', body: data });
}

export async function registerNotificationDevice(token, platform = 'android') {
  return apiRequest('/notifications/devices', { method: 'POST', body: { token, platform, enabled: true } });
}

export async function listManagerLeaveRequests(status = 'pending') {
  const params = new URLSearchParams({ status });
  return normalizePayload(await apiRequest(`/ess/manager/leave-requests?${params.toString()}`));
}

export async function actionManagerLeaveRequest(id, action, data = {}) {
  return apiRequest(`/ess/manager/leave-requests/${id}/${action}`, { method: 'PATCH', body: data });
}

export async function listManagerAttendanceCorrections(status = 'pending') {
  const params = new URLSearchParams({ status });
  return normalizePayload(await apiRequest(`/ess/manager/attendance-corrections?${params.toString()}`));
}

export async function actionManagerAttendanceCorrection(id, action, data = {}) {
  return apiRequest(`/ess/manager/attendance-corrections/${id}/${action}`, { method: 'PATCH', body: data });
}

export async function lookupAssetByCode(code) {
  const params = new URLSearchParams({ code });
  return apiRequest(`/ess/assets/lookup?${params.toString()}`);
}

export { normalizePayload };
