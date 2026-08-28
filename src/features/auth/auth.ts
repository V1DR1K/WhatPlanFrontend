import { api, clearMediaCache, normalizeSession, session, type CentralTokenResponse } from '../../lib/api';

export const login = (username: string, password: string) => api<CentralTokenResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }).then(value => {
  const valueSession = normalizeSession(value);
  clearMediaCache();
  session.set(valueSession);
  return valueSession;
});

export const logout = () => { clearMediaCache(); session.clear(); };
