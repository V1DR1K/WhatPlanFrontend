import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { StarRating } from '../../components/ui/StarRating';
import { mediaUrl, session } from '../../lib/api';
import type { FunPhoto, FunSchedule, FunVenue, FunWeekday } from '../../types/domain';
import { FunPhotoGallery } from './FunPhotoGallery';
import { FunVenueForm } from './FunVenueForm';
import { deleteFunPhoto, deleteFunVenue, getFunVenue } from './whyFun';

const days: { value: FunWeekday; label: string }[] = [
  { value: 'MONDAY', label: 'Lunes' }, { value: 'TUESDAY', label: 'Martes' }, { value: 'WEDNESDAY', label: 'Miércoles' }, { value: 'THURSDAY', label: 'Jueves' }, { value: 'FRIDAY', label: 'Viernes' }, { value: 'SATURDAY', label: 'Sábado' }, { value: 'SUNDAY', label: 'Domingo' },
];
const mapsSearch = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, Rosario, Santa Fe, Argentina`)}`;
const timeRange = (schedule: FunSchedule) => `${schedule.opensAt.slice(0, 5)} a ${schedule.closesAt.slice(0, 5)}`;
const couple = ['tomas', 'avril'];

export function FunVenueDetailPage() {
  const id = Number(useParams().id);
  const validId = Number.isInteger(id) && id > 0;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const venueQuery = useQuery({ queryKey: ['fun-venue', id], queryFn: () => getFunVenue(id), enabled: validId });
  const removeVenue = useMutation({ mutationFn: () => deleteFunVenue(id), onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['fun-venues'] }); navigate('/why-fun'); } });
  const removePhoto = useMutation({ mutationFn: (photoId: number) => deleteFunPhoto(photoId), onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['fun-venue', id] }); await qc.invalidateQueries({ queryKey: ['fun-venues'] }); } });

  if (!validId || venueQuery.isError || (!venueQuery.isLoading && !venueQuery.data)) return <p className="form-error">No pudimos abrir ese lugar. Volvé a WhyFun e intentá otra vez.</p>;
  if (venueQuery.isLoading) return <p>Cargando salida…</p>;

  const venue = venueQuery.data!;
  const username = session.get()?.username;
  const own = venue.author === username;
  const review = venue.reviews.find(value => value.author === username);

  return <section className="fun-detail">
    <Link to="/why-fun">← Volver a WhyFun</Link>
    <div className="fun-detail__cover">
      {venue.coverPhoto ? <img src={mediaUrl(venue.coverPhoto.url)} alt={`Foto de ${venue.name}`} /> : <span>{venue.subcategory.icon}</span>}
    </div>
    <div className="fun-detail__head">
      <div className="fun-detail__summary">
        <h1>{venue.name}</h1>
        <div className="fun-detail__meta">
          <p className="eyebrow">{venue.category.icon} {venue.category.name} · {venue.subcategory.icon} {venue.subcategory.name}</p>
          <a className="address-link" href={mapsSearch(venue.address)} target="_blank" rel="noreferrer">📍 {venue.address} ↗</a>
          {venue.reviewCount > 0 && <p className="fun-detail-rating"><strong>{venue.rating.toFixed(1)} ★</strong> Promedio de las últimas opiniones de Tomás y Avril</p>}
        </div>
      </div>
      <div className="detail-actions">
        {own && <button className="secondary-button" onClick={() => setEditing(true)}>✎ Editar lugar</button>}
        <button className="main-button" onClick={() => setReviewing(true)}>{review ? '✎ Editar opinión' : '★ Calificar lugar'}</button>
        {own && <button className="text-button" onClick={() => setConfirmingDelete(true)}>Borrar lugar</button>}
      </div>
    </div>
    <section className="fun-detail-grid">
      <div className="fun-detail-panel">
        <p className="eyebrow">HORARIOS</p>
        <h2>Cuándo ir</h2>
        <div className="fun-hours">{days.map(day => {
          const entries = venue.schedules.filter(schedule => schedule.day === day.value);
          return <div key={day.value}><strong>{day.label}</strong><span>{entries.length ? entries.map(timeRange).join(' · ') : 'Cerrado'}</span></div>;
        })}</div>
      </div>
      <div className="fun-detail-panel">
        <p className="eyebrow">OPINIÓN COMPARTIDA</p>
        <h2>Cómo la pasamos</h2>
        {venue.reviewCount ? <div className="fun-rating-summary"><strong>{venue.rating.toFixed(1)}</strong><StarRating label="Promedio de las últimas opiniones" value={Math.round(venue.rating)} /><span>{venue.reviewCount} de 2 opiniones actuales</span></div> : <p className="muted">Todavía no hay opiniones de ustedes.</p>}
      </div>
    </section>
    <section className="fun-gallery-section">
      <div className="section-title"><div><p className="eyebrow">FOTOS</p><h2>El lugar</h2></div><strong>{venue.photos.length} foto{venue.photos.length === 1 ? '' : 's'}</strong></div>
      {venue.photos.length ? <FunPhotoGallery photos={venue.photos} venueName={venue.name} onDelete={own ? (photo: FunPhoto) => removePhoto.mutate(photo.id) : undefined} /> : <p className="empty-state">Todavía no hay fotos de este lugar.</p>}
      {removePhoto.error && <p className="form-error">{removePhoto.error.message}</p>}
    </section>
    <section className="reviews-section">
      <div className="section-title"><div><p className="eyebrow">RESEÑAS ACTUALES</p><h2>Tomás y Avril</h2></div><strong>{venue.reviewCount}/2</strong></div>
      <div className="fun-review-columns">{couple.map(author => <ReviewCard key={author} venue={venue} author={author} currentUser={username} onEdit={() => setReviewing(true)} />)}</div>
    </section>
    {editing && <FunVenueForm venue={venue} onClose={() => setEditing(false)} />}
    {reviewing && <FunVenueForm venue={venue} reviewOnly onClose={() => setReviewing(false)} />}
    {confirmingDelete && <ConfirmDialog title="¿Borrar este lugar?" message="También se eliminarán sus horarios, fotos y opiniones." confirmLabel="Borrar lugar" pending={removeVenue.isPending} onClose={() => setConfirmingDelete(false)} onConfirm={() => removeVenue.mutate()} />}
  </section>;
}

function ReviewCard({ venue, author, currentUser, onEdit }: { venue: FunVenue; author: string; currentUser?: string; onEdit: () => void }) {
  const review = venue.reviews.find(value => value.author === author);
  const name = author === 'tomas' ? 'Tomás' : 'Avril';
  return <article className="fun-review-card"><div><span className="review-avatar">{name[0]}</span><h3>{currentUser === author ? 'Tu opinión' : `Opinión de ${name}`}</h3>{currentUser === author && review && <button className="icon-edit" type="button" onClick={onEdit} aria-label={`Editar opinión de ${name}`}>✎</button>}</div>{review ? <><StarRating label={`Puntuación de ${name}`} value={review.rating} /><p>{review.comment || 'Sin comentario todavía.'}</p><small>Actualizada {new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(review.updatedAt))}</small></> : <p className="muted">{name} todavía no dejó su opinión.</p>}</article>;
}
