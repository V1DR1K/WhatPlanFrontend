import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { session } from '../../lib/api';
import { acceptInvitation } from './couple';
import { inviteTokenFromState } from './inviteToken';

export function InvitePage({ initialToken = null }: { initialToken?: string | null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationToken = inviteTokenFromState(location.state);
  const inviteToken = navigationToken ?? initialToken ?? '';
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const loggedIn = Boolean(session.get());

  async function accept() {
    setPending(true);
    setError('');
    try {
      await acceptInvitation(inviteToken);
      navigate('/app', { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos aceptar la invitación.');
    } finally {
      setPending(false);
    }
  }

  if (!inviteToken) return <main className="login-shell"><section className="login-card couple-invite-card"><h1>Esta invitación no está disponible</h1><p className="intro">El enlace puede haber vencido o estar incompleto. Pedile a tu pareja que genere uno nuevo.</p><Button variant="secondary" onClick={() => navigate('/', { replace: true })}>Volver al inicio</Button></section></main>;
  if (!loggedIn) return <main className="login-shell"><section className="login-card"><p className="eyebrow">INVITACIÓN PRIVADA</p><h1>Sumate a su <span>WhatPlan</span></h1><p className="intro">Iniciá sesión o creá tu cuenta para aceptar la invitación y ver el espacio compartido.</p><Button icon="💞" onClick={() => navigate('/login', { state: { inviteToken } })}>Iniciar sesión</Button><p className="tiny">¿Todavía no tenés cuenta? <Link to="/register" state={{ inviteToken }}>Crear cuenta</Link></p></section></main>;
  return <main className="login-shell"><section className="login-card couple-invite-card"><p className="eyebrow">INVITACIÓN PRIVADA</p><h1>Te invitaron a un espacio <span>compartido</span></h1><p className="intro">Al aceptar, vas a poder ver y editar el contenido de esa pareja.</p>{error && <p className="form-error" role="alert">{error}</p>}<Button icon="✅" onClick={() => void accept()} disabled={pending}>{pending ? 'Aceptando…' : 'Aceptar invitación'}</Button></section></main>;
}

