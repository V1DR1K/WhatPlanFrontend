import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import type { Film, FilmView } from '../../types/domain';
import { addFilmView, updateFilmView } from './films';
import { showNotice } from '../../lib/flash';
import { useExperienceDraft } from '../journey/LocationFields';

const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());

export function FilmViewForm({ film, view, onClose, onSaved }: { film: Film; view?: FilmView; onClose: () => void; onSaved: (view: FilmView) => void }) {
  const location = useExperienceDraft('FILM', film.id, view?.id, undefined);
  const query = new URLSearchParams(window.location.search);
  const journeyBinding = view || (query.get('journeySection') === 'FILM' && query.get('journeyEntity') === String(film.id))
    ? { stageId: location.binding.stageId, pointId: location.binding.pointId }
    : {};
  const qc = useQueryClient();
  const title = film.tmdb?.title ?? film.title;
  const [watchedOn, setWatchedOn] = useState(view?.watchedOn ?? new URLSearchParams(window.location.search).get('journeyDate') ?? today());
  const mutation = useMutation({
    mutationFn: () => view ? updateFilmView(film.id, view.id, watchedOn, journeyBinding) : addFilmView(film.id, watchedOn, journeyBinding),
    onSuccess: async saved => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['journey'] }),
        qc.invalidateQueries({ queryKey: ['journey-day'] }),
        qc.invalidateQueries({ queryKey: ['when-dates'] }),
        qc.invalidateQueries({ queryKey: ['experience-location'] }),
        qc.invalidateQueries({ queryKey: ['film', film.id] }),
        qc.invalidateQueries({ queryKey: ['films'] }),
      ]);
      showNotice(view ? 'Actualizamos la fecha de la vista.' : 'Vista registrada. Ahora cada uno puede dejar su reseña.');
      onSaved(saved);
    },
  });

  return (
    <Modal size="compact" onClose={onClose} confirmDiscard pending={mutation.isPending}>
      <form className="film-form" onSubmit={event => { event.preventDefault(); mutation.mutate(); }}>
        <p className="eyebrow">{view ? 'EDITAR VISTA' : film.watchedCount ? 'NUEVA VISTA' : 'PRIMERA VISTA'}</p>
        <h2>{title}</h2>
        <p className="muted">Registren la fecha. Las reseñas quedan asociadas a esta vista.</p>
        <label>¿Cuándo la vieron?<input type="date" required max={today()} value={watchedOn} onChange={event => setWatchedOn(event.target.value)} /></label>
        <Button icon={view ? '💾' : '📅'} disabled={location.loading || !!location.error || mutation.isPending}>{mutation.isPending ? 'Guardando…' : view ? 'Guardar vista' : film.watchedCount ? 'Registrar nueva vista' : 'Registrar primera vista'}</Button>
        {location.error && <p className="form-error" role="alert">{location.error.message}</p>}
        {mutation.error && <p className="form-error" role="alert">{mutation.error.message}</p>}
      </form>
    </Modal>
  );
}
