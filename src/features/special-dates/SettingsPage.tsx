import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { showNotice } from '../../lib/flash';
import type { SpecialDate, SpecialDateRecurrence } from '../../types/domain';
import { getGlobalSettings, saveGlobalSettings } from '../../lib/settings';
import { specialDateRecurrenceLabel } from './SpecialDateLabels';
import { deleteSpecialDate, getSpecialDates, saveSpecialDate, type SpecialDateInput } from './specialDates';

const emptyDraft: SpecialDateInput = { date: '', label: '', recurrence: 'ONCE' };

export function SettingsPage() {
  const queryClient = useQueryClient();
  const specialDates = useQuery({ queryKey: ['special-dates'], queryFn: getSpecialDates });
  const settings = useQuery({ queryKey: ['settings'], queryFn: getGlobalSettings });
  const [draft, setDraft] = useState<SpecialDateInput>(emptyDraft);
  const [catalogPageSize, setCatalogPageSize] = useState(5);
  const [editing, setEditing] = useState<SpecialDate | null>();
  const [deleting, setDeleting] = useState<SpecialDate>();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['special-dates'] });
  const refreshSettings = () => queryClient.invalidateQueries({ queryKey: ['settings'] });
  const closeForm = () => {
    setEditing(undefined);
    setDraft(emptyDraft);
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
  const saveCatalogPageSize = useMutation({
    mutationFn: () => saveGlobalSettings({ catalogPageSize }),
    onSuccess: async () => {
      await refreshSettings();
      showNotice('Actualizamos el límite de Ver más.');
    },
  });

  useEffect(() => {
    if (settings.data) setCatalogPageSize(settings.data.catalogPageSize);
  }, [settings.data]);

  const startCreate = () => {
    save.reset();
    setDraft(emptyDraft);
    setEditing(null);
  };
  const startEdit = (specialDate: SpecialDate) => {
    save.reset();
    setDraft({ date: specialDate.date, label: specialDate.label, recurrence: specialDate.recurrence });
    setEditing(specialDate);
  };

  return <section className="settings-page special-dates-settings" aria-labelledby="settings-title">
    <p className="eyebrow">CONFIGURACIÓN GLOBAL</p>
    <h1 id="settings-title">Configuración global</h1>
    <section className="settings-page__panel" aria-labelledby="catalog-limit-title">
      <p className="eyebrow">CATÁLOGOS</p>
      <h2 id="catalog-limit-title">Límite de Ver más</h2>
      <p className="intro">Define cuántas entidades muestra inicialmente cada bloque y cuántas suma cada vez que eligen Ver más.</p>
      {settings.isError && <p className="form-error" role="alert">{settings.error.message}</p>}
      <form className="settings-page__limit-form" onSubmit={(event) => { event.preventDefault(); saveCatalogPageSize.mutate(); }}>
        <label>Cantidad por bloque<input type="number" min="1" max="50" required value={catalogPageSize} onChange={(event) => setCatalogPageSize(Number(event.target.value))} /></label>
        <Button icon="💾" disabled={saveCatalogPageSize.isPending}>{saveCatalogPageSize.isPending ? 'Guardando…' : 'Guardar límite'}</Button>
        {saveCatalogPageSize.error && <p className="form-error" role="alert">{saveCatalogPageSize.error.message}</p>}
      </form>
    </section>
    <section className="settings-page__panel" aria-labelledby="special-dates-title">
    <p className="eyebrow">CALENDARIO COMPARTIDO</p>
    <h2 id="special-dates-title">Fechas especiales</h2>
    <p className="intro">Marcá fechas que quieran reconocer en las visitas, vistas, cocinadas y salidas. Podés guardar más de una etiqueta para el mismo día.</p>
    <div className="special-dates-settings__toolbar">
      <Button icon="➕" type="button" onClick={startCreate}>Agregar fecha especial</Button>
    </div>
    {specialDates.isLoading && <p className="muted" aria-busy="true">Cargando fechas especiales…</p>}
    {specialDates.isError && <p className="form-error" role="alert">{specialDates.error.message}</p>}
    {!specialDates.isLoading && !specialDates.isError && (
      specialDates.data?.length ? <ul className="special-dates-settings__list">
        {specialDates.data.map((specialDate) => <li key={specialDate.id}>
          <div>
            <time dateTime={specialDate.date}>{specialDate.date}</time>
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
    {editing !== undefined && <Modal onClose={closeForm} confirmDiscard pending={save.isPending}>
      <form onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
        <p className="eyebrow">{editing ? 'EDITAR FECHA ESPECIAL' : 'NUEVA FECHA ESPECIAL'}</p>
        <h2>{editing ? editing.label : 'Agregar fecha especial'}</h2>
        <p className="special-dates-settings__modal-copy">Elegí si la etiqueta ocurre una sola vez, cada año o todos los meses el mismo día.</p>
        <label>Etiqueta<input value={draft.label} maxLength={160} required autoFocus onChange={(event) => setDraft({ ...draft, label: event.target.value })} /></label>
        <label>Fecha<input type="date" value={draft.date} required onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label>
        <label>Repetición<select value={draft.recurrence} onChange={(event) => setDraft({ ...draft, recurrence: event.target.value as SpecialDateRecurrence })}><option value="ONCE">Única, solo esta fecha</option><option value="ANNUAL">Anual, mismo día y mes</option><option value="MONTHLY">Mensual, mismo día</option></select></label>
        <Button icon="💾" disabled={save.isPending}>{save.isPending ? 'Guardando…' : 'Guardar fecha especial'}</Button>
        {save.error && <p className="form-error" role="alert">{save.error.message}</p>}
      </form>
    </Modal>}
    {deleting && <ConfirmDialog
      title="¿Borrar esta fecha especial?"
      message={remove.error?.message ?? `"${deleting.label}" dejará de mostrarse para el ${deleting.date}.`}
      confirmLabel="Borrar fecha"
      pending={remove.isPending}
      onClose={() => { remove.reset(); setDeleting(undefined); }}
      onConfirm={() => remove.mutate(deleting.id)}
    />}
    </section>
  </section>;
}
