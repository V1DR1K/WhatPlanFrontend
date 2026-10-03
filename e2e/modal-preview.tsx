import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Modal } from '../src/components/ui/Modal';
import { PhotoViewer } from '../src/components/ui/PhotoViewer';
import { Button } from '../src/components/ui/Button';
import { StarRating } from '../src/components/ui/StarRating';
import { ConfirmDialog } from '../src/components/ui/ConfirmDialog';
import { PhotoManagerModal } from '../src/components/ui/PhotoManagerModal';
import { SectionThemeContext } from '../src/lib/sectionTheme';
import { ZoneProvider } from '../src/lib/zoneContext';
import { VisitReviewForm } from '../src/features/items/VisitReviewForm';
import { PlaceForm } from '../src/features/places/PlaceForm';
import { PlaceReviewForm } from '../src/features/places/PlaceReviewForm';
import type { Place, PlaceReview, PlaceVisit, PlaceVisitReview } from '../src/types/domain';
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

const svg = (hue: string, width = 1400, height = 900) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="${hue}"/><rect x="2" y="2" width="${width - 4}" height="${height - 4}" fill="none" stroke="white" stroke-width="4"/></svg>`)}`;
const tags = Array.from({ length: 26 }, (_, index) => ({ id: index + 1, name: ['Brunch', 'Café de especialidad', 'Carlitos', 'Cervezas', 'Churros', 'Descuento', 'Donas', 'Empanada', 'Hamburguesas', 'Helado', 'Medialunas', 'Papas fritas', 'Pastas'][index % 13], emoji: '🍕', active: true }));
const place = { id: 27, name: 'Tomasso', address: 'España 501', acceptsReservations: true, category: { id: 1, name: 'Pizzería', slug: 'pizzeria', icon: '🍕', active: true }, tags: [tags[7], tags[8]], photoUrl: '/sample-photo', status: 'VISITED' } as Place;
const visit = { id: 1, placeId: 27, visitedOn: '2026-09-23', photos: [], reviews: [] } as PlaceVisit;
const review = { id: 1, author: 'tomas', updatedBy: 'tomas', overall: 4, taste: 4, price: 4, comment: 'Muy rica la pizza. '.repeat(18) } as PlaceVisitReview;
const venueReview = { author: 'tomas', location: 4, heating: 4, bathrooms: 4, exterior: 4, seating: 4, service: 4, ambiance: 4, comment: 'Buen lugar para volver.' } as PlaceReview;
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
queryClient.setQueryData(['categories',{coupleId:'preview'}], [place.category]);
queryClient.setQueryData(['highlight-tags',{coupleId:'preview'}], tags);
queryClient.setQueryData(['zones'], []);
queryClient.setQueryData(['location-context',undefined], {coupleId:'preview',originCityId:1,options:[{key:'origin',cityId:1,stageId:null,journeyId:null,label:'Rosario · Origen'}]});

export function Preview() {
  const [open, setOpen] = useState(true);
  const [rating, setRating] = useState(4);
  const [long, setLong] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const kind = new URLSearchParams(location.search).get('kind') ?? 'review';
  const photoShapes: Record<string, [number, number]> = { viewer: [1400, 900], 'viewer-portrait': [800, 1600], 'viewer-square': [1000, 1000], 'viewer-panorama': [2400, 500] };
  const photoShape = photoShapes[kind];
  return <SectionThemeContext.Provider value={kind === 'film' ? 'film' : kind === 'recipe' ? 'cook' : 'food'}>
    <main style={{ padding: 32 }}><Button type="button" onClick={() => setOpen(true)}>Abrir diálogo</Button></main>
    {open && photoShape && <PhotoViewer photos={[{ src: svg('#a86727', ...photoShape), alt: 'Foto de la visita', width: 1400, height: 900 }, { src: svg('#684292', 900, 1400), alt: 'Otra foto de la visita' }]} onClose={() => setOpen(false)} />}
    {open && kind === 'real-review' && <VisitReviewForm placeId={place.id} visit={visit} review={review} onClose={() => setOpen(false)} />}
    {open && kind === 'real-venue-review' && <PlaceReviewForm place={place} review={venueReview} onClose={() => setOpen(false)} />}
    {open && kind === 'real-place' && <PlaceForm place={place} onClose={() => setOpen(false)} />}
    {kind === 'manager' && <PhotoManagerModal mode="gallery" name="la visita" photos={[{ id: 1, url: svg('#a86727'), thumbnailUrl: svg('#a86727'), width: 1400, height: 900, position: 0, createdBy: 'qa', createdAt: '2026-09-27' }, { id: 2, url: svg('#684292'), thumbnailUrl: svg('#684292'), width: 1400, height: 900, position: 1, createdBy: 'qa', createdAt: '2026-09-27' }]} onUpload={async () => {}} />}
    {open && kind === 'stack' && <><Modal size="compact" onClose={() => setOpen(false)}><form onSubmit={(event) => event.preventDefault()}><h2>Editar visita</h2><label>Fecha<input type="date" defaultValue="2026-09-27" /></label><Button type="button" variant="destructive" onClick={() => setConfirming(true)}>Borrar visita</Button></form></Modal>{confirming && <ConfirmDialog title="¿Borrar visita?" message="La visita se eliminará." confirmLabel="Borrar" onClose={() => setConfirming(false)} onConfirm={() => { setConfirming(false); setOpen(false); }} />}</>}
    {open && !photoShape && kind !== 'real-review' && kind !== 'real-venue-review' && kind !== 'real-place' && kind !== 'stack' && kind !== 'manager' && <Modal size={kind === 'short' ? 'compact' : 'wide'} onClose={() => setOpen(false)} confirmDiscard>
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

createRoot(document.getElementById('root')!).render(<QueryClientProvider client={queryClient}><ZoneProvider><Preview /></ZoneProvider></QueryClientProvider>);
