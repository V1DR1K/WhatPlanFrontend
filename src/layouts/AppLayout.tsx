import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { session } from '../lib/api';
import { logout } from '../features/auth/auth';
import { Button, buttonClassName } from '../components/ui/Button';

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = session.get();
  const isAdmin = user?.role === 'ADMIN';
  const canManageSection = isAdmin || user?.username === 'avril';
  const inFood = location.pathname.startsWith('/food');
  const inFilms = location.pathname.startsWith('/films');
  const inCook = location.pathname.startsWith('/how-cook');
  const inFun = location.pathname.startsWith('/why-fun');
  const inDates = location.pathname.startsWith('/when-dates');
  const sectionHome = inFood ? '/food' : inFilms ? '/films' : inCook ? '/how-cook' : inFun ? '/why-fun' : '/when-dates';
  const mobileBackTarget = location.pathname === sectionHome ? '/' : sectionHome;
  const isDetail = location.pathname !== sectionHome;

  const sectionShell = inFood ? 'food-shell' : inFilms ? 'film-shell' : inCook ? 'cook-shell' : inFun ? 'fun-shell' : inDates ? 'dates-shell' : '';
  const sectionSettingsLink = inFood ? '/food/categories' : inFilms ? '/films/platforms' : inFun ? '/why-fun/categories' : inDates && isAdmin ? '/when-dates/settings' : undefined;
  const outsideSection = !inFood && !inFilms && !inCook && !inFun && !inDates;

  return <main className={`app-shell ${sectionShell}`}>
    <header className="app-header">
      <Link className="brand" to="/" aria-label="WhatPlan, ir al selector">What<span>Plan</span><i>✦</i></Link>
      <div className="header-actions">
        {(inFood || inFilms || inCook || inFun || inDates) && <>
          <Link className={buttonClassName('icon', 'round round--section-home')} to="/" aria-label="Cambiar de aplicación" title="Cambiar de aplicación">🏠</Link>
          <Link className={buttonClassName('icon', `round round--back${isDetail ? ' round--back--detail' : ''}`)} to={mobileBackTarget} aria-label="Volver" title="Volver">↩️</Link>
        </>}
        {canManageSection && sectionSettingsLink && <Link className={buttonClassName('icon', 'round')} to={sectionSettingsLink} aria-label="Configuración de la sección" title="Configuración de la sección">⚙️</Link>}
        {isAdmin && outsideSection && <Link className={buttonClassName('icon', 'round')} to="/settings" aria-label="Configuración global" title="Configuración global">⚙️</Link>}
        <Button className="avatar" icon="🚪" variant="icon" aria-label={`Cerrar sesión de ${user?.username ?? 'usuario'}`} title="Cerrar sesión" onClick={() => { logout(); navigate('/login'); }} />
      </div>
    </header>
    <Outlet />
  </main>;
}
