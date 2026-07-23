import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FilmCard } from "./FilmCard";
import { FilmForm } from "./FilmForm";
import { getFilmGenres, getFilms, getPlatforms } from "./films";
import { Modal } from "../../components/ui/Modal";
import { EntityCreateButton } from "../../components/ui/EntityCreateButton";
import type { Film } from "../../types/domain";

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

function FilmSection({
  title,
  eyebrow,
  films,
  empty,
  filtered,
}: {
  title: string;
  eyebrow: string;
  films: Film[];
  empty: string;
  filtered: boolean;
}) {
  return (
    <section className="film-section">
      <div className="section-title">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <strong>{films.length} película{films.length === 1 ? "" : "s"}</strong>
      </div>
      {films.length ? (
        <div className="film-grid">
          {films.map((film) => (
            <FilmCard key={film.id} film={film} />
          ))}
        </div>
      ) : (
        <p className="empty-state">{filtered ? "No encontramos películas con estos filtros." : empty}</p>
      )}
    </section>
  );
}

export function WhichFilmPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [genre, setGenre] = useState(() => searchParams.get("genre") ?? "");
  const [platformId, setPlatformId] = useState<number | undefined>(() => {
    const value = Number(searchParams.get("platform"));
    return Number.isInteger(value) && value > 0 ? value : undefined;
  });
  const [showForm, setShowForm] = useState(false);
  const filmsQuery = useQuery({
    queryKey: ["films", genre, platformId],
    queryFn: () => getFilms({ genre: genre || undefined, platformId }),
  });
  useEffect(() => {
    const next = new URLSearchParams();
    if (genre) next.set("genre", genre);
    if (platformId) next.set("platform", String(platformId));
    setSearchParams(next, { replace: true });
  }, [genre, platformId, setSearchParams]);
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
  const pending = all.filter((film) => film.watchedCount === 0);
  const watched = all.filter((film) => film.watchedCount > 0);
  const filtered = Boolean(genre || platformId);
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
          <FilmSection
            films={pending}
            eyebrow="EN LA LISTA"
            title="Para ver"
            empty="Todavía no hay películas en la lista. ¡Busquen la primera!"
            filtered={filtered}
          />
          <FilmSection
            films={watched}
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
