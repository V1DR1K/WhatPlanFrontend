import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery } from '../../lib/locationQuery';
import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { showNotice } from '../../lib/flash';
import type { SpecialDate, SpecialDateRecurrence } from '../../types/domain';
import { specialDateDisplay, specialDateRecurrenceLabel } from './SpecialDateLabels';
import { deleteSpecialDate, getSpecialDates, saveSpecialDate, type SpecialDateInput } from './specialDates';

const emptyDraft: SpecialDateInput = { date: '', endsOn: '', label: '', recurrence: 'ONCE' };

export function SpecialDatesManager() {
  const queryClient = useQueryClient();
  const specialDates = useQuery({ queryKey: ['special-dates'], queryFn: getSpecialDates });
  const [draft, setDraft] = useState<SpecialDateInput>(emptyDraft);
  const [rangeEnabled, setRangeEnabled] = useState(false);
  const [editing, setEditing] = useState<SpecialDate | null>();
  const [deleting, setDeleting] = useState<SpecialDate>();
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['special-dates'] }),
    queryClient.invalidateQueries({ queryKey: ['journey-day'] }),
  ]);
  const closeForm = () => {
    setEditing(undefined);
    setDraft(emptyDraft);
    setRangeEnabled(false);
  };
  const save = useMutation({
    mutationFn: () => saveSpecialDate(draft, editing?.id),
    onSuccess: async () => {
      await refresh();
      showNotice(editing ? 'Actualizamos la fecha especial.' : 'Agregamos la fecha especial.');
      closeForm();
    },
  });
  const remove = useMutation({
    mutationFn: (id: number) => deleteSpecialDate(id),
    onSuccess: async () => {
      await refresh();
      showNotice('Eliminamos la fecha especial.');
      setDeleting(undefined);
    },
  });
  const startCreate = () => {
    save.reset();
    setDraft(emptyDraft);
    setRangeEnabled(false);
    setEditing(null);
  };
  const startEdit = (specialDate: SpecialDate) => {
    save.reset();
    setDraft({ date: specialDate.date, endsOn: specialDate.endsOn ?? specialDate.date, label: specialDate.label, recurrence: specialDate.recurrence });
    setRangeEnabled(Boolean(specialDate.endsOn && specialDate.endsOn !== specialDate.date));
    setEditing(specialDate);
  };

  return <>
    <section className="settings-page__panel" aria-labelledby="special-dates-title">
      <p className="eyebrow">CALENDARIO COMPARTIDO</p>
      <h2 id="special-dates-title">Fechas especiales</h2>
      <p className="intro">Marcá fechas que quieran reconocer en las visitas, vistas, cocinadas y salidas. Podés guardar más de una etiqueta para el mismo día.</p>
      <div className="special-dates-settings__toolbar">
        <Button icon="➕" type="button" onClick={startCreate}>Agregar fecha especial</Button>
      </div>
      {specialDates.isLoading && <LoadingSkeleton variant="list" section="dates" />}
      {specialDates.isError && <p className="form-error" role="alert">{specialDates.error.message}</p>}
      {!specialDates.isLoading && !specialDates.isError && (
        specialDates.data?.length ? <ul className="special-dates-settings__list">
          {specialDates.data.map((specialDate) => <li key={specialDate.id}>
            <div>
              <time dateTime={specialDate.date}>{specialDateDisplay(specialDate.date)}{specialDate.endsOn && specialDate.endsOn !== specialDate.date ? ` — ${specialDateDisplay(specialDate.endsOn)}` : ''}</time>
              <strong>{specialDate.label}</strong>
              <small className="special-date-recurrence">{specialDateRecurrenceLabel[specialDate.recurrence]}</small>
            </div>
            <div className="special-dates-settings__actions">
              <Button variant="tertiary" icon="✏️" type="button" onClick={() => startEdit(specialDate)}>Editar</Button>
              <Button variant="destructive" icon="🗑️" type="button" onClick={() => { remove.reset(); setDeleting(specialDate); }}>Borrar</Button>
            </div>
          </li>)}
        </ul> : <p className="special-dates-settings__empty">Todavía no cargaron fechas especiales.</p>
      )}
    </section>
    {editing !== undefined && <Modal onClose={closeForm} confirmDiscard pending={save.isPending}>
      <form onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
        <p className="eyebrow">{editing ? 'EDITAR FECHA ESPECIAL' : 'NUEVA FECHA ESPECIAL'}</p>
        <h2>{editing ? editing.label : 'Agregar fecha especial'}</h2>
        <p className="special-dates-settings__modal-copy">Las fechas se repiten según la frecuencia elegida. Si activás un rango, se conserva su duración en cada repetición.</p>
        <label>Etiqueta<input value={draft.label} maxLength={160} required autoFocus onChange={(event) => setDraft({ ...draft, label: event.target.value })} /></label>
        <label>Fecha de inicio<input type="date" value={draft.date} required onChange={(event) => { const date = event.target.value; setDraft({ ...draft, date, endsOn: !rangeEnabled || !draft.endsOn || draft.endsOn < date ? date : draft.endsOn }); }} /></label>
        <label className="special-dates-range-toggle" title={draft.recurrence === 'DAILY' ? 'La repetición diaria se configura para un solo día.' : undefined}><input type="checkbox" disabled={draft.recurrence === 'DAILY'} checked={rangeEnabled} onChange={(event) => { const enabled = event.target.checked; setRangeEnabled(enabled); setDraft({ ...draft, endsOn: enabled ? (draft.endsOn && draft.endsOn > draft.date ? draft.endsOn : draft.date) : draft.date }); }} /><span>Rango: {rangeEnabled ? 'Sí' : 'No'}</span></label>
        {rangeEnabled && <label>Fecha de fin<input type="date" min={draft.date} value={draft.endsOn ?? draft.date} required onChange={(event) => setDraft({ ...draft, endsOn: event.target.value })} /></label>}
        <label>Repetición<select value={draft.recurrence} onChange={(event) => { const recurrence = event.target.value as SpecialDateRecurrence; const daily = recurrence === 'DAILY'; if (daily) setRangeEnabled(false); setDraft({ ...draft, recurrence, endsOn: daily || !rangeEnabled ? draft.date : (draft.endsOn || draft.date) }); }}><option value="ONCE">Única</option><option value="ANNUAL">Anual</option><option value="MONTHLY">Mensual</option><option value="DAILY">Diaria</option></select></label>
        <Button icon="💾" disabled={save.isPending}>{save.isPending ? 'Guardando…' : 'Guardar fecha especial'}</Button>
        {save.error && <p className="form-error" role="alert">{save.error.message}</p>}
      </form>
    </Modal>}
    {deleting && <ConfirmDialog
      title="¿Borrar esta fecha especial?"
      message={remove.error?.message ?? `"${deleting.label}" dejará de mostrarse para el ${specialDateDisplay(deleting.date)}.`}
      confirmLabel="Borrar fecha"
      pending={remove.isPending}
      onClose={() => { remove.reset(); setDeleting(undefined); }}
      onConfirm={() => remove.mutate(deleting.id)}
    />}
  </>;
}
