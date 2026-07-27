import { Link } from 'react-router-dom';

export function DashboardPage() {
  return <section className="picks-dashboard">
    <div className="picks-orbit" aria-hidden="true">✨ <span>🍿</span> <b>🍋</b></div>
    <p className="eyebrow">WHATPLAN · NUESTRO RINCÓN</p>
    <h1>Hola Tomás y Avril <span>✨</span><br />¿qué van a</h1> <h1> hacer hoy?</h1>
    <p className="intro">Un lugar para anotar y reseñar todos sus planes</p>
    <div className="module-picker">
      <Link to="/food" className="module-card module-card--food"><div className="module-card__emoji">🍔<span>🍜</span></div><p>DÓNDE COMEMOS</p><h2>where<span>food</span></h2><small>Guarden cada lugar y opinión</small><b>Entrar a saborear →</b></Link>
      <Link to="/films" className="module-card module-card--films"><div className="module-card__emoji">🎬<span>🍿</span></div><p>CUÁL MIRAMOS</p><h2>which<span>movie</span></h2><small>Guarden cada película y sus vistas</small><b>Entrar a la sala →</b></Link>
      <Link to="/how-cook" className="module-card module-card--cook"><div className="module-card__emoji">🍳<span>🥘</span></div><p>QUIÉN COCINA</p><h2>who<span>cook</span></h2><small>Guarden recetas y cada cocinada</small><b>Entrar a la cocina →</b></Link>
      <Link to="/why-fun" className="module-card module-card--fun"><div className="module-card__emoji">🎲<span>🕹️</span></div><p>POR QUÉ DIVERTIRNOS</p><h2>why<span>fun</span></h2><small>Guarden salidas, juegos y experiencias</small><b>Entrar a divertirse →</b></Link>
      <Link to="/when-dates" className="module-card module-card--dates"><div className="module-card__emoji">💝<span>📅</span></div><p>CUÁNDO RECORDAMOS</p><h2>when<span>dates</span></h2><small>Vuelvan a sus fechas importantes</small><b>Entrar a recordar →</b></Link>
    </div>
    <p className="dashboard-foot">Hecho para dos, con hambre y películas de sobra. ♥</p>
  </section>;
}
