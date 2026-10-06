import { useInfiniteQuery } from '@tanstack/react-query';
import { useQuery } from '../../lib/locationQuery';
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useInAppBackGuard } from "../../lib/backGuard";
import { FilmCard } from "./FilmCard";
import { FilmForm } from "./FilmForm";
import { getFilmGenres, getFilms, getPlatforms } from "./films";
import { EntityCreateButton } from "../../components/ui/EntityCreateButton";
import { ExperienceHero } from "../../components/ui/ExperienceHero";
import { CatalogEntitySearch } from "../../components/ui/CatalogEntitySearch";
import { CatalogMoreButton } from "../../components/ui/IncrementalCatalog";
import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";
import { SectionShell } from "../../components/ui/SectionShell";
import { AsyncState } from "../../components/ui/AsyncState";
import { CatalogFilterChips } from "../../components/ui/CatalogFilterChips";
import { useCatalogPageSize } from "../../lib/settings";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { useLocationQueryScope } from "../../lib/locationQueryScope";
import {
  catalogSortFromQuery,
  catalogSortOptions,
  type CatalogSortValue,
} from "../../lib/catalogSort";

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
  const locationScope = useLocationQueryScope();
  return useInfiniteQuery({
    queryKey: ["films", ...locationScope, watched, genre, platformId, search, sort, pageSize],
    queryFn: ({ pageParam, signal }) =>
      getFilms({
        genre,
        platformId,
        watched,
        search: search || undefined,
        sort: sort || undefined,
        cursor: pageParam,
        size: pageSize,
        signal,
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
        <AsyncState error onRetry={() => query.refetch()} section="film" />
      ) : query.isLoading ? (
        <LoadingSkeleton variant="catalog" section="film" />
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
  useInAppBackGuard("/app");
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
  const deferredSearch = useDebouncedValue(searchTerm);
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
    <SectionShell className="catalog-experience" section="film">
      <ExperienceHero
        className="film-hero"
        eyebrow="NUESTRA SALA PERSONAL"
        title={<>¿Qué vamos a<br /><em>mirar</em> hoy?</>}
        description="Una colección para las películas que todavía esperan y las que ya se quedaron con nosotros. 🍿"
        art={<>🎬<span>✨</span><b>🍿</b></>}
      />
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
        <CatalogFilterChips
          label="Géneros"
          allLabel="Todos"
          options={filterGenres}
          value={genre || undefined}
          onChange={(value) => setGenre((value as string) ?? "")}
        />
        <CatalogFilterChips
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
      {(platforms.isError || genreOptions.isError) && <p className="form-error" role="alert">No pudimos cargar todos los filtros. Podés seguir explorando la lista.</p>}
      {pendingFilms.isLoading && watchedFilms.isLoading ? (
        <LoadingSkeleton variant="catalog" section="film" />
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
    </SectionShell>
  );
}
