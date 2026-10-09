import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { showNotice } from '../../lib/flash';
import { createCouple, createInvitation, getCouple, invitationUrl, leaveCouple, revokeInvitation } from './couple';

const coupleQueryKey = ['couple'];
type Member = { displayName: string };

function memberNames(members: Member[]) {
  return members.map(member => member.displayName).join(' y ');
}

export function CouplePanel({ compact = false, showLeaveAction = false }: { compact?: boolean; showLeaveAction?: boolean }) {
  const stateClass = compact ? 'dashboard-couple' : 'async-state';
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: coupleQueryKey, queryFn: getCouple });
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const invitationInput = useRef<HTMLInputElement>(null);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: coupleQueryKey });
  const create = useMutation({ mutationFn: createCouple, onSuccess: invalidate });
  const invite = useMutation({
    mutationFn: createInvitation,
    onSuccess: value => { setInviteToken(value.token ?? null); void invalidate(); },
  });
  const revoke = useMutation({
    mutationFn: (id: number) => revokeInvitation(id),
    onSuccess: () => { setInviteToken(null); void invalidate(); },
  });
  const leave = useMutation({ mutationFn: leaveCouple, onSuccess: () => {
    setInviteToken(null);
    window.location.assign('/app');
  }, onError: () => setConfirmingLeave(false) });

  if (query.isLoading) return <section className={`${stateClass} ${stateClass}--loading`} aria-busy="true">
    <p className="eyebrow">PAREJA</p><p>Preparando su espacio…</p>
  </section>;
  if (query.isError) return <section className={`${stateClass} ${stateClass}--error`} role="alert"><p>{query.error.message}</p></section>;

  const couple = query.data;
  if (compact && couple && couple.status !== 'NONE' && couple.status !== 'CLOSED') return null;
  if (!couple || couple.status === 'NONE' || couple.status === 'CLOSED') return <section className={stateClass}>
    <p className="eyebrow">SU ESPACIO PRIVADO</p>
    <h2>Armen su pareja</h2>
    <p>Creá un espacio privado para compartir planes. Después podés invitar a la otra persona con un enlace de un solo uso.</p>
    <Button icon="💞" onClick={() => create.mutate()} disabled={create.isPending}>
      {create.isPending ? 'Creando…' : 'Crear pareja'}
    </Button>
    {create.error && <p className="form-error" role="alert">{create.error.message}</p>}
  </section>;

  const link = inviteToken ? invitationUrl(inviteToken) : null;
  const names = memberNames(couple.members) || 'su pareja';
  const compactTitle = compact ? 'section-title section-title--compact' : 'section-title';

  async function copyInvitation() {
    if (!link) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('El portapapeles no está disponible');
      await navigator.clipboard.writeText(link);
      showNotice('Copiamos el enlace de invitación.');
    } catch {
      invitationInput.current?.select();
      showNotice('Seleccionamos el enlace para que puedas copiarlo.');
    }
  }

  return <section className={stateClass}>
    <div className={`${compactTitle} section-title--with-actions`}>
      <div><p className="eyebrow">PAREJA · {couple.status === 'PENDING' ? 'PENDIENTE' : 'ACTIVA'}</p><h2>{names}</h2></div>
      <span>{couple.status === 'PENDING' ? '1 / 2' : '2 / 2'}</span>
    </div>
    {couple.status === 'PENDING' ? <>
      <p>Tu espacio ya está listo. Invitá a la otra persona para empezar a compartir todo lo que suban.</p>
      {link ? <div className="section-title section-title--with-actions">
        <label className="inline-form">Enlace de invitación
          <input ref={invitationInput} aria-label="Enlace de invitación" readOnly value={link}
            onFocus={event => event.currentTarget.select()} />
        </label>
        <Button variant="secondary" onClick={() => void copyInvitation()}>Copiar enlace</Button>
      </div> : <Button icon="🔗" onClick={() => invite.mutate()} disabled={invite.isPending}>
        {invite.isPending ? 'Generando…' : 'Generar invitación'}
      </Button>}
      {couple.pendingInvitation && <p className="tiny">La invitación vence el {new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(new Date(couple.pendingInvitation.expiresAt))}.</p>}
      {couple.pendingInvitation && <button type="button" className="text-button"
        onClick={() => revoke.mutate(couple.pendingInvitation!.id)} disabled={revoke.isPending}>Revocar invitación</button>}
    </> : <p>Todo lo que guarden queda visible solamente para los integrantes de esta pareja: {names}.</p>}
    {showLeaveAction && <Button type="button" variant="destructive" onClick={() => setConfirmingLeave(true)} disabled={leave.isPending}>
      Desvincularme
    </Button>}
    {(invite.error || revoke.error || leave.error) && <p className="form-error" role="alert">{(invite.error || revoke.error || leave.error)!.message}</p>}
    {confirmingLeave && <ConfirmDialog
      title="Desvincularme de esta pareja"
      message="El histórico se conserva, pero vas a perder acceso a este espacio compartido."
      confirmLabel="Desvincularme"
      pending={leave.isPending}
      onClose={() => setConfirmingLeave(false)}
      onConfirm={() => leave.mutate()}
    />}
  </section>;
}
