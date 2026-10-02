import { useLayoutEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { session } from '../lib/api';
import { logout } from '../features/auth/auth';
import { Button, buttonClassName } from '../components/ui/Button';
import { SectionThemeContext, sectionThemeStyle } from '../lib/sectionTheme';
import { useZoneContext } from '../lib/zoneContext';

function backTarget(pathname: string) {
  if (pathname === '/app' || pathname === '/app/settings') return '/app';
  if (pathname.startsWith('/app/food/')) return '/app/food';
  if (pathname.startsWith('/app/films/')) return '/app/films';
  if (pathname.startsWith('/app/how-cook/')) return '/app/how-cook';
  if (pathname.startsWith('/app/why-fun/')) return '/app/why-fun';
  if (pathname.startsWith('/app/when-dates/')) return '/app/when-dates';
  return '/app';
}

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();
  const previousPathname = useRef<string | undefined>(undefined);
  const previousHistoryIndex = useRef<number | undefined>(undefined);
  const user = session.get();
  const zoneContext = useZoneContext();
  const isAdmin = user?.role === 'ADMIN';
  const canManageSection = isAdmin;
  const inFood = location.pathname.startsWith('/app/food');
  const inFilms = location.pathname.startsWith('/app/films');
  const inCook = location.pathname.startsWith('/app/how-cook');
  const inFun = location.pathname.startsWith('/app/why-fun');
  const inDates = location.pathname.startsWith('/app/when-dates');
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
  const isDetail = currentBackTarget !== '/app';

  const section = inFood ? 'food' : inFilms ? 'film' : inCook ? 'cook' : inFun ? 'fun' : inDates ? 'dates' : undefined;
  const sectionShell = section ? `${section}-shell` : '';
  const sectionSettingsLink = inFood ? '/app/food/categories' : inFilms ? '/app/films/platforms' : inFun ? '/app/why-fun/categories' : inDates && isAdmin ? '/app/when-dates/settings' : undefined;
  const outsideSection = !inFood && !inFilms && !inCook && !inFun && !inDates;

  return <SectionThemeContext value={section}>
    <main className={`app-shell ${sectionShell}`} style={section ? sectionThemeStyle(section) : undefined}>
      <header className="app-header">
        <Link className="brand" to="/app" aria-label="WhatPlan, ir al selector">What<span>Plan</span><i>✦</i></Link>
        <label className="zone-filter" aria-label="Filtrar registros por Zona">
          <span>Zona</span>
          <select aria-label="Filtrar por Zona" value={zoneContext.selectedZoneId ?? ''} disabled={zoneContext.loading} onChange={event => zoneContext.selectZone(event.target.value ? Number(event.target.value) : null)}>
            <option value="">Todos</option>
            {zoneContext.zones.map(zone => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
          </select>
        </label>
        <div className="header-actions">
          {(inFood || inFilms || inCook || inFun || inDates) && <>
            <Link className={buttonClassName('icon', 'round round--section-home')} to="/app" aria-label="Cambiar de aplicación" title="Cambiar de aplicación">🏠</Link>
            <Link className={buttonClassName('icon', `round round--back${isDetail ? ' round--back--detail' : ''}`)} to={currentBackTarget} aria-label="Volver" title="Volver">↩️</Link>
          </>}
          {canManageSection && sectionSettingsLink && <Link className={buttonClassName('icon', 'round')} to={sectionSettingsLink} aria-label="Configuración de la sección" title="Configuración de la sección">⚙️</Link>}
          {(!isAdmin || outsideSection) && <Link className={buttonClassName('icon', 'round')} to="/app/settings" aria-label="Configuración" title="Configuración">⚙️</Link>}
          <Button className="avatar" icon="🚪" variant="icon" aria-label={`Cerrar sesión de ${user?.username ?? 'usuario'}`} title="Cerrar sesión" onClick={() => { logout(); navigate('/login'); }} />
        </div>
      </header>
      <div className="page-stage" key={location.pathname}><Outlet /></div>
    </main>
  </SectionThemeContext>;
}
