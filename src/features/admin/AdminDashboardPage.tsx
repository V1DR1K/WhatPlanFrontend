import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useAdminScope } from '../../lib/adminScope';
import {
  createAdminCouple, getAdminAudit, getAdminCouples, getAdminOverview, getAdminUsers,
  updateAdminUserRole, type AdminCouple, type AdminUser,
} from './admin';

type AdminTab = 'couples' | 'users' | 'audit';
const dateTime = (value: string) => new Date(value).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
const activeNames = (couple: AdminCouple) => couple.members.filter(member => member.status === 'ACTIVE').map(member => member.displayName).join(' y ') || 'Sin integrantes activos';

export function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { clearCouple } = useAdminScope();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<AdminTab>(searchParams.get('tab') === 'audit' ? 'audit' : 'couples');
  const [firstMemberUserId, setFirstMemberUserId] = useState('');
  const [auditCoupleId, setAuditCoupleId] = useState(searchParams.get('coupleId') ?? '');
  const overview = useQuery({ queryKey: ['admin', 'overview'], queryFn: getAdminOverview });
  const couples = useQuery({ queryKey: ['admin', 'couples'], queryFn: getAdminCouples, enabled: tab === 'couples' || tab === 'audit' });
  const users = useQuery({ queryKey: ['admin', 'users'], queryFn: getAdminUsers, enabled: tab === 'users' || tab === 'couples' });
  const audit = useQuery({
    queryKey: ['admin', 'audit', auditCoupleId],
    queryFn: () => getAdminAudit({ coupleId: auditCoupleId || undefined, limit: 100 }),
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

  return <section className="settings-page">
    <p className="eyebrow">WHATPLAN · ADMINISTRACIÓN</p>
    <h2>Panel administrativo</h2>
    <p className="intro">Administrá parejas y usuarios, abrí cada espacio y revisá las acciones registradas.</p>
    {overview.data && <div className="settings-grid">
      <section><h3>Parejas</h3><p>{overview.data.couples} en total · {overview.data.activeCouples} activas · {overview.data.pendingCouples} pendientes</p></section>
      <section><h3>Usuarios</h3><p>{overview.data.users} cuentas · {overview.data.activeMembers} integrantes activos</p></section>
    </div>}
    {overview.isError && <p className="form-error" role="alert">{overview.error.message}</p>}
    <nav className="quick-nav chips" aria-label="Secciones administrativas">
      <button type="button" className={tab === 'couples' ? 'active' : ''} onClick={() => setTab('couples')}>💞 Parejas</button>
      <button type="button" className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>👤 Usuarios</button>
      <button type="button" className={tab === 'audit' ? 'active' : ''} onClick={() => setTab('audit')}>🧾 Auditoría</button>
    </nav>

    {tab === 'couples' && <div className="settings-grid">
      <section>
        <h3>Crear pareja</h3>
        <p>Elegí el primer integrante. Después podés sumar otra cuenta desde el detalle.</p>
        <form onSubmit={event => { event.preventDefault(); createCouple.mutate(); }}>
          <label>Primer integrante
            <select value={firstMemberUserId} onChange={event => setFirstMemberUserId(event.target.value)} required>
              <option value="">Elegir usuario</option>
              {selectableUsers.map(user => <option key={user.id} value={user.id}>{user.username} · {user.role}</option>)}
            </select>
          </label>
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
        <div className="category-list">
          {couples.data?.map(couple => <span key={couple.id}>
            <strong>{activeNames(couple)}</strong> · {couple.status} · {couple.members.length} integrantes históricos
            <Button variant="secondary" onClick={() => navigate(`/app/admin/couples/${couple.id}`)}>Administrar</Button>
          </span>)}
          {couples.data?.length === 0 && <p className="empty-state">Todavía no hay parejas.</p>}
        </div>
      </section>
    </div>}

    {tab === 'users' && <section>
      <div className="section-title"><div><p className="eyebrow">CUENTAS</p><h2>Usuarios</h2></div><strong>{users.data?.length ?? 0}</strong></div>
      {users.isLoading && <p className="async-state async-state--loading">Cargando usuarios…</p>}
      {users.isError && <p className="form-error" role="alert">{users.error.message}</p>}
      <div className="category-list">
        {users.data?.map(user => <span key={user.id}>
          <strong>{user.username}</strong> · {user.role} · {user.coupleId ? `Pareja ${user.coupleId.slice(0, 8)}` : 'Sin pareja'} · Alta {dateTime(user.createdAt)}
          <Button variant="tertiary" disabled={changeRole.isPending}
            onClick={() => {
              const role = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
              if (window.confirm(`¿Cambiar ${user.username} al rol ${role}?`)) changeRole.mutate({ userId: user.id, role });
            }}>Pasar a {user.role === 'ADMIN' ? 'USER' : 'ADMIN'}</Button>
        </span>)}
      </div>
      {changeRole.error && <p className="form-error" role="alert">{changeRole.error.message}</p>}
    </section>}

    {tab === 'audit' && <section>
      <div className="section-title"><div><p className="eyebrow">ACTIVIDAD REGISTRADA</p><h2>Auditoría</h2></div><strong>{audit.data?.total ?? 0}</strong></div>
      <label>Filtrar por pareja
        <select value={auditCoupleId} onChange={event => setAuditCoupleId(event.target.value)}>
          <option value="">Todas las parejas</option>
          {couples.data?.map(couple => <option key={couple.id} value={couple.id}>{activeNames(couple)} · {couple.id.slice(0, 8)}</option>)}
        </select>
      </label>
      {audit.isLoading && <p className="async-state async-state--loading">Cargando actividad…</p>}
      {audit.isError && <p className="form-error" role="alert">{audit.error.message}</p>}
      <div className="category-list">
        {audit.data?.entries.map(entry => <span key={entry.id}>
          <strong>{entry.actorUsername}</strong> · {entry.action} · {entry.method} {entry.path} · {entry.status} · {dateTime(entry.occurredAt)}
          {entry.coupleId && <small>Pareja {entry.coupleId.slice(0, 8)}</small>}
        </span>)}
        {audit.data?.entries.length === 0 && <p className="empty-state">No hay acciones para este filtro.</p>}
      </div>
    </section>}
  </section>;
}
