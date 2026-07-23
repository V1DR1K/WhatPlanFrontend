import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { StarRating } from "../../components/ui/StarRating";
import { mediaUrl, session } from "../../lib/api";
import { showNotice } from "../../lib/flash";
import type { Cooking, CookingReview } from "../../types/domain";
import { CookingForm } from "./CookingForm";
import { CookingReviewForm } from "./CookingReviewForm";
import { RecipeForm } from "./RecipeForm";
import { deleteRecipe, getCookings, getRecipe } from "./homeRecipes";

const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "long", year: "numeric" })
    .format(new Date(`${date}T12:00:00`));
const mealName = (meal: string) =>
  ({ DESAYUNO: "Desayuno", ALMUERZO: "Almuerzo", MERIENDA: "Merienda", CENA: "Cena" })[
    meal as "DESAYUNO"
  ] ?? meal;

export function HomeRecipeDetailPage() {
  const id = Number(useParams().id);
  const validId = Number.isInteger(id) && id > 0;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editingRecipe, setEditingRecipe] = useState(false);
  const [editingCooking, setEditingCooking] = useState<Cooking | null | undefined>();
  const [selectedCookingId, setSelectedCookingId] = useState<number>();
  const [reviewing, setReviewing] = useState<CookingReview | null>();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const recipe = useQuery({ queryKey: ["recipe", id], queryFn: () => getRecipe(id), enabled: validId });
  const cookings = useQuery({ queryKey: ["cookings", id], queryFn: () => getCookings({ recipeId: id }), enabled: validId });
  const list = cookings.data ?? [];
  const current = list.find((cooking) => cooking.id === selectedCookingId);
  const invalidate = () => Promise.all([
    qc.invalidateQueries({ queryKey: ["recipes"] }),
    qc.invalidateQueries({ queryKey: ["recipe", id] }),
    qc.invalidateQueries({ queryKey: ["cookings"] }),
  ]);
  const removeRecipe = useMutation({
    mutationFn: () => deleteRecipe(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["recipes"] });
      showNotice("Eliminamos la receta.");
      navigate("/how-cook");
    },
  });

  useEffect(() => {
    if (list.length && !list.some((cooking) => cooking.id === selectedCookingId)) {
      setSelectedCookingId(list[0].id);
    }
  }, [list, selectedCookingId]);

  if (!validId || recipe.isError || (!recipe.isLoading && !recipe.data)) {
    return <section className="home-recipe-detail"><p className="form-error">No pudimos abrir esta receta.</p></section>;
  }
  if (recipe.isLoading) return <p className="muted" aria-busy="true">Cargando receta…</p>;

  const value = recipe.data!;
  const profilePhoto = value.photoUrl ?? value.thumbnailUrl;
  const ownReview = current?.reviews.find((review) => review.author === session.get()?.username);
  return (
    <section className="home-recipe-detail">
      <div className="home-recipe-detail__head">
        <div className="home-recipe-detail__photo">
          {profilePhoto ? <img className="home-recipe-detail__image" src={mediaUrl(profilePhoto)} alt={`Foto de ${value.name}`} /> : <div className="home-recipe-detail__photo-empty"><span>🍳</span><p>Receta</p></div>}
        </div>
        <div className="home-recipe-detail__summary">
          <p className="eyebrow">WHOCOOK · RECETA COMPARTIDA</p>
          <h1>{value.name}</h1>
          <p className="byline">Creada por {value.createdBy} · editada por {value.updatedBy}</p>
          {value.sourceUrl && <a className="source-link" href={value.sourceUrl} target="_blank" rel="noreferrer">↗ Ver fuente original</a>}
        </div>
        <div className="detail-actions home-recipe-detail__actions">
          <button className="main-button" type="button" onClick={() => setEditingCooking(null)}>＋ Registrar cocinada</button>
          <button className="secondary-button" type="button" onClick={() => setEditingRecipe(true)}>✎ Editar receta</button>
          <button className="danger-button home-recipe-delete" type="button" onClick={() => setConfirmingDelete(true)}>× Borrar receta</button>
        </div>
      </div>
      <section className="home-recipe-detail__content">
        <div className="home-recipe-detail__panel"><p className="eyebrow">INGREDIENTES</p><h2>Lo que hace falta</h2><ul>{value.ingredients.map((ingredient, index) => <li key={`${ingredient.name}-${index}`}><strong>{ingredient.quantity} {ingredient.unit}</strong> {ingredient.name}</li>)}</ul></div>
        <div className="home-recipe-detail__panel"><p className="eyebrow">RECETA</p><h2>Cómo se hace</h2><ol className="recipe-steps">{value.steps.map((step, index) => <li key={`${step.instruction}-${index}`}>{step.instruction}</li>)}</ol></div>
      </section>
      <section className="reviews-section">
        <div className="section-title"><div><p className="eyebrow">HISTORIAL DE COCINADAS</p><h2>Veces que la hicieron</h2></div><strong>{list.length}</strong></div>
        {list.length ? <>
          <div className="item-date-pager">
            <label>
              Elegir cocinada
              <select value={selectedCookingId ?? ""} onChange={(event) => setSelectedCookingId(Number(event.target.value))}>
                {list.map((cooking) => <option key={cooking.id} value={cooking.id}>{dateLabel(cooking.cookedOn)} · {mealName(cooking.mealType)} · {cooking.createdBy}</option>)}
              </select>
            </label>
            {current && <>
              <button className="secondary-button" type="button" onClick={() => setEditingCooking(current)}>✎ Editar cocinada</button>
              <button className="secondary-button" type="button" onClick={() => setReviewing(ownReview ?? null)}>{ownReview ? "✎ Editar reseña" : "＋ Agregar reseña"}</button>
            </>}
          </div>
          {current && <CookingExperience cooking={current} />}
        </> : <p className="empty-state">Todavía no cocinaron esta receta. Registren la primera vez para guardar su historial y reseñas.</p>}
      </section>
      {editingRecipe && <RecipeForm recipe={value} onClose={() => setEditingRecipe(false)} />}
      {editingCooking !== undefined && <CookingForm recipe={value} cooking={editingCooking ?? undefined} onClose={() => setEditingCooking(undefined)} onSaved={(saved) => setSelectedCookingId(saved.id)} />}
      {reviewing !== undefined && current && <CookingReviewForm cooking={current} review={reviewing ?? undefined} onClose={() => setReviewing(undefined)} />}
      {confirmingDelete && <ConfirmDialog title="¿Borrar esta receta?" message={removeRecipe.error ? removeRecipe.error.message : "Solo podés borrarla si no tiene cocinadas registradas."} confirmLabel="Borrar receta" pending={removeRecipe.isPending} onClose={() => setConfirmingDelete(false)} onConfirm={() => removeRecipe.mutate()} />}
    </section>
  );
}

function CookingExperience({ cooking }: { cooking: Cooking }) {
  return (
    <div className="experience-detail">
      <p className="muted">{dateLabel(cooking.cookedOn)} · {mealName(cooking.mealType)} · {cooking.home === "TOMAS" ? "🏠 Casa de Tomás" : "🏡 Casa de Avril"} · {cooking.servings} porciones. Registrada por {cooking.createdBy}.</p>
      <section className="reviews-section">
        <div className="section-title section-title--compact"><div><p className="eyebrow">RESEÑAS</p><h2>Cómo salió</h2></div><strong>{cooking.reviews.length}</strong></div>
        {cooking.reviews.length ? <div className="home-recipe-review-columns">{cooking.reviews.map((review) => <article className="home-recipe-review" key={review.id}><div><span className="review-avatar">{review.author[0]?.toUpperCase()}</span><h3>Reseña de {review.author}</h3></div><StarRating label={`Puntuación de ${review.author}`} value={review.rating} /><p>{review.comment || "Sin comentario."}</p><small>Creada por {review.author} · editada por {review.updatedBy}</small></article>)}</div> : <p className="empty-state">Todavía no hay reseñas para esta cocinada.</p>}
      </section>
    </div>
  );
}
