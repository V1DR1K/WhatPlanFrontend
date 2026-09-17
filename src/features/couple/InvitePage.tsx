import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { session, api } from '../../lib/api';
import type { CoupleSnapshot } from './couple';

export function InvitePage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const loggedIn = Boolean(session.get());

  async function accept() {
    setPending(true);
    setError('');
    try {
      await api<CoupleSnapshot>(`/couple/invitations/${encodeURIComponent(token)}/accept`, { method: 'POST' });
      navigate('/app', { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos aceptar la invitación.');
    } finally {
      setPending(false);
    }
  }

  if (!loggedIn) return <main className="login-shell"><section className="login-card couple-invite-card"><p className="eyebrow">INVITACIÓN PRIVADA</p><h1>Sumate a su <span>WhatPlan</span></h1><p className="intro">Iniciá sesión o registrate para aceptar la invitación y ver el espacio compartido.</p><Button icon="💞" onClick={() => navigate(`/login?invite=${encodeURIComponent(token)}${searchParams.get('redirect') ? `&redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : ''}`)}>Iniciar sesión</Button></section></main>;
  return <main className="login-shell"><section className="login-card couple-invite-card"><p className="eyebrow">INVITACIÓN PRIVADA</p><h1>Te invitaron a un espacio <span>compartido</span></h1><p className="intro">Al aceptar, vas a poder ver y editar el contenido de esa pareja.</p>{error && <p className="form-error" role="alert">{error}</p>}<Button icon="✅" onClick={() => void accept()} disabled={pending}>{pending ? 'Aceptando…' : 'Aceptar invitación'}</Button></section></main>;
}

