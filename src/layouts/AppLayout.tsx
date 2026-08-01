import { useLayoutEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { session } from '../lib/api';
import { logout } from '../features/auth/auth';
import { Button, buttonClassName } from '../components/ui/Button';
import { sectionThemeStyle, type SectionId } from '../lib/sectionTheme';

function backTarget(pathname: string) {
  if (pathname === '/' || pathname === '/settings') return '/';
  if (pathname.startsWith('/food/')) return '/food';
  if (pathname.startsWith('/films/')) return '/films';
  if (pathname.startsWith('/how-cook/')) return '/how-cook';
  if (pathname.startsWith('/why-fun/')) return '/why-fun';
  if (pathname.startsWith('/when-dates/')) return '/when-dates';
  return '/';
}

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();
  const previousPathname = useRef<string | undefined>(undefined);
  const previousHistoryIndex = useRef<number | undefined>(undefined);
  const user = session.get();
  const isAdmin = user?.role === 'ADMIN';
  const canManageSection = isAdmin || user?.username === 'avril';
  const inFood = location.pathname.startsWith('/food');
  const inFilms = location.pathname.startsWith('/films');
  const inCook = location.pathname.startsWith('/how-cook');
  const inFun = location.pathname.startsWith('/why-fun');
  const inDates = location.pathname.startsWith('/when-dates');
  useLayoutEffect(() => {
    const origin = previousPathname.current;
    const parent = origin ? backTarget(origin) : undefined;
    const historyIndex = typeof window.history.state?.idx === 'number' ? window.history.state.idx : undefined;
    const isBack = navigationType === 'POP' && (previousHistoryIndex.current === undefined || historyIndex === undefined || historyIndex < previousHistoryIndex.current);
    if (isBack && parent && parent !== location.pathname) {
      navigate(parent, { replace: true });
      return;
    }
    const isNewSection = origin === undefined || origin !== location.pathname;
    const hashTarget = location.hash ? document.getElementById(location.hash.slice(1)) : undefined;
    const frame = window.requestAnimationFrame(() => {
      if (hashTarget) hashTarget.scrollIntoView();
      else if (navigationType === 'POP' || isNewSection) window.scrollTo(0, 0);
    });
    previousPathname.current = location.pathname;
    previousHistoryIndex.current = historyIndex;
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [location.hash, location.pathname, navigate, navigationType]);
  const currentBackTarget = backTarget(location.pathname);
  const isDetail = currentBackTarget !== '/';

  const section = inFood ? 'food' : inFilms ? 'film' : inCook ? 'cook' : inFun ? 'fun' : inDates ? 'dates' : undefined;
  const sectionShell = section ? `${section}-shell` : '';
  const sectionSettingsLink = inFood ? '/food/categories' : inFilms ? '/films/platforms' : inFun ? '/why-fun/categories' : inDates && isAdmin ? '/when-dates/settings' : undefined;
  const outsideSection = !inFood && !inFilms && !inCook && !inFun && !inDates;

  return <main className={`app-shell ${sectionShell}`} style={section ? sectionThemeStyle(section as SectionId) : undefined}>
    <header className="app-header">
      <Link className="brand" to="/" aria-label="WhatPlan, ir al selector">What<span>Plan</span><i>✦</i></Link>
      <div className="header-actions">
        {(inFood || inFilms || inCook || inFun || inDates) && <>
          <Link className={buttonClassName('icon', 'round round--section-home')} to="/" aria-label="Cambiar de aplicación" title="Cambiar de aplicación">🏠</Link>
          <Link className={buttonClassName('icon', `round round--back${isDetail ? ' round--back--detail' : ''}`)} to={currentBackTarget} aria-label="Volver" title="Volver">↩️</Link>
        </>}
        {canManageSection && sectionSettingsLink && <Link className={buttonClassName('icon', 'round')} to={sectionSettingsLink} aria-label="Configuración de la sección" title="Configuración de la sección">⚙️</Link>}
        {isAdmin && outsideSection && <Link className={buttonClassName('icon', 'round')} to="/settings" aria-label="Configuración global" title="Configuración global">⚙️</Link>}
        <Button className="avatar" icon="🚪" variant="icon" aria-label={`Cerrar sesión de ${user?.username ?? 'usuario'}`} title="Cerrar sesión" onClick={() => { logout(); navigate('/login'); }} />
      </div>
    </header>
    <div className="page-stage" key={location.pathname}><Outlet /></div>
  </main>;
}
