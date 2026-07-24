import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Modal } from "../../components/ui/Modal";
import { EntityCreateButton } from "../../components/ui/EntityCreateButton";
import type { FunCategory } from "../../types/domain";
import { FunVenueCard } from "./FunVenueCard";
import { ActivityForm } from "./ActivityForm";
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

function matchesSearch(
  activity: {
    name: string;
    address: string;
    category: FunCategory;
    subcategory: FunCategory;
  },
  search: string,
) {
  if (!search) return true;
  return [activity.name, activity.address, activity.category.name, activity.subcategory.name]
    .join(" ")
    .toLocaleLowerCase("es")
    .includes(search.toLocaleLowerCase("es"));
}

function FilterChips({ label, options, selected, onSelect }: { label: string; options: FunCategory[]; selected?: number; onSelect: (id?: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? options : options.slice(0, 6);
  const choose = (id?: number) => { onSelect(id); setExpanded(false); };
  return <section className="fun-filter"><span>{label}</span><div className="chips"><button aria-pressed={!selected} className={!selected ? "selected" : ""} type="button" onClick={() => choose()}>Todas</button>{visible.map((category) => <button aria-pressed={category.id === selected} key={category.id} className={category.id === selected ? "selected" : ""} type="button" onClick={() => choose(category.id)}>{category.icon} {category.name}</button>)}{options.length > 6 && <button type="button" onClick={() => setExpanded(true)} aria-label={`Ver más ${label.toLowerCase()}`}>•••</button>}</div>{expanded && <Modal onClose={() => setExpanded(false)}><p className="eyebrow">FILTRAR POR {label.toUpperCase()}</p><h2>Elegí una opción</h2><div className="chips fun-filter-dialog"><button aria-pressed={!selected} className={!selected ? "selected" : ""} type="button" onClick={() => choose()}>Todas</button>{options.map((category) => <button aria-pressed={category.id === selected} key={category.id} className={category.id === selected ? "selected" : ""} type="button" onClick={() => choose(category.id)}>{category.icon} {category.name}</button>)}</div></Modal>}</section>;
}

export function WhyFunPage() {
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
  const searchTerm = search.trim();
  const deferredSearch = useDeferredValue(searchTerm);
  const categories = useQuery({ queryKey: ["fun-categories"], queryFn: getFunCategories });
  const activities = useQuery({ queryKey: ["activities", categoryId, subcategoryId], queryFn: () => getActivities({ categoryId, subcategoryId }) });
  const roots = (categories.data ?? []).filter((category) => !category.parentId);
  const subcategories = (categories.data ?? []).filter((category) => category.parentId === categoryId);
  const activitiesWithSearch = (activities.data ?? []).filter((activity) =>
    matchesSearch(activity, deferredSearch),
  );
  const visibleActivities = !sort
    ? activitiesWithSearch
    : [...activitiesWithSearch].sort((left, right) => {
        if (sort === "date-desc" || sort === "date-asc") {
          return (Date.parse(left.createdAt) - Date.parse(right.createdAt)) * (sort === "date-desc" ? -1 : 1);
        }
        const leftRating = left.rating;
        const rightRating = right.rating;
        if (leftRating == null) return rightRating == null ? 0 : 1;
        if (rightRating == null) return -1;
        return (leftRating - rightRating) * (sort === "rating-desc" ? -1 : 1);
      });
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
    <>
      <section className="fun-hero">
        <div>
          <p className="eyebrow">WHYFUN · SALIDAS PARA REPETIR</p>
          <h1>¿Qué salida<br />repetimos <em>hoy?</em></h1>
          <p>Guarden actividades y registren cada salida con una fecha, fotos y opiniones compartidas.</p>
        </div>
        <div className="fun-hero-art" aria-hidden="true">🎲<span>✦</span><b>🕹️</b></div>
      </section>
      <nav className="quick-nav quick-nav-action">
        <EntityCreateButton eyebrow="Nueva actividad" icon="🎯" label="Agregar actividad" onClick={() => setCreating(true)} />
      </nav>
      <section className="fun-controls">
        <div className="catalog-search-sort">
          <label className="catalog-search-sort__field">
            <span>Buscar actividades</span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, dirección o categoría" />
          </label>
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
      {activities.isError ? <p className="form-error">{activities.error.message}</p> : (
        <section className="fun-section">
          <div className="section-title">
            <div><p className="eyebrow">CATÁLOGO COMPARTIDO</p><h2>Actividades para salir</h2></div>
            <strong>{visibleActivities.length} actividades</strong>
          </div>
          {activities.isLoading ? <p className="muted" aria-busy="true">Cargando actividades…</p> : visibleActivities.length ? <div className="fun-grid">{visibleActivities.map((activity) => <FunVenueCard key={activity.id} activity={activity} />)}</div> : <p className="empty-state">{filtered ? "No hay actividades con esos filtros." : "No hay actividades todavía. Agreguen la primera para empezar el historial."}</p>}
        </section>
      )}
      {creating && <ActivityForm onClose={() => setCreating(false)} />}
    </>
  );
}
