import { api, clearMediaCache, normalizeSession, session, type CentralTokenResponse } from '../../lib/api';
import { broadcastPrivateStateEvent, clearPrivateState } from '../../lib/privateState';
import { clearStoredAdminCoupleScope } from '../../lib/adminScopeStorage';

export const login = (username: string, password: string) => api<CentralTokenResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }).then(value => {
  const valueSession = normalizeSession(value);
  clearPrivateState();
  clearMediaCache();
  clearStoredAdminCoupleScope();
  session.set(valueSession);
  broadcastPrivateStateEvent('session-replaced');
  return valueSession;
});

export const register = (username: string, password: string) => api<CentralTokenResponse>('/auth/register', {
  method: 'POST', body: JSON.stringify({ username, password }),
}).then(value => {
  const valueSession = normalizeSession(value);
  clearPrivateState();
  clearMediaCache();
  clearStoredAdminCoupleScope();
  session.set(valueSession);
  broadcastPrivateStateEvent('session-replaced');
  return valueSession;
});

export const logout = async () => {
  try { await api('/auth/logout', { method: 'POST' }); }
  finally {
    clearPrivateState();
    clearMediaCache();
    clearStoredAdminCoupleScope();
    session.clear();
    broadcastPrivateStateEvent('session-ended');
  }
};
