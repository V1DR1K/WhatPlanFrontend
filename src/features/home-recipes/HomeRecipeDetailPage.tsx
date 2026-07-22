import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { StarRating } from "../../components/ui/StarRating";
import { showNotice } from "../../lib/flash";
import { mediaUrl, session } from "../../lib/api";
import type { HomeRecipe, HomeRecipeReview } from "../../types/domain";
import { HomeRecipeForm } from "./HomeRecipeForm";
import { HomeRecipeReviewForm } from "./HomeRecipeReviewForm";
import { deleteHomeRecipe, getHomeRecipe } from "./homeRecipes";

const homeName = (home: HomeRecipe["home"]) =>
  home === "TOMAS" ? "Tomás" : "Avril";
const mealName = (meal: HomeRecipe["mealType"]) =>
  ({
    DESAYUNO: "Desayuno",
    ALMUERZO: "Almuerzo",
    MERIENDA: "Merienda",
    CENA: "Cena",
  })[meal];
const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
const ingredientLabel = (ingredient: HomeRecipe["ingredients"][number]) =>
  `${ingredient.quantity === undefined ? "" : `${ingredient.quantity} `}${ingredient.unit} ${ingredient.name}`;
const reviewers = ["tomas", "avril"];

export function HomeRecipeDetailPage() {
  const id = Number(useParams().id);
  const validId = Number.isInteger(id) && id > 0;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [repeating, setRepeating] = useState(false);
  const [reviewing, setReviewing] = useState<HomeRecipeReview | null>();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const recipeQuery = useQuery({
    queryKey: ["home-recipe", id],
    queryFn: () => getHomeRecipe(id),
    enabled: validId,
  });
  const remove = useMutation({
    mutationFn: () => deleteHomeRecipe(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["home-recipes", "TOMAS"] }),
        queryClient.invalidateQueries({ queryKey: ["home-recipes", "AVRIL"] }),
        queryClient.removeQueries({ queryKey: ["home-recipe", id] }),
      ]);
      showNotice("Eliminamos la receta.");
      navigate("/how-cook");
    },
  });

  if (
    !validId ||
    recipeQuery.isError ||
    (!recipeQuery.isLoading && !recipeQuery.data)
  )
    return (
      <section className="home-recipe-detail">
        <Link to="/how-cook">← Volver a HowCook</Link>
        <p className="form-error">
          No pudimos abrir esta receta. Probá nuevamente desde HowCook.
        </p>
      </section>
    );
  if (recipeQuery.isLoading) return <p>Cargando receta…</p>;

  const recipe = recipeQuery.data!;
  const username = session.get()?.username;
  const canManageRecipe = session.get()?.role === "ADMIN" || recipe.author === username;

  return (
    <section className="home-recipe-detail">
      <Link to="/how-cook">← Volver a HowCook</Link>
      <div className="home-recipe-detail__head">
        <RecipePhoto key={recipe.id} recipe={recipe} />
        <div className="home-recipe-detail__summary">
          <p className="eyebrow">
            {recipe.home === "TOMAS" ? "🏠 CASA TOMÁS" : "🏡 CASA AVRIL"} ·{" "}
            {mealName(recipe.mealType).toUpperCase()}
          </p>
          <h1>{recipe.name}</h1>
          <div className="home-recipe-detail__author">
            <span>{recipe.author[0]?.toUpperCase()}</span>
            <p>
              <strong>Preparó {recipe.author}</strong>
              <small>
                {dateLabel(recipe.preparedOn)} · Casa de {homeName(recipe.home)}{" "}
                · {recipe.servings} porciones
              </small>
            </p>
          </div>
          {recipe.repeatedFrom && (
            <p className="muted">
              ↻ Esta preparación repite{" "}
              <Link to={`/how-cook/${recipe.repeatedFrom.id}`}>
                {recipe.repeatedFrom.name}
              </Link>
              .
            </p>
          )}
        </div>
        <div className="detail-actions home-recipe-detail__actions">
          {canManageRecipe && (
            <button
              className="secondary-button"
              type="button"
              onClick={() => setEditing(true)}
            >
              <span aria-hidden="true">✎</span> Editar receta
            </button>
          )}
          <button
            className="secondary-button"
            type="button"
            onClick={() => setRepeating(true)}
          >
            <span aria-hidden="true">↻</span> Repetir receta
          </button>
          {canManageRecipe && (
            <button
              className="text-button home-recipe-delete"
              type="button"
              disabled={remove.isPending}
              onClick={() => setConfirmingDelete(true)}
            >
              {remove.isPending ? "Borrando…" : "Borrar receta"}
            </button>
          )}
        </div>
      </div>
      <section className="home-recipe-detail__content">
        <div className="home-recipe-detail__panel">
          <p className="eyebrow">INGREDIENTES</p>
          <h2>Para {recipe.servings} porciones</h2>
          <ul>
            {recipe.ingredients.map((ingredient, index) => (
              <li key={`${ingredient.name}-${index}`}>
                <strong>{ingredientLabel(ingredient)}</strong>
              </li>
            ))}
          </ul>
        </div>
        <div className="home-recipe-detail__panel">
          <p className="eyebrow">RECETA</p>
          <h2>Cómo se hace</h2>
          <ol className="recipe-steps">
            {recipe.steps.map((step, index) => (
              <li key={`${step.instruction}-${index}`}>{step.instruction}</li>
            ))}
          </ol>
          {recipe.recipeUrl && (
            <a
              className="secondary-button recipe-detail-button"
              href={recipe.recipeUrl}
              target="_blank"
              rel="noreferrer"
            >
              Ver fuente original ↗
            </a>
          )}
        </div>
      </section>
      {recipe.repetitions.length > 0 && (
        <section className="home-recipe-repetitions">
          <p className="eyebrow">HISTORIAL</p>
          <h2>La volvieron a preparar</h2>
          <div>
            {recipe.repetitions.map((repetition) => (
              <Link key={repetition.id} to={`/how-cook/${repetition.id}`}>
                ↻ {repetition.name}
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="reviews-section home-recipe-reviews">
        <div className="section-title">
          <div>
            <p className="eyebrow">RESEÑAS DE ESTA PREPARACIÓN</p>
            <h2>Tomás y Avril</h2>
          </div>
          <strong>{recipe.reviews.length}/2</strong>
        </div>
        <div className="home-recipe-review-columns">
          {reviewers.map((author) => (
            <ReviewCard
              key={author}
              author={author}
              currentUser={username}
              review={recipe.reviews.find((value) => value.author === author)}
              canManage={session.get()?.role === "ADMIN" || author === username}
              onReview={(review) => setReviewing(review ?? null)}
            />
          ))}
        </div>
      </section>
      {confirmingDelete && (
        <ConfirmDialog
          title="¿Borrar esta receta?"
          message={
            remove.error
              ? remove.error.message
              : "La receta y su foto dejarán de estar disponibles en la casa."
          }
          confirmLabel="Borrar receta"
          pending={remove.isPending}
          onClose={() => setConfirmingDelete(false)}
          onConfirm={() => remove.mutate()}
        />
      )}
      {editing && (
        <HomeRecipeForm
          home={recipe.home}
          recipe={recipe}
          onClose={() => setEditing(false)}
          onDeleted={() => navigate("/how-cook")}
        />
      )}
      {repeating && (
        <HomeRecipeForm
          home={recipe.home}
          copyOf={recipe}
          onClose={() => setRepeating(false)}
        />
      )}
      {reviewing !== undefined && (
        <HomeRecipeReviewForm
          recipe={recipe}
          review={reviewing ?? undefined}
          onClose={() => setReviewing(undefined)}
        />
      )}
    </section>
  );
}

function RecipePhoto({ recipe }: { recipe: HomeRecipe }) {
  const [imageState, setImageState] = useState<
    "primary" | "thumbnail" | "unavailable"
  >("primary");
  const primary = recipe.photoUrl ?? recipe.thumbnailUrl;
  const thumbnail =
    recipe.photoUrl && recipe.thumbnailUrl ? recipe.thumbnailUrl : undefined;
  const image =
    imageState === "primary"
      ? primary
      : imageState === "thumbnail"
        ? thumbnail
        : undefined;
  const portrait =
    !!recipe.photoWidth &&
    !!recipe.photoHeight &&
    recipe.photoHeight > recipe.photoWidth;
  return (
    <div className="home-recipe-detail__photo">
      {image ? (
        <img
          className={
            portrait
              ? "home-recipe-detail__image home-recipe-detail__image--portrait"
              : "home-recipe-detail__image"
          }
          src={mediaUrl(image)}
          alt={`Foto de ${recipe.name}`}
          onError={() =>
            setImageState((current) =>
              current === "primary" && thumbnail && thumbnail !== primary
                ? "thumbnail"
                : "unavailable",
            )
          }
        />
      ) : (
        <div className="home-recipe-detail__photo-empty">
          <span>🍳</span>
          <p>Sin foto</p>
        </div>
      )}
    </div>
  );
}

function ReviewCard({
  author,
  currentUser,
  review,
  canManage,
  onReview,
}: {
  author: string;
  currentUser?: string;
  review?: HomeRecipeReview;
  canManage: boolean;
  onReview: (review?: HomeRecipeReview) => void;
}) {
  const name = author === "tomas" ? "Tomás" : "Avril";
  const own = author === currentUser;
  return (
    <article className="home-recipe-review">
      <div>
        <span className="review-avatar">{name[0]}</span>
        <h3>{own ? "Tu reseña" : `Reseña de ${name}`}</h3>
        {canManage && review && (
          <button
            className="icon-edit"
            type="button"
            aria-label={`Editar reseña de ${name}`}
            onClick={() => onReview(review)}
          >
            ✎
          </button>
        )}
      </div>
      {review ? (
        <>
          <StarRating label={`Puntuación de ${name}`} value={review.rating} />
          <p>{review.comment || ""}</p>
          <small>
            Actualizada{" "}
            {new Intl.DateTimeFormat("es-AR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }).format(new Date(review.updatedAt))}
          </small>
        </>
      ) : own ? (
        <button className="secondary-button" type="button" onClick={() => onReview()}>
          Escribir mi reseña
        </button>
      ) : (
        <p className="muted"></p>
      )}
    </article>
  );
}
