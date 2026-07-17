import { StrictMode } from 'react'; import { createRoot } from 'react-dom/client'; import { AppRoutes } from './routes/AppRoutes'; import { HeartRain } from './components/HeartRain'; import './styles/base.css';

createRoot(document.getElementById('root')!).render(<StrictMode><HeartRain /><AppRoutes /></StrictMode>);
