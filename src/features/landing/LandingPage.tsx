import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

type StoryState = { active: number; progress: number };

const chapters = [
  {
    id: 'wherefood',
    label: 'WhereFood',
    color: '#ff8a00',
    title: 'De “¿dónde comemos?” a un lugar al que quieren volver.',
    description: 'Guarden restaurantes, visitas, fotos y opiniones para que elegir el próximo plan sea parte de la diversión.',
    action: 'Explorar la escena',
  },
  {
    id: 'whichmovie',
    label: 'WhichMovie',
    color: '#b8adff',
    title: 'La próxima película no tiene que perderse entre mil opciones.',
    description: 'Organicen películas, plataformas, géneros y cada vista compartida en una cartelera hecha para ustedes.',
    action: 'Seguir el recorrido',
  },
  {
    id: 'whocook',
    label: 'WhoCook',
    color: '#d4ef55',
    title: 'Las recetas que valen la pena se vuelven parte de la casa.',
    description: 'Guarden ingredientes, pasos y cada cocinada para saber qué quieren repetir la próxima vez.',
    action: 'Entrar a la cocina',
  },
  {
    id: 'whyfun',
    label: 'WhyFun',
    color: '#ffd166',
    title: 'Salir de la rutina también puede quedar guardado.',
    description: 'Registren actividades, horarios, fotos y opiniones de esas salidas que merecen una segunda vuelta.',
    action: 'Buscar una salida',
  },
  {
    id: 'whendates',
    label: 'WhenDates',
    color: '#ff8bca',
    title: 'Algunos planes terminan convirtiéndose en recuerdos.',
    description: 'Reúnan visitas, películas, recetas y salidas alrededor de sus fechas importantes.',
    action: 'Volver a recordar',
  },
] as const;

export function LandingPage() {
  const chapterRefs = useRef<Array<HTMLElement | null>>([]);
  const [story, setStory] = useState<StoryState>({ active: 0, progress: 0 });

  useEffect(() => {
    let frame = 0;
    const updateStory = () => {
      frame = 0;
      const viewportCenter = window.innerHeight * 0.48;
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      chapterRefs.current.forEach((chapter, index) => {
        if (!chapter) return;
        const bounds = chapter.getBoundingClientRect();
        const distance = Math.abs(bounds.top + bounds.height / 2 - viewportCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      const current = chapterRefs.current[closestIndex];
      if (!current) return;
      const bounds = current.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (viewportCenter - bounds.top) / bounds.height + 0.5));
      setStory((previous) => previous.active === closestIndex && Math.abs(previous.progress - progress) < 0.01
        ? previous
        : { active: closestIndex, progress });
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateStory);
    };

    updateStory();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const activeChapter = chapters[story.active];
  const sceneStyle = {
    '--story-progress': story.progress,
    '--scene-accent': activeChapter.color,
  } as CSSProperties;

  return <main className="landing-page">
    <nav className="landing-nav" aria-label="Navegación principal">
      <Link className="landing-brand" to="/" aria-label="WhatPlan, inicio">What<span>Plan</span><i>✦</i></Link>
      <div className="landing-nav__actions">
        <a href="#recorrido">Conocer WhatPlan</a>
        <Link className="landing-nav__login" to="/login">Entrar <span aria-hidden="true">↗</span></Link>
      </div>
    </nav>

    <section className="landing-hero" aria-labelledby="landing-title">
      <div className="landing-hero__copy">
        <p className="landing-kicker">UN RINCÓN PARA SUS PRÓXIMOS PLANES</p>
        <h1 id="landing-title">Lo mejor de un plan es <em>volver a él.</em></h1>
        <p className="landing-hero__intro">WhatPlan reúne los lugares, películas, recetas, salidas y recuerdos que hacen que cada día juntos tenga algo para esperar.</p>
        <div className="landing-hero__actions">
          <Link className="landing-button landing-button--primary" to="/login">Entrar a WhatPlan <span aria-hidden="true">↗</span></Link>
          <a className="landing-button landing-button--quiet" href="#recorrido">Ver cómo funciona <span aria-hidden="true">↓</span></a>
        </div>
      </div>
      <div className="landing-hero__orbit" aria-hidden="true">
        <span className="orbit-dot orbit-dot--food">🍜</span>
        <span className="orbit-dot orbit-dot--film">✦</span>
        <span className="orbit-dot orbit-dot--cook">⌁</span>
        <span className="orbit-dot orbit-dot--fun">+</span>
        <span className="orbit-dot orbit-dot--date">♥</span>
        <div className="orbit-core"><strong>What</strong><b>Plan</b><small>todo lo que quieren hacer</small></div>
      </div>
    </section>

    <section className="landing-story" id="recorrido" aria-label="Recorrido por los módulos de WhatPlan">
      <div className="landing-story__intro">
        <p className="landing-kicker">EL RECORRIDO EMPIEZA ASÍ</p>
        <h2>Un sistema para que elegir también sea un plan.</h2>
      </div>
      <div className="landing-story__grid">
        <div className="landing-chapters">
          {chapters.map((chapter, index) => <article
            className={`landing-chapter${story.active === index ? ' is-active' : ''}`}
            key={chapter.id}
            ref={(element) => { chapterRefs.current[index] = element; }}
            style={{ '--chapter-accent': chapter.color } as CSSProperties}
          >
            <p className="landing-chapter__label"><span>{chapter.label}</span><i>{String(index + 1).padStart(2, '0')}</i></p>
            <h3>{chapter.title}</h3>
            <p>{chapter.description}</p>
            <span className="landing-chapter__action">{chapter.action} <b aria-hidden="true">→</b></span>
            <div className="landing-chapter__mobile-demo"><DemoWindow active={index} progress={0.5} /></div>
          </article>)}
        </div>
        <div className="landing-stage-wrap">
          <div className="landing-stage" style={sceneStyle} aria-live="polite">
            <div className="landing-stage__glow" aria-hidden="true" />
            <DemoWindow active={story.active} progress={story.progress} />
            <div className="demo-caption"><span className="demo-caption__signal" />{activeChapter.label}<b>demo ilustrativa</b></div>
          </div>
        </div>
      </div>
    </section>

    <section className="landing-teaser" aria-labelledby="coming-title">
      <div>
        <p className="landing-kicker">TODO EL SISTEMA, EN UN SOLO RINCÓN</p>
        <h2>Cinco formas de armar un buen día y volver a vivirlo.</h2>
      </div>
      <p>La escena muestra la misma lógica que encontrarán dentro de WhatPlan: catálogo, filtros, fichas y experiencias registradas.</p>
    </section>

    <section className="landing-close" aria-labelledby="close-title">
      <p className="landing-kicker">SU PRÓXIMO PLAN</p>
      <h2 id="close-title">¿Qué hacemos hoy?</h2>
      <Link className="landing-button landing-button--primary" to="/login">Entrar a elegir <span aria-hidden="true">↗</span></Link>
    </section>

    <footer className="landing-footer"><span>WhatPlan</span><p>Hecho para planes que merecen repetirse.</p><Link to="/login">Entrar</Link></footer>
  </main>;
}

function DemoWindow({ active, progress }: { active: number; progress: number }) {
  return <div className="demo-window" style={{ '--scene-tilt': `${(0.5 - progress) * 3}deg` } as CSSProperties}>
    <div className="demo-window__topbar"><div className="demo-window__brand">What<span>Plan</span><i>✦</i></div><div className="demo-window__section">{chapters[active].label}</div><div className="demo-window__actions"><span>⌕</span><span>⚙</span><b>●</b></div></div>
    <div className="demo-window__viewport">
      <FoodDemo active={active === 0} />
      <MovieDemo active={active === 1} />
      <CookDemo active={active === 2} />
      <FunDemo active={active === 3} />
      <DatesDemo active={active === 4} />
    </div>
  </div>;
}

function DemoScene({ active, className, children }: { active: boolean; className: string; children: ReactNode }) {
  return <div className={`demo-scene ${className}${active ? ' is-visible' : ''}`} aria-hidden={!active}>{children}</div>;
}

function DemoHero({ eyebrow, title, description, art }: { eyebrow: string; title: string; description: string; art: ReactNode }) {
  return <div className="demo-experience-hero"><div><small>{eyebrow}</small><h3>{title}</h3><p>{description}</p></div><strong aria-hidden="true">{art}</strong></div>;
}

function DemoControls({ search, chips }: { search: string; chips: string[] }) {
  return <div className="demo-controls"><div className="demo-control-row"><span className="demo-search">⌕ {search}</span><span className="demo-select">Ordenar catálogo⌄</span></div><div className="demo-chips">{chips.map((chip, index) => <span className={index === 0 ? 'is-selected' : ''} key={chip}>{chip}</span>)}</div></div>;
}

function DemoSectionTitle({ eyebrow, title, count }: { eyebrow: string; title: string; count: string }) {
  return <div className="demo-section-title"><div><small>{eyebrow}</small><h4>{title}</h4></div><b>{count}</b></div>;
}

function DemoCard({ theme, media, badge, eyebrow, title, kpi, detail, chips, footer }: { theme: string; media: React.ReactNode; badge: string; eyebrow: string; title: string; kpi: string; detail?: React.ReactNode; chips?: string[]; footer: string }) {
  return <article className={`demo-card demo-card--${theme}`}>
    <div className="demo-card__media">{media}<small>{badge}</small></div>
    <div className="demo-card__body"><div className="demo-card__heading"><div><p>{eyebrow}</p><h5>{title}</h5></div><b>{kpi}</b></div>{detail && <div className="demo-card__detail">{detail}</div>}{chips && <div className="demo-card__chips">{chips.map((chip) => <span key={chip}>{chip}</span>)}</div>}<footer><span>{footer}</span><strong>Ver ficha →</strong></footer></div>
  </article>;
}

function FoodDemo({ active }: { active: boolean }) {
  return <DemoScene active={active} className="demo-scene--food"><DemoHero eyebrow="TU MAPA DEL HAMBRE" title="¿Qué vamos a probar hoy?" description="Tu ranking personal de lugares que sí dan ganas de volver." art="🍜" /><DemoCreate label="Agregar lugar" icon="🍽️" /><DemoControls search="Buscar lugares" chips={['🍽️ Todos', '🍕 Restaurantes', '🔥 Para compartir']} /><DemoSectionTitle eyebrow="POR PROBAR" title="Pendientes para ir" count="Mostrando 2 lugares" /><div className="demo-card-grid demo-card-grid--food"><DemoCard theme="food" media={<div className="demo-media-art demo-media-art--food">🍔</div>} badge="PENDIENTE" eyebrow="Parrilla" title="La Cabrera" kpi="✨ —" detail={<p>Palermo · Para la próxima salida</p>} chips={['🔥 Para compartir', '🥩 Parrilla']} footer="📌 En la lista" /><DemoCard theme="food" media={<div className="demo-media-art demo-media-art--food-alt">✦</div>} badge="4.7/5" eyebrow="Cocina de autor" title="Casa Cavia" kpi="✨ 4.7" detail={<p>★ Visitas y reseñas</p>} footer="★ Visitas y reseñas" /></div></DemoScene>;
}

function MovieDemo({ active }: { active: boolean }) {
  return <DemoScene active={active} className="demo-scene--movie"><DemoHero eyebrow="NUESTRA SALA PERSONAL" title="¿Qué vamos a mirar hoy?" description="Una colección para las películas que todavía esperan y las que ya se quedaron con nosotros." art="🎬" /><DemoCreate label="Agregar película" icon="🎬" /><DemoControls search="Buscar películas" chips={['Todos', '🎭 Drama', '🍿 Netflix']} /><DemoSectionTitle eyebrow="EN LA LISTA" title="Para ver" count="Mostrando 3 películas" /><div className="demo-card-grid demo-card-grid--movie"><DemoCard theme="movie" media={<div className="demo-poster demo-poster--purple"><small>PAST<br />LIVES</small><b>過去</b></div>} badge="PARA VER" eyebrow="PARA VER · 🍿 Netflix" title="Past Lives" kpi="⌛ Pendiente" chips={['Romance', 'Drama']} footer="✦ Sin reseñas" /><DemoCard theme="movie" media={<div className="demo-poster demo-poster--gold"><small>THE<br />MENU</small><b>MENU</b></div>} badge="PARA VER" eyebrow="PARA VER · ◉ Disney+" title="The Menu" kpi="⌛ Pendiente" chips={['Comedia', 'Thriller']} footer="✦ Sin reseñas" /><DemoCard theme="movie" media={<div className="demo-poster demo-poster--blue"><small>PERFECT<br />DAYS</small><b>日々</b></div>} badge="2 VISTAS" eyebrow="VISTA 18/05 · ◉ Mubi" title="Perfect Days" kpi="★ 4.8" chips={['Drama']} footer="💬 2 reseñas en historial" /></div></DemoScene>;
}

function CookDemo({ active }: { active: boolean }) {
  return <DemoScene active={active} className="demo-scene--cook"><DemoHero eyebrow="WHOCOOK · RECETAS PARA REPETIR" title="¿Qué cocinamos hoy?" description="Guarden una receta una vez y registren cada cocinada con sus propios recuerdos." art="🍳" /><DemoCreate label="Agregar receta" icon="🍳" /><DemoControls search="Buscar recetas" chips={['Todas', '🏠 Integrante 1', '🏡 Integrante 2']} /><DemoSectionTitle eyebrow="PARA PROBAR" title="Pendientes para cocinar" count="Mostrando 2 recetas" /><div className="demo-card-grid demo-card-grid--cook"><DemoCard theme="cook" media={<div className="demo-media-art demo-media-art--cook">🍲</div>} badge="6 ingredientes · 4 pasos" eyebrow="PARA PROBAR" title="Ravioles de ricota" kpi="⌛ Pendiente" footer="🏠 Integrante 1" /><DemoCard theme="cook" media={<div className="demo-media-art demo-media-art--cook-alt">🥘</div>} badge="8 ingredientes · 5 pasos" eyebrow="COCINADA" title="Curry de garbanzos" kpi="🍳 2" footer="🏡 Integrante 2" /></div></DemoScene>;
}

function FunDemo({ active }: { active: boolean }) {
  return <DemoScene active={active} className="demo-scene--fun"><DemoHero eyebrow="WHYFUN · SALIDAS PARA REPETIR" title="¿Qué salida repetimos hoy?" description="Guarden actividades y registren cada salida con una fecha, fotos y opiniones compartidas." art="🎲" /><DemoCreate label="Agregar actividad" icon="🎯" /><DemoControls search="Buscar actividades" chips={['Todas', '🎲 Juegos', '🎨 Paseos']} /><DemoSectionTitle eyebrow="PARA HACER" title="Pendientes para salir" count="Mostrando 2 actividades" /><div className="demo-card-grid demo-card-grid--fun"><DemoCard theme="fun" media={<div className="demo-media-art demo-media-art--fun">🎯</div>} badge="🎲 Juegos" eyebrow="EN EQUIPO" title="Escape Room" kpi="⌛ Pendiente" detail={<p>📍 Palermo · Dirección por definir</p>} footer="2 horarios" /><DemoCard theme="fun" media={<div className="demo-media-art demo-media-art--fun-alt">🎟️</div>} badge="🎨 Paseo" eyebrow="PARA DESCUBRIR" title="Feria del libro" kpi="★ 4.8" detail={<p>📍 La Rural · Buenos Aires</p>} footer="1 horario" /></div></DemoScene>;
}

function DatesDemo({ active }: { active: boolean }) {
  return <DemoScene active={active} className="demo-scene--dates"><DemoHero eyebrow="WHENDATES · RECUERDOS COMPARTIDOS" title="¿Qué recordamos hoy?" description="Reunimos las visitas, vistas, cocinadas y salidas que coincidieron con sus fechas importantes." art="💝" /><div className="demo-date-filter"><span>Fecha importante</span><b>Todas las fechas⌄</b></div><DemoSectionTitle eyebrow="RECUERDOS COMPARTIDOS" title="Fechas importantes" count="3 recuerdos" /><div className="demo-card-grid demo-card-grid--dates"><DemoCard theme="dates" media={<div className="demo-date-art"><b>14</b><small>FEB<br />2026</small></div>} badge="14/02/2026" eyebrow="FECHA IMPORTANTE" title="Nuestro aniversario" kpi="Anual" chips={['3 experiencias']} footer="3 experiencias vinculadas" /><DemoCard theme="dates" media={<div className="demo-date-art demo-date-art--alt"><b>08</b><small>MAR<br />2025</small></div>} badge="08/03/2025" eyebrow="FECHA IMPORTANTE" title="Primer viaje" kpi="Única" chips={['2 experiencias']} footer="2 experiencias vinculadas" /></div></DemoScene>;
}

function DemoCreate({ label, icon }: { label: string; icon: string }) {
  return <div className="demo-create"><span>{icon}</span><b><small>NUEVO</small>{label}</b><strong>＋</strong></div>;
}
