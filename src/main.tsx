import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppRoutes } from './routes/AppRoutes';
import { HeartRain } from './components/HeartRain';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/dm-sans/800.css';
import '@fontsource/dm-mono/400.css';
import '@fontsource/dm-mono/500.css';
import '@fontsource/fraunces/400.css';
import '@fontsource/fraunces/600.css';
import '@fontsource/fraunces/700.css';
import './styles/base.css';
import './styles/global.css';
import './styles/interactions.css';
import './styles/touch.css';
import './styles/media.css';
import './styles/experiences.css';
import './styles/action-buttons.css';
import './styles/catalog-controls.css';
import './styles/special-dates.css';
import './styles/catalog-experience.css';
import './styles/when-dates.css';
import './styles/journey.css';
import './styles/experience-hero.css';
import './styles/motion.css';
import './styles/loading.css';
import './styles/landing.css';
import './styles/modals.css';

function isStandaloneApp() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

// Older installed PWAs keep the start URL captured at installation time.
// Route those installs into the authenticated shell so they can restore the session.
if (window.location.pathname === '/' && isStandaloneApp()) {
  window.history.replaceState(window.history.state, '', `/app${window.location.search}${window.location.hash}`);
}

// A release can remove a lazily loaded, hash-named chunk while a tab is open.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><HeartRain /><AppRoutes /></ErrorBoundary></StrictMode>);
