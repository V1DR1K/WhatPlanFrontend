import { useLayoutEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { session } from '../lib/api';
import { logout } from '../features/auth/auth';
import { Button, buttonClassName } from '../components/ui/Button';
import { sectionThemeStyle, type SectionId } from '../lib/sectionTheme';

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();
  const scrollPositions = useRef(new Map<string, { left: number; top: number }>());
  const previousPathname = useRef<string | undefined>(undefined);
  const user = session.get();
  const isAdmin = user?.role === 'ADMIN';
  const canManageSection = isAdmin || user?.username === 'avril';
  const inFood = location.pathname.startsWith('/food');
  const inFilms = location.pathname.startsWith('/films');
  const inCook = location.pathname.startsWith('/how-cook');
  const inFun = location.pathname.startsWith('/why-fun');
  const inDates = location.pathname.startsWith('/when-dates');
  useLayoutEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    const storedPosition = window.sessionStorage.getItem(`whatplan-scroll:${location.key}`);
    const position = navigationType === 'POP'
      ? scrollPositions.current.get(location.key) ?? (storedPosition ? JSON.parse(storedPosition) as { left: number; top: number } : undefined)
      : undefined;
    const isNewSection = previousPathname.current === undefined || previousPathname.current !== location.pathname;
    const restore = () => window.scrollTo(position?.left ?? 0, position?.top ?? 0);
    const hashTarget = location.hash ? document.getElementById(location.hash.slice(1)) : undefined;
    const frame = window.requestAnimationFrame(() => {
      if (hashTarget) hashTarget.scrollIntoView();
      else if (navigationType === 'POP') restore();
      else if (isNewSection) window.scrollTo(0, 0);
    });
    const observer = navigationType === 'POP' && position
      ? new ResizeObserver(restore)
      : undefined;
    observer?.observe(document.documentElement);
    const restoreTimeout = observer ? window.setTimeout(() => observer.disconnect(), 800) : undefined;
    previousPathname.current = location.pathname;
    return () => {
      window.cancelAnimationFrame(frame);
      if (restoreTimeout) window.clearTimeout(restoreTimeout);
      observer?.disconnect();
      const currentPosition = { left: window.scrollX, top: window.scrollY };
      scrollPositions.current.set(location.key, currentPosition);
      window.sessionStorage.setItem(`whatplan-scroll:${location.key}`, JSON.stringify(currentPosition));
      window.history.scrollRestoration = previousRestoration;
    };
  }, [location.hash, location.key, location.pathname, navigationType]);
  const sectionHome = inFood ? '/food' : inFilms ? '/films' : inCook ? '/how-cook' : inFun ? '/why-fun' : '/when-dates';
  const mobileBackTarget = location.pathname === sectionHome ? '/' : sectionHome;
  const isDetail = location.pathname !== sectionHome;

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
          <Link className={buttonClassName('icon', `round round--back${isDetail ? ' round--back--detail' : ''}`)} to={mobileBackTarget} aria-label="Volver" title="Volver">↩️</Link>
        </>}
        {canManageSection && sectionSettingsLink && <Link className={buttonClassName('icon', 'round')} to={sectionSettingsLink} aria-label="Configuración de la sección" title="Configuración de la sección">⚙️</Link>}
        {isAdmin && outsideSection && <Link className={buttonClassName('icon', 'round')} to="/settings" aria-label="Configuración global" title="Configuración global">⚙️</Link>}
        <Button className="avatar" icon="🚪" variant="icon" aria-label={`Cerrar sesión de ${user?.username ?? 'usuario'}`} title="Cerrar sesión" onClick={() => { logout(); navigate('/login'); }} />
      </div>
    </header>
    <div className="page-stage" key={location.pathname}><Outlet /></div>
  </main>;
}
