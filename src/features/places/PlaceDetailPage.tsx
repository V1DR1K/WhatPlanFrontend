import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getPlace } from "./places";
import { getItemDates, getItems } from "../items/items";
import { ItemCard } from "../items/ItemCard";
import { ItemForm } from "../items/ItemForm";
import { PlaceForm } from "./PlaceForm";
import { StarRating } from "../../components/ui/StarRating";
import { AdaptivePhoto } from "../../components/ui/AdaptivePhoto";
import { mediaUrl, session } from "../../lib/api";
import type { Item } from "../../types/domain";

const mapsSearch = (address?: string) =>
  address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, Rosario, Santa Fe, Argentina`)}`
    : undefined;
const reviewLabels: {
  key: "location" | "heating" | "bathrooms" | "exterior" | "seating" | "service" | "ambiance";
  label: string;
}[] = [
  { key: "location", label: "Ubicación" },
  { key: "heating", label: "Calefacción" },
  { key: "bathrooms", label: "Baños" },
  { key: "exterior", label: "Exterior" },
  { key: "seating", label: "Asientos" },
  { key: "service", label: "Atención" },
  { key: "ambiance", label: "Ambiente" },
];
const score = (value: number | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(1) : "—";
const visitDateLabel = (date: string) =>
  new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));

export function PlaceDetailPage() {
  const id = Number(useParams().id);
  const validId = Number.isInteger(id) && id > 0;
  const [editingItem, setEditingItem] = useState<Item | null | undefined>();
  const [editingPlace, setEditingPlace] = useState(false);
  const [selectedVisitDate, setSelectedVisitDate] = useState("");
  const place = useQuery({
    queryKey: ["place", id],
    queryFn: () => getPlace(id),
    enabled: validId,
  });
  const itemDates = useQuery({
    queryKey: ["item-dates", id],
    queryFn: () => getItemDates(id),
    enabled: validId && place.isSuccess,
  });
  const visitDates = itemDates.data ?? [];
  useEffect(() => {
    if (visitDates.length && !visitDates.includes(selectedVisitDate)) {
      setSelectedVisitDate(visitDates[0]);
    }
  }, [selectedVisitDate, visitDates]);
  const items = useQuery({
    queryKey: ["items", id, selectedVisitDate],
    queryFn: () => getItems(id, selectedVisitDate),
    enabled: validId && place.isSuccess && Boolean(selectedVisitDate),
  });

  if (!validId || place.isError || (!place.isLoading && !place.data)) {
    return <p className="form-error">No pudimos cargar ese lugar. Volvé al mapa e intentá de nuevo.</p>;
  }
  if (place.isLoading) return <p>Cargando lugar…</p>;

  const venue = place.data!;
  const username = session.get()?.username;
  const pending = venue.status === "PENDING";
  const mapsUrl = venue.mapsUrl || mapsSearch(venue.address);
  const coverPhoto = venue.photoUrl || venue.thumbnailUrl;
  const coverPhotoSrc = coverPhoto ? mediaUrl(coverPhoto) : undefined;
  const itemList = items.data?.content ?? [];
  const itemsByAuthor = Object.entries(
    itemList.reduce<Record<string, Item[]>>((groups, item) => {
      (groups[item.author] ??= []).push(item);
      return groups;
    }, {}),
  );
  const selectedDateIndex = visitDates.indexOf(selectedVisitDate);

  return (
    <section className="detail">
      <Link to="/">← Volver al mapa</Link>
      <div className="detail-heading">
        <div className="place-cover">
          {coverPhotoSrc ? (
            <AdaptivePhoto alt={`Foto de ${venue.name}`} context="place" height={venue.photoHeight} src={coverPhotoSrc} width={venue.photoWidth} />
          ) : (
            <span className="place-cover-empty">{venue.category.icon}</span>
          )}
        </div>
        <div>
          <p className="eyebrow">{pending ? "PENDIENTE · " : ""}{venue.category.name}</p>
          <h1>{venue.name}</h1>
          {!!venue.tags?.length && <div className="place-tags place-tags--detail">{venue.tags.map((tag) => <span key={tag.id}>{tag.emoji} {tag.name}</span>)}</div>}
          <p>
            {mapsUrl ? (
              <a className="address-link" href={mapsUrl} target="_blank" rel="noreferrer">📍 {venue.address || "Abrir en Google Maps"} ↗</a>
            ) : venue.address}
            {!pending && ` · ${score(venue.rating)} ★ · ${venue.itemCount} ítems`}
          </p>
          {venue.sourceUrl && <a className="source-link" href={venue.sourceUrl} target="_blank" rel="noreferrer">↗ Ver link de referencia</a>}
        </div>
        <div className="detail-actions">
          <button className="secondary-button" onClick={() => setEditingPlace(true)}>{venue.author === username ? "✎ Editar lugar" : "★ Calificar lugar"}</button>
          <button className="main-button" onClick={() => setEditingItem(null)}>{pending ? "Ya fui, agregar ítem" : "Agregar ítem"}</button>
        </div>
      </div>
      {!pending && (
        <section className="rating-breakdown" aria-label="Promedios globales">
          <div><span>😋 Sabor</span><strong>{score(venue.tasteAverage)}</strong><StarRating label="Promedio de sabor" value={Math.round(venue.tasteAverage || 0)} /></div>
          <div><span>💸 Precio</span><strong>{score(venue.priceAverage)}</strong><StarRating label="Promedio de precio" value={Math.round(venue.priceAverage || 0)} /></div>
          <div><span>📍 Lugar</span><strong>{score(venue.venueAverage)}</strong><StarRating label="Promedio del lugar" value={Math.round(venue.venueAverage || 0)} /></div>
        </section>
      )}
      <section className="reviews-section">
        <h2>Reseñas del lugar</h2>
        <div className="review-columns">
          {venue.reviews.map((review) => (
            <article className="place-review" key={review.author}>
              <h3>{review.author === username ? "Tu calificación" : `Calificación de ${review.author}`}</h3>
              {review.comment && <p>{review.comment}</p>}
              <div>{reviewLabels.map(({ key, label }) => <span key={key}>{label}<StarRating label={label} value={review[key]} /></span>)}</div>
            </article>
          ))}
          {!venue.reviews.length && <p className="empty-state">Todavía no hay calificaciones del lugar.</p>}
        </div>
      </section>
      <h2>{pending ? "Cuando vayas, contanos qué pediste" : "Lo que pedimos"}</h2>
      {!!visitDates.length && (
        <div className="item-date-pager" aria-label="Navegar visitas por fecha">
          <button type="button" className="date-chevron" aria-label="Ver visita más reciente" disabled={selectedDateIndex <= 0} onClick={() => setSelectedVisitDate(visitDates[selectedDateIndex - 1])}>‹</button>
          <label>Visita
            <select value={selectedVisitDate} onChange={(event) => setSelectedVisitDate(event.target.value)}>
              {visitDates.map((date) => <option key={date} value={date}>{visitDateLabel(date)}</option>)}
            </select>
          </label>
          <button type="button" className="date-chevron" aria-label="Ver visita anterior" disabled={selectedDateIndex < 0 || selectedDateIndex >= visitDates.length - 1} onClick={() => setSelectedVisitDate(visitDates[selectedDateIndex + 1])}>›</button>
        </div>
      )}
      {items.isError && <p className="form-error">No pudimos cargar los ítems todavía. Podés seguir usando el detalle e intentarlo de nuevo.</p>}
      <div className="author-item-groups">
        {itemsByAuthor.map(([author, authorItems]) => (
          <section key={author}>
            <h3>{author === username ? "Tus ítems" : `Ítems de ${author}`}</h3>
            <div className="item-list">{authorItems.map((item) => <ItemCard key={item.id} item={item} canEdit={item.author === username} onEdit={setEditingItem} />)}</div>
          </section>
        ))}
        {!items.isLoading && !itemList.length && !!selectedVisitDate && <p className="empty-state">No hay ítems cargados para esta visita.</p>}
      </div>
      {editingItem !== undefined && <ItemForm placeId={id} item={editingItem ?? undefined} onClose={() => { setEditingItem(undefined); setSelectedVisitDate(""); }} />}
      {editingPlace && <PlaceForm place={venue} onClose={() => setEditingPlace(false)} />}
    </section>
  );
}
