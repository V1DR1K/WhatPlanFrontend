import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { inviteTokenFromState } from '../couple/inviteToken';
import { login } from './auth';

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const inviteToken = inviteTokenFromState(location.state);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      await login(username, password);
      navigate(inviteToken ? '/invite' : '/app', {
        replace: true,
        state: inviteToken ? { inviteToken } : undefined,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Error al iniciar sesión.');
    } finally {
      setPending(false);
    }
  }

  return <main className="login-shell">
    <form className="login-card" onSubmit={submit}>
      <div className="food-orbit" aria-hidden="true">🍔 <span>🍿</span> 🎬</div>
      <p className="eyebrow">EL RINCÓN DE USTEDES DOS</p>
      <h1>What<span>Plan</span></h1>
      <p className="intro">Lugares para saborear y películas para recordar, todo en un mismo rincón. ✨</p>
      <label>Usuario
        <input value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" required />
      </label>
      <label>Contraseña
        <input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <Button icon="🔐" disabled={pending}>{pending ? 'Ingresando…' : 'Entrar a elegir'}</Button>
      <p className="tiny">¿Primera vez? <Link to="/register" state={inviteToken ? { inviteToken } : undefined}>Crear cuenta</Link></p>
    </form>
  </main>;
}
