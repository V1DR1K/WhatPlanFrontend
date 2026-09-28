import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Modal } from '../src/components/ui/Modal';
import { PhotoViewer } from '../src/components/ui/PhotoViewer';
import { Button } from '../src/components/ui/Button';
import { StarRating } from '../src/components/ui/StarRating';
import { ConfirmDialog } from '../src/components/ui/ConfirmDialog';
import { PhotoManagerModal } from '../src/components/ui/PhotoManagerModal';
import { SectionThemeContext } from '../src/lib/sectionTheme';
import '../src/styles/base.css';
import '../src/styles/global.css';
import '../src/styles/interactions.css';
import '../src/styles/touch.css';
import '../src/styles/media.css';
import '../src/styles/experiences.css';
import '../src/styles/action-buttons.css';
import '../src/styles/catalog-controls.css';
import '../src/styles/special-dates.css';
import '../src/styles/catalog-experience.css';
import '../src/styles/when-dates.css';
import '../src/styles/experience-hero.css';
import '../src/styles/motion.css';
import '../src/styles/loading.css';
import '../src/styles/landing.css';
import '../src/styles/modals.css';

const svg = (hue: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="900"><rect width="1400" height="900" fill="${hue}"/><circle cx="700" cy="450" r="240" fill="#fffaef"/><text x="700" y="485" text-anchor="middle" font-size="70" font-family="sans-serif" fill="#211f21">WhatPlan</text></svg>`)}`;

export function Preview() {
  const [open, setOpen] = useState(true);
  const [rating, setRating] = useState(4);
  const [long, setLong] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const kind = new URLSearchParams(location.search).get('kind') ?? 'review';
  return <SectionThemeContext.Provider value={kind === 'film' ? 'film' : kind === 'recipe' ? 'cook' : 'food'}>
    <main style={{ padding: 32 }}><Button type="button" onClick={() => setOpen(true)}>Abrir diálogo</Button></main>
    {open && kind === 'viewer' && <PhotoViewer photos={[{ src: svg('#a86727'), alt: 'Foto de la visita' }, { src: svg('#684292'), alt: 'Otra foto de la visita' }]} onClose={() => setOpen(false)} />}
    {kind === 'manager' && <PhotoManagerModal mode="gallery" name="la visita" photos={[{ id: 1, url: svg('#a86727'), thumbnailUrl: svg('#a86727'), width: 1400, height: 900, position: 0, createdBy: 'qa', createdAt: '2026-09-27' }, { id: 2, url: svg('#684292'), thumbnailUrl: svg('#684292'), width: 1400, height: 900, position: 1, createdBy: 'qa', createdAt: '2026-09-27' }]} onUpload={async () => {}} />}
    {open && kind === 'stack' && <><Modal size="compact" onClose={() => setOpen(false)}><form onSubmit={(event) => event.preventDefault()}><h2>Editar visita</h2><label>Fecha<input type="date" defaultValue="2026-09-27" /></label><Button type="button" variant="destructive" onClick={() => setConfirming(true)}>Borrar visita</Button></form></Modal>{confirming && <ConfirmDialog title="¿Borrar visita?" message="La visita se eliminará." confirmLabel="Borrar" onClose={() => setConfirming(false)} onConfirm={() => { setConfirming(false); setOpen(false); }} />}</>}
    {open && kind !== 'viewer' && kind !== 'stack' && kind !== 'manager' && <Modal size={kind === 'short' ? 'compact' : 'wide'} onClose={() => setOpen(false)} confirmDiscard>
      <form onSubmit={(event) => event.preventDefault()}>
        <p className="eyebrow">{kind === 'recipe' ? 'EDITAR RECETA' : kind === 'film' ? 'EDITAR RESEÑA' : 'RESEÑA DE LA VISITA'}</p>
        <h2>{kind === 'recipe' ? 'Ajustemos la receta' : kind === 'film' ? 'La película de la noche' : '¿Cómo estuvo?'}</h2>
        <p className="muted">{kind === 'recipe' ? 'Organicen ingredientes y pasos.' : 'La puntuación general es obligatoria. Los detalles son opcionales.'}</p>
        {kind === 'recipe' ? <><label>Nombre<input defaultValue="Pasta con verduras" /></label><label>Fuente<input defaultValue="https://example.com" /></label><fieldset className="ingredient-fields"><legend>Ingredientes</legend>{Array.from({ length: long ? 12 : 2 }, (_, i) => <div className="ingredient-row" key={i}><label>Cantidad<input defaultValue="1" /></label><label>Ingrediente<input defaultValue={`Ingrediente ${i + 1}`} /></label><Button type="button" variant="tertiary">Quitar</Button></div>)}</fieldset><Button type="button" variant="secondary" onClick={() => setLong(true)}>Agregar ingredientes</Button></> : <><label>Puntuación general<StarRating value={rating} onChange={setRating} label="Puntuación" /></label><div className="score-grid"><label>Sabor<StarRating value={4} onChange={() => {}} label="Sabor" /></label><label>Precio<StarRating value={3} onChange={() => {}} label="Precio" /></label></div><label>Comentario<textarea className="review-textarea" defaultValue="Una experiencia que queremos recordar." /></label></>}
        <Button type="submit">Guardar</Button><Button type="button" variant="destructive">Borrar</Button>
      </form>
    </Modal>}
  </SectionThemeContext.Provider>;
}

createRoot(document.getElementById('root')!).render(<Preview />);
