import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useDeferredValue, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FilmCard } from "./FilmCard";
import { FilmForm } from "./FilmForm";
import { getFilmGenres, getFilms, getPlatforms } from "./films";
import { Modal } from "../../components/ui/Modal";
import { EntityCreateButton } from "../../components/ui/EntityCreateButton";
import { CatalogEntitySearch } from "../../components/ui/CatalogEntitySearch";
import { CatalogMoreButton } from "../../components/ui/IncrementalCatalog";
import { useCatalogPageSize } from "../../lib/settings";
import {
  catalogSortFromQuery,
  catalogSortOptions,
  type CatalogSortValue,
} from "../../lib/catalogSort";

type FilterOption = { id: string | number; label: string };
function FilterChips({
  label,
  allLabel,
  options,
  value,
  onChange,
}: {
  label: string;
  allLabel: string;
  options: FilterOption[];
  value?: string | number;
  onChange: (value?: string | number) => void;
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
      className="film-filter"
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
            className="film-filter-more"
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
          <div className="chips film-filter-dialog">
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

function useFilmPages({
  genre,
  platformId,
  search,
  sort,
  watched,
  pageSize,
}: {
  genre?: string;
  platformId?: number;
  search: string;
  sort: CatalogSortValue;
  watched: boolean;
  pageSize: number;
}) {
  return useInfiniteQuery({
    queryKey: ["films", watched, genre, platformId, search, sort, pageSize],
    queryFn: ({ pageParam }) =>
      getFilms({
        genre,
        platformId,
        watched,
        search: search || undefined,
        sort: sort || undefined,
        cursor: pageParam,
        size: pageSize,
      }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

function FilmSection({
  title,
  eyebrow,
  query,
  empty,
  filtered,
}: {
  title: string;
  eyebrow: string;
  query: ReturnType<typeof useFilmPages>;
  empty: string;
  filtered: boolean;
}) {
  const films = query.data?.pages.flatMap((page) => page.content) ?? [];
  return (
    <section className="film-section">
      <div className="section-title">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <strong>Mostrando {films.length} película{films.length === 1 ? "" : "s"}</strong>
      </div>
      {query.isError ? (
        <p className="form-error">{query.error.message}</p>
      ) : films.length ? (
        <div className="film-grid">
          {films.map((film) => (
            <FilmCard key={film.id} film={film} />
          ))}
        </div>
      ) : (
        !query.isLoading && <p className="empty-state">{filtered ? "No encontramos películas con estos filtros." : empty}</p>
      )}
      {query.hasNextPage && <CatalogMoreButton loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()} />}
    </section>
  );
}

export function WhichFilmPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [genre, setGenre] = useState(() => searchParams.get("genre") ?? "");
  const [platformId, setPlatformId] = useState<number | undefined>(() => {
    const value = Number(searchParams.get("platform"));
    return Number.isInteger(value) && value > 0 ? value : undefined;
  });
  const [sort, setSort] = useState<CatalogSortValue>(() =>
    catalogSortFromQuery(searchParams.get("sort")),
  );
  const [showForm, setShowForm] = useState(false);
  const pageSize = useCatalogPageSize();
  const searchTerm = search.trim();
  const deferredSearch = useDeferredValue(searchTerm);
  const pendingFilms = useFilmPages({
    genre: genre || undefined,
    platformId,
    search: deferredSearch,
    sort,
    watched: false,
    pageSize,
  });
  const watchedFilms = useFilmPages({
    genre: genre || undefined,
    platformId,
    search: deferredSearch,
    sort,
    watched: true,
    pageSize,
  });
  useEffect(() => {
    const next = new URLSearchParams();
    if (searchTerm) next.set("search", searchTerm);
    if (genre) next.set("genre", genre);
    if (platformId) next.set("platform", String(platformId));
    if (sort) next.set("sort", sort);
    setSearchParams(next, { replace: true });
  }, [genre, platformId, searchTerm, setSearchParams, sort]);
  const platforms = useQuery({
    queryKey: ["watch-platforms"],
    queryFn: getPlatforms,
  });
  const genreOptions = useQuery({
    queryKey: ["film-genres"],
    queryFn: getFilmGenres,
  });
  const all = [
    ...(pendingFilms.data?.pages.flatMap((page) => page.content) ?? []),
    ...(watchedFilms.data?.pages.flatMap((page) => page.content) ?? []),
  ];
  const filterGenres = genreOptions.data?.length
    ? genreOptions.data.map((option) => ({
        id: option.name,
        label: `${option.emoji} ${option.name}`,
      }))
    : [];
  const filtered = Boolean(genre || platformId || searchTerm || sort);
  return (
    <>
      <section className="film-hero">
        <div>
          <p className="eyebrow">NUESTRA SALA PERSONAL</p>
          <h1>
            ¿Qué vamos a<br />
            <em>mirar</em> hoy?
          </h1>
          <p>
            Una colección para las películas que todavía esperan y las que ya se
            quedaron con nosotros. 🍿
          </p>
        </div>
        <div className="film-hero-art" aria-hidden="true">
          🎬<span>✨</span>
          <b>🍿</b>
        </div>
      </section>
      <nav className="quick-nav quick-nav-action">
        <EntityCreateButton
          eyebrow="Nueva película"
          icon="🎬"
          label="Agregar película"
          onClick={() => setShowForm(true)}
        />
      </nav>
      <section className="film-controls">
        <div className="catalog-search-sort">
          <CatalogEntitySearch
            candidates={all.map((film) => ({ id: film.id, title: film.tmdb?.title ?? film.title, updatedAt: film.updatedAt }))}
            label="Buscar películas"
            onChange={setSearch}
            placeholder="Título, género o plataforma"
            value={search}
          />
          <label className="catalog-search-sort__field">
            <span>Ordenar catálogo</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as CatalogSortValue)}>
              {catalogSortOptions.map((option) => <option key={option.value || "default"} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        <FilterChips
          label="Géneros"
          allLabel="Todos"
          options={filterGenres}
          value={genre || undefined}
          onChange={(value) => setGenre((value as string) ?? "")}
        />
        <FilterChips
          label="Plataformas"
          allLabel="Todas"
          options={(platforms.data ?? []).map((platform) => ({
            id: platform.id,
            label: `${platform.icon} ${platform.name}`,
          }))}
          value={platformId}
          onChange={(value) =>
            setPlatformId(typeof value === "number" ? value : undefined)
          }
        />
      </section>
      {(platforms.isError || genreOptions.isError) && <p className="form-error">No pudimos cargar todos los filtros. Podés seguir explorando la lista.</p>}
      {pendingFilms.isLoading && watchedFilms.isLoading ? (
        <p aria-busy="true" className="muted">Cargando la sala…</p>
      ) : (
        <>
          <FilmSection
            query={pendingFilms}
            eyebrow="EN LA LISTA"
            title="Para ver"
            empty="Todavía no hay películas en la lista. ¡Busquen la primera!"
            filtered={filtered}
          />
          <FilmSection
            query={watchedFilms}
            eyebrow="YA PASARON POR LA SALA"
            title="Vistas registradas"
            empty="Cuando sumen la primera vista, aparecerá acá."
            filtered={filtered}
          />
        </>
      )}
      {showForm && <FilmForm onClose={() => setShowForm(false)} />}
    </>
  );
}
