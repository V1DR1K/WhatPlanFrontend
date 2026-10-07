import { useInfiniteQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useInAppBackGuard } from "../../lib/backGuard";
import { useEffect, useState } from "react";
import type { Home } from "../../types/domain";
import { RecipeForm } from "./RecipeForm";
import { EntityCreateButton } from "../../components/ui/EntityCreateButton";
import { ExperienceHero } from "../../components/ui/ExperienceHero";
import { CatalogEntitySearch } from "../../components/ui/CatalogEntitySearch";
import { CatalogReviewFilter } from "../../components/ui/CatalogReviewFilter";
import { CatalogMoreButton } from "../../components/ui/IncrementalCatalog";
import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";
import { CatalogExperienceLayout } from "../../components/ui/CatalogExperienceLayout";
import { useCatalogPageSize } from "../../lib/settings";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { useLocationQueryScope } from "../../lib/locationQueryScope";
import { useZoneContext } from "../../lib/zoneContext";
import { reviewStatusFromQuery, type ReviewStatusFilter } from "../../lib/reviewStatus";
import { homeName } from "../../lib/homeLabels";
import { getRecipes } from "./homeRecipes";
import { CatalogRecipeCard } from "./CatalogRecipeCard";
import {
  catalogSortFromQuery,
  catalogSortOptions,
  type CatalogSortValue,
} from "../../lib/catalogSort";

function homeFromQuery(value: string | null): Home | "ALL" {
  return value === "TOMAS" || value === "AVRIL" ? value : "ALL";
}

function useRecipePages({
  cooked,
  home,
  search,
  sort,
  reviewStatus,
  pageSize,
}: {
  cooked: boolean;
  home?: Home;
  search: string;
  sort: CatalogSortValue;
  reviewStatus: ReviewStatusFilter;
  pageSize: number;
}) {
  const locationScope = useLocationQueryScope();
  return useInfiniteQuery({
    queryKey: ["recipes", ...locationScope, cooked, home, search, sort, reviewStatus, pageSize],
    queryFn: ({ pageParam, signal }) =>
      getRecipes({
        cooked,
        home,
        search: search || undefined,
        sort: sort || undefined,
        reviewStatus,
        cursor: pageParam,
        size: pageSize,
        signal,
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
     {query.isError ? <p className="form-error" role="alert">{query.error.message}</p> : query.isLoading ? <LoadingSkeleton variant="catalog" section="cook" /> : recipes.length ? <div className="home-recipe-grid">{recipes.map((recipe) => <CatalogRecipeCard key={recipe.id} recipe={recipe} />)}</div> : <p className="empty-state" role="status">{filtered ? "No encontramos recetas con esos filtros." : empty}</p>}
    {query.hasNextPage && <CatalogMoreButton loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()} />}
  </section>;
}

export function HomeRecipesPage() {
  const { homeLabels } = useZoneContext();
  useInAppBackGuard("/app");
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [creating, setCreating] = useState(false);
  const [home, setHome] = useState<Home | "ALL">(() =>
    homeFromQuery(searchParams.get("home")),
  );
  const [sort, setSort] = useState<CatalogSortValue>(() =>
    catalogSortFromQuery(searchParams.get("sort")),
  );
  const [reviewStatus, setReviewStatus] = useState<ReviewStatusFilter>(() =>
    reviewStatusFromQuery(searchParams.get("reviewStatus")),
  );
  const pageSize = useCatalogPageSize();
  const searchTerm = search.trim();
  const deferredSearch = useDebouncedValue(searchTerm);
  const pendingRecipes = useRecipePages({
    cooked: false,
    home: home === "ALL" ? undefined : home,
    search: deferredSearch,
    sort,
    reviewStatus,
    pageSize,
  });
  const doneRecipes = useRecipePages({
    cooked: true,
    home: home === "ALL" ? undefined : home,
    search: deferredSearch,
    sort,
    reviewStatus,
    pageSize,
  });
  const recipes = [
    ...(pendingRecipes.data?.pages.flatMap((page) => page.content) ?? []),
    ...(doneRecipes.data?.pages.flatMap((page) => page.content) ?? []),
  ];
  const filtered = Boolean(searchTerm || home !== "ALL" || sort !== "created-desc" || reviewStatus !== "ALL");

  useEffect(() => {
    const next = new URLSearchParams();
    if (searchTerm) next.set("search", searchTerm);
    if (home !== "ALL") next.set("home", home);
    if (sort) next.set("sort", sort);
    if (reviewStatus !== "ALL") next.set("reviewStatus", reviewStatus);
    setSearchParams(next, { replace: true });
  }, [home, reviewStatus, searchTerm, setSearchParams, sort]);

  return (
    <CatalogExperienceLayout
      className="home-recipes"
      section="cook"
      hero={<ExperienceHero
        className="home-recipes__hero"
        eyebrow="WHOCOOK · RECETAS PARA REPETIR"
        title={<>¿Qué <em>cocinamos</em> hoy?</>}
        description="Guarden una receta una vez y registren cada cocinada con sus propios recuerdos."
        art="🍳"
      />}
      createAction={<nav className="quick-nav quick-nav-action">
        <EntityCreateButton
          eyebrow="Nueva receta"
          icon="🍳"
          label="Agregar receta"
          onClick={() => setCreating(true)}
        />
      </nav>}
      controls={<section className="home-recipe-controls" aria-label="Buscar, ordenar y filtrar recetas">
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
        <CatalogReviewFilter value={reviewStatus} onChange={setReviewStatus} />
        <div className="home-recipe-home-filters" aria-label="Filtrar recetas por casa">
          <button aria-pressed={home === "ALL"} className={home === "ALL" ? "selected" : ""} type="button" onClick={() => setHome("ALL")}>Todas</button>
          <button aria-pressed={home === "TOMAS"} className={home === "TOMAS" ? "selected" : ""} type="button" onClick={() => setHome("TOMAS")}>{homeName("TOMAS", homeLabels)}</button>
          <button aria-pressed={home === "AVRIL"} className={home === "AVRIL" ? "selected" : ""} type="button" onClick={() => setHome("AVRIL")}>{homeName("AVRIL", homeLabels)}</button>
        </div>
      </section>}
    >
      {pendingRecipes.isLoading && doneRecipes.isLoading ? <LoadingSkeleton variant="catalog" section="cook" /> : <>
        {reviewStatus === "ALL" && <RecipeSection query={pendingRecipes} eyebrow="PARA PROBAR" title="Pendientes para cocinar" empty="Todavía no hay recetas pendientes." filtered={filtered} />}
        <RecipeSection query={doneRecipes} eyebrow="YA COCINARON" title="Cocinadas registradas" empty="Cuando registren una cocinada, aparecerá acá." filtered={filtered} />
      </>}
      {creating && <RecipeForm onClose={() => setCreating(false)} />}
    </CatalogExperienceLayout>
  );
}
