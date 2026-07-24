import { useInfiniteQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useDeferredValue, useEffect, useState } from "react";
import { mediaUrl } from "../../lib/api";
import type { Home, Recipe } from "../../types/domain";
import { RecipeForm } from "./RecipeForm";
import { EntityCreateButton } from "../../components/ui/EntityCreateButton";
import { CatalogEntitySearch } from "../../components/ui/CatalogEntitySearch";
import { CatalogMoreButton } from "../../components/ui/IncrementalCatalog";
import { useCatalogPageSize } from "../../lib/settings";
import { getRecipes } from "./homeRecipes";
import {
  catalogSortFromQuery,
  catalogSortOptions,
  type CatalogSortValue,
} from "../../lib/catalogSort";

function homeFromQuery(value: string | null): Home | "ALL" {
  return value === "TOMAS" || value === "AVRIL" ? value : "ALL";
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const photo = recipe.thumbnailUrl ?? recipe.photoUrl;
  const kpi = recipe.rating != null
    ? { label: `Puntuación promedio: ${recipe.rating.toFixed(1)} de 5`, value: `★ ${recipe.rating.toFixed(1)}` }
    : recipe.cookingCount
      ? { label: `${recipe.cookingCount} ${recipe.cookingCount === 1 ? "cocinada registrada" : "cocinadas registradas"}`, value: `🍳 ${recipe.cookingCount}` }
      : { label: "Pendiente de cocinar", value: "⌛ Pendiente" };
  return (
    <Link className="home-recipe-card-link" to={`/how-cook/${recipe.id}`}>
      <article className="home-recipe-card">
        {photo ? <img className="home-recipe-card__image" src={mediaUrl(photo)} alt={`Foto de ${recipe.name}`} loading="lazy" /> : <div className="home-recipe-card__empty">🍲</div>}
        <div className="home-recipe-card__body">
          <div className="home-recipe-card__heading">
            <div><p>{recipe.ingredients.length} ingredientes · {recipe.steps.length} pasos</p><h3>{recipe.name}</h3></div>
            <b className="home-recipe-card__rating" aria-label={kpi.label}>{kpi.value}</b>
          </div>
          <footer className="recipe-card-actions"><small>{recipe.homes.length ? recipe.homes.map((value) => value === "TOMAS" ? "🏠 Tomás" : "🏡 Avril").join(" · ") : "Sin cocinadas"}</small><span>Ver receta →</span></footer>
        </div>
      </article>
    </Link>
  );
}

function useRecipePages({
  cooked,
  home,
  search,
  sort,
  pageSize,
}: {
  cooked: boolean;
  home?: Home;
  search: string;
  sort: CatalogSortValue;
  pageSize: number;
}) {
  return useInfiniteQuery({
    queryKey: ["recipes", cooked, home, search, sort, pageSize],
    queryFn: ({ pageParam }) =>
      getRecipes({
        cooked,
        home,
        search: search || undefined,
        sort: sort || undefined,
        cursor: pageParam,
        size: pageSize,
      }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

function RecipeSection({
  query,
  eyebrow,
  title,
  empty,
  filtered,
}: {
  query: ReturnType<typeof useRecipePages>;
  eyebrow: string;
  title: string;
  empty: string;
  filtered: boolean;
}) {
  const recipes = query.data?.pages.flatMap((page) => page.content) ?? [];
  return <section className="home-recipe-section">
    <div className="section-title"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><strong>Mostrando {recipes.length} recetas</strong></div>
    {query.isError ? <p className="form-error">{query.error.message}</p> : recipes.length ? <div className="home-recipe-grid">{recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}</div> : !query.isLoading && <p className="empty-state">{filtered ? "No encontramos recetas con esos filtros." : empty}</p>}
    {query.hasNextPage && <CatalogMoreButton loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()} />}
  </section>;
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
  const pageSize = useCatalogPageSize();
  const searchTerm = search.trim();
  const deferredSearch = useDeferredValue(searchTerm);
  const pendingRecipes = useRecipePages({
    cooked: false,
    home: home === "ALL" ? undefined : home,
    search: deferredSearch,
    sort,
    pageSize,
  });
  const doneRecipes = useRecipePages({
    cooked: true,
    home: home === "ALL" ? undefined : home,
    search: deferredSearch,
    sort,
    pageSize,
  });
  const recipes = [
    ...(pendingRecipes.data?.pages.flatMap((page) => page.content) ?? []),
    ...(doneRecipes.data?.pages.flatMap((page) => page.content) ?? []),
  ];
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
          <CatalogEntitySearch
            candidates={recipes.map((recipe) => ({ id: recipe.id, title: recipe.name, updatedAt: recipe.updatedAt }))}
            label="Buscar recetas"
            onChange={setSearch}
            placeholder="Ej. risotto, pasta, arroz…"
            value={search}
          />
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
      {pendingRecipes.isLoading && doneRecipes.isLoading ? <p className="muted" aria-busy="true">Cargando recetas…</p> : <>
        <RecipeSection query={pendingRecipes} eyebrow="PARA PROBAR" title="Pendientes para cocinar" empty="Todavía no hay recetas pendientes." filtered={filtered} />
        <RecipeSection query={doneRecipes} eyebrow="YA COCINARON" title="Cocinadas registradas" empty="Cuando registren una cocinada, aparecerá acá." filtered={filtered} />
      </>}
      {creating && <RecipeForm onClose={() => setCreating(false)} />}
    </section>
  );
}
