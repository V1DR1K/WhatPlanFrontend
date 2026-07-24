import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Modal } from "../../components/ui/Modal";
import { EntityCreateButton } from "../../components/ui/EntityCreateButton";
import type { Activity, FunCategory } from "../../types/domain";
import { FunVenueCard } from "./FunVenueCard";
import { ActivityForm } from "./ActivityForm";
import { CatalogEntitySearch } from "../../components/ui/CatalogEntitySearch";
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

function ActivitySection({
  activities,
  eyebrow,
  title,
  empty,
  filtered,
  focused,
  morePath,
}: {
  activities: Activity[];
  eyebrow: string;
  title: string;
  empty: string;
  filtered: boolean;
  focused: boolean;
  morePath: string;
}) {
  const displayed = focused ? activities : activities.slice(0, 10);
  return <section className="fun-section">
    <div className="section-title"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><strong>{displayed.length} actividades</strong></div>
    {displayed.length ? <div className="fun-grid">{displayed.map((activity) => <FunVenueCard key={activity.id} activity={activity} />)}</div> : <p className="empty-state">{filtered ? "No hay actividades con esos filtros." : empty}</p>}
    {!focused && activities.length > 10 && <Link className="catalog-section-more" to={morePath}>✨ Ver más</Link>}
  </section>;
}

export function WhyFunPage() {
  const { catalogStatus } = useParams();
  const focusedStatus = catalogStatus === "pending" || catalogStatus === "done" ? catalogStatus : undefined;
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
          return (Date.parse(left.updatedAt) - Date.parse(right.updatedAt)) * (sort === "date-desc" ? -1 : 1);
        }
        const leftRating = left.rating;
        const rightRating = right.rating;
        if (leftRating == null) return rightRating == null ? 0 : 1;
        if (rightRating == null) return -1;
        return (leftRating - rightRating) * (sort === "rating-desc" ? -1 : 1);
      });
  const filtered = Boolean(categoryId || subcategoryId || searchTerm || sort);
  const pendingActivities = visibleActivities.filter((activity) => activity.visitCount === 0);
  const doneActivities = visibleActivities.filter((activity) => activity.visitCount > 0);

  useEffect(() => {
    const next = new URLSearchParams();
    if (categoryId) next.set("category", String(categoryId));
    if (subcategoryId) next.set("subcategory", String(subcategoryId));
    if (searchTerm) next.set("search", searchTerm);
    if (sort) next.set("sort", sort);
    setSearchParams(next, { replace: true });
  }, [categoryId, searchTerm, setSearchParams, sort, subcategoryId]);

  const focusPath = (status: "pending" | "done") => {
    const query = new URLSearchParams();
    if (categoryId) query.set("category", String(categoryId));
    if (subcategoryId) query.set("subcategory", String(subcategoryId));
    if (searchTerm) query.set("search", searchTerm);
    if (sort) query.set("sort", sort);
    return `/why-fun/list/${status}${query.size ? `?${query}` : ""}`;
  };

  return (
    <>
      {focusedStatus ? <section className="catalog-focus-heading"><p className="eyebrow">WHYFUN · CATÁLOGO COMPLETO</p><h1>{focusedStatus === "pending" ? "Actividades pendientes" : "Salidas registradas"}</h1><p>Explorá solo este grupo de actividades, con todos los filtros disponibles.</p></section> : <section className="fun-hero">
        <div>
          <p className="eyebrow">WHYFUN · SALIDAS PARA REPETIR</p>
          <h1>¿Qué salida<br />repetimos <em>hoy?</em></h1>
          <p>Guarden actividades y registren cada salida con una fecha, fotos y opiniones compartidas.</p>
        </div>
        <div className="fun-hero-art" aria-hidden="true">🎲<span>✦</span><b>🕹️</b></div>
      </section>}
      <nav className="quick-nav quick-nav-action">
        <EntityCreateButton eyebrow="Nueva actividad" icon="🎯" label="Agregar actividad" onClick={() => setCreating(true)} />
      </nav>
      <section className="fun-controls">
        <div className="catalog-search-sort">
          <CatalogEntitySearch
            candidates={(activities.data ?? []).map((activity) => ({ id: activity.id, title: activity.name, updatedAt: activity.updatedAt }))}
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
      {activities.isError ? <p className="form-error">{activities.error.message}</p> : activities.isLoading ? <p className="muted" aria-busy="true">Cargando actividades…</p> : <>
        {(!focusedStatus || focusedStatus === "pending") && <ActivitySection activities={pendingActivities} eyebrow="PARA HACER" title="Pendientes para salir" empty="Todavía no hay actividades pendientes." filtered={filtered} focused={focusedStatus === "pending"} morePath={focusPath("pending")} />}
        {(!focusedStatus || focusedStatus === "done") && <ActivitySection activities={doneActivities} eyebrow="YA SALIERON" title="Salidas registradas" empty="Cuando registren una salida, aparecerá acá." filtered={filtered} focused={focusedStatus === "done"} morePath={focusPath("done")} />}
      </>}
      {creating && <ActivityForm onClose={() => setCreating(false)} />}
    </>
  );
}
