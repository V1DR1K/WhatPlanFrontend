import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { showNotice } from "../../lib/flash";
import { getPlace, deletePlace } from "./places";
import { getVisit, getVisits } from "../items/items";
import { ItemCard } from "../items/ItemCard";
import { ItemForm } from "../items/ItemForm";
import { ItemReviewForm } from "../items/ItemReviewForm";
import { VisitForm } from "../items/VisitForm";
import { PlaceForm } from "./PlaceForm";
import { AdaptivePhoto } from "../../components/ui/AdaptivePhoto";
import { mediaUrl, session } from "../../lib/api";
import type { Item, PlaceVisitSummary } from "../../types/domain";

const mapsSearch = (address?: string) => address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : undefined;
const dateTimeLabel = (date: string, _time?: string) => new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00`));

export function PlaceDetailPage() {
  const id = Number(useParams().id);
  const validId = Number.isInteger(id) && id > 0;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [itemForm, setItemForm] = useState<Item | null | undefined>();
  const [reviewingItem, setReviewingItem] = useState<Item>();
  const [editingPlace, setEditingPlace] = useState<"details" | "review">();
  const [editingVisit, setEditingVisit] = useState<PlaceVisitSummary | null | undefined>();
  const [selectedVisitId, setSelectedVisitId] = useState<number>();
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const place = useQuery({ queryKey: ["place", id], queryFn: () => getPlace(id), enabled: validId });
  const visits = useQuery({ queryKey: ["visits", id], queryFn: () => getVisits(id), enabled: validId && place.isSuccess });
  const archive = useMutation({
    mutationFn: () => deletePlace(id),
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["places"] }), queryClient.removeQueries({ queryKey: ["place", id] })]);
      showNotice("Movimos el lugar a archivados. Podés restaurarlo cuando quieras.");
      navigate("/food");
    },
  });
  const visitList = visits.data ?? [];

  useEffect(() => {
    if (visitList.length && !visitList.some(visit => visit.id === selectedVisitId)) setSelectedVisitId(visitList[0].id);
  }, [selectedVisitId, visitList]);

  const selectedVisit = visitList.find(entry => entry.id === selectedVisitId);
  const visit = useQuery({ queryKey: ["visit", selectedVisitId], queryFn: () => getVisit(selectedVisitId!), enabled: Boolean(selectedVisitId) });

  if (!validId || place.isError || (!place.isLoading && !place.data)) return <section className="detail"><Link to="/food">← Volver a WhereFood</Link><p className="form-error">No pudimos cargar este lugar. Probá nuevamente desde la lista.</p></section>;
  if (place.isLoading) return <p>Cargando lugar…</p>;

  const venue = place.data!;
  const username = session.get()?.username;
  const ownVenue = venue.author === username;
  const hasVisits = visitList.length > 0;
  const mapsUrl = venue.mapsUrl || mapsSearch(venue.address);
  const coverPhoto = venue.photoUrl || venue.thumbnailUrl;
  const selectedVisitIndex = visitList.findIndex(entry => entry.id === selectedVisitId);
  const visitNumber = selectedVisitIndex < 0 ? 0 : visitList.length - selectedVisitIndex;

  return <section className="detail">
    <Link to="/food">← Volver a WhereFood</Link>
    <div className="detail-heading">
      <div className="place-cover">{coverPhoto ? <AdaptivePhoto alt={`Foto de ${venue.name}`} context="place" height={venue.photoHeight} src={mediaUrl(coverPhoto)} width={venue.photoWidth} /> : <span className="place-cover-empty">{venue.category.icon}</span>}</div>
      <div>
        <p className="eyebrow">{hasVisits ? "YA FUERON · " : "PENDIENTE · "}{venue.category.name}</p>
        <h1>{venue.name}</h1>
        {!!venue.tags.length && <div className="place-tags place-tags--detail">{venue.tags.map(tag => <span key={tag.id}>{tag.emoji} {tag.name}</span>)}</div>}
        <p>{mapsUrl ? <a className="address-link" href={mapsUrl} target="_blank" rel="noreferrer">📍 {venue.address || "Abrir ubicación"} ↗</a> : venue.address}{hasVisits && ` · ${venue.itemCount} ítems registrados`}</p>
        {venue.sourceUrl && <a className="source-link" href={venue.sourceUrl} target="_blank" rel="noreferrer">↗ Ver link de referencia</a>}
      </div>
      <div className="detail-actions">
        {ownVenue && <button className="secondary-button food-detail-action" type="button" onClick={() => setEditingPlace("details")}>✎ Editar lugar</button>}
        {hasVisits && <button className="secondary-button food-detail-action" type="button" onClick={() => setEditingPlace("review")}>{venue.reviews.some(review => review.author === username) ? "✎ Editar mi reseña" : "★ Calificar lugar"}</button>}
        <button className="main-button" type="button" onClick={() => setEditingVisit(null)}>Registrar visita 🍽️</button>
        {selectedVisit && <button className="secondary-button food-detail-action food-detail-action--item" type="button" onClick={() => setItemForm(null)}><span aria-hidden="true">+</span> Agregar ítem a esta visita</button>}
        {ownVenue && <button className="text-button food-detail-delete" type="button" disabled={archive.isPending} onClick={() => setConfirmingArchive(true)}>{archive.isPending ? "Archivando…" : "Archivar lugar"}</button>}
      </div>
    </div>
    <section className="watch-counter" aria-label="Contador de visitas"><div><p className="eyebrow">HISTORIAL COMPARTIDO</p><h2>{hasVisits ? `${visitList.length} ${visitList.length === 1 ? "visita" : "visitas"}` : "Todavía no fueron"}</h2><p>{visitList[0] ? `Última visita: ${dateTimeLabel(visitList[0].visitedOn, visitList[0].visitedAt)}` : "Cuando vayan, registren fecha y hora."}</p></div><div><button className="counter-add food-counter-add" type="button" onClick={() => setEditingVisit(null)}>Registrar visita</button></div></section>
    {hasVisits && <section className="reviews-section"><div className="section-title"><div><p className="eyebrow">HISTORIAL DE VISITAS</p><h2>¿Qué pidieron?</h2></div><strong>{visitList.length}</strong></div><div className="item-date-pager" aria-label="Elegir visita"><label>Visita #{visitNumber}<select value={selectedVisitId ?? ""} onChange={event => setSelectedVisitId(Number(event.target.value))}>{visitList.map((entry, index) => <option key={entry.id} value={entry.id}>Visita #{visitList.length - index} · {dateTimeLabel(entry.visitedOn, entry.visitedAt)}</option>)}</select></label>{selectedVisit && selectedVisit.createdBy === username && <button className="secondary-button" type="button" onClick={() => setEditingVisit(selectedVisit)}>Editar visita</button>}</div>{visit.isLoading && <p>Cargando ítems…</p>}{visit.data && <><p className="muted">Visita del {dateTimeLabel(visit.data.visitedOn, visit.data.visitedAt)}. Agregada por {visit.data.createdBy}.</p>{visit.data.items.length ? <div className="item-list">{visit.data.items.map(item => <ItemCard key={item.id} item={item} username={username} onEditItem={setItemForm} onEditReview={setReviewingItem} />)}</div> : <p className="empty-state">Todavía no cargaron ítems para esta visita.</p>}</>}</section>}
    {confirmingArchive && <ConfirmDialog title="¿Archivar este lugar?" message={archive.error ? archive.error.message : "Dejará de aparecer en la lista, pero conservará sus fotos y reseñas. Podés restaurarlo desde Archivados."} confirmLabel="Archivar lugar" pending={archive.isPending} onClose={() => setConfirmingArchive(false)} onConfirm={() => archive.mutate()} />}
    {editingPlace && <PlaceForm place={venue} mode={editingPlace} onClose={() => setEditingPlace(undefined)} />}
    {editingVisit !== undefined && <VisitForm placeId={venue.id} visit={editingVisit ?? undefined} onClose={() => setEditingVisit(undefined)} onSaved={saved => setSelectedVisitId(saved.id)} onDeleted={() => setSelectedVisitId(undefined)} />}
    {itemForm !== undefined && selectedVisit && <ItemForm placeId={venue.id} visitId={selectedVisit.id} item={itemForm ?? undefined} onClose={() => setItemForm(undefined)} />}
    {reviewingItem && selectedVisit && <ItemReviewForm item={reviewingItem} review={reviewingItem.reviews.find(review => review.author === username)} placeId={venue.id} visitId={selectedVisit.id} onClose={() => setReviewingItem(undefined)} />}
  </section>;
}
