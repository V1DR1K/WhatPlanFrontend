import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useAdminScope } from '../../lib/adminScope';
import {
  addAdminCoupleMember, auditActionLabel, closeAdminCouple, getAdminAudit, getAdminCouple, getAdminUsers,
  removeAdminCoupleMember, updateAdminCoupleMemberName, type AdminCouple,
} from './admin';

type DetailTab = 'members' | 'audit';
const AUDIT_PAGE_SIZE = 50;
const dateTime = (value: string) => new Date(value).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
const namesFor = (couple: AdminCouple) => couple.members.filter(member => member.status === 'ACTIVE').map(member => member.displayName).join(' y ') || 'Pareja sin integrantes activos';

export function AdminCouplePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectCouple } = useAdminScope();
  const [tab, setTab] = useState<DetailTab>('members');
  const [userId, setUserId] = useState('');
  const [auditPage, setAuditPage] = useState(0);
  const couple = useQuery({ queryKey: ['admin', 'couple', id], queryFn: () => getAdminCouple(id), enabled: Boolean(id) });
  const users = useQuery({ queryKey: ['admin', 'users'], queryFn: getAdminUsers });
  const audit = useQuery({
    queryKey: ['admin', 'audit', id, auditPage],
    queryFn: () => getAdminAudit({ coupleId: id, page: auditPage, limit: AUDIT_PAGE_SIZE }),
    enabled: tab === 'audit' && Boolean(id),
  });
  const refreshAdmin = () => queryClient.invalidateQueries({ queryKey: ['admin'] });
  const addMember = useMutation({ mutationFn: () => addAdminCoupleMember(id, Number(userId)), onSuccess: refreshAdmin });
  const removeMember = useMutation({ mutationFn: (targetId: number) => removeAdminCoupleMember(id, targetId), onSuccess: refreshAdmin });
  const renameMember = useMutation({
    mutationFn: ({ targetId, name }: { targetId: number; name: string }) => updateAdminCoupleMemberName(id, targetId, name),
    onSuccess: refreshAdmin,
  });
  const close = useMutation({ mutationFn: () => closeAdminCouple(id), onSuccess: refreshAdmin });

  useEffect(() => { if (id) selectCouple(id); }, [id, selectCouple]);

  if (couple.isLoading) return <section className="settings-page"><p className="async-state async-state--loading">Cargando pareja…</p></section>;
  if (couple.isError || !couple.data) return <section className="settings-page">
    <p className="eyebrow">ADMINISTRACIÓN DE PAREJA</p><h2>No encontramos esa pareja</h2>
    {couple.error && <p className="form-error" role="alert">{couple.error.message}</p>}
    <Button variant="secondary" onClick={() => navigate('/app/admin')}>Volver al panel</Button>
  </section>;

  const value = couple.data;
  const availableUsers = users.data?.filter(user => !user.coupleId) ?? [];

  return <section className="settings-page">
    <p className="eyebrow">ADMINISTRACIÓN DE PAREJA</p>
    <h2>{namesFor(value)}</h2>
    <p className="intro">Estado: {value.status} · Creada {dateTime(value.createdAt)} · ID {value.id}</p>
    <nav className="quick-nav chips" aria-label="Administración de esta pareja">
      <button type="button" className={tab === 'members' ? 'active' : ''} onClick={() => setTab('members')}>👥 Integrantes</button>
      <button type="button" className={tab === 'audit' ? 'active' : ''} onClick={() => setTab('audit')}>🧾 Auditoría</button>
    </nav>

    {tab === 'members' && <div className="settings-grid">
      <section>
        <h3>Integrantes</h3>
        <div className="category-list">
          {value.members.map(member => <span key={member.membershipId}>
            <strong>{member.displayName}</strong> · @{member.username} · {member.status} · Alta {dateTime(member.joinedAt)}
            {member.status === 'ACTIVE' && <>
              <Button variant="tertiary" onClick={() => {
                const nextName = window.prompt('Nombre visible para esta persona', member.displayName);
                if (nextName !== null && nextName.trim() !== member.displayName) renameMember.mutate({ targetId: member.userId, name: nextName });
              }}>Cambiar nombre</Button>
              <Button variant="destructive" onClick={() => {
                if (window.confirm(`¿Quitar a ${member.displayName} de esta pareja?`)) removeMember.mutate(member.userId);
              }}>Quitar</Button>
            </>}
          </span>)}
          {value.members.length === 0 && <p className="empty-state">La pareja todavía no tiene integrantes activos ni historial.</p>}
        </div>
        {value.status !== 'CLOSED' && <Button variant="destructive" onClick={() => {
          if (window.confirm('¿Cerrar esta pareja? Se conservará su historial y dejará de aceptar cambios de contenido.')) close.mutate();
        }} disabled={close.isPending}>{close.isPending ? 'Cerrando…' : 'Cerrar pareja'}</Button>}
        {value.status === 'CLOSED' && <p className="async-state">Esta pareja está cerrada. Al agregar un integrante volverá a quedar pendiente.</p>}
      </section>
      <section>
        <h3>{value.status === 'CLOSED' ? 'Reabrir con un integrante' : 'Sumar integrante'}</h3>
        <p>Solo pueden sumarse cuentas que todavía no pertenezcan a otra pareja activa.</p>
        <form onSubmit={event => { event.preventDefault(); addMember.mutate(); }}>
          <label>Usuario
            <select value={userId} onChange={event => setUserId(event.target.value)} required>
              <option value="">Elegir usuario</option>
              {availableUsers.map(user => <option key={user.id} value={user.id}>{user.username} · {user.role}</option>)}
            </select>
          </label>
          <Button icon="➕" disabled={!userId || addMember.isPending}>{addMember.isPending ? 'Sumando…' : 'Sumar integrante'}</Button>
          {addMember.error && <p className="form-error" role="alert">{addMember.error.message}</p>}
        </form>
      </section>
    </div>}

    {tab === 'audit' && <section>
      <div className="section-title"><div><p className="eyebrow">ACCIONES REGISTRADAS</p><h2>Auditoría de la pareja</h2></div><strong>{audit.data?.total ?? 0}</strong></div>
      {audit.isLoading && <p className="async-state async-state--loading">Cargando actividad…</p>}
      {audit.isError && <p className="form-error" role="alert">{audit.error.message}</p>}
      <div className="category-list">
        {audit.data?.entries.map(entry => <span key={entry.id}>
          <strong>{entry.actorUsername}</strong> · {auditActionLabel(entry.action)} · {entry.method} {entry.path} · {entry.status} · {dateTime(entry.occurredAt)}
        </span>)}
        {audit.data?.entries.length === 0 && <p className="empty-state">Todavía no hay acciones registradas para esta pareja.</p>}
      </div>
      {audit.data && <nav className="quick-nav chips" aria-label="Paginación de auditoría de la pareja">
        <Button variant="secondary" disabled={auditPage === 0 || audit.isFetching} onClick={() => setAuditPage(page => Math.max(0, page - 1))}>← Anterior</Button>
        <span aria-live="polite">Página {audit.data.totalPages === 0 ? 0 : auditPage + 1} de {audit.data.totalPages} · {audit.data.total} acciones</span>
        <Button variant="secondary" disabled={auditPage + 1 >= audit.data.totalPages || audit.isFetching} onClick={() => setAuditPage(page => page + 1)}>Siguiente →</Button>
      </nav>}
    </section>}
    {(removeMember.error || renameMember.error || close.error) && <p className="form-error" role="alert">{(removeMember.error || renameMember.error || close.error)!.message}</p>}
  </section>;
}
