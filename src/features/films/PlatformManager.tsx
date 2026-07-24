import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import type { FilmGenreOption, WatchPlatform } from '../../types/domain';
import { deleteFilmGenre, deletePlatform, getAllPlatforms, getFilmGenres, saveFilmGenre, savePlatform } from './films';

type PlatformDraft = Pick<WatchPlatform, 'name' | 'icon' | 'active'>;
type GenreDraft = Pick<FilmGenreOption, 'name' | 'emoji'>;

const emptyPlatform: PlatformDraft = { name: '', icon: '📺', active: true };
const emptyGenre: GenreDraft = { name: '', emoji: '' };

export function PlatformManager() {
  const qc = useQueryClient();
  const platforms = useQuery({ queryKey: ['watch-platforms', 'all'], queryFn: getAllPlatforms });
  const genres = useQuery({ queryKey: ['film-genres'], queryFn: getFilmGenres });
  const [platform, setPlatform] = useState<PlatformDraft>(emptyPlatform);
  const [genre, setGenre] = useState<GenreDraft>(emptyGenre);
  const [editingPlatform, setEditingPlatform] = useState<WatchPlatform>();
  const [editingGenre, setEditingGenre] = useState<FilmGenreOption>();
  const [creatingPlatform, setCreatingPlatform] = useState(false);
  const [creatingGenre, setCreatingGenre] = useState(false);
  const [deletingPlatform, setDeletingPlatform] = useState<WatchPlatform>();
  const [deletingGenre, setDeletingGenre] = useState<FilmGenreOption>();
  const refreshPlatforms = () => Promise.all([qc.invalidateQueries({ queryKey: ['watch-platforms'] }), qc.invalidateQueries({ queryKey: ['films'] })]);
  const refreshGenres = () => Promise.all([qc.invalidateQueries({ queryKey: ['film-genres'] }), qc.invalidateQueries({ queryKey: ['films'] })]);
  const savePlatformMutation = useMutation({
    mutationFn: () => savePlatform(platform, editingPlatform?.id),
    onSuccess: async () => {
      await refreshPlatforms();
      setEditingPlatform(undefined);
      setCreatingPlatform(false);
      setPlatform(emptyPlatform);
    },
  });
  const saveGenreMutation = useMutation({
    mutationFn: () => saveFilmGenre(genre, editingGenre?.id),
    onSuccess: async () => {
      await refreshGenres();
      setEditingGenre(undefined);
      setCreatingGenre(false);
      setGenre(emptyGenre);
    },
  });
  const deletePlatformMutation = useMutation({
    mutationFn: deletePlatform,
    onSuccess: async () => {
      await refreshPlatforms();
      setDeletingPlatform(undefined);
    },
  });
  const removeGenre = useMutation({
    mutationFn: deleteFilmGenre,
    onSuccess: async () => {
      await refreshGenres();
      setDeletingGenre(undefined);
    },
  });
  const platformForm = editingPlatform || creatingPlatform ? <Modal onClose={() => { setEditingPlatform(undefined); setCreatingPlatform(false); setPlatform(emptyPlatform); }}>
    <form onSubmit={event => { event.preventDefault(); savePlatformMutation.mutate(); }}>
      <p className="eyebrow">{editingPlatform ? 'EDITAR PLATAFORMA' : 'NUEVA PLATAFORMA'}</p>
      <h2>{editingPlatform ? editingPlatform.name : 'Agregar plataforma'}</h2>
      <label>Nombre<input value={platform.name} onChange={event => setPlatform({ ...platform, name: event.target.value })} required autoFocus /></label>
      <label>Ícono<input value={platform.icon} maxLength={20} onChange={event => setPlatform({ ...platform, icon: event.target.value })} required /></label>
      <Button icon="💾" disabled={savePlatformMutation.isPending}>{savePlatformMutation.isPending ? 'Guardando…' : 'Guardar plataforma'}</Button>
      {savePlatformMutation.error && <p className="form-error">{savePlatformMutation.error.message}</p>}
    </form>
  </Modal> : null;
  const genreForm = editingGenre || creatingGenre ? <Modal onClose={() => { setEditingGenre(undefined); setCreatingGenre(false); setGenre(emptyGenre); }}>
    <form onSubmit={event => { event.preventDefault(); saveGenreMutation.mutate(); }}>
      <p className="eyebrow">{editingGenre ? 'EDITAR GÉNERO' : 'NUEVO GÉNERO'}</p>
      <h2>{editingGenre ? editingGenre.name : 'Agregar género'}</h2>
      <label>Nombre<input value={genre.name} onChange={event => setGenre({ ...genre, name: event.target.value })} required autoFocus /></label>
      <label>Emoji<input value={genre.emoji} maxLength={20} onChange={event => setGenre({ ...genre, emoji: event.target.value })} required /></label>
      <Button icon="💾" disabled={saveGenreMutation.isPending}>{saveGenreMutation.isPending ? 'Guardando…' : 'Guardar género'}</Button>
      {saveGenreMutation.error && <p className="form-error">{saveGenreMutation.error.message}</p>}
    </form>
  </Modal> : null;

  return <section className="settings-page">
    <p className="eyebrow">CONFIGURACIÓN COMPARTIDA</p>
    <h2>Plataformas y géneros</h2>
    <p className="intro">Mantengan el catálogo disponible para WhichMovie.</p>
    <div className="settings-grid film-settings-grid">
      <section className="platform-settings">
        <h3>¿Dónde las vieron?</h3>
        <Button className="settings-add-button" icon="➕" type="button" onClick={() => { setEditingPlatform(undefined); setPlatform(emptyPlatform); setCreatingPlatform(true); }}>Agregar plataforma</Button>
        <div className="platform-list">
          {platforms.data?.map(value => <article key={value.id}>
            <span>{value.icon}</span>
            <div><h3>{value.name}</h3><small>{value.active ? 'Disponible' : 'Inactiva'}</small></div>
            <Button variant="tertiary" icon="✏️" type="button" onClick={() => { setEditingPlatform(value); setPlatform(value); }}>Editar</Button>
            <Button variant="destructive" icon="🗑️" type="button" onClick={() => { deletePlatformMutation.reset(); setDeletingPlatform(value); }}>Borrar</Button>
          </article>)}
        </div>
      </section>
      <section className="genre-settings">
        <h3>Géneros</h3>
        <Button className="settings-add-button" icon="➕" type="button" onClick={() => { setEditingGenre(undefined); setGenre(emptyGenre); setCreatingGenre(true); }}>Agregar género</Button>
        <div className="category-list">
          {genres.data?.map(value => <span key={value.id}>
            {value.emoji} {value.name}
            <Button variant="tertiary" icon="✏️" type="button" onClick={() => { setEditingGenre(value); setGenre(value); }}>Editar</Button>
            <Button variant="destructive" icon="🗑️" type="button" onClick={() => { removeGenre.reset(); setDeletingGenre(value); }}>Borrar</Button>
          </span>)}
        </div>
      </section>
    </div>
    {platformForm}
    {genreForm}
    {deletingPlatform && <ConfirmDialog
      title="¿Borrar esta plataforma?"
      message={deletePlatformMutation.error?.message ?? 'No podrá borrarse si está asociada a películas.'}
      confirmLabel="Borrar plataforma"
      pending={deletePlatformMutation.isPending}
      onClose={() => setDeletingPlatform(undefined)}
      onConfirm={() => deletePlatformMutation.mutate(deletingPlatform.id)}
    />}
    {deletingGenre && <ConfirmDialog
      title="¿Borrar este género?"
      message={removeGenre.error?.message ?? 'No podrá seleccionarse en nuevas películas.'}
      confirmLabel="Borrar género"
      pending={removeGenre.isPending}
      onClose={() => setDeletingGenre(undefined)}
      onConfirm={() => removeGenre.mutate(deletingGenre.id)}
    />}
  </section>;
}
