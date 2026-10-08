import { describe, expect, it } from 'vitest';
import { invitationUrl, inviteTokenFromHash, inviteTokenFromLegacyPath, inviteTokenFromState } from './inviteToken';

describe('invitation secrets in browser navigation', () => {
  it('builds a fragment URL so the secret is not sent in the HTTP request path', () => {
    expect(invitationUrl('abc+/=', 'https://whatplan.example')).toBe('https://whatplan.example/#invite=abc%2B%2F%3D');
  });

  it('extracts invite tokens from URL fragments', () => {
    expect(inviteTokenFromHash('#invite=token-123')).toBe('token-123');
    expect(inviteTokenFromHash('#section=about')).toBeNull();
  });

  it('only recovers the exact generated token format from a legacy path', () => {
    const token = 'A'.repeat(43);
    expect(inviteTokenFromLegacyPath(`/invite/${token}`)).toBe(token);
    expect(inviteTokenFromLegacyPath('/invite/token-123')).toBeNull();
    expect(inviteTokenFromLegacyPath(`/invite/${'A'.repeat(44)}`)).toBeNull();
    expect(inviteTokenFromLegacyPath('/invite/%E0%A4%A')).toBeNull();
    expect(inviteTokenFromLegacyPath('/app/invite/' + token)).toBeNull();
  });

  it('accepts only bounded navigation-state tokens', () => {
    expect(inviteTokenFromState({ inviteToken: 'token-123' })).toBe('token-123');
    expect(inviteTokenFromState({ inviteToken: 'x'.repeat(513) })).toBeNull();
    expect(inviteTokenFromState(null)).toBeNull();
  });
});
