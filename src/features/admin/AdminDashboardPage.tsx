import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { SelectField } from '../../components/ui/SelectField';
import { useAdminScope } from '../../lib/adminScope';
import {
  auditActionLabel, createAdminCouple, getAdminAudit, getAdminCouples, getAdminOverview, getAdminUsers,
  updateAdminUserRole, type AdminCouple, type AdminUser,
} from './admin';

type AdminTab = 'couples' | 'users' | 'audit';
const AUDIT_PAGE_SIZE = 50;
const dateTime = (value: string) => new Date(value).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
const activeNames = (couple: AdminCouple) => couple.members.filter(member => member.status === 'ACTIVE').map(member => member.displayName).join(' y ') || 'Sin integrantes activos';
const coupleStatus = (status: AdminCouple['status']) => ({ ACTIVE: 'Activa', PENDING: 'Pendiente', CLOSED: 'Cerrada' })[status];

export function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { clearCouple } = useAdminScope();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<AdminTab>(searchParams.get('tab') === 'audit' ? 'audit' : 'couples');
  const [firstMemberUserId, setFirstMemberUserId] = useState('');
  const [auditCoupleId, setAuditCoupleId] = useState(searchParams.get('coupleId') ?? '');
  const [auditActorId, setAuditActorId] = useState('');
  const [auditPage, setAuditPage] = useState(0);
  const overview = useQuery({ queryKey: ['admin', 'overview'], queryFn: getAdminOverview });
  const couples = useQuery({ queryKey: ['admin', 'couples'], queryFn: getAdminCouples, enabled: tab === 'couples' || tab === 'audit' });
  const users = useQuery({ queryKey: ['admin', 'users'], queryFn: getAdminUsers, enabled: tab === 'users' || tab === 'couples' || tab === 'audit' });
  const audit = useQuery({
    queryKey: ['admin', 'audit', auditCoupleId, auditActorId, auditPage],
    queryFn: () => getAdminAudit({
      coupleId: auditCoupleId || undefined,
      actorId: auditActorId ? Number(auditActorId) : undefined,
      page: auditPage,
      limit: AUDIT_PAGE_SIZE,
    }),
    enabled: tab === 'audit',
  });
  const createCouple = useMutation({
    mutationFn: () => createAdminCouple(Number(firstMemberUserId)),
    onSuccess: async couple => {
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      setFirstMemberUserId('');
      navigate(`/app/admin/couples/${couple.id}`);
    },
  });
  const changeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: AdminUser['role'] }) => updateAdminUserRole(userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });

  useEffect(() => { clearCouple(); }, [clearCouple]);

  const selectableUsers = users.data?.filter(user => !user.coupleId) ?? [];
  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'couples', label: '💞 Parejas' },
    { id: 'users', label: '👤 Usuarios' },
    { id: 'audit', label: '🧾 Auditoría' },
  ];

  return <section className="settings-page admin-page" aria-labelledby="admin-title">
    <p className="eyebrow">WHATPLAN · ADMINISTRACIÓN</p>
    <h1 id="admin-title">Panel administrativo</h1>
    <p className="intro">Administrá parejas y usuarios, abrí cada espacio y revisá las acciones registradas.</p>
    {overview.data && <div className="settings-grid admin-overview" aria-label="Resumen de WhatPlan">
      <section><h3>Parejas</h3><p><strong>{overview.data.couples}</strong> en total · {overview.data.activeCouples} activas · {overview.data.pendingCouples} pendientes</p></section>
      <section><h3>Usuarios</h3><p><strong>{overview.data.users}</strong> cuentas · {overview.data.activeMembers} integrantes activos</p></section>
    </div>}
    {overview.isError && <p className="form-error" role="alert">{overview.error.message}</p>}
    <nav className="quick-nav chips admin-tabs" aria-label="Secciones administrativas">
      {tabs.map(item => <button key={item.id} type="button" aria-pressed={tab === item.id}
        className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{item.label}</button>)}
    </nav>

    {tab === 'couples' && <div className="settings-grid">
      <section>
        <h3>Crear pareja</h3>
        <p>Elegí el primer integrante. Después podés sumar otra cuenta desde el detalle.</p>
        <form onSubmit={event => { event.preventDefault(); createCouple.mutate(); }}>
          <SelectField label="Primer integrante" value={firstMemberUserId} onValueChange={setFirstMemberUserId}
            placeholder={selectableUsers.length ? 'Elegir usuario' : 'No hay usuarios disponibles'}
            options={selectableUsers.map(user => ({ value: String(user.id), label: `${user.username} · ${user.role}` }))}
            required disabled={selectableUsers.length === 0} />
          <Button icon="➕" disabled={!firstMemberUserId || createCouple.isPending}>
            {createCouple.isPending ? 'Creando…' : 'Crear pareja'}
          </Button>
          {createCouple.error && <p className="form-error" role="alert">{createCouple.error.message}</p>}
        </form>
      </section>
      <section>
        <h3>Parejas registradas</h3>
        {couples.isLoading && <p className="async-state async-state--loading">Cargando parejas…</p>}
        {couples.isError && <p className="form-error" role="alert">{couples.error.message}</p>}
        <ul className="admin-list" aria-label="Parejas registradas">
          {couples.data?.map(couple => <li className="admin-list__row" key={couple.id}>
            <div className="admin-list__copy">
              <strong>{activeNames(couple)}</strong>
              <p><span className="admin-status">{coupleStatus(couple.status)}</span> · {couple.members.length} integrantes históricos</p>
              <small>Creada {dateTime(couple.createdAt)} · ID {couple.id.slice(0, 8)}</small>
            </div>
            <Button variant="secondary" onClick={() => navigate(`/app/admin/couples/${couple.id}`)}>Administrar</Button>
          </li>)}
        </ul>
        {couples.data?.length === 0 && <p className="empty-state">Todavía no hay parejas.</p>}
      </section>
    </div>}

    {tab === 'users' && <section>
      <div className="section-title"><div><p className="eyebrow">CUENTAS</p><h2>Usuarios</h2></div><strong>{users.data?.length ?? 0}</strong></div>
      {users.isLoading && <p className="async-state async-state--loading">Cargando usuarios…</p>}
      {users.isError && <p className="form-error" role="alert">{users.error.message}</p>}
      <ul className="admin-list" aria-label="Usuarios registrados">
        {users.data?.map(user => <li className="admin-list__row" key={user.id}>
          <div className="admin-list__copy">
            <strong>{user.username}</strong>
            <p><span className="admin-status">{user.role}</span> · {user.coupleId ? `Pareja ${user.coupleId.slice(0, 8)}` : 'Sin pareja'}</p>
            <small>Alta {dateTime(user.createdAt)}</small>
          </div>
          <Button variant="tertiary" disabled={changeRole.isPending}
            onClick={() => {
              const role = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
              if (window.confirm(`¿Cambiar ${user.username} al rol ${role}?`)) changeRole.mutate({ userId: user.id, role });
            }}>Pasar a {user.role === 'ADMIN' ? 'USER' : 'ADMIN'}</Button>
        </li>)}
      </ul>
      {changeRole.error && <p className="form-error" role="alert">{changeRole.error.message}</p>}
    </section>}

    {tab === 'audit' && <section>
      <div className="section-title"><div><p className="eyebrow">ACTIVIDAD REGISTRADA</p><h2>Auditoría</h2></div><strong>{audit.data?.total ?? 0}</strong></div>
      <div className="admin-filters">
        <SelectField label="Filtrar por pareja" value={auditCoupleId}
          onValueChange={value => { setAuditCoupleId(value); setAuditPage(0); }}
          placeholder="Todas las parejas"
          options={(couples.data ?? []).map(couple => ({ value: couple.id, label: `${activeNames(couple)} · ${couple.id.slice(0, 8)}` }))} />
        <SelectField label="Filtrar por persona" value={auditActorId}
          onValueChange={value => { setAuditActorId(value); setAuditPage(0); }}
          placeholder="Todas las personas"
          options={(users.data ?? []).map(user => ({ value: String(user.id), label: user.username }))} />
      </div>
      {audit.isLoading && <p className="async-state async-state--loading">Cargando actividad…</p>}
      {audit.isError && <p className="form-error" role="alert">{audit.error.message}</p>}
      <ul className="admin-list" aria-label="Acciones de auditoría">
        {audit.data?.entries.map(entry => <li className="admin-list__row" key={entry.id}>
          <div className="admin-list__copy">
            <strong>{entry.actorUsername} · {auditActionLabel(entry.action)}</strong>
            <p>{entry.method} {entry.path} · respuesta {entry.status}</p>
            <small>{dateTime(entry.occurredAt)}{entry.coupleId ? ` · Pareja ${entry.coupleId.slice(0, 8)}` : ''}</small>
          </div>
        </li>)}
      </ul>
      {audit.data?.entries.length === 0 && <p className="empty-state">No hay acciones para este filtro.</p>}
      {audit.data && <nav className="quick-nav chips" aria-label="Paginación de auditoría">
        <Button variant="secondary" disabled={auditPage === 0 || audit.isFetching} onClick={() => setAuditPage(page => Math.max(0, page - 1))}>← Anterior</Button>
        <span aria-live="polite">Página {audit.data.totalPages === 0 ? 0 : auditPage + 1} de {audit.data.totalPages} · {audit.data.total} acciones</span>
        <Button variant="secondary" disabled={auditPage + 1 >= audit.data.totalPages || audit.isFetching} onClick={() => setAuditPage(page => page + 1)}>Siguiente →</Button>
      </nav>}
    </section>}
  </section>;
}
