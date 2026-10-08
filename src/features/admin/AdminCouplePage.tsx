import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { SelectField } from '../../components/ui/SelectField';
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
  const [auditActorId, setAuditActorId] = useState('');
  const [auditPage, setAuditPage] = useState(0);
  const couple = useQuery({ queryKey: ['admin', 'couple', id], queryFn: () => getAdminCouple(id), enabled: Boolean(id) });
  const users = useQuery({ queryKey: ['admin', 'users'], queryFn: getAdminUsers });
  const audit = useQuery({
    queryKey: ['admin', 'audit', id, auditActorId, auditPage],
    queryFn: () => getAdminAudit({
      coupleId: id,
      actorId: auditActorId ? Number(auditActorId) : undefined,
      page: auditPage,
      limit: AUDIT_PAGE_SIZE,
    }),
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

  if (couple.isLoading) return <section className="settings-page admin-page"><p className="async-state async-state--loading">Cargando pareja…</p></section>;
  if (couple.isError || !couple.data) return <section className="settings-page admin-page">
    <p className="eyebrow">ADMINISTRACIÓN DE PAREJA</p><h2>No encontramos esa pareja</h2>
    {couple.error && <p className="form-error" role="alert">{couple.error.message}</p>}
    <Button variant="secondary" onClick={() => navigate('/app/admin')}>Volver al panel</Button>
  </section>;

  const value = couple.data;
  const availableUsers = users.data?.filter(user => !user.coupleId) ?? [];
  const coupleUsers = value.members.map(member => ({ value: String(member.userId), label: `${member.displayName} · @${member.username}` }));

  return <section className="settings-page admin-page">
    <p className="eyebrow">ADMINISTRACIÓN DE PAREJA</p>
    <h1>{namesFor(value)}</h1>
    <p className="intro">Estado: {value.status} · Creada {dateTime(value.createdAt)} · ID {value.id}</p>
    <nav className="quick-nav chips admin-tabs" aria-label="Administración de esta pareja">
      <button type="button" aria-pressed={tab === 'members'} className={tab === 'members' ? 'active' : ''} onClick={() => setTab('members')}>👥 Integrantes</button>
      <button type="button" aria-pressed={tab === 'audit'} className={tab === 'audit' ? 'active' : ''} onClick={() => setTab('audit')}>🧾 Auditoría</button>
    </nav>

    {tab === 'members' && <div className="settings-grid">
      <section>
        <h3>Integrantes</h3>
        <ul className="admin-list" aria-label="Integrantes de esta pareja">
          {value.members.map(member => <li className="admin-list__row" key={member.membershipId}>
            <div className="admin-list__copy">
              <strong>{member.displayName}</strong>
              <p>@{member.username} · {member.status === 'ACTIVE' ? 'Activo' : 'Se desvinculó'}</p>
              <small>Alta {dateTime(member.joinedAt)}</small>
            </div>
            <div className="admin-list__actions">
            {member.status === 'ACTIVE' && <>
              <Button variant="tertiary" onClick={() => {
                const nextName = window.prompt('Nombre visible para esta persona', member.displayName);
                if (nextName !== null && nextName.trim() !== member.displayName) renameMember.mutate({ targetId: member.userId, name: nextName });
              }}>Cambiar nombre</Button>
              <Button variant="destructive" onClick={() => {
                if (window.confirm(`¿Quitar a ${member.displayName} de esta pareja?`)) removeMember.mutate(member.userId);
              }}>Quitar</Button>
            </>}
            </div>
          </li>)}
        </ul>
        {value.members.length === 0 && <p className="empty-state">La pareja todavía no tiene integrantes activos ni historial.</p>}
        {value.status !== 'CLOSED' && <Button variant="destructive" onClick={() => {
          if (window.confirm('¿Cerrar esta pareja? Se conservará su historial y dejará de aceptar cambios de contenido.')) close.mutate();
        }} disabled={close.isPending}>{close.isPending ? 'Cerrando…' : 'Cerrar pareja'}</Button>}
        {value.status === 'CLOSED' && <p className="async-state">Esta pareja está cerrada. Al agregar un integrante volverá a quedar pendiente.</p>}
      </section>
      <section>
        <h3>{value.status === 'CLOSED' ? 'Reabrir con un integrante' : 'Sumar integrante'}</h3>
        <p>Solo pueden sumarse cuentas que todavía no pertenezcan a otra pareja activa.</p>
        <form onSubmit={event => { event.preventDefault(); addMember.mutate(); }}>
          <SelectField label="Usuario" value={userId} onValueChange={setUserId} required
            placeholder={availableUsers.length ? 'Elegir usuario' : 'No hay usuarios disponibles'}
            options={availableUsers.map(user => ({ value: String(user.id), label: `${user.username} · ${user.role}` }))}
            disabled={availableUsers.length === 0} />
          <Button icon="➕" disabled={!userId || addMember.isPending}>{addMember.isPending ? 'Sumando…' : 'Sumar integrante'}</Button>
          {addMember.error && <p className="form-error" role="alert">{addMember.error.message}</p>}
        </form>
      </section>
    </div>}

    {tab === 'audit' && <section>
      <div className="section-title"><div><p className="eyebrow">ACCIONES REGISTRADAS</p><h2>Auditoría de la pareja</h2></div><strong>{audit.data?.total ?? 0}</strong></div>
      <div className="admin-filters admin-filters--single">
        <SelectField label="Filtrar por persona" value={auditActorId}
          onValueChange={value => { setAuditActorId(value); setAuditPage(0); }}
          placeholder="Todas las personas" options={coupleUsers} />
      </div>
      {audit.isLoading && <p className="async-state async-state--loading">Cargando actividad…</p>}
      {audit.isError && <p className="form-error" role="alert">{audit.error.message}</p>}
      <ul className="admin-list" aria-label="Auditoría de esta pareja">
        {audit.data?.entries.map(entry => <li className="admin-list__row" key={entry.id}>
          <div className="admin-list__copy">
            <strong>{entry.actorUsername} · {auditActionLabel(entry.action)}</strong>
            <p>{entry.method} {entry.path} · respuesta {entry.status}</p>
            <small>{dateTime(entry.occurredAt)}</small>
          </div>
        </li>)}
      </ul>
      {audit.data?.entries.length === 0 && <p className="empty-state">Todavía no hay acciones registradas para esta pareja.</p>}
      {audit.data && <nav className="quick-nav chips" aria-label="Paginación de auditoría de la pareja">
        <Button variant="secondary" disabled={auditPage === 0 || audit.isFetching} onClick={() => setAuditPage(page => Math.max(0, page - 1))}>← Anterior</Button>
        <span aria-live="polite">Página {audit.data.totalPages === 0 ? 0 : auditPage + 1} de {audit.data.totalPages} · {audit.data.total} acciones</span>
        <Button variant="secondary" disabled={auditPage + 1 >= audit.data.totalPages || audit.isFetching} onClick={() => setAuditPage(page => page + 1)}>Siguiente →</Button>
      </nav>}
    </section>}
    {(removeMember.error || renameMember.error || close.error) && <p className="form-error" role="alert">{(removeMember.error || renameMember.error || close.error)!.message}</p>}
  </section>;
}
