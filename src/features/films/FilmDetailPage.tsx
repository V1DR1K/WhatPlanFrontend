import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { SegmentedLevel } from "../../components/ui/SegmentedLevel";
import { StarRating } from "../../components/ui/StarRating";
import { mediaUrl, session } from "../../lib/api";
import { showNotice } from "../../lib/flash";
import type { FilmReview, FilmView } from "../../types/domain";
import { FilmForm } from "./FilmForm";
import { FilmReviewForm } from "./FilmReviewForm";
import { FilmViewForm } from "./FilmViewForm";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EntityDetailActions, EntityDetailHeader } from "../../components/ui/EntityDetailHeader";
import { Button } from "../../components/ui/Button";
import { deleteFilm, deleteFilmView, getFilm } from "./films";
import { filmReviewMetrics, metricLevel } from "./reviewMetrics";

const viewedLabel = (date?: string) =>
  date
    ? `VISTA ${date.split("-").reverse().join("/")}`
    : "PARA VER";

export function FilmDetailPage() {
  const id = Number(useParams().id);
  const validId = Number.isInteger(id) && id > 0;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [addingView, setAddingView] = useState(false);
  const [editingView, setEditingView] = useState<FilmView>();
  const [reviewing, setReviewing] = useState<{
    view: FilmView;
    review?: FilmReview;
  }>();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingDeleteView, setConfirmingDeleteView] = useState<FilmView>();
  const [selectedViewId, setSelectedViewId] = useState<number>();
  const filmQuery = useQuery({
    queryKey: ["film", id],
    queryFn: () => getFilm(id),
    enabled: validId,
  });
  const remove = useMutation({
    mutationFn: () => deleteFilm(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["films"] });
      showNotice("Eliminamos la película y su historial.");
      navigate("/films");
    },
  });
  const removeView = useMutation({
    mutationFn: (view: FilmView) => deleteFilmView(id, view.id),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["film", id] }),
        qc.invalidateQueries({ queryKey: ["films"] }),
      ]);
      showNotice("Eliminamos la vista y sus reseñas asociadas.");
      setConfirmingDeleteView(undefined);
      setSelectedViewId(undefined);
    },
  });
  const views = filmQuery.data?.views ?? [];
  useEffect(() => {
    if (views.length && !views.some((view) => view.id === selectedViewId))
      setSelectedViewId(views[0].id);
  }, [selectedViewId, views]);

  if (
    !validId ||
    filmQuery.isError ||
    (!filmQuery.isLoading && !filmQuery.data)
  )
    return <section className="film-detail"><p className="form-error">No pudimos abrir esta película. Probá nuevamente desde la sala.</p></section>;
  if (filmQuery.isLoading) return <p>Cargando película…</p>;

  const film = filmQuery.data!;
  const selectedView = views.find((view) => view.id === selectedViewId);
  const selectedViewIndex = views.findIndex(
    (view) => view.id === selectedViewId,
  );
  const visitNumber =
    selectedViewIndex < 0 ? 0 : views.length - selectedViewIndex;
  const username = session.get()?.username;
  const ownReview = selectedView?.reviews.find(
    (review) => review.author === username,
  );
  const tmdb = film.tmdb;
  const title = tmdb?.title ?? film.title;
  const posterUrl = film.posterUrl ?? tmdb?.posterFullUrl ?? tmdb?.posterUrl;
  const genres = tmdb?.genres.length ? tmdb.genres : film.genres;
  const synopsis = tmdb?.synopsis ?? film.synopsis;
  const releaseDate = tmdb?.releaseDate ?? film.releaseDate;
  const cast = tmdb?.cast ?? [];
  const visibleCast = cast.slice(0, 8);
  const hiddenCastCount = cast.length - visibleCast.length;
  const viewAction = film.watchedCount
    ? "Registrar otra vista"
    : "Registrar primera vista";

  return (
    <section className="film-detail">
      <EntityDetailHeader
        actions={
          <EntityDetailActions
            destructive={{
              disabled: remove.isPending,
              label: remove.isPending ? "Borrando película…" : "Borrar película",
              onClick: () => setConfirmingDelete(true),
            }}
            primary={{ icon: "🎬", label: viewAction, onClick: () => setAddingView(true) }}
            secondary={{ label: "Editar película", onClick: () => setEditing(true) }}
          />
        }
        className="film-detail__head"
        eyebrow={
          <>
            {viewedLabel(film.lastWatchedOn)} ·{" "}
            {film.platform
              ? `${film.platform.icon} ${film.platform.name}`
              : "PLATAFORMA PENDIENTE"}
          </>
        }
        media={
          <div className="film-detail__poster">
          {posterUrl ? (
            <img src={mediaUrl(posterUrl)} alt={`Póster de ${title}`} />
          ) : (
            <span>🍿</span>
          )}
          </div>
        }
        metadata={
          <>
          {tmdb?.originalTitle && tmdb.originalTitle !== title && (
            <p className="tmdb-original-title">{tmdb.originalTitle}</p>
          )}
          <div className="genre-pills genre-pills--detail">
            {genres.map((genre) => (
              <span key={genre}>{genre}</span>
            ))}
          </div>
          </>
        }
        summary={
          <p className="film-synopsis">
            {synopsis || "Todavía no hay una sinopsis disponible."}
          </p>
        }
        title={title}
      />
      {tmdb && (
        <section className="tmdb-film-info">
          <div className="tmdb-film-stats">
            <article>
              <span>Estreno</span>
              <strong>
                {releaseDate ? releaseDate.slice(0, 4) : "Sin fecha"}
              </strong>
            </article>
            <article>
              <span>Duración</span>
              <strong>
                {tmdb.runtime ? `${tmdb.runtime} min` : "Sin dato"}
              </strong>
            </article>
            <article>
              <span>Dirección</span>
              <strong>{tmdb.director ?? "Sin dato"}</strong>
            </article>
            <article>
              <span>TMDB</span>
              <strong>
                {tmdb.voteAverage !== undefined
                  ? `${tmdb.voteAverage.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}/10`
                  : "Sin puntaje"}
              </strong>
              {tmdb.voteCount !== undefined && (
                <small>{tmdb.voteCount.toLocaleString("es-AR")} votos</small>
              )}
            </article>
          </div>
          {tmdb.trailerUrl && (
            <a
              className="tmdb-trailer-link"
              href={tmdb.trailerUrl}
              target="_blank"
              rel="noreferrer"
            >
              Ver tráiler en YouTube <span aria-hidden="true">↗</span>
            </a>
          )}
          {!!cast.length && (
            <section className="tmdb-cast">
              <div className="section-title">
                <div>
                  <p className="eyebrow">DESDE TMDB</p>
                  <h2>El reparto</h2>
                </div>
              </div>
              <div className="tmdb-cast-grid">
                {visibleCast.map((member) => (
                  <article key={`${member.name}-${member.character ?? ""}`}>
                    {member.profileUrl ? (
                      <img
                        src={mediaUrl(member.profileUrl)}
                        alt={`Foto de ${member.name}`}
                        loading="lazy"
                      />
                    ) : (
                      <span aria-hidden="true">🎭</span>
                    )}
                    <div>
                      <h3 title={member.name}>{member.name}</h3>
                      <p title={member.character || "Reparto"}>{member.character || "Reparto"}</p>
                    </div>
                  </article>
                ))}
                {hiddenCastCount > 0 && <article className="tmdb-cast-grid__more" aria-label={`${hiddenCastCount} integrantes más`}><strong>+{hiddenCastCount}</strong><small>más</small></article>}
              </div>
            </section>
          )}
          <p className="tmdb-attribution">
            Datos e imágenes de{" "}
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noreferrer"
            >
              TMDB
            </a>
            . This product uses the TMDB API but is not endorsed or certified by
            TMDB.
          </p>
        </section>
      )}
      <section className="watch-counter" aria-label="Contador de veces vistas">
        <div className="watch-counter__content">
          <p className="eyebrow">HISTORIAL COMPARTIDO</p>
          <h2>
            {film.watchedCount === 0
              ? "Todavía no la vieron"
              : `${film.watchedCount} ${film.watchedCount === 1 ? "vez" : "veces"}`}
          </h2>
          <p>Última vista: {viewedLabel(film.lastWatchedOn)}</p>
        </div>
      </section>
      <section className="reviews-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">HISTORIAL DE VISTAS</p>
            <h2>Vistas registradas</h2>
          </div>
          <strong>{views.length}</strong>
        </div>
        {!!views.length && (
          <div className="item-date-pager" aria-label="Navegar vistas">
            <label>
              Vista #{visitNumber}
              <select
                value={selectedViewId ?? ""}
                onChange={(event) =>
                  setSelectedViewId(Number(event.target.value))
                }
              >
                {views.map((view, index) => (
                  <option key={view.id} value={view.id}>
                    Vista #{views.length - index} ·{" "}
                     {viewedLabel(view.watchedOn)}
                  </option>
                ))}
              </select>
            </label>
            {selectedView && <div className="item-date-pager__actions"><Button icon="✏️" variant="secondary" type="button" onClick={() => setEditingView(selectedView)}>Editar vista</Button><Button icon="🗑️" variant="destructive" type="button" onClick={() => setConfirmingDeleteView(selectedView)}>Borrar vista</Button></div>}
          </div>
        )}
        {selectedView && (
          <>
            <p className="muted">
              Vista del{" "}
               {viewedLabel(selectedView.watchedOn)}.
              Registrada por {selectedView.createdBy}; última edición de {selectedView.updatedBy}.
            </p>
            <div className="section-title section-title--compact">
              <div>
                <p className="eyebrow">RESEÑAS DE ESTA VISTA</p>
                <h2>Qué les pareció</h2>
              </div>
              <strong>{selectedView.reviews.length}/2</strong>
            </div>
            <div className="film-review-columns">
              {selectedView.reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  visitNumber={visitNumber}
                />
              ))}
            </div>
            <div className="experience-review-action">
              <Button icon={ownReview ? "✏️" : "💬"} variant="secondary" type="button" onClick={() => setReviewing({ view: selectedView, review: ownReview })}>
                {ownReview ? "Editar reseña" : "Agregar reseña"}
              </Button>
            </div>
          </>
        )}
        {!views.length && (
          <p className="empty-state">
            Todavía no hay vistas. Registren la primera cuando la vean.
          </p>
        )}
      </section>
      {editing && <FilmForm film={film} onClose={() => setEditing(false)} />}
      {addingView && (
        <FilmViewForm
          film={film}
          onClose={() => setAddingView(false)}
          onSaved={(view) => {
            setSelectedViewId(view.id);
            setAddingView(false);
          }}
        />
      )}
      {editingView && (
        <FilmViewForm
          film={film}
          view={editingView}
          onClose={() => setEditingView(undefined)}
          onSaved={(view) => {
            setSelectedViewId(view.id);
            setEditingView(undefined);
          }}
        />
      )}
      {reviewing && (
        <FilmReviewForm
          film={film}
          view={reviewing.view}
          review={reviewing.review}
          onClose={() => setReviewing(undefined)}
        />
      )}
      {confirmingDelete && (
        <ConfirmDialog
          title="¿Borrar esta película?"
          message={
            remove.error
              ? remove.error.message
              : "Se eliminará de la lista junto con sus vistas y reseñas."
          }
          confirmLabel="Borrar película"
          pending={remove.isPending}
          onClose={() => setConfirmingDelete(false)}
          onConfirm={() => remove.mutate()}
        />
      )}
      {confirmingDeleteView && (
        <ConfirmDialog
          title="¿Borrar esta vista?"
          message={
            removeView.error
              ? removeView.error.message
              : `También se eliminarán sus ${confirmingDeleteView.reviews.length} reseña${confirmingDeleteView.reviews.length === 1 ? "" : "s"}.`
          }
          confirmLabel="Borrar vista"
          pending={removeView.isPending}
          onClose={() => setConfirmingDeleteView(undefined)}
          onConfirm={() => removeView.mutate(confirmingDeleteView)}
        />
      )}
    </section>
  );
}

function ReviewCard({
  review,
  visitNumber,
}: {
  review: FilmReview;
  visitNumber: number;
}) {
  const own = review.author === session.get()?.username;
   const author = review.author;
  const initial = author[0].toUpperCase();
  const authorLabel =
    review.author === "tomas"
      ? "Tomás"
      : review.author === "avril"
        ? "Avril"
        : author;
  return (
    <article className="film-review-card">
      <div>
        <span className="review-avatar">{initial}</span>
        <h3>{own ? "Tu reseña" : `Reseña de ${authorLabel}`}</h3>
      </div>
      <div className="review-score">
        <StarRating
          label={`Puntuación de ${authorLabel}`}
          value={review.rating}
        />
        <span>{scoreLabel(review.rating)}</span>
      </div>
      <div className="film-review-metrics">
        {filmReviewMetrics.map((metric) => {
          const value = review.metrics?.[metric.key];
          return (
            <div key={metric.key}>
              <span>{metric.shortLabel}</span>
              <SegmentedLevel
                label={`${metric.label} de ${authorLabel}`}
                levels={metric.levels}
                value={value}
              />
              <small>{metricLevel(metric.levels, value)} · {scoreLabel(value)}</small>
            </div>
          );
        })}
      </div>
      <p className="film-review-comment">
        {review.comment || "Sin comentario todavía."}
      </p>
      {review.favoriteCharacter && <small>Personaje favorito: {review.favoriteCharacter}</small>}
      <small>Vista #{visitNumber}</small>
    </article>
  );
}

function scoreLabel(value?: number) {
  return value === undefined || value === null ? "—" : `${value}/5`;
}
