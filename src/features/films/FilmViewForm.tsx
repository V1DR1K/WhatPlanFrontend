import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import type { Film, FilmView } from '../../types/domain';
import { addFilmView, updateFilmView } from './films';
import { showNotice } from '../../lib/flash';

const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());

export function FilmViewForm({ film, view, onClose, onSaved }: { film: Film; view?: FilmView; onClose: () => void; onSaved: (view: FilmView) => void }) {
  const qc = useQueryClient();
  const title = film.tmdb?.title ?? film.title;
  const [watchedOn, setWatchedOn] = useState(view?.watchedOn ?? today());
  const mutation = useMutation({
    mutationFn: () => view ? updateFilmView(film.id, view.id, watchedOn) : addFilmView(film.id, watchedOn),
    onSuccess: async saved => {
      await Promise.all([qc.invalidateQueries({ queryKey: ['film', film.id] }), qc.invalidateQueries({ queryKey: ['films'] })]);
      showNotice(view ? 'Actualizamos la fecha de la vista.' : 'Vista registrada. Ahora cada uno puede dejar su reseña.');
      onSaved(saved);
    },
  });

  return <Modal onClose={onClose} confirmDiscard pending={mutation.isPending}><form onSubmit={event => { event.preventDefault(); mutation.mutate(); }}><p className="eyebrow">{view ? 'EDITAR VISTA' : film.watchedCount ? 'NUEVA VISTA' : 'PRIMERA VISTA'}</p><h2>{title}</h2><p className="muted">Registren la fecha. Las reseñas quedan asociadas a esta vista.</p><label>¿Cuándo la vieron?<input type="date" required max={today()} value={watchedOn} onChange={event => setWatchedOn(event.target.value)} /></label><Button icon={view ? '✓' : '＋'} disabled={mutation.isPending}>{mutation.isPending ? 'Guardando…' : view ? 'Guardar vista' : film.watchedCount ? 'Registrar nueva vista' : 'Registrar primera vista'}</Button>{mutation.error && <p className="form-error">{mutation.error.message}</p>}</form></Modal>;
}
