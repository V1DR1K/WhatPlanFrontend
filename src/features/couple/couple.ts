import { api } from '../../lib/api';
import { broadcastPrivateStateEvent, clearPrivateState } from '../../lib/privateState';
import { invitationUrl as buildInvitationUrl } from './inviteToken';

export type CoupleMember = {
  id: number;
  userId: number;
  displayName: string;
  username: string;
  current: boolean;
};

export type CoupleInvitation = {
  id: number;
  token?: string | null;
  expiresAt: string;
};

export type CoupleSnapshot = {
  id: string | null;
  status: 'NONE' | 'PENDING' | 'ACTIVE' | 'CLOSED' | string;
  members: CoupleMember[];
  pendingInvitation?: CoupleInvitation | null;
};

export function getCouple() {
  return api<CoupleSnapshot>('/couple');
}
export function createCouple() {
  return api<CoupleSnapshot>('/couples', { method: 'POST' });
}
export function createInvitation() {
  return api<CoupleInvitation>('/couple/invitations', { method: 'POST' });
}

export function revokeInvitation(id: number) {
  return api<void>(`/couple/invitations/${id}`, { method: 'DELETE' });
}

export function acceptInvitation(token: string) {
  return api<CoupleSnapshot>('/couple/invitations/accept', { method: 'POST', body: JSON.stringify({ token }) }).then((result) => {
    clearPrivateState();
    broadcastPrivateStateEvent('membership-changed');
    return result;
  });
}

export function leaveCouple() {
  return api<void>('/couple/leave', { method: 'POST' }).then(() => {
    clearPrivateState();
    broadcastPrivateStateEvent('membership-changed');
  });
}

export function invitationUrl(token: string) {
  return buildInvitationUrl(token, window.location.origin);
}
