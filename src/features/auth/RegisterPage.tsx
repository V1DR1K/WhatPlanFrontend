import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { inviteTokenFromState } from '../couple/inviteToken';
import { register } from './auth';

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,79}$/;

export function RegisterPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const inviteToken = inviteTokenFromState(location.state);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const normalizedUsername = username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      setError('El usuario debe tener entre 3 y 80 caracteres: letras, números, punto, guion o guion bajo.');
      return;
    }
    if (password.length < 10 || password.length > 128) {
      setError('La contraseña debe tener entre 10 y 128 caracteres.');
      return;
    }
    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setPending(true);
    try {
      await register(normalizedUsername, password);
      navigate(inviteToken ? '/invite' : '/app', {
        replace: true,
        state: inviteToken ? { inviteToken } : undefined,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos crear la cuenta.');
    } finally {
      setPending(false);
    }
  }

  return <main className="login-shell">
    <form className="login-card" onSubmit={submit}>
      <div className="food-orbit" aria-hidden="true">💞 <span>✨</span> 🍿</div>
      <p className="eyebrow">UN ESPACIO PARA COMPARTIR</p>
      <h1>Crear <span>cuenta</span></h1>
      <p className="intro">Elegí un usuario y una contraseña para empezar a guardar sus planes.</p>
      <label>Usuario
        <input value={username} onChange={event => setUsername(event.target.value)} autoComplete="username"
          minLength={3} maxLength={80} pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,79}" required />
      </label>
      <label>Contraseña
        <input type="password" value={password} onChange={event => setPassword(event.target.value)}
          autoComplete="new-password" minLength={10} maxLength={128} required />
      </label>
      <label>Repetí la contraseña
        <input type="password" value={confirmation} onChange={event => setConfirmation(event.target.value)}
          autoComplete="new-password" minLength={10} maxLength={128} required />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <Button icon="✨" disabled={pending}>{pending ? 'Creando cuenta…' : 'Crear cuenta'}</Button>
      <p className="tiny">¿Ya tenés cuenta? <Link to="/login" state={inviteToken ? { inviteToken } : undefined}>Iniciar sesión</Link></p>
    </form>
  </main>;
}
