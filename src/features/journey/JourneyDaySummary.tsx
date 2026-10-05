import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { StarRating } from "../../components/ui/StarRating";
import { session } from "../../lib/api";
import {
  deleteJourneyDayReview,
  formatDate,
  getJourneyDay,
  getJourneyDays,
  saveJourneyDayReview,
  saveJourneyDayStory,
  type Detail,
} from "./journey";

export function JourneyDaySummary({
  detail,
  date,
  onDateChange,
  editable,
}: {
  detail: Detail;
  date: string;
  onDateChange: (date: string) => void;
  editable: boolean;
}) {
  const cache = useQueryClient();
  const [editingStory, setEditingStory] = useState(false);
  const [editingReview, setEditingReview] = useState(false);
  const days = useQuery({
    queryKey: ["journey-days", detail.trip.id],
    queryFn: () => getJourneyDays(detail.trip.id),
  });
  const query = useQuery({
    queryKey: ["journey-day", detail.trip.id, date],
    queryFn: () => getJourneyDay(detail.trip.id, date),
    enabled: Boolean(date),
  });
  const invalidate = async () => Promise.all([
    cache.invalidateQueries({ queryKey: ["journey-day", detail.trip.id, date] }),
    cache.invalidateQueries({ queryKey: ["journey-days", detail.trip.id] }),
    cache.invalidateQueries({ queryKey: ["journey", detail.trip.id] }),
    cache.invalidateQueries({ queryKey: ["journeys"] }),
  ]);
  const story = useMutation({
    mutationFn: (text: string) => saveJourneyDayStory(detail.trip.id, date, text),
    onSuccess: async () => { await invalidate(); setEditingStory(false); },
  });
  const selected = query.data;
  const ownReview = selected?.reviews.find((review) => review.author === session.get()?.username);
  const isFuture = date > new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });

  return (
    <>
      <section className="journey-day-summary" aria-labelledby="journey-day-title">
        <section className="journey-day-index" aria-label="Elegir día del viaje">
          <div className="journey-panel__heading"><h3>Sus días</h3>
            {days.error && <Button variant="tertiary" onClick={() => void days.refetch()}>Reintentar</Button>}
          </div>
          {days.isLoading && <p className="muted" role="status">Cargando días…</p>}
          {days.error && <p role="alert" className="form-error">{days.error.message}</p>}
          {days.data && <div className="journey-day-index__list">
            {days.data.map((item) => <button key={item.date} type="button" aria-pressed={date === item.date}
              className={date === item.date ? "is-selected" : ""} onClick={() => onDateChange(item.date)}>
              <time dateTime={item.date}>{formatDate(item.date)}</time>
              <small>{item.destinations[0] || "Día del viaje"}</small>
            </button>)}
          </div>}
        </section>
        <div className="journey-panel__heading">
          <div>
            <h2 id="journey-day-title">Resumen del día</h2>
            <p className="muted">{formatDate(date)}{isFuture ? " · Día por venir" : " · Lo que pasó en el viaje"}</p>
          </div>
          <label className="journey-day-picker__date">
            Día del viaje
            <input type="date" min={detail.trip.startsOn} max={detail.trip.endsOn}
              value={date} onChange={(event) => onDateChange(event.target.value)} />
          </label>
        </div>
        {query.isLoading && <p role="status">Cargando lo que pasó este día…</p>}
        {query.error && <p className="form-error" role="alert">{query.error.message}</p>}
        {selected && <>
          <section className="journey-day-entries">
            <h3>Lo que hicieron</h3>
            {selected.entries.length ? <div className="journey-day-entry-list">
              {selected.entries.map((entry) => <article key={entry.id}>
                <div className="journey-day-entry-list__body">
                  <p className="eyebrow">{{ FOOD: "WHEREFOOD", FILM: "WHICHMOVIE", COOK: "WHOCOOK", FUN: "WHYFUN" }[entry.section]}</p>
                  <h4><Link to={entry.href}>{entry.title}</Link></h4>
                  {entry.detail && <p>{entry.detail}</p>}
                </div>
              </article>)}
            </div> : <p className="journey-empty">{isFuture ? "Todavía no hay experiencias guardadas para este día." : "Aún no hay experiencias registradas para este día."}</p>}
          </section>

          <section className="journey-day-memory">
            <div className="journey-panel__heading"><h3>Su recuerdo del día</h3>
              {editable && <Button variant="secondary" onClick={() => setEditingStory(true)}>{selected.story ? "Editar relato" : "Escribir un relato"}</Button>}
            </div>
            {selected.story ? <p className="journey-day-story">{selected.story}</p> : <p className="journey-empty">Un relato compartido para guardar los detalles de este día.</p>}
            <div className="journey-panel__heading"><h3>Reseñas personales</h3>
              {editable && <Button variant="secondary" onClick={() => setEditingReview(true)}>{ownReview ? "Editar mi reseña" : "Agregar mi reseña"}</Button>}
            </div>
            {selected.reviews.length ? <div className="journey-day-review-list">{selected.reviews.map((review) => <article key={review.id}>
              <strong>{review.author}</strong>
              {review.rating !== null && <StarRating label="Del día" value={review.rating} />}
              {review.comment && <p>{review.comment}</p>}
            </article>)}</div> : <p className="journey-empty">Todavía no hay reseñas para este día.</p>}
          </section>

        </>}
      </section>

      {editingStory && selected && <StoryEditor story={selected.story ?? ""} pending={story.isPending}
        error={story.error?.message} onClose={() => setEditingStory(false)}
        onSave={(text) => story.mutate(text)} onDelete={selected.story ? () => story.mutate("") : undefined} />}
      {editingReview && selected && <ReviewEditor review={ownReview} pending={false}
        tripId={detail.trip.id} day={date} onClose={() => setEditingReview(false)} onRefresh={invalidate} />}
    </>
  );
}

function StoryEditor({ story, pending, error, onClose, onSave, onDelete }: {
  story: string; pending: boolean; error?: string; onClose: () => void;
  onSave: (story: string) => void; onDelete?: () => void;
}) {
  const [text, setText] = useState(story);
  return <Modal className="journey-modal" title="Relato del día" onClose={onClose} confirmDiscard pending={pending}>
    <form className="journey-form" onSubmit={(event) => { event.preventDefault(); onSave(text.trim()); }}>
      <h2>¿Qué quieren recordar?</h2>
      <label>Relato compartido<textarea autoFocus rows={7} maxLength={4000} value={text}
        onChange={(event) => setText(event.target.value)} placeholder="Anoten los momentos que hicieron especial este día…" /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <Button disabled={pending}>{pending ? "Guardando…" : "Guardar relato"}</Button>
      {onDelete && <Button type="button" variant="destructive" disabled={pending} onClick={onDelete}>Quitar relato</Button>}
    </form>
  </Modal>;
}

function ReviewEditor({ review, pending, tripId, day, onClose, onRefresh }: {
  review?: { id: string; userId: number; author: string; rating: number | null; comment: string | null };
  pending: boolean; tripId: string; day: string; onClose: () => void; onRefresh: () => Promise<unknown>;
}) {
  const [rating, setRating] = useState<number | undefined>(review?.rating ?? undefined);
  const [comment, setComment] = useState(review?.comment ?? "");
  const save = useMutation({
    mutationFn: () => saveJourneyDayReview(tripId, day, rating ?? null, comment.trim()),
    onSuccess: async () => { await onRefresh(); onClose(); },
  });
  const remove = useMutation({
    mutationFn: () => deleteJourneyDayReview(tripId, day),
    onSuccess: async () => { await onRefresh(); onClose(); },
  });
  const saving = pending || save.isPending || remove.isPending;
  return <Modal className="journey-modal" title="Reseña personal del día" onClose={onClose} confirmDiscard pending={saving}>
    <form className="journey-form journey-day-review-form" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
      <h2>¿Cómo estuvo este día?</h2>
      <fieldset className="journey-day-rating"><legend>Puntuación (opcional)</legend>
        <StarRating label="Puntuación del día" value={rating} onChange={setRating} />
        {rating !== undefined && <Button type="button" variant="tertiary" onClick={() => setRating(undefined)}>Quitar puntuación</Button>}
      </fieldset>
      <label>Comentario (opcional)<textarea rows={5} maxLength={2000} value={comment}
        onChange={(event) => setComment(event.target.value)} placeholder="¿Qué les gustó de este día?" /></label>
      {!rating && !comment.trim() && <p className="muted">Agregá una puntuación o un comentario.</p>}
      {(save.error || remove.error) && <p className="form-error" role="alert">{(save.error || remove.error)?.message}</p>}
      <Button disabled={saving || (rating === undefined && !comment.trim())}>{saving ? "Guardando…" : "Guardar reseña"}</Button>
      {review && <Button type="button" variant="destructive" disabled={saving} onClick={() => remove.mutate()}>Borrar mi reseña</Button>}
    </form>
  </Modal>;
}
