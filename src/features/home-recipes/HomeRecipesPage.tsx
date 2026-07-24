import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useDeferredValue, useEffect, useState } from "react";
import { mediaUrl } from "../../lib/api";
import type { Home, Recipe } from "../../types/domain";
import { RecipeForm } from "./RecipeForm";
import { EntityCreateButton } from "../../components/ui/EntityCreateButton";
import { getCookings, getRecipes } from "./homeRecipes";
import {
  catalogSortFromQuery,
  catalogSortOptions,
  type CatalogSortValue,
} from "../../lib/catalogSort";

function homeFromQuery(value: string | null): Home | "ALL" {
  return value === "TOMAS" || value === "AVRIL" ? value : "ALL";
}

function sortRecipes(
  recipes: Recipe[],
  ratings: Map<number, { total: number; count: number }>,
  sort: CatalogSortValue,
) {
  if (!sort) return recipes;
  return [...recipes].sort((left, right) => {
    if (sort === "date-desc" || sort === "date-asc") {
      const direction = sort === "date-desc" ? -1 : 1;
      return (Date.parse(left.createdAt) - Date.parse(right.createdAt)) * direction;
    }
    const leftRatings = ratings.get(left.id);
    const rightRatings = ratings.get(right.id);
    const leftRating = leftRatings && leftRatings.total / leftRatings.count;
    const rightRating = rightRatings && rightRatings.total / rightRatings.count;
    // Recipes without loaded cooking reviews stay after rated recipes.
    if (leftRating === undefined) return rightRating === undefined ? 0 : 1;
    if (rightRating === undefined) return -1;
    return (leftRating - rightRating) * (sort === "rating-desc" ? -1 : 1);
  });
}

export function HomeRecipesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [creating, setCreating] = useState(false);
  const [home, setHome] = useState<Home | "ALL">(() =>
    homeFromQuery(searchParams.get("home")),
  );
  const [sort, setSort] = useState<CatalogSortValue>(() =>
    catalogSortFromQuery(searchParams.get("sort")),
  );
  const searchTerm = search.trim();
  const deferredSearch = useDeferredValue(searchTerm);
  const recipes = useQuery({
    queryKey: ["recipes", deferredSearch],
    queryFn: () => getRecipes(deferredSearch || undefined),
  });
  const cookings = useQuery({ queryKey: ["cookings"], queryFn: () => getCookings() });
  const cookingsByRecipe = new Map<number, Home[]>();
  const ratingsByRecipe = new Map<number, { total: number; count: number }>();
  for (const cooking of cookings.data ?? []) {
    const homes = cookingsByRecipe.get(cooking.recipe.id) ?? [];
    if (!homes.includes(cooking.home)) homes.push(cooking.home);
    cookingsByRecipe.set(cooking.recipe.id, homes);
    for (const review of cooking.reviews) {
      const totals = ratingsByRecipe.get(cooking.recipe.id) ?? { total: 0, count: 0 };
      totals.total += review.rating;
      totals.count += 1;
      ratingsByRecipe.set(cooking.recipe.id, totals);
    }
  }
  const visibleRecipes = sortRecipes(
    (recipes.data ?? []).filter((recipe) => home === "ALL" || cookingsByRecipe.get(recipe.id)?.includes(home)),
    ratingsByRecipe,
    sort,
  );
  const filtered = Boolean(searchTerm || home !== "ALL" || sort);

  useEffect(() => {
    const next = new URLSearchParams();
    if (searchTerm) next.set("search", searchTerm);
    if (home !== "ALL") next.set("home", home);
    if (sort) next.set("sort", sort);
    setSearchParams(next, { replace: true });
  }, [home, searchTerm, setSearchParams, sort]);

  return (
    <section className="home-recipes">
      <section className="home-recipes__hero">
        <div>
          <p className="eyebrow">WHOCOOK · RECETAS PARA REPETIR</p>
          <h1>¿Qué <em>cocinamos</em> hoy?</h1>
          <p>Guarden una receta una vez y registren cada cocinada con sus propios recuerdos.</p>
        </div>
        <span aria-hidden="true">🍳</span>
      </section>
      <nav className="quick-nav quick-nav-action">
        <EntityCreateButton
          eyebrow="Nueva receta"
          icon="🍳"
          label="Agregar receta"
          onClick={() => setCreating(true)}
        />
      </nav>
      <section className="home-recipe-controls" aria-label="Buscar, ordenar y filtrar recetas">
        <div className="catalog-search-sort">
          <label className="catalog-search-sort__field">
            <span>Buscar recetas</span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ej. risotto, pasta, arroz…" />
          </label>
          <label className="catalog-search-sort__field">
            <span>Ordenar catálogo</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as CatalogSortValue)}>
              {catalogSortOptions.map((option) => <option key={option.value || "default"} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        <div className="home-recipe-home-filters" aria-label="Filtrar recetas por casa">
          <button aria-pressed={home === "ALL"} className={home === "ALL" ? "selected" : ""} type="button" onClick={() => setHome("ALL")}>Todas</button>
          <button aria-pressed={home === "TOMAS"} className={home === "TOMAS" ? "selected" : ""} type="button" onClick={() => setHome("TOMAS")}>🏠 Tomás</button>
          <button aria-pressed={home === "AVRIL"} className={home === "AVRIL" ? "selected" : ""} type="button" onClick={() => setHome("AVRIL")}>🏡 Avril</button>
        </div>
      </section>
      <section className="home-recipe-section">
        <div className="section-title">
          <div><p className="eyebrow">CATÁLOGO COMPARTIDO</p><h2>Recetas guardadas</h2></div>
          <strong>{visibleRecipes.length} recetas</strong>
        </div>
        {recipes.isError ? <p className="form-error">{recipes.error.message}</p> : recipes.isLoading || cookings.isLoading ? <p className="muted" aria-busy="true">Cargando recetas…</p> : visibleRecipes.length ? (
          <div className="home-recipe-grid">
            {visibleRecipes.map((recipe) => {
              const photo = recipe.thumbnailUrl ?? recipe.photoUrl;
              const homes = cookingsByRecipe.get(recipe.id) ?? [];
              return (
                <Link className="home-recipe-card-link" key={recipe.id} to={`/how-cook/${recipe.id}`}>
                  <article className="home-recipe-card">
                    {photo ? <img className="home-recipe-card__image" src={mediaUrl(photo)} alt={`Foto de ${recipe.name}`} loading="lazy" /> : <div className="home-recipe-card__empty">🍲</div>}
                    <div className="home-recipe-card__body">
                      <div className="home-recipe-card__heading">
                        <div><p>{recipe.ingredients.length} ingredientes · {recipe.steps.length} pasos</p><h3>{recipe.name}</h3></div>
                      </div>
                      <footer className="recipe-card-actions"><small>{homes.length ? homes.map((value) => value === "TOMAS" ? "🏠 Tomás" : "🏡 Avril").join(" · ") : "Sin cocinadas"}</small><span>Ver receta →</span></footer>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        ) : <p className="empty-state">{filtered ? "No encontramos recetas con esos filtros." : "Todavía no hay recetas. Agreguen la primera para poder repetirla."}</p>}
      </section>
      {creating && <RecipeForm onClose={() => setCreating(false)} />}
    </section>
  );
}
