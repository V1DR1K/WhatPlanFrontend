import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppRoutes } from './routes/AppRoutes';
import { HeartRain } from './components/HeartRain';
import './styles/base.css';
import './styles/global.css';
import './styles/interactions.css';
import './styles/touch.css';
import './styles/media.css';
import './styles/experiences.css';
import './styles/action-buttons.css';

createRoot(document.getElementById('root')!).render(<StrictMode><HeartRain /><AppRoutes /></StrictMode>);
