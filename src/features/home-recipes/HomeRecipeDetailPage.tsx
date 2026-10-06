import { ExperienceJourneyPanel } from '../journey/ExperienceJourneyPanel';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery } from '../../lib/locationQuery';
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useInAppBackGuard } from "../../lib/backGuard";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EntityDetailActions, EntityDetailHeader } from "../../components/ui/EntityDetailHeader";
import { RecordIterator } from "../../components/ui/RecordIterator";
import { Button } from "../../components/ui/Button";
import { StarRating } from "../../components/ui/StarRating";
import { RatingStars } from "../../components/ui/RatingStars";
import { ImportantDatesLink } from "../../components/ui/ImportantDatesLink";
import { session } from "../../lib/api";
import { ExpandablePhoto } from "../../components/ui/ExpandablePhoto";
import { showNotice } from "../../lib/flash";
import type { Cooking, CookingReview, SpecialDate } from "../../types/domain";
import { CookingForm } from "./CookingForm";
import { CookingReviewForm } from "./CookingReviewForm";
import { RecipeForm } from "./RecipeForm";
import { deleteRecipe, getCookings, getRecipe } from "./homeRecipes";
import { SpecialDateLabels, specialDateOptionSuffix } from "../special-dates/SpecialDateLabels";
import { getSpecialDates } from "../special-dates/specialDates";
import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";
import { useZoneContext } from "../../lib/zoneContext";
import { homeName } from "../../lib/homeLabels";

const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "long", year: "numeric" })
    .format(new Date(`${date}T12:00:00`));
const mealName = (meal: string) =>
  ({ DESAYUNO: "Desayuno", ALMUERZO: "Almuerzo", MERIENDA: "Merienda", CENA: "Cena" })[
    meal as "DESAYUNO"
  ] ?? meal;
const average = (values: number[]) =>
  values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : undefined;

export function HomeRecipeDetailPage() {
  const id = Number(useParams().id);
  const validId = Number.isInteger(id) && id > 0;
  const navigate = useNavigate();
  useInAppBackGuard("/app/how-cook");
  const qc = useQueryClient();
  const [editingRecipe, setEditingRecipe] = useState(false);
  const [editingCooking, setEditingCooking] = useState<Cooking | null | undefined>(() => new URLSearchParams(window.location.search).get("journeyAction") === "register" ? null : undefined);
  const [selectedCookingId, setSelectedCookingId] = useState<number>();
  const [reviewing, setReviewing] = useState<CookingReview | null>();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const recipe = useQuery({ queryKey: ["recipe", id], queryFn: () => getRecipe(id), enabled: validId });
  const cookings = useQuery({ queryKey: ["cookings", id], queryFn: () => getCookings({ recipeId: id }), enabled: validId });
  const specialDates = useQuery({ queryKey: ["special-dates"], queryFn: getSpecialDates, enabled: validId });
  const list = cookings.data ?? [];
  const specialDateList = specialDates.data ?? [];
  const current = list.find((cooking) => cooking.id === selectedCookingId);
  const reviews = list.flatMap((cooking) => cooking.reviews);
  const ratingAverage = average(reviews.map((review) => review.rating));
  const complexityAverage = average(reviews.map((review) => review.complexity ?? 1));
  const tasteAverage = average(reviews.map((review) => review.taste ?? review.rating));
  const removeRecipe = useMutation({
    mutationFn: () => deleteRecipe(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["journey-day"] });
      await qc.invalidateQueries({ queryKey: ["recipes"] });
      showNotice("Eliminamos la receta.");
      navigate("/app/how-cook");
    },
  });

  useEffect(() => {
    if (list.length && !list.some((cooking) => cooking.id === selectedCookingId)) {
      setSelectedCookingId(list[0].id);
    }
  }, [list, selectedCookingId]);

  if (!validId || recipe.isError || (!recipe.isLoading && !recipe.data)) {
    return <section className="home-recipe-detail"><p className="form-error" role="alert">No pudimos abrir esta receta.</p></section>;
  }
  if (recipe.isLoading) return <LoadingSkeleton variant="detail" section="cook" />;

  const value = recipe.data!;
  const profilePhoto = value.photoUrl ?? value.thumbnailUrl;
  const ownReview = current?.reviews.find((review) => review.author === session.get()?.username);
  return (
    <section className="home-recipe-detail">
      <Link className="section-back" to="/app/how-cook">← Volver a WhoCook</Link>
      <EntityDetailHeader
        actions={
          <EntityDetailActions
            destructive={{ label: "Borrar receta", onClick: () => setConfirmingDelete(true) }}
            primary={{ icon: "🍳", label: "Registrar cocinada", onClick: () => setEditingCooking(null) }}
            secondary={{ label: "Editar receta", onClick: () => setEditingRecipe(true) }}
          />
        }
        className="home-recipe-detail__head"
        eyebrow="WHOCOOK · RECETA COMPARTIDA"
        media={
          <div className="home-recipe-detail__photo">
          {profilePhoto ? <ExpandablePhoto imageClassName="home-recipe-detail__image" src={profilePhoto} alt={`Foto de ${value.name}`} width={720} height={480} /> : <div className="home-recipe-detail__photo-empty"><span>🍳</span><p>Receta</p></div>}
          </div>
        }
        metadata={
          <>
          <p className="byline">Creada por {value.createdBy} · editada por {value.updatedBy}</p>
          {value.sourceUrl && <a className="source-link" href={value.sourceUrl} target="_blank" rel="noreferrer">↗ Ver fuente original</a>}
          </>
        }
        summary={<ImportantDatesLink date={current?.cookedOn} specialDates={specialDateList} />}
        title={value.name}
      />
      <section className="rating-breakdown rating-breakdown--cook" aria-label="Promedios de la receta">
        <div className="rating-breakdown__experience">
          <span>🍳 Nota promedio</span>
          <RatingStars label="Nota promedio de la receta" value={ratingAverage} />
          <small>Calculada sobre todas las reseñas de sus cocinadas.</small>
        </div>
        <div className="rating-breakdown__metrics">
          <div>
            <span>😋 Sabor</span>
            <RatingStars label="Sabor promedio de la receta" value={tasteAverage} />
          </div>
          <div>
            <span>🧩 Complejidad</span>
            <RatingStars label="Complejidad promedio de la receta" value={complexityAverage} />
          </div>
        </div>
      </section>
      <section className="home-recipe-detail__content">
        <div className="home-recipe-detail__panel"><p className="eyebrow">INGREDIENTES</p><h2>Lo que hace falta</h2><ul>{value.ingredients.map((ingredient, index) => <li key={`${ingredient.name}-${index}`}><strong>{ingredient.quantity} {ingredient.unit}</strong> {ingredient.name}</li>)}</ul></div>
        <div className="home-recipe-detail__panel"><p className="eyebrow">RECETA</p><h2>Cómo se hace</h2><ol className="recipe-steps">{value.steps.map((step, index) => <li key={`${step.instruction}-${index}`}>{step.instruction}</li>)}</ol></div>
      </section>
      <section className="reviews-section">
        <div className="section-title"><div><p className="eyebrow">HISTORIAL DE COCINADAS</p><h2>Veces que la hicieron</h2></div><strong>{list.length}</strong></div>
        {cookings.isLoading ? <LoadingSkeleton variant="experience" section="cook" compactExperience /> : list.length ? <>
          <div className="item-date-pager">
            <RecordIterator
              ariaLabel="Navegar cocinadas"
              label="Cocinada"
              value={String(selectedCookingId ?? "")}
              options={list.map((cooking) => ({ value: String(cooking.id), label: `${dateLabel(cooking.cookedOn)}${specialDateOptionSuffix(cooking.cookedOn, specialDateList)}`, detail: `${mealName(cooking.mealType)} · ${cooking.createdBy}` }))}
              onChange={(value) => setSelectedCookingId(Number(value))}
            />
            {current && <div className="item-date-pager__actions"><Button icon="✏️" variant="secondary" type="button" onClick={() => setEditingCooking(current)}>Editar cocinada</Button></div>}
          </div>
          {current && <CookingExperience cooking={current} specialDates={specialDateList} ownReview={Boolean(ownReview)} onReview={() => setReviewing(ownReview ?? null)} />}
        </> : <p className="empty-state">Todavía no cocinaron esta receta. Registren la primera vez para guardar su historial y reseñas.</p>}
      </section>
      {current?.id && <ExperienceJourneyPanel key={current?.id} source={{section:"COOK",entityId:id,experienceId:current?.id}} physicalCity={undefined} />}
      {editingRecipe && <RecipeForm recipe={value} onClose={() => setEditingRecipe(false)} />}
      {editingCooking !== undefined && <CookingForm recipe={value} cooking={editingCooking ?? undefined} onClose={() => setEditingCooking(undefined)} onSaved={(saved) => setSelectedCookingId(saved.id)} />}
      {reviewing !== undefined && current && <CookingReviewForm cooking={current} review={reviewing ?? undefined} onClose={() => setReviewing(undefined)} />}
      {confirmingDelete && <ConfirmDialog title="¿Borrar esta receta?" message={removeRecipe.error ? removeRecipe.error.message : "Solo podés borrarla si no tiene cocinadas registradas."} confirmLabel="Borrar receta" pending={removeRecipe.isPending} onClose={() => setConfirmingDelete(false)} onConfirm={() => removeRecipe.mutate()} />}
    </section>
  );
}

function CookingExperience({ cooking, specialDates, onReview, ownReview }: { cooking: Cooking; specialDates: SpecialDate[]; onReview: () => void; ownReview: boolean }) {
  const { homeLabels } = useZoneContext();
  return (
    <div className="experience-detail">
      <p className="muted">{dateLabel(cooking.cookedOn)}<SpecialDateLabels date={cooking.cookedOn} specialDates={specialDates} /> · {mealName(cooking.mealType)} · {homeName(cooking.home, homeLabels)} · {cooking.servings} porciones. Registrada por {cooking.createdBy}.</p>
      <section className="reviews-section">
        <div className="section-title section-title--compact"><div><p className="eyebrow">RESEÑAS</p><h2>Cómo salió</h2></div><strong>{cooking.reviews.length}</strong></div>
         {cooking.reviews.length ? <div className="home-recipe-review-columns">{cooking.reviews.map((review) => <article className="home-recipe-review" key={review.id}><div><span className="review-avatar">{review.author[0]?.toUpperCase()}</span><h3>Reseña de {review.author}</h3></div><div className="recipe-review-scores"><div className="review-score"><StarRating label={`Puntuación de ${review.author}`} value={review.rating} /><span>{scoreLabel(review.rating)}</span></div><div className="recipe-review-metric"><span>Sabor</span><RatingStars label={`Sabor de ${review.author}`} value={review.taste ?? review.rating} /><b>{scoreLabel(review.taste ?? review.rating)}</b></div><div className="recipe-review-metric"><span>Complejidad</span><RatingStars label={`Complejidad de ${review.author}`} value={review.complexity ?? 1} /><b>{scoreLabel(review.complexity ?? 1)}</b></div></div><p className="review-comment">{review.comment || "Sin comentario."}</p><small>Creada por {review.author} · editada por {review.updatedBy}</small></article>)}</div> : <p className="empty-state">Todavía no hay reseñas para esta cocinada.</p>}
        <div className="experience-review-action"><Button icon={ownReview ? "✏️" : "💬"} variant="secondary" type="button" onClick={onReview}>{ownReview ? "Editar reseña" : "Agregar reseña"}</Button></div>
      </section>
    </div>
  );
}

function scoreLabel(value?: number) {
  return value === undefined || value === null ? "—" : `${value}/5`;
}
