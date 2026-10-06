import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { RecordIterator, type RecordIteratorOption } from "../../components/ui/RecordIterator";
import { Modal } from "../../components/ui/Modal";
import { StarRating } from "../../components/ui/StarRating";
import { session } from "../../lib/api";
import { sectionThemeStyle, type SectionId } from "../../lib/sectionTheme";
import {
  deleteJourneyDayReview,
  formatDate,
  formatJourneyDay,
  getJourneyDay,
  getJourneyDays,
  saveJourneyDayReview,
  saveJourneyDayStory,
  offsetJourneyDate,
  type Detail,
  type Section,
} from "./journey";

const entrySections: Record<Section, { label: string; emoji: string; cue: string; theme: SectionId }> = {
  FOOD: { label: "WHEREFOOD", emoji: "🍽️", cue: "¡Qué rico!", theme: "food" },
  FILM: { label: "WHICHMOVIE", emoji: "🎬", cue: "¡De película!", theme: "film" },
  COOK: { label: "WHOCOOK", emoji: "🥘", cue: "¡Manos a la obra!", theme: "cook" },
  FUN: { label: "WHYFUN", emoji: "🎟️", cue: "¡Planazo!", theme: "fun" },
};

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
  const dayOptions: RecordIteratorOption[] = [];
  for (let day = detail.trip.startsOn; day <= detail.trip.endsOn; day = offsetJourneyDate(day, 1)) {
    const summary = days.data?.find((item) => item.date === day);
    dayOptions.push({
      value: day,
      label: formatJourneyDay(day),
      detail: summary?.destinations[0],
    });
  }
  const ownReview = selected?.reviews.find((review) => review.author === session.get()?.username);
  const isFuture = date > new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });

  return (
    <>
      <section className="journey-day-summary" aria-labelledby="journey-day-title">
        <div className="journey-day-summary__navigation" aria-label="Elegir día del viaje">
          {days.isLoading && <p className="muted" role="status">Cargando días…</p>}
          {days.error && <div className="journey-gallery__error"><p role="alert" className="form-error">{days.error.message}</p><Button variant="tertiary" onClick={() => void days.refetch()}>Reintentar</Button></div>}
          {!days.isLoading && !days.error && <RecordIterator
            ariaLabel="Iterar días del viaje"
            className="journey-day-stepper"
            hideLabel
            label="Día del viaje"
            options={dayOptions}
            value={date}
            onChange={onDateChange}
          />}
        </div>
        <div className="journey-panel__heading">
          <div>
            <h2 id="journey-day-title">Resumen del día</h2>
            <p className="muted">{formatDate(date)}{isFuture ? " · Día por venir" : " · Lo que pasó en el viaje"}</p>
          </div>
        </div>
        {query.isLoading && <p role="status">Cargando lo que pasó este día…</p>}
        {query.error && <p className="form-error" role="alert">{query.error.message}</p>}
        {selected && <>
          <div className="journey-day-summary__columns">
            <section className="journey-day-entries">
              <h3>Lo que hicieron</h3>
              {selected.entries.length ? <div className="journey-day-entry-list">
                {selected.entries.map((entry) => {
                  const presentation = entrySections[entry.section];
                  return <article
                    className="journey-day-entry"
                    key={entry.id}
                    style={sectionThemeStyle(presentation.theme)}
                  >
                    <div className="journey-day-entry__intro">
                      <span className="journey-day-entry__emoji" aria-hidden="true">{presentation.emoji}</span>
                      <div className="journey-day-entry__text">
                        <div className="journey-day-entry__labels">
                          <p className="eyebrow">{presentation.label}</p>
                          <span className="journey-day-entry__cue">{presentation.cue}</span>
                        </div>
                        <h4><Link to={entry.href}>{entry.title}</Link></h4>
                      </div>
                    </div>
                    {entry.detail && <p className="journey-day-entry__detail">{entry.detail}</p>}
                  </article>;
                })}
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
          </div>
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
