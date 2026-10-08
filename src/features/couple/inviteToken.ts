export type InviteNavigationState = { inviteToken: string };

export function inviteTokenFromState(state: unknown): string | null {
  if (!state || typeof state !== 'object' || !('inviteToken' in state)) return null;
  const token = (state as InviteNavigationState).inviteToken;
  return typeof token === 'string' && token.length > 0 && token.length <= 512 ? token : null;
}

export function inviteTokenFromHash(hash: string): string | null {
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const token = params.get('invite');
  return token && token.length <= 512 ? token : null;
}

export function inviteTokenFromLegacyPath(pathname: string): string | null {
  const match = /^\/invite\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  let token: string;
  try {
    token = decodeURIComponent(match[1]);
  } catch {
    return null;
  }
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

export function invitationUrl(token: string, origin: string): string {
  return `${origin}/#invite=${encodeURIComponent(token)}`;
}
