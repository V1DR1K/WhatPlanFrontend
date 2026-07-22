import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/ui/Modal';
import type { Film, FilmView } from '../../types/domain';
import { addFilmView, updateFilmView } from './films';
import { showNotice } from '../../lib/flash';

const today = () => new Date().toLocaleDateString('sv-SE');
const now = () => new Date().toTimeString().slice(0, 5);

export function FilmViewForm({ film, view, onClose, onSaved }: { film: Film; view?: FilmView; onClose: () => void; onSaved: (view: FilmView) => void }) {
  const qc = useQueryClient();
  const title = film.tmdb?.title ?? film.title;
  const [watchedOn, setWatchedOn] = useState(view?.watchedOn ?? today());
  const [watchedAt, setWatchedAt] = useState(view?.watchedAt ?? now());
  const mutation = useMutation({
    mutationFn: () => view ? updateFilmView(film.id, view.id, watchedOn, watchedAt) : addFilmView(film.id, watchedOn, watchedAt),
    onSuccess: async saved => {
      await Promise.all([qc.invalidateQueries({ queryKey: ['film', film.id] }), qc.invalidateQueries({ queryKey: ['films'] })]);
      showNotice(view ? 'Actualizamos la fecha y hora de la vista.' : 'Vista registrada. Ahora cada uno puede dejar su reseña.');
      onSaved(saved);
    },
  });

  return <Modal onClose={onClose} confirmDiscard pending={mutation.isPending}><form onSubmit={event => { event.preventDefault(); mutation.mutate(); }}><p className="eyebrow">{view ? 'EDITAR VISTA' : film.watchedCount ? 'NUEVA VISTA' : 'PRIMERA VISTA'}</p><h2>{title}</h2><p className="muted">Registren fecha y hora aproximada. Las reseñas quedan asociadas a esta vista.</p><div className="form-columns"><label>¿Cuándo la vieron?<input type="date" required max={today()} value={watchedOn} onChange={event => setWatchedOn(event.target.value)} /></label><label>Hora aproximada<input type="time" required value={watchedAt} onChange={event => setWatchedAt(event.target.value)} /></label></div><button className="main-button" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando…' : view ? 'Guardar vista' : film.watchedCount ? 'Registrar nueva vista' : 'Registrar primera vista'} ✦</button>{mutation.error && <p className="form-error">{mutation.error.message}</p>}</form></Modal>;
}
