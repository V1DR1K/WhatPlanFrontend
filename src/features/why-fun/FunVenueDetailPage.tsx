import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { StarRating } from "../../components/ui/StarRating";
import { showNotice } from "../../lib/flash";
import { mediaUrl, session } from "../../lib/api";
import type { FunPhoto, FunPlan } from "../../types/domain";
import { FunPhotoGallery } from "./FunPhotoGallery";
import { FunVenueForm } from "./FunVenueForm";
import {
  deleteFunPhoto,
  deleteFunPlan,
  getFunPlan,
  setFunCover,
} from "./whyFun";

const mapsSearch = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
const dateLabel = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("es-AR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "Todavía no tiene fecha";
const couple = ["tomas", "avril"];

export function FunVenueDetailPage() {
  const id = Number(useParams().id);
  const validId = Number.isInteger(id) && id > 0;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState<FunPhoto>();
  const planQuery = useQuery({
    queryKey: ["fun-plan", id],
    queryFn: () => getFunPlan(id),
    enabled: validId,
  });
  const invalidate = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["fun-plans"] }),
      qc.invalidateQueries({ queryKey: ["fun-plan", id] }),
    ]);
  const removePlan = useMutation({
    mutationFn: () => deleteFunPlan(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["fun-plans"] });
      showNotice("Eliminamos la salida.");
      navigate("/why-fun");
    },
  });
  const removePhoto = useMutation({
    mutationFn: (photoId: number) => deleteFunPhoto(photoId),
    onSuccess: async () => {
      await invalidate();
      showNotice("Eliminamos la foto.");
      setDeletingPhoto(undefined);
    },
  });
  const cover = useMutation({
    mutationFn: (photoId: number) => setFunCover(id, photoId),
    onSuccess: async () => {
      await invalidate();
      showNotice("Actualizamos la foto de portada.");
    },
  });
  if (
    !validId ||
    planQuery.isError ||
    (!planQuery.isLoading && !planQuery.data)
  )
    return (
      <section className="fun-detail">
        <Link to="/why-fun">← Volver a WhyFun</Link>
        <p className="form-error">
          No pudimos abrir esta salida. Probá nuevamente desde la lista.
        </p>
      </section>
    );
  if (planQuery.isLoading) return <p>Cargando salida…</p>;
  const plan = planQuery.data!;
  const username = session.get()?.username;
  const own = plan.author === username;
  const review = plan.reviews.find((value) => value.author === username);
  const hasOccurred = Boolean(
    plan.scheduledAt && new Date(plan.scheduledAt) <= new Date(),
  );
  return (
    <section className="fun-detail">
      <Link to="/why-fun">← Volver a WhyFun</Link>
      <div className="fun-detail__cover">
        {plan.coverPhoto ? (
          <img
            src={mediaUrl(plan.coverPhoto.url)}
            alt={`Foto de ${plan.name}`}
          />
        ) : (
          <span>{plan.subcategory.icon}</span>
        )}
      </div>
      <div className="fun-detail__head">
        <div className="fun-detail__summary">
          <p className="eyebrow">
            {hasOccurred
              ? "SALIDA REALIZADA"
              : plan.scheduledAt
                ? "PRÓXIMA SALIDA"
                : "FALTA FECHA"}
          </p>
          <h1>{plan.name}</h1>
          <div className="fun-detail__meta">
            <p className="eyebrow">
              {plan.category.icon} {plan.category.name} ·{" "}
              {plan.subcategory.icon} {plan.subcategory.name}
            </p>
            <p className="fun-plan-date">🗓️ {dateLabel(plan.scheduledAt)}</p>
            <a
              className="address-link"
              href={mapsSearch(plan.address)}
              target="_blank"
              rel="noreferrer"
            >
              📍 {plan.address} ↗
            </a>
            {plan.reviewCount > 0 && (
              <p className="fun-detail-rating">
                <strong>{plan.rating.toFixed(1)} ★</strong> Promedio de
                opiniones de esta salida
              </p>
            )}
          </div>
        </div>
        <div className="detail-actions">
          {!hasOccurred && (
            <p className="muted">
              Las opiniones se habilitan cuando termine la salida.
            </p>
          )}
          {own && (
            <button
              className="secondary-button"
              onClick={() => setEditing(true)}
            >
              ✎ Editar salida
            </button>
          )}
          {hasOccurred && (
            <button className="main-button" onClick={() => setReviewing(true)}>
              {review ? "✎ Editar opinión" : "★ Opinar sobre la salida"}
            </button>
          )}
          {own && (
            <button
              className="text-button"
              onClick={() => setConfirmingDelete(true)}
            >
              Borrar salida
            </button>
          )}
        </div>
      </div>
      <section className="fun-detail-grid">
        <div className="fun-detail-panel">
          <p className="eyebrow">CUÁNDO</p>
          <h2>El plan</h2>
          <p className="fun-plan-date fun-plan-date--large">
            {dateLabel(plan.scheduledAt)}
          </p>
          <p className="muted">
            Cada salida queda guardada por separado para que puedan repetir el
            lugar otro día sin perder el historial.
          </p>
        </div>
        <div className="fun-detail-panel">
          <p className="eyebrow">OPINIONES DE ESTA SALIDA</p>
          <h2>Cómo la pasaron</h2>
          {plan.reviewCount ? (
            <div className="fun-rating-summary">
              <strong>{plan.rating.toFixed(1)}</strong>
              <StarRating
                label="Promedio de opiniones"
                value={Math.round(plan.rating)}
              />
              <span>{plan.reviewCount} de 2 opiniones</span>
            </div>
          ) : (
            <p className="muted">Todavía no hay opiniones de esta salida.</p>
          )}
        </div>
      </section>
      <section className="fun-gallery-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">FOTOS</p>
            <h2>La salida</h2>
          </div>
          <strong>
            {plan.photos.length} foto{plan.photos.length === 1 ? "" : "s"}
          </strong>
        </div>
        {plan.photos.length ? (
          <FunPhotoGallery
            photos={plan.photos}
            planName={plan.name}
            coverPhotoId={plan.coverPhoto?.id}
            onDelete={own ? setDeletingPhoto : undefined}
            onSetCover={own ? (photo) => cover.mutate(photo.id) : undefined}
          />
        ) : (
          <p className="empty-state">Todavía no hay fotos de esta salida.</p>
        )}
        {(removePhoto.error || cover.error) && (
          <p className="form-error">
            {(removePhoto.error || cover.error)!.message}
          </p>
        )}
      </section>
      <section className="reviews-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">OPINIONES DE ESTA SALIDA</p>
            <h2>Tomás y Avril</h2>
          </div>
          <strong>{plan.reviewCount}/2</strong>
        </div>
        <div className="fun-review-columns">
          {couple.map((author) => (
            <ReviewCard
              key={author}
              plan={plan}
              author={author}
              currentUser={username}
              onEdit={() => setReviewing(true)}
            />
          ))}
        </div>
      </section>
      {editing && (
        <FunVenueForm plan={plan} onClose={() => setEditing(false)} />
      )}
      {reviewing && (
        <FunVenueForm
          plan={plan}
          reviewOnly
          onClose={() => setReviewing(false)}
        />
      )}
      {confirmingDelete && (
        <ConfirmDialog
          title="¿Borrar esta salida?"
          message={
            removePlan.error
              ? removePlan.error.message
              : "También se eliminarán sus fotos y opiniones."
          }
          confirmLabel="Borrar salida"
          pending={removePlan.isPending}
          onClose={() => setConfirmingDelete(false)}
          onConfirm={() => removePlan.mutate()}
        />
      )}
      {deletingPhoto && (
        <ConfirmDialog
          title="¿Quitar esta foto?"
          message="La foto se eliminará definitivamente de la salida."
          confirmLabel="Quitar foto"
          pending={removePhoto.isPending}
          onClose={() => setDeletingPhoto(undefined)}
          onConfirm={() => removePhoto.mutate(deletingPhoto.id)}
        />
      )}
    </section>
  );
}

function ReviewCard({
  plan,
  author,
  currentUser,
  onEdit,
}: {
  plan: FunPlan;
  author: string;
  currentUser?: string;
  onEdit: () => void;
}) {
  const review = plan.reviews.find((value) => value.author === author);
  const name = author === "tomas" ? "Tomás" : "Avril";
  return (
    <article className="fun-review-card">
      <div>
        <span className="review-avatar">{name[0]}</span>
        <h3>{currentUser === author ? "Tu opinión" : `Opinión de ${name}`}</h3>
        {currentUser === author && review && (
          <button
            className="icon-edit"
            type="button"
            onClick={onEdit}
            aria-label={`Editar opinión de ${name}`}
          >
            ✎
          </button>
        )}
      </div>
      {review ? (
        <>
          <StarRating label={`Puntuación de ${name}`} value={review.rating} />
          <p>{review.comment || "Sin comentario todavía."}</p>
          <small>
            Actualizada{" "}
            {new Intl.DateTimeFormat("es-AR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }).format(new Date(review.updatedAt))}
          </small>
        </>
      ) : (
        <p className="muted">{name} todavía no dejó su opinión.</p>
      )}
    </article>
  );
}
