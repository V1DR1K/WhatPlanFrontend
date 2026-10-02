import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { showNotice } from '../../lib/flash';
import { getGlobalSettings, saveGlobalSettings } from '../../lib/settings';
import { session } from '../../lib/api';
import { useZoneContext } from '../../lib/zoneContext';
import { saveZonePreference } from '../zones/zones';
import { ZoneSettingsManager } from '../zones/ZoneSettingsManager';

export function SettingsPage() {
  const queryClient = useQueryClient();
  const zoneContext = useZoneContext();
  const isAdmin = session.get()?.role === 'ADMIN';
  const settings = useQuery({ queryKey: ['settings'], queryFn: getGlobalSettings, enabled: isAdmin });
  const [catalogPageSize, setCatalogPageSize] = useState(5);
  const [defaultZoneId, setDefaultZoneId] = useState<number | null>(zoneContext.defaultZoneId);
  const saveCatalogPageSize = useMutation({
    mutationFn: () => saveGlobalSettings({ catalogPageSize }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
      showNotice('Actualizamos el límite de Ver más.');
    },
  });
  const saveZoneDefault = useMutation({
    mutationFn: () => saveZonePreference(defaultZoneId),
    onSuccess: async (preference) => {
      queryClient.setQueryData(['zone-preference'], preference);
      zoneContext.selectZone(preference.defaultZoneId);
      showNotice('Actualizamos tu Zona predeterminada.');
    },
  });

  useEffect(() => {
    if (settings.data) setCatalogPageSize(settings.data.catalogPageSize);
  }, [settings.data]);
  useEffect(() => setDefaultZoneId(zoneContext.defaultZoneId), [zoneContext.defaultZoneId]);

  return <section className="settings-page" aria-labelledby="settings-title">
    <p className="eyebrow">PREFERENCIAS</p>
    <h1 id="settings-title">Configuración</h1>
    <section className="settings-page__panel" aria-labelledby="zone-default-title">
      <h2 id="zone-default-title">Zona al entrar</h2>
      <p>Elegí qué registros querés ver al iniciar sesión. También podés cambiar el filtro desde el navbar cuando quieras.</p>
      <form className="settings-page__limit-form" onSubmit={event => { event.preventDefault(); saveZoneDefault.mutate(); }}>
        <label>Mostrar por defecto
          <select value={defaultZoneId ?? ''} disabled={zoneContext.loading} onChange={event => setDefaultZoneId(event.target.value ? Number(event.target.value) : null)}>
            <option value="">Todos</option>
            {zoneContext.zones.map(zone => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
          </select>
        </label>
        <Button icon="💾" disabled={saveZoneDefault.isPending || zoneContext.loading}>{saveZoneDefault.isPending ? 'Guardando…' : 'Guardar preferencia'}</Button>
        {saveZoneDefault.error && <p className="form-error" role="alert">{saveZoneDefault.error.message}</p>}
      </form>
    </section>
    {isAdmin && <>
      <p className="eyebrow settings-page__global-label">CONFIGURACIÓN GLOBAL</p>
      <ZoneSettingsManager />
      <section className="settings-page__panel" aria-labelledby="catalog-limit-title">
        <p className="eyebrow">CATÁLOGOS</p>
        <h2 id="catalog-limit-title">Límite de Ver más</h2>
        <p className="intro">Define cuántas entidades muestra inicialmente cada bloque y cuántas suma cada vez que eligen Ver más.</p>
        {settings.isError && <p className="form-error" role="alert">{settings.error.message}</p>}
        <form className="settings-page__limit-form" onSubmit={event => { event.preventDefault(); saveCatalogPageSize.mutate(); }}>
          <label>Cantidad por bloque<input type="number" min="1" max="50" required value={catalogPageSize} onChange={event => setCatalogPageSize(Number(event.target.value))} /></label>
          <Button icon="💾" disabled={saveCatalogPageSize.isPending}>{saveCatalogPageSize.isPending ? 'Guardando…' : 'Guardar límite'}</Button>
          {saveCatalogPageSize.error && <p className="form-error" role="alert">{saveCatalogPageSize.error.message}</p>}
        </form>
      </section>
    </>}
  </section>;
}
