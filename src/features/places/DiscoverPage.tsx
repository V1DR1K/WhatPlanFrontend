import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Modal } from "../../components/ui/Modal";
import { EntityCreateButton } from "../../components/ui/EntityCreateButton";
import { Button } from "../../components/ui/Button";
import type { PlaceStatus } from "../../types/domain";
import { getCategories } from "../categories/categories";
import { getHighlightTags } from "./highlightTags";
import { PlaceCard } from "./PlaceCard";
import { PlaceForm } from "./PlaceForm";
import { getArchivedPlaces, getPlaces, restorePlace } from "./places";
import { showNotice } from "../../lib/flash";
import { CatalogEntitySearch } from "../../components/ui/CatalogEntitySearch";
import { CatalogMoreButton } from "../../components/ui/IncrementalCatalog";
import { useCatalogPageSize } from "../../lib/settings";
import {
  catalogSortFromQuery,
  catalogSortOptions,
  type CatalogSortValue,
} from "../../lib/catalogSort";
type FilterOption = { id: number; label: string };

const positiveIdFromQuery = (value: string | null) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
};
function FoodFilterChips({
  label,
  allLabel,
  options,
  value,
  onChange,
}: {
  label: string;
  allLabel: string;
  options: FilterOption[];
  value?: number;
  onChange: (value?: number) => void;
}) {
  const [showMore, setShowMore] = useState(false);
  const selected = (option?: FilterOption) =>
    option ? option.id === value : !value;
  const choose = (option?: FilterOption) => {
    onChange(option?.id);
    setShowMore(false);
  };
  return (
    <section
      className="food-filter"
      aria-label={`Filtrar por ${label.toLowerCase()}`}
    >
      <span>{label}</span>
      <div className="chips">
          <button
            aria-pressed={selected()}
            className={selected() ? "selected" : ""}
            onClick={() => choose()}
            type="button"
        >
          {allLabel}
        </button>
        {options.slice(0, 5).map((option) => (
          <button
            aria-pressed={selected(option)}
            key={option.id}
            className={selected(option) ? "selected" : ""}
            onClick={() => choose(option)}
            type="button"
          >
            {option.label}
          </button>
        ))}
        {options.length > 5 && (
          <button
            className="food-filter-more"
            onClick={() => setShowMore(true)}
            aria-label={`Ver más ${label.toLowerCase()}`}
            type="button"
          >
            •••
          </button>
        )}
      </div>
      {showMore && (
        <Modal onClose={() => setShowMore(false)}>
          <p className="eyebrow">FILTRAR POR {label.toUpperCase()}</p>
          <h2>Elegí una opción</h2>
          <div className="chips food-filter-dialog">
            <button
              aria-pressed={selected()}
              className={selected() ? "selected" : ""}
              onClick={() => choose()}
              type="button"
            >
              {allLabel}
            </button>
            {options.map((option) => (
              <button
                aria-pressed={selected(option)}
                key={option.id}
                className={selected(option) ? "selected" : ""}
                onClick={() => choose(option)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </section>
  );
}
function PlaceSection({
  status,
  category,
  highlightTagId,
  search,
  sort,
  title,
  eyebrow,
  empty,
  hasFilter,
  pageSize,
}: {
  status: PlaceStatus;
  category?: number;
  highlightTagId?: number;
  search: string;
  sort: CatalogSortValue;
  title: string;
  eyebrow: string;
  empty: string;
  hasFilter: boolean;
  pageSize: number;
}) {
  const query = useInfiniteQuery({
    // A changed search or sort starts a distinct infinite query at cursor zero.
    queryKey: ["places", status, category, highlightTagId, search, sort, pageSize],
    queryFn: ({ pageParam }) =>
      getPlaces(
        category,
        pageParam,
        status,
        highlightTagId,
        search || undefined,
        sort || undefined,
        pageSize,
      ),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const list = query.data?.pages.flatMap((p) => p.content) ?? [];
  const hasMore = query.hasNextPage;
  return (
    <section className="place-section">
      <div className="section-title">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <strong>Mostrando {list.length} lugar{list.length === 1 ? "" : "es"}</strong>
      </div>
      {query.isError ? (
        <p className="form-error">{query.error.message}</p>
      ) : list.length ? (
        <div className="place-grid">
          {list.map((p) => (
            <PlaceCard place={p} key={p.id} />
          ))}
        </div>
      ) : (
        !query.isLoading && <p className="empty-state">{hasFilter ? "No hay lugares que coincidan con estos filtros." : empty}</p>
      )}
      {hasMore && <CatalogMoreButton loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()} />}
    </section>
  );
}
export function DiscoverPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [category, setCategory] = useState<number | undefined>(() =>
    positiveIdFromQuery(searchParams.get("category")),
  );
  const [highlightTagId, setHighlightTagId] = useState<number | undefined>(() =>
    positiveIdFromQuery(searchParams.get("highlightTag")),
  );
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [sort, setSort] = useState<CatalogSortValue>(() =>
    catalogSortFromQuery(searchParams.get("sort")),
  );
  const [showForm, setShowForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const pageSize = useCatalogPageSize();
  const searchTerm = search.trim();
  const deferredSearch = useDeferredValue(searchTerm);
  const qc = useQueryClient();
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });
  const tags = useQuery({
    queryKey: ["highlight-tags"],
    queryFn: getHighlightTags,
  });
  const suggestions = useQuery({
    queryKey: ["place-suggestions", deferredSearch],
    queryFn: () => getPlaces(undefined, undefined, undefined, undefined, deferredSearch, undefined, 10),
    enabled: Boolean(deferredSearch),
  });
  const archived = useQuery({ queryKey: ["places", "archived"], queryFn: getArchivedPlaces, enabled: showArchived });
  const restore = useMutation({ mutationFn: restorePlace, onSuccess: async place => { await Promise.all([qc.invalidateQueries({ queryKey: ["places"] }), qc.invalidateQueries({ queryKey: ["places", "archived"] })]); showNotice(`${place.name} volvió a la lista de lugares.`); } });
  useEffect(() => {
    const next = new URLSearchParams();
    if (category) next.set("category", String(category));
    if (highlightTagId) next.set("highlightTag", String(highlightTagId));
    if (searchTerm) next.set("search", searchTerm);
    if (sort) next.set("sort", sort);
    setSearchParams(next, { replace: true });
  }, [category, highlightTagId, searchTerm, setSearchParams, sort]);
  const hasFilter = Boolean(category || highlightTagId || searchTerm || sort);
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">TU MAPA DEL HAMBRE</p>
          <h1>
            ¿Qué vamos a<br />
            <em> probar</em> hoy?
          </h1>
          <p>Tu ranking personal de lugares que sí dan ganas de volver.</p>
        </div>
        <div className="hero-art">
          🍜<span>✦</span>
          <b>🍗</b>
        </div>
      </section>
      <nav className="quick-nav quick-nav-action">
        <EntityCreateButton
          eyebrow="Nuevo lugar"
          icon="🍽️"
          label="Agregar lugar"
          onClick={() => setShowForm(true)}
        />
      </nav>
      <section className="food-controls">
        <div className="catalog-search-sort">
          <CatalogEntitySearch
            candidates={(suggestions.data?.content ?? []).map((place) => ({ id: place.id, title: place.name, updatedAt: place.updatedAt }))}
            label="Buscar lugares"
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
        <FoodFilterChips
          label="Categorías"
          allLabel="🍽️ Todos"
          options={(categories.data ?? []).map((category) => ({
            id: category.id,
            label: `${category.icon} ${category.name}`,
          }))}
          value={category}
          onChange={setCategory}
        />
        <FoodFilterChips
          label="¿Por qué se destaca?"
          allLabel="Todos"
          options={(tags.data ?? []).map((tag) => ({
            id: tag.id,
            label: `${tag.emoji} ${tag.name}`,
          }))}
          value={highlightTagId}
          onChange={setHighlightTagId}
        />
      </section>
      <PlaceSection
        status="PENDING"
        category={category}
        highlightTagId={highlightTagId}
        search={deferredSearch}
        sort={sort}
        eyebrow="POR PROBAR"
        title="Pendientes para ir"
        empty="Todavía no agendaste ningún lugar."
        hasFilter={hasFilter}
        pageSize={pageSize}
      />
      <PlaceSection
        status="REVIEWED"
        category={category}
        highlightTagId={highlightTagId}
        search={deferredSearch}
        sort={sort}
        eyebrow="YA FUIMOS"
        title="Visitas registradas"
        empty="Cuando registren la primera visita, aparecerá acá."
        hasFilter={hasFilter}
        pageSize={pageSize}
      />
      <section className="archived-places"><Button variant="tertiary" icon="🗃️" type="button" onClick={() => setShowArchived(current => !current)}>{showArchived ? "Ocultar archivados" : "Ver lugares archivados"}</Button>{showArchived && <>{archived.isError && <p className="form-error">{archived.error.message}</p>}{archived.isLoading && <p className="muted">Cargando archivados…</p>}{!archived.isLoading && !archived.data?.length && <p className="empty-state">No tenés lugares archivados.</p>}{archived.data?.map(place => <article className="archived-place" key={place.id}><span>{place.category.icon}</span><div><strong>{place.name}</strong><small>Archivado. Sus datos y fotos se conservan.</small></div><Button variant="secondary" icon="↩️" type="button" disabled={restore.isPending} onClick={() => restore.mutate(place.id)}>Restaurar lugar</Button></article>)}</>}</section>
      {showForm && <PlaceForm onClose={() => setShowForm(false)} />}
    </>
  );
}
