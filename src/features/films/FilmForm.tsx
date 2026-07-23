import { useDeferredValue, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Film, TmdbMovie } from '../../types/domain';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { getFilmGenres, getPlatforms, saveFilm, searchTmdbMovies, type FilmInput, uploadFilmPhoto } from './films';
import { ReviewPrompt } from '../../components/ui/ReviewPrompt';
import { mediaUrl } from '../../lib/api';
import { showNotice } from '../../lib/flash';
import { photoInputAccept, preparePhoto } from '../../lib/photos';

const manualInput = (form: FormData, synopsis: string | undefined, genres: string[]): FilmInput => ({
  title: String(form.get('title')).trim(),
  synopsis,
  platformId: form.get('platformId') ? Number(form.get('platformId')) : undefined,
  genres,
});

const releaseYear = (date?: string) => date?.slice(0, 4);

function TmdbAttribution() {
  return <p className="tmdb-attribution">Datos e imágenes de <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">TMDB</a>. This product uses the TMDB API but is not endorsed or certified by TMDB.</p>;
}

export function FilmForm({ onClose, film }: { onClose: () => void; film?: Film }) {
  const qc = useQueryClient();
  const [genres, setGenres] = useState<string[]>(film?.genres ?? []);
  const [file, setFile] = useState<File>();
  const [photoError, setPhotoError] = useState<string>();
  const [created, setCreated] = useState<Film>();
  const [manualMode, setManualMode] = useState(Boolean(film && !film.tmdbId));
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<TmdbMovie>();
  const deferredSearch = useDeferredValue(search.trim());
  const platforms = useQuery({ queryKey: ['watch-platforms'], queryFn: getPlatforms });
  const genreOptions = useQuery({ queryKey: ['film-genres'], queryFn: getFilmGenres });
  const catalogQuery = useQuery({ queryKey: ['tmdb-movies', deferredSearch], queryFn: () => searchTmdbMovies(deferredSearch), enabled: !film && !manualMode && !selected && deferredSearch.length >= 2 });
  const importedTmdbId = selected?.tmdbId ?? film?.tmdbId;
  const isTmdbFilm = Boolean(importedTmdbId);
  const save = useMutation({
    mutationFn: async (data: FormData) => {
      const input = isTmdbFilm
        ? { tmdbId: importedTmdbId, platformId: data.get('platformId') ? Number(data.get('platformId')) : undefined, genres: [] }
        : manualInput(data, film?.synopsis, genres);
      const saved = await saveFilm(input, film?.id);
      try {
        return { film: file && !isTmdbFilm ? await uploadFilmPhoto(saved.id, file) : saved };
      } catch (error) {
        return { film: saved, photoError: error instanceof Error ? error.message : 'No pudimos subir el póster' };
      }
    },
    onSuccess: async result => {
      await Promise.all([qc.invalidateQueries({ queryKey: ['films'] }), qc.invalidateQueries({ queryKey: ['film', result.film.id] })]);
      if (!film) {
        setCreated(result.film);
        if (result.photoError) showNotice(`Guardamos la película, pero el póster no se subió: ${result.photoError}`, 'error');
        return;
      }
      showNotice(result.photoError ? `Guardamos los cambios, pero el póster no se subió: ${result.photoError}` : 'Actualizamos la película.', result.photoError ? 'error' : 'success');
      onClose();
    },
  });
  const availablePlatforms = [...(platforms.data ?? []), ...(film?.platform && !platforms.data?.some(value => value.id === film.platform?.id) ? [film.platform] : [])];
  const visibleOptions = genreOptions.data ?? [];
  const toggleGenre = (name: string) => setGenres(current => current.includes(name) ? current.filter(value => value !== name) : [...current, name]);

  if (created) return <ReviewPrompt name={created.tmdb?.title ?? created.title} reviewTo={`/films/${created.id}`} onClose={onClose} actionLabel="Registrar una vista" message="¿Ya la vieron? Primero registren la vista y después cada uno puede dejar su reseña." />;
  return <Modal onClose={onClose} confirmDiscard pending={save.isPending}><form className="film-form" onSubmit={event => { event.preventDefault(); save.mutate(new FormData(event.currentTarget)); }}>
    <p className="eyebrow">{film ? 'EDITAR PELÍCULA' : 'NUEVA PELÍCULA'}</p>
    <h2>{film ? 'Afinemos la ficha' : 'Elijan la próxima función'}</h2>
    {!film && !manualMode && !selected && <section className="tmdb-search" aria-label="Buscar película en TMDB">
      <label>Buscar en TMDB<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Ej. El viaje de Chihiro" autoFocus /></label>
      {deferredSearch.length > 0 && deferredSearch.length < 2 && <p className="tiny">Escribí al menos dos letras para buscar.</p>}
      {catalogQuery.isFetching && <p className="tiny">Buscando películas…</p>}
      {catalogQuery.isError && <p className="form-error">{catalogQuery.error.message}</p>}
      {!!catalogQuery.data?.length && <div className="tmdb-search-results">{catalogQuery.data.map(movie => <button type="button" className="tmdb-search-result" key={movie.tmdbId} onClick={() => setSelected(movie)}>{movie.posterUrl ? <img src={mediaUrl(movie.posterUrl)} alt="" /> : <span aria-hidden="true">🎬</span>}<span><strong>{movie.title}</strong>{releaseYear(movie.releaseDate) && <small>{releaseYear(movie.releaseDate)}</small>}{movie.originalTitle && movie.originalTitle !== movie.title && <em>{movie.originalTitle}</em>}<i>{movie.synopsis || 'Sin sinopsis disponible.'}</i></span></button>)}</div>}
      {catalogQuery.isSuccess && deferredSearch.length >= 2 && !catalogQuery.data?.length && <p className="empty-state">No encontramos una película con ese nombre.</p>}
      <Button variant="tertiary" type="button" className="tmdb-manual-toggle" onClick={() => setManualMode(true)}>No aparece, cargar manualmente</Button>
    </section>}
    {selected && <section className="tmdb-selection"><div>{selected.posterUrl ? <img src={mediaUrl(selected.posterUrl)} alt={`Póster de ${selected.title}`} /> : <span aria-hidden="true">🎬</span>}<div><p className="eyebrow">SELECCIONADA EN TMDB</p><h3>{selected.title}</h3>{releaseYear(selected.releaseDate) && <small>{releaseYear(selected.releaseDate)}</small>}<p>{selected.synopsis || 'La ficha se completará desde TMDB.'}</p></div></div><Button variant="tertiary" type="button" onClick={() => setSelected(undefined)}>Cambiar película</Button></section>}
    {film?.tmdbId && <section className="tmdb-selection tmdb-selection--saved"><div>{film.tmdb?.posterUrl ? <img src={mediaUrl(film.tmdb.posterUrl)} alt={`Póster de ${film.tmdb.title ?? film.title}`} /> : <span aria-hidden="true">🎬</span>}<div><p className="eyebrow">FICHA SINCRONIZADA CON TMDB</p><h3>{film.tmdb?.title ?? film.title}</h3><p>La información de la película se consulta desde TMDB y no se duplica en WhatPlan.</p></div></div></section>}
    {isTmdbFilm && <TmdbAttribution />}
    {!isTmdbFilm && (manualMode || film) && <>
      <label>Título<input name="title" defaultValue={film?.title} required autoFocus /></label>
      <label>Foto o póster <small className="tiny">JPG, PNG, WebP o HEIC · hasta 10 MB</small><input type="file" accept={photoInputAccept} onChange={async event => { const selected = event.target.files?.[0]; setPhotoError(undefined); if (!selected) return setFile(undefined); try { setFile(await preparePhoto(selected)); } catch (error) { setFile(undefined); setPhotoError(error instanceof Error ? error.message : 'No pudimos preparar el póster'); event.currentTarget.value = ''; } }} /></label>
      {photoError && <p className="form-error">{photoError}</p>}
      <small className="tiny">{file ? `Se cargará ${file.name}.` : film?.posterUrl ? 'La imagen actual se conservará si no elegís otra.' : 'Podés subir una imagen; se adapta automáticamente a los mosaicos.'}</small>
      <fieldset className="tag-picker film-genre-picker"><legend>Géneros</legend><p>Elegí todos los que correspondan. El catálogo se administra desde Configuración.</p><div className="tag-options">{visibleOptions.map(option => <label className="tag-option" key={option.id}><input type="checkbox" checked={genres.includes(option.name)} onChange={() => toggleGenre(option.name)} /><span>{option.emoji} {option.name}</span></label>)}</div></fieldset>
    </>}
    {isTmdbFilm || manualMode || film ? <><div className="form-columns"><label>Plataforma<select name="platformId" defaultValue={film?.platform?.id ?? ''}><option value="">Todavía no sabemos</option>{availablePlatforms.map(platform => <option key={platform.id} value={platform.id}>{platform.icon} {platform.name}{!platform.active ? ' (inactiva)' : ''}</option>)}</select></label></div><Button icon={film ? '✓' : '＋'} disabled={save.isPending || Boolean(photoError)}>{save.isPending ? 'Guardando…' : film ? 'Guardar película' : 'Agregar película'}</Button>{save.error && <p className="form-error">{save.error.message}</p>}</> : null}
  </form></Modal>;
}
