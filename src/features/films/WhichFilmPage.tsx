import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { FilmCard } from "./FilmCard";
import { FilmForm } from "./FilmForm";
import { getFilmGenres, getFilms, getPlatforms } from "./films";
import { Modal } from "../../components/ui/Modal";
import { EntityCreateButton } from "../../components/ui/EntityCreateButton";
import { CatalogEntitySearch } from "../../components/ui/CatalogEntitySearch";
import type { Film } from "../../types/domain";
import {
  catalogSortFromQuery,
  catalogSortOptions,
  type CatalogSortValue,
} from "../../lib/catalogSort";

type FilterOption = { id: string | number; label: string };
const filmCatalogSortOptions = catalogSortOptions.map((option) => {
  if (option.value === "") return { ...option, label: "Última vista primero" };
  if (option.value === "date-desc") return { ...option, label: "Vista más reciente" };
  if (option.value === "date-asc") return { ...option, label: "Vista más antigua" };
  return option;
});

function currentRating(film: Film) {
  const currentReviews = new Map<string, Film["reviews"][number]>();
  for (const review of film.reviews) {
    const author = review.author?.toLowerCase();
    if ((author === "tomas" || author === "avril") && !currentReviews.has(author)) {
      currentReviews.set(author, review);
    }
  }
  const ratings = [...currentReviews.values()].map((review) => review.rating);
  return ratings.length
    ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length
    : undefined;
}

function sortFilms(films: Film[], sort: CatalogSortValue) {
  if (!sort) return films;
  return [...films].sort((left, right) => {
    if (sort === "date-desc" || sort === "date-asc") {
      const direction = sort === "date-desc" ? -1 : 1;
      const leftDate = left.lastWatchedOn ?? left.updatedAt;
      const rightDate = right.lastWatchedOn ?? right.updatedAt;
      return (Date.parse(leftDate) - Date.parse(rightDate)) * direction;
    }
    const leftRating = currentRating(left);
    const rightRating = currentRating(right);
    // Unrated films remain after rated ones instead of triggering per-film requests.
    if (leftRating === undefined) return rightRating === undefined ? 0 : 1;
    if (rightRating === undefined) return -1;
    return (leftRating - rightRating) * (sort === "rating-desc" ? -1 : 1);
  });
}

function matchesSearch(film: Film, search: string) {
  if (!search) return true;
  const text = [
    film.title,
    film.originalTitle,
    film.tmdb?.title,
    film.tmdb?.originalTitle,
    ...film.genres,
    film.platform?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("es");
  return text.includes(search.toLocaleLowerCase("es"));
}

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

function FilmSection({
  title,
  eyebrow,
  films,
  empty,
  filtered,
  focused = false,
  morePath,
}: {
  title: string;
  eyebrow: string;
  films: Film[];
  empty: string;
  filtered: boolean;
  focused?: boolean;
  morePath?: string;
}) {
  const displayed = focused ? films : films.slice(0, 10);
  return (
    <section className="film-section">
      <div className="section-title">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <strong>{displayed.length} película{displayed.length === 1 ? "" : "s"}</strong>
      </div>
      {displayed.length ? (
        <div className="film-grid">
          {displayed.map((film) => (
            <FilmCard key={film.id} film={film} />
          ))}
        </div>
      ) : (
        <p className="empty-state">{filtered ? "No encontramos películas con estos filtros." : empty}</p>
      )}
      {!focused && films.length > 10 && morePath && <Link className="catalog-section-more" to={morePath}>✨ Ver más</Link>}
    </section>
  );
}

export function WhichFilmPage() {
  const { catalogStatus } = useParams();
  const focusedStatus = catalogStatus === "pending" || catalogStatus === "done" ? catalogStatus : undefined;
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
  const searchTerm = search.trim();
  const deferredSearch = useDeferredValue(searchTerm);
  const filmsQuery = useQuery({
    queryKey: ["films", genre, platformId],
    queryFn: () => getFilms({ genre: genre || undefined, platformId }),
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
  const all = filmsQuery.data ?? [];
  const genres = useMemo(
    () =>
      [...new Set(all.flatMap((film) => film.genres))].sort((a, b) =>
        a.localeCompare(b, "es"),
      ),
    [all],
  );
  const filterGenres = genreOptions.data?.length
    ? genreOptions.data.map((option) => ({
        id: option.name,
        label: `${option.emoji} ${option.name}`,
      }))
    : genres.map((name) => ({ id: name, label: name }));
  const visible = sortFilms(
    all.filter((film) => matchesSearch(film, deferredSearch)),
    sort,
  );
  const pending = visible.filter((film) => film.watchedCount === 0);
  const watched = visible.filter((film) => film.watchedCount > 0);
  const filtered = Boolean(genre || platformId || searchTerm || sort);
  const focusPath = (status: "pending" | "done") => {
    const query = new URLSearchParams();
    if (genre) query.set("genre", genre);
    if (platformId) query.set("platform", String(platformId));
    if (searchTerm) query.set("search", searchTerm);
    if (sort) query.set("sort", sort);
    return `/films/list/${status}${query.size ? `?${query}` : ""}`;
  };
  return (
    <>
      {focusedStatus ? <section className="catalog-focus-heading"><p className="eyebrow">WHICHMOVIE · CATÁLOGO COMPLETO</p><h1>{focusedStatus === "pending" ? "Películas pendientes" : "Películas vistas"}</h1><p>Explorá solo esta parte de la sala, con todos los filtros disponibles.</p></section> : <section className="film-hero">
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
      </section>}
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
              {filmCatalogSortOptions.map((option) => <option key={option.value || "default"} value={option.value}>{option.label}</option>)}
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
      {filmsQuery.isError ? (
        <p className="form-error">{filmsQuery.error.message}</p>
      ) : filmsQuery.isLoading ? (
        <p aria-busy="true" className="muted">Cargando la sala…</p>
      ) : (
        <>
          {(!focusedStatus || focusedStatus === "pending") && <FilmSection
            films={pending}
            eyebrow="EN LA LISTA"
            title="Para ver"
            empty="Todavía no hay películas en la lista. ¡Busquen la primera!"
            filtered={filtered}
            focused={focusedStatus === "pending"}
            morePath={focusPath("pending")}
          />}
          {(!focusedStatus || focusedStatus === "done") && <FilmSection
            films={watched}
            eyebrow="YA PASARON POR LA SALA"
            title="Vistas registradas"
            empty="Cuando sumen la primera vista, aparecerá acá."
            filtered={filtered}
            focused={focusedStatus === "done"}
            morePath={focusPath("done")}
          />}
        </>
      )}
      {showForm && <FilmForm onClose={() => setShowForm(false)} />}
    </>
  );
}
