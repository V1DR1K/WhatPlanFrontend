import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useDeferredValue, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useInAppBackGuard } from "../../lib/backGuard";
import { Modal } from "../../components/ui/Modal";
import { EntityCreateButton } from "../../components/ui/EntityCreateButton";
import { ExperienceHero } from "../../components/ui/ExperienceHero";
import type { FunCategory } from "../../types/domain";
import { FunVenueCard } from "./FunVenueCard";
import { ActivityForm } from "./ActivityForm";
import { CatalogEntitySearch } from "../../components/ui/CatalogEntitySearch";
import { CatalogMoreButton } from "../../components/ui/IncrementalCatalog";
import { SectionShell } from "../../components/ui/SectionShell";
import { useCatalogPageSize } from "../../lib/settings";
import { getActivities, getFunCategories } from "./whyFun";
import {
  catalogSortFromQuery,
  catalogSortOptions,
  type CatalogSortValue,
} from "../../lib/catalogSort";

const positiveIdFromQuery = (value: string | null) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
};

function FilterChips({ label, options, selected, onSelect }: { label: string; options: FunCategory[]; selected?: number; onSelect: (id?: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? options : options.slice(0, 6);
  const choose = (id?: number) => { onSelect(id); setExpanded(false); };
  return <section className="fun-filter"><span>{label}</span><div className="chips"><button aria-pressed={!selected} className={!selected ? "selected" : ""} type="button" onClick={() => choose()}>Todas</button>{visible.map((category) => <button aria-pressed={category.id === selected} key={category.id} className={category.id === selected ? "selected" : ""} type="button" onClick={() => choose(category.id)}>{category.icon} {category.name}</button>)}{options.length > 6 && <button type="button" onClick={() => setExpanded(true)} aria-label={`Ver más ${label.toLowerCase()}`}>•••</button>}</div>{expanded && <Modal onClose={() => setExpanded(false)}><p className="eyebrow">FILTRAR POR {label.toUpperCase()}</p><h2>Elegí una opción</h2><div className="chips fun-filter-dialog"><button aria-pressed={!selected} className={!selected ? "selected" : ""} type="button" onClick={() => choose()}>Todas</button>{options.map((category) => <button aria-pressed={category.id === selected} key={category.id} className={category.id === selected ? "selected" : ""} type="button" onClick={() => choose(category.id)}>{category.icon} {category.name}</button>)}</div></Modal>}</section>;
}

function useActivityPages({
  categoryId,
  subcategoryId,
  search,
  sort,
  visited,
  pageSize,
}: {
  categoryId?: number;
  subcategoryId?: number;
  search: string;
  sort: CatalogSortValue;
  visited: boolean;
  pageSize: number;
}) {
  return useInfiniteQuery({
    queryKey: ["activities", visited, categoryId, subcategoryId, search, sort, pageSize],
    queryFn: ({ pageParam }) =>
      getActivities({
        categoryId,
        subcategoryId,
        visited,
        search: search || undefined,
        sort: sort || undefined,
        cursor: pageParam,
        size: pageSize,
      }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

function ActivitySection({
  query,
  eyebrow,
  title,
  empty,
  filtered,
}: {
  query: ReturnType<typeof useActivityPages>;
  eyebrow: string;
  title: string;
  empty: string;
  filtered: boolean;
}) {
  const activities = query.data?.pages.flatMap((page) => page.content) ?? [];
  return <section className="fun-section">
    <div className="section-title"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><strong>Mostrando {activities.length} actividades</strong></div>
    {query.isError ? <p className="form-error">{query.error.message}</p> : activities.length ? <div className="fun-grid">{activities.map((activity) => <FunVenueCard key={activity.id} activity={activity} />)}</div> : !query.isLoading && <p className="empty-state">{filtered ? "No hay actividades con esos filtros." : empty}</p>}
    {query.hasNextPage && <CatalogMoreButton loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()} />}
  </section>;
}

export function WhyFunPage() {
  useInAppBackGuard("/");
  const [searchParams, setSearchParams] = useSearchParams();
  const [categoryId, setCategoryId] = useState<number | undefined>(() =>
    positiveIdFromQuery(searchParams.get("category")),
  );
  const [subcategoryId, setSubcategoryId] = useState<number | undefined>(() =>
    positiveIdFromQuery(searchParams.get("subcategory")),
  );
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [sort, setSort] = useState<CatalogSortValue>(() =>
    catalogSortFromQuery(searchParams.get("sort")),
  );
  const [creating, setCreating] = useState(false);
  const pageSize = useCatalogPageSize();
  const searchTerm = search.trim();
  const deferredSearch = useDeferredValue(searchTerm);
  const categories = useQuery({ queryKey: ["fun-categories"], queryFn: getFunCategories });
  const pendingActivities = useActivityPages({
    categoryId,
    subcategoryId,
    search: deferredSearch,
    sort,
    visited: false,
    pageSize,
  });
  const doneActivities = useActivityPages({
    categoryId,
    subcategoryId,
    search: deferredSearch,
    sort,
    visited: true,
    pageSize,
  });
  const activities = [
    ...(pendingActivities.data?.pages.flatMap((page) => page.content) ?? []),
    ...(doneActivities.data?.pages.flatMap((page) => page.content) ?? []),
  ];
  const roots = (categories.data ?? []).filter((category) => !category.parentId);
  const subcategories = (categories.data ?? []).filter((category) => category.parentId === categoryId);
  const filtered = Boolean(categoryId || subcategoryId || searchTerm || sort);

  useEffect(() => {
    const next = new URLSearchParams();
    if (categoryId) next.set("category", String(categoryId));
    if (subcategoryId) next.set("subcategory", String(subcategoryId));
    if (searchTerm) next.set("search", searchTerm);
    if (sort) next.set("sort", sort);
    setSearchParams(next, { replace: true });
  }, [categoryId, searchTerm, setSearchParams, sort, subcategoryId]);

  return (
    <SectionShell className="catalog-experience" section="fun">
      <ExperienceHero
        className="fun-hero"
        eyebrow="WHYFUN · SALIDAS PARA REPETIR"
        title={<>¿Qué salida<br />repetimos <em>hoy?</em></>}
        description="Guarden actividades y registren cada salida con una fecha, fotos y opiniones compartidas."
        art={<>🎲<span>✦</span><b>🕹️</b></>}
      />
      <nav className="quick-nav quick-nav-action">
        <EntityCreateButton eyebrow="Nueva actividad" icon="🎯" label="Agregar actividad" onClick={() => setCreating(true)} />
      </nav>
      <section className="fun-controls">
        <div className="catalog-search-sort">
          <CatalogEntitySearch
            candidates={activities.map((activity) => ({ id: activity.id, title: activity.name, updatedAt: activity.updatedAt }))}
            label="Buscar actividades"
            onChange={setSearch}
            placeholder="Nombre, dirección o categoría"
            value={search}
          />
          <label className="catalog-search-sort__field">
            <span>Ordenar catálogo</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as CatalogSortValue)}>
              {catalogSortOptions.map((option) => <option key={option.value || "default"} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        <FilterChips label="Categorías" options={roots} selected={categoryId} onSelect={(id) => { setCategoryId(id); setSubcategoryId(undefined); }} />
        {categoryId && <FilterChips label="Subcategorías" options={subcategories} selected={subcategoryId} onSelect={setSubcategoryId} />}
      </section>
      {categories.isError && <p className="form-error">No pudimos cargar las categorías.</p>}
      {pendingActivities.isLoading && doneActivities.isLoading ? <p className="muted" aria-busy="true">Cargando actividades…</p> : <>
        <ActivitySection query={pendingActivities} eyebrow="PARA HACER" title="Pendientes para salir" empty="Todavía no hay actividades pendientes." filtered={filtered} />
        <ActivitySection query={doneActivities} eyebrow="YA SALIERON" title="Salidas registradas" empty="Cuando registren una salida, aparecerá acá." filtered={filtered} />
      </>}
      {creating && <ActivityForm onClose={() => setCreating(false)} />}
    </SectionShell>
  );
}
