import { getPhotoOrientation, ResponsiveImage } from "../../components/ui/AdaptivePhoto";
import { CatalogMediaCard } from "../../components/ui/CatalogMediaCard";
import type { Recipe } from "../../types/domain";

export function CatalogRecipeCard({ recipe }: { recipe: Recipe }) {
  const width = recipe.photoWidth ?? undefined;
  const height = recipe.photoHeight ?? undefined;
  const kpi = recipe.rating != null
    ? { label: `Puntuación promedio: ${recipe.rating.toFixed(1)} de 5`, value: `★ ${recipe.rating.toFixed(1)}` }
    : recipe.cookingCount
      ? { label: `${recipe.cookingCount} ${recipe.cookingCount === 1 ? "cocinada registrada" : "cocinadas registradas"}`, value: `🍳 ${recipe.cookingCount}` }
      : { label: "Pendiente de cocinar", value: "⌛ Pendiente" };

  return <CatalogMediaCard
    ariaLabel={`Ver receta ${recipe.name}`}
    badge={`${recipe.ingredients.length} ingredientes · ${recipe.steps.length} pasos`}
    eyebrow={recipe.cookingCount ? "COCINADA" : "PARA PROBAR"}
    footer={<><span>{recipe.homes.length ? recipe.homes.map((home) => home === "TOMAS" ? "🏠 Tomás" : "🏡 Avril").join(" · ") : "Sin cocinadas"}</span><span>Ver receta →</span></>}
    image={recipe.thumbnailUrl || recipe.photoUrl ? <ResponsiveImage alt={`Foto de ${recipe.name}`} className="catalog-media-card__image" fullSrc={recipe.photoUrl ?? undefined} height={height} thumbnailSrc={recipe.thumbnailUrl ?? undefined} width={width} /> : <span className="catalog-media-card__empty">🍲</span>}
    kpi={<span aria-label={kpi.label}>{kpi.value}</span>}
    orientation={getPhotoOrientation(width, height)}
    theme="cook"
    title={recipe.name}
    to={`/how-cook/${recipe.id}`}
  />;
}
