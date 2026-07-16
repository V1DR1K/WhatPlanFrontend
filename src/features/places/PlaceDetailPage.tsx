import { Link, useParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getPlace } from './places';
import { getItems } from '../items/items';
import { ItemCard } from '../items/ItemCard';
import { ItemForm } from '../items/ItemForm';
import { PlaceForm } from './PlaceForm';
import { LoadMore } from '../../components/ui/Pagination';
import { StarRating } from '../../components/ui/StarRating';
import { session } from '../../lib/api';
import type { Item } from '../../types/domain';

const mapsSearch = (address?: string) => address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, Rosario, Santa Fe, Argentina`)}` : undefined;
const reviewLabels: { key: 'location' | 'heating' | 'bathrooms' | 'exterior' | 'seating' | 'service' | 'ambiance'; label: string }[] = [
  { key: 'location', label: 'Ubicación' }, { key: 'heating', label: 'Calefacción' }, { key: 'bathrooms', label: 'Baños' }, { key: 'exterior', label: 'Exterior' }, { key: 'seating', label: 'Asientos' }, { key: 'service', label: 'Atención' }, { key: 'ambiance', label: 'Ambiente' },
];
const score = (value: number | undefined) => typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : '—';

export function PlaceDetailPage() {
  const id = Number(useParams().id);
  const validId = Number.isInteger(id) && id > 0;
  const [editingItem, setEditingItem] = useState<Item | null | undefined>();
  const [editingPlace, setEditingPlace] = useState(false);
  const place = useQuery({ queryKey: ['place', id], queryFn: () => getPlace(id), enabled: validId });
  const items = useInfiniteQuery({
    queryKey: ['items', id],
    queryFn: ({ pageParam }) => getItems(id, pageParam),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: last => last.nextCursor ?? undefined,
    enabled: validId && place.isSuccess,
  });

  if (!validId || place.isError || (!place.isLoading && !place.data)) return <p className="form-error">No pudimos cargar ese lugar. Volvé al mapa e intentá de nuevo.</p>;
  if (place.isLoading) return <p>Cargando lugar…</p>;

  const venue = place.data!;
  const username = session.get()?.username;
  const pending = venue.status === 'PENDING';
  const mapsUrl = venue.mapsUrl || mapsSearch(venue.address);
  const itemList = items.data?.pages.flatMap(page => Array.isArray(page.content) ? page.content : []) ?? [];
  const itemsByAuthor = Object.entries(itemList.reduce<Record<string, Item[]>>((groups, item) => {
    (groups[item.author] ??= []).push(item);
    return groups;
  }, {}));

  return <section className="detail">
    <Link to="/">← Volver al mapa</Link>
    <div className="detail-heading">
      {venue.thumbnailUrl || venue.photoUrl ? <img className="place-hero-photo" src={venue.thumbnailUrl || venue.photoUrl} alt={`Foto de ${venue.name}`} /> : <span>{venue.category.icon}</span>}
      <div>
        <p className="eyebrow">{pending ? 'PENDIENTE · ' : ''}{venue.category.name}</p>
        <h1>{venue.name}</h1>
        <p>{mapsUrl ? <a className="address-link" href={mapsUrl} target="_blank" rel="noreferrer">📍 {venue.address || 'Abrir en Google Maps'} ↗</a> : venue.address}{!pending && ` · ${score(venue.rating)} ★ · ${venue.itemCount} ítems`}</p>
        {venue.sourceUrl && <a className="source-link" href={venue.sourceUrl} target="_blank" rel="noreferrer">↗ Ver link de referencia</a>}
      </div>
      <div className="detail-actions">
        <button className="secondary-button" onClick={() => setEditingPlace(true)}>{venue.author === username ? '✎ Editar lugar' : '★ Calificar lugar'}</button>
        <button className="main-button" onClick={() => setEditingItem(null)}>{pending ? 'Ya fui, agregar ítem' : 'Agregar ítem'}</button>
      </div>
    </div>
    {!pending && <section className="rating-breakdown" aria-label="Promedios globales">
      <div><span>😋 Sabor</span><strong>{score(venue.tasteAverage)}</strong><StarRating label="Promedio de sabor" value={Math.round(venue.tasteAverage || 0)} /></div>
      <div><span>💸 Precio</span><strong>{score(venue.priceAverage)}</strong><StarRating label="Promedio de precio" value={Math.round(venue.priceAverage || 0)} /></div>
      <div><span>📍 Lugar</span><strong>{score(venue.venueAverage)}</strong><StarRating label="Promedio del lugar" value={Math.round(venue.venueAverage || 0)} /></div>
    </section>}
    <section className="reviews-section"><h2>Reseñas del lugar</h2><div className="review-columns">{venue.reviews.map(review => <article className="place-review" key={review.author}><h3>{review.author === username ? 'Tu calificación' : `Calificación de ${review.author}`}</h3>{review.comment && <p>{review.comment}</p>}<div>{reviewLabels.map(({ key, label }) => <span key={key}>{label}<StarRating label={label} value={review[key]} /></span>)}</div></article>)}{!venue.reviews.length && <p className="empty-state">Todavía no hay calificaciones del lugar.</p>}</div></section>
    <h2>{pending ? 'Cuando vayas, contanos qué pediste' : 'Lo que pedimos'}</h2>
    {items.isError && <p className="form-error">No pudimos cargar los ítems todavía. Podés seguir usando el detalle e intentarlo de nuevo.</p>}
    <div className="author-item-groups">{itemsByAuthor.map(([author, authorItems]) => <section key={author}><h3>{author === username ? 'Tus ítems' : `Ítems de ${author}`}</h3><div className="item-list">{authorItems.map(item => <ItemCard key={item.id} item={item} canEdit={item.author === username} onEdit={setEditingItem} />)}</div></section>)}</div>
    <LoadMore enabled={items.hasNextPage} onClick={() => items.fetchNextPage()} loading={items.isFetchingNextPage} />
    {editingItem !== undefined && <ItemForm placeId={id} item={editingItem ?? undefined} onClose={() => setEditingItem(undefined)} />}
    {editingPlace && <PlaceForm place={venue} onClose={() => setEditingPlace(false)} />}
  </section>;
}
