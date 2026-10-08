const KEY = 'whatplan.admin-couple-scope';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let volatileScope: string | null = null;

export function getAdminCoupleScope() {
  if (typeof window === 'undefined') return volatileScope;
  try {
    const value = sessionStorage.getItem(KEY);
    if (value && UUID_PATTERN.test(value)) return value;
  } catch {
    return volatileScope;
  }
  return volatileScope;
}

export function storeAdminCoupleScope(coupleId: string | null) {
  volatileScope = coupleId && UUID_PATTERN.test(coupleId) ? coupleId : null;
  if (typeof window === 'undefined') return;
  try {
    if (volatileScope) sessionStorage.setItem(KEY, volatileScope);
    else sessionStorage.removeItem(KEY);
  } catch { /* The scope is also held in memory for the active view. */ }
}

export function clearStoredAdminCoupleScope() {
  volatileScope = null;
  try { if (typeof window !== 'undefined') sessionStorage.removeItem(KEY); } catch { /* Ignore unavailable browser storage. */ }
}
