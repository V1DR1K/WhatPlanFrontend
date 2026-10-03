import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery } from '../../lib/locationQuery';
import { Button } from '../../components/ui/Button';
import { showNotice } from '../../lib/flash';
import { createZone, deactivateZone, getAllZones, updateZone } from './zones';

export function ZoneSettingsManager() {
  const client = useQueryClient();
  const zones = useQuery({ queryKey: ['zones-all'], queryFn: getAllZones });
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const refresh = () => Promise.all([client.invalidateQueries({ queryKey: ['zones'] }), client.invalidateQueries({ queryKey: ['zones-all'] }), client.invalidateQueries({ queryKey: ['zone-preference'] })]);
  const add = useMutation({ mutationFn: () => createZone(name), onSuccess: async () => { setName(''); await refresh(); showNotice('Zona agregada.'); } });
  const edit = useMutation({ mutationFn: () => updateZone(editingId!, editingName), onSuccess: async () => { setEditingId(null); await refresh(); showNotice('Zona actualizada.'); } });
  const deactivate = useMutation({ mutationFn: deactivateZone, onSuccess: async () => { setConfirmingId(null); await refresh(); showNotice('Zona dada de baja.'); } });

  return <section className="settings-page__panel zone-settings" aria-labelledby="zone-settings-title">
    <h2 id="zone-settings-title">Zonas disponibles</h2>
    <p>Estas Zonas aparecen en el filtro superior y se pueden asignar a los registros nuevos.</p>
    {zones.isError && <p className="form-error" role="alert">{zones.error.message}</p>}
    <form className="zone-settings__add" onSubmit={event => { event.preventDefault(); add.mutate(); }}>
      <label>Nueva Zona<input value={name} maxLength={80} required onChange={event => setName(event.target.value)} placeholder="Ej. Córdoba" /></label>
      <Button icon="➕" disabled={add.isPending}>{add.isPending ? 'Agregando…' : 'Agregar Zona'}</Button>
    </form>
    {add.error && <p className="form-error" role="alert">{add.error.message}</p>}
    <ul className="zone-settings__list">
      {(zones.data ?? []).map(zone => <li key={zone.id}>
        {editingId === zone.id ? <form onSubmit={event => { event.preventDefault(); edit.mutate(); }}>
          <label className="sr-only" htmlFor={`zone-${zone.id}`}>Nombre de la Zona</label>
          <input id={`zone-${zone.id}`} value={editingName} maxLength={80} required onChange={event => setEditingName(event.target.value)} />
          <Button disabled={edit.isPending}>Guardar</Button>
          <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>Cancelar</Button>
        </form> : <>
          <span><strong>{zone.name}</strong>{!zone.active && <small>Dada de baja</small>}</span>
          <div>
            <Button type="button" variant="secondary" onClick={() => { setEditingId(zone.id); setEditingName(zone.name); }}>Editar</Button>
            {zone.active && (confirmingId === zone.id ? <>
              <span className="zone-settings__confirm">¿Dar de baja?</span>
              <Button type="button" variant="secondary" disabled={deactivate.isPending} onClick={() => deactivate.mutate(zone.id)}>Confirmar</Button>
              <Button type="button" variant="tertiary" onClick={() => setConfirmingId(null)}>Cancelar</Button>
            </> : <Button type="button" variant="tertiary" onClick={() => setConfirmingId(zone.id)}>Dar de baja</Button>)}
          </div>
        </>}
      </li>)}
    </ul>
    {(edit.error || deactivate.error) && <p className="form-error" role="alert">{(edit.error ?? deactivate.error)?.message}</p>}
  </section>;
}
