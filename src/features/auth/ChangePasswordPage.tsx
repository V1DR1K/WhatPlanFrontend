import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, session } from '../../lib/api';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword.length < 10) return setError('La nueva contraseña debe tener al menos 10 caracteres.');
    if (newPassword !== confirmation) return setError('Las contraseñas no coinciden.');
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const value = session.get();
      if (value) session.set({ ...value, user: { ...value.user, mustChangePassword: false } });
      navigate('/', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cambiar la contraseña.');
    }
  }

  return <main className="login-shell"><form className="login-card" onSubmit={submit}>
    <p className="eyebrow">PRIMER INGRESO</p>
    <h1>Elegí una nueva contraseña</h1>
    <p className="intro">Por seguridad, reemplazá la clave temporal antes de continuar.</p>
    <label>Contraseña actual<input type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} required /></label>
    <label>Nueva contraseña<input type="password" autoComplete="new-password" minLength={10} value={newPassword} onChange={event => setNewPassword(event.target.value)} required /></label>
    <label>Repetir contraseña<input type="password" autoComplete="new-password" minLength={10} value={confirmation} onChange={event => setConfirmation(event.target.value)} required /></label>
    {error && <p className="form-error">{error}</p>}
    <button className="main-button">Cambiar contraseña</button>
  </form></main>;
}
