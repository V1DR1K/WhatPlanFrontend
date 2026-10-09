import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { session } from '../../lib/api';
import { sectionThemeStyle } from '../../lib/sectionTheme';
import { getCouple } from '../couple/couple';

export function DashboardPage() {
  const couple = useQuery({ queryKey: ['couple'], queryFn: getCouple });
  const names = couple.data?.members.map(member => member.displayName).join(' y ') || session.get()?.username || '';
  const canOpenSections = Boolean(couple.data && couple.data.status !== 'NONE' && couple.data.status !== 'CLOSED');
  return <section className="picks-dashboard">
    <div className="picks-orbit" aria-hidden="true">✨ <span>🍿</span> <b>🍋</b></div>
    <p className="eyebrow">WHATPLAN · NUESTRO RINCÓN</p>
      <h1>Hola {names} <span>✨</span><br />¿qué van a hacer hoy?</h1>
    <p className="intro">Un lugar para anotar y reseñar todos sus planes</p>
    {canOpenSections && <div className="module-picker">
      <Link to="/app/food" className="module-card module-card--food"><div className="module-card__emoji">🍔<span>🍜</span></div><p>DÓNDE COMEMOS</p><h2>where<span>food</span></h2><small>Guarden cada lugar y opinión</small><b>Entrar a saborear →</b></Link>
      <Link to="/app/films" className="module-card module-card--films"><div className="module-card__emoji">🎬<span>🍿</span></div><p>CUÁL MIRAMOS</p><h2>which<span>movie</span></h2><small>Guarden cada película y sus vistas</small><b>Entrar a la sala →</b></Link>
      <Link to="/app/how-cook" className="module-card module-card--cook"><div className="module-card__emoji">🍳<span>🥘</span></div><p>QUIÉN COCINA</p><h2>who<span>cook</span></h2><small>Guarden recetas y cada cocinada</small><b>Entrar a la cocina →</b></Link>
      <Link to="/app/why-fun" className="module-card module-card--fun"><div className="module-card__emoji">🎲<span>🕹️</span></div><p>POR QUÉ DIVERTIRNOS</p><h2>why<span>fun</span></h2><small>Guarden salidas, juegos y experiencias</small><b>Entrar a divertirse →</b></Link>
      <Link to="/app/when-dates" className="module-card module-card--dates"><div className="module-card__emoji">💝<span>📅</span></div><p>CUÁNDO RECORDAMOS</p><h2>when<span>dates</span></h2><small>Vuelvan a sus fechas importantes</small><b>Entrar a recordar →</b></Link>
      <Link to="/app/whither-journey" className="module-card module-card--journey" style={sectionThemeStyle('journey')}><div className="module-card__emoji">✈️<span>🎒</span></div><p>ADÓNDE VIAJAMOS</p><h2>whither<span>journey</span></h2><small>Organicen destinos, recorridos y recuerdos</small><b>Preparar nuestro viaje →</b></Link>
    </div>}
    <p className="dashboard-foot">Hecho para dos, con hambre y películas de sobra. ♥</p>
  </section>;
}
