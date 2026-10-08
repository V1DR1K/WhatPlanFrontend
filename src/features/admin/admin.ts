import { api } from '../../lib/api';

export type AdminMember = {
  membershipId: number;
  userId: number;
  username: string;
  displayName: string;
  slot: number;
  status: 'ACTIVE' | 'LEFT';
  joinedAt: string;
  leftAt: string | null;
};

export type AdminCouple = {
  id: string;
  status: 'PENDING' | 'ACTIVE' | 'CLOSED';
  originCityId: number;
  createdBy: string | null;
  createdAt: string;
  closedAt: string | null;
  members: AdminMember[];
};

export type AdminUser = {
  id: number;
  username: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  coupleId: string | null;
  coupleStatus: string | null;
};

export type AdminOverview = {
  users: number;
  couples: number;
  activeCouples: number;
  pendingCouples: number;
  closedCouples: number;
  activeMembers: number;
};

export type AuditEntry = {
  id: number;
  actorUserId: number;
  actorUsername: string;
  coupleId: string | null;
  action: string;
  method: string;
  path: string;
  status: number;
  occurredAt: string;
};

export type AuditPage = { entries: AuditEntry[]; total: number; page: number; limit: number; totalPages: number };

const AUDIT_ACTION_LABELS: Record<string, string> = {
  API_MUTATION: 'Cambio en datos',
  COUPLE_CREATED: 'Pareja creada',
  COUPLE_MEMBER_ADDED: 'Integrante agregado',
  COUPLE_REOPENED_MEMBER_ADDED: 'Pareja reabierta e integrante agregado',
  COUPLE_MEMBER_REMOVED: 'Integrante desvinculado',
  COUPLE_MEMBER_RENAMED: 'Nombre visible cambiado',
  COUPLE_CLOSED: 'Pareja cerrada',
  USER_ROLE_CHANGED: 'Rol de usuario cambiado',
};

export const auditActionLabel = (action: string) => AUDIT_ACTION_LABELS[action]
  ?? action.replaceAll('_', ' ').toLocaleLowerCase('es-AR');

export const getAdminOverview = () => api<AdminOverview>('/admin/overview');
export const getAdminCouples = () => api<AdminCouple[]>('/admin/couples');
export const getAdminCouple = (id: string) => api<AdminCouple>(`/admin/couples/${id}`);
export const createAdminCouple = (firstMemberUserId: number) => api<AdminCouple>('/admin/couples', {
  method: 'POST', body: JSON.stringify({ firstMemberUserId }),
});
export const addAdminCoupleMember = (coupleId: string, userId: number) => api<AdminCouple>(`/admin/couples/${coupleId}/members`, {
  method: 'POST', body: JSON.stringify({ userId }),
});
export const updateAdminCoupleMemberName = (coupleId: string, userId: number, displayName: string) => api<AdminCouple>(`/admin/couples/${coupleId}/members/${userId}`, {
  method: 'PATCH', body: JSON.stringify({ displayName }),
});
export const removeAdminCoupleMember = (coupleId: string, userId: number) => api<AdminCouple>(`/admin/couples/${coupleId}/members/${userId}`, {
  method: 'DELETE',
});
export const closeAdminCouple = (coupleId: string) => api<AdminCouple>(`/admin/couples/${coupleId}/close`, { method: 'POST' });
export const getAdminUsers = () => api<AdminUser[]>('/admin/users');
export const updateAdminUserRole = (userId: number, role: AdminUser['role']) => api<AdminUser>(`/admin/users/${userId}/role`, {
  method: 'PATCH', body: JSON.stringify({ role }),
});
export const getAdminAudit = (filters: { coupleId?: string; actorId?: number; page?: number; limit?: number } = {}) => {
  const params = new URLSearchParams();
  if (filters.coupleId) params.set('coupleId', filters.coupleId);
  if (filters.actorId) params.set('actorId', String(filters.actorId));
  if (filters.page !== undefined) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  return api<AuditPage>(`/admin/audit${params.size ? `?${params}` : ''}`);
};
