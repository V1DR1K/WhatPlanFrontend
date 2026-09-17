import { api, clearMediaCache, normalizeSession, session, type CentralTokenResponse } from '../../lib/api';

export const login = (username: string, password: string) => api<CentralTokenResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }).then(value => {
  const valueSession = normalizeSession(value);
  clearMediaCache();
  session.set(valueSession);
  return valueSession;
});

export const logout = async () => {
  try { await api('/auth/logout', { method: 'POST' }); } finally {
    clearMediaCache();
    session.clear();
  }
};
