import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { showNotice } from '../../lib/flash';
import { createCouple, createInvitation, getCouple, invitationUrl, leaveCouple, revokeInvitation } from './couple';

const coupleQueryKey = ['couple'];

function memberNames(members: { displayName: string }[]) {
  return members.map((member) => member.displayName).join(' y ');
}

export function CouplePanel({ compact = false }: { compact?: boolean }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: coupleQueryKey, queryFn: getCouple });
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: coupleQueryKey });
  const create = useMutation({ mutationFn: createCouple, onSuccess: invalidate });
  const invite = useMutation({
    mutationFn: createInvitation,
    onSuccess: (value) => {
      setInviteToken(value.token ?? null);
      void invalidate();
    },
  });
  const revoke = useMutation({ mutationFn: (id: number) => revokeInvitation(id), onSuccess: () => { setInviteToken(null); void invalidate(); } });
  const leave = useMutation({ mutationFn: leaveCouple, onSuccess: () => { setInviteToken(null); void invalidate(); } });

  if (query.isLoading) return <section className="couple-panel couple-panel--loading" aria-busy="true"><p className="eyebrow">PAREJA</p><p>Preparando su espacio…</p></section>;
  if (query.isError) return <section className="couple-panel"><p className="form-error" role="alert">{query.error.message}</p></section>;

  const couple = query.data;
  if (!couple) return null;
  if (couple.status === 'NONE' || couple.status === 'CLOSED') return <section className={`couple-panel ${compact ? 'couple-panel--compact' : ''}`}>
    <p className="eyebrow">SU ESPACIO PRIVADO</p>
    <h2>Armen su pareja</h2>
    <p>Creá un espacio privado para compartir planes. Después podés invitar a la otra persona con un enlace de un solo uso.</p>
    <Button icon="💞" onClick={() => create.mutate()} disabled={create.isPending}>{create.isPending ? 'Creando…' : 'Crear pareja'}</Button>
    {create.error && <p className="form-error" role="alert">{create.error.message}</p>}
  </section>;

  const link = inviteToken ? invitationUrl(inviteToken) : null;
  const names = memberNames(couple.members) || 'su pareja';
  return <section className={`couple-panel couple-panel--${couple.status.toLowerCase()} ${compact ? 'couple-panel--compact' : ''}`}>
    <div className="couple-panel__heading"><div><p className="eyebrow">PAREJA · {couple.status === 'PENDING' ? 'PENDIENTE' : 'ACTIVA'}</p><h2>{names}</h2></div><span className="couple-panel__status" aria-label={couple.status === 'PENDING' ? 'Falta un integrante' : 'Dos integrantes'}>{couple.status === 'PENDING' ? '1 / 2' : '2 / 2'}</span></div>
    {couple.status === 'PENDING' ? <>
      <p>Tu espacio ya está listo. Invitá a la otra persona para empezar a compartir todo lo que suban.</p>
      {link ? <div className="couple-invite-link"><input aria-label="Enlace de invitación" readOnly value={link} onFocus={(event) => event.currentTarget.select()} /><Button variant="secondary" onClick={() => { void navigator.clipboard?.writeText(link); showNotice('Copiamos el enlace de invitación.'); }}>Copiar</Button></div> : <Button icon="🔗" onClick={() => invite.mutate()} disabled={invite.isPending}>{invite.isPending ? 'Generando…' : 'Generar invitación'}</Button>}
      {couple.pendingInvitation && <div className="couple-panel__actions"><small>La invitación vence el {new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(new Date(couple.pendingInvitation.expiresAt))}.</small><button type="button" className="text-button" onClick={() => revoke.mutate(couple.pendingInvitation!.id)} disabled={revoke.isPending}>Revocar</button></div>}
    </> : <p>Todo lo que guarden queda visible solamente para los integrantes de esta pareja: {names}.</p>}
    <button type="button" className="text-button couple-panel__leave" onClick={() => { if (window.confirm('¿Querés desvincularte? El histórico se conserva, pero perderás acceso a esta pareja.')) leave.mutate(); }} disabled={leave.isPending}>{leave.isPending ? 'Desvinculando…' : 'Desvincularme'}</button>
    {(invite.error || revoke.error || leave.error) && <p className="form-error" role="alert">{(invite.error || revoke.error || leave.error)!.message}</p>}
  </section>;
}
