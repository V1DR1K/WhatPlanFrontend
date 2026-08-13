import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';

type StoryState = {
  active: number;
  progress: number;
};

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
];

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
        const center = bounds.top + bounds.height / 2;
        const distance = Math.abs(center - viewportCenter);
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

  const sceneStyle = {
    '--story-progress': story.progress,
    '--scene-accent': chapters[story.active].color,
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
          </article>)}
        </div>
        <div className="landing-stage-wrap">
          <div className="landing-stage" style={sceneStyle} aria-live="polite">
            <div className="landing-stage__glow" aria-hidden="true" />
            <div className="demo-window">
              <div className="demo-window__bar"><span /><span /><span /><b>whatplan / {chapters[story.active].label.toLowerCase()}</b><i>•••</i></div>
              <FoodDemo active={story.active === 0} />
              <MovieDemo active={story.active === 1} />
            </div>
            <div className="demo-caption"><span className="demo-caption__signal" />{chapters[story.active].label}<b>demo ilustrativa</b></div>
          </div>
        </div>
      </div>
    </section>

    <section className="landing-teaser" aria-labelledby="coming-title">
      <div>
        <p className="landing-kicker">Y ESTO RECIÉN EMPIEZA</p>
        <h2 id="coming-title">Después vienen las recetas, las salidas y los recuerdos.</h2>
      </div>
      <p>La primera entrega muestra cómo WhatPlan transforma cada pregunta cotidiana en una historia que pueden guardar.</p>
    </section>

    <section className="landing-close" aria-labelledby="close-title">
      <p className="landing-kicker">SU PRÓXIMO PLAN</p>
      <h2 id="close-title">¿Qué hacemos hoy?</h2>
      <Link className="landing-button landing-button--primary" to="/login">Entrar a elegir <span aria-hidden="true">↗</span></Link>
    </section>

    <footer className="landing-footer"><span>WhatPlan</span><p>Hecho para planes que merecen repetirse.</p><Link to="/login">Entrar</Link></footer>
  </main>;
}

function FoodDemo({ active }: { active: boolean }) {
  return <div className={`demo-screen demo-screen--food${active ? ' is-visible' : ''}`} aria-hidden={!active}>
    <div className="demo-screen__heading"><div><small>DÓNDE COMEMOS</small><h3>Un lugar para volver</h3></div><span>＋</span></div>
    <div className="food-demo__feature"><div className="food-demo__plate">✦</div><div><b>Casa Cavia</b><small>Palermo · Cocina de autor</small><span>★★★★★ <em>4.8</em></span></div><i>Guardado</i></div>
    <div className="food-demo__list"><div><span className="demo-thumb demo-thumb--orange">◌</span><p><b>La Alacena</b><small>Para una cena tranquila</small></p><strong>4.5</strong></div><div><span className="demo-thumb demo-thumb--red">⌁</span><p><b>El Preferido</b><small>Para repetir el domingo</small></p><strong>4.7</strong></div></div>
    <div className="demo-screen__footer"><span>3 lugares guardados</span><b>Ver catálogo →</b></div>
  </div>;
}

function MovieDemo({ active }: { active: boolean }) {
  return <div className={`demo-screen demo-screen--movie${active ? ' is-visible' : ''}`} aria-hidden={!active}>
    <div className="demo-screen__heading"><div><small>CUÁL MIRAMOS</small><h3>Una noche de película</h3></div><span>＋</span></div>
    <div className="movie-demo__poster"><div className="movie-demo__art"><span>THE</span><strong>LOST<br />DAUGHTER</strong><i>una historia para conversar después</i></div><div><b>The Lost Daughter</b><small>Netflix · Drama</small><span>○ Pendiente de ver</span></div></div>
    <div className="movie-demo__queue"><div><span>01</span><p><b>Past Lives</b><small>Romance · 1h 46m</small></p><i>♡</i></div><div><span>02</span><p><b>Perfect Days</b><small>Drama · 2h 3m</small></p><i>♡</i></div></div>
    <div className="demo-screen__footer"><span>12 películas en la lista</span><b>Ver cartelera →</b></div>
  </div>;
}
