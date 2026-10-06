import { OriginSettingsPanel } from '../journey/OriginSettingsPanel';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery } from '../../lib/locationQuery';
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { showNotice } from '../../lib/flash';
import { getGlobalSettings, saveGlobalSettings } from '../../lib/settings';
import { session } from '../../lib/api';

export function SettingsPage() {
  const queryClient = useQueryClient();
  const isAdmin = session.get()?.role === 'ADMIN';
  const settings = useQuery({ queryKey: ['settings'], queryFn: getGlobalSettings, enabled: isAdmin });
  const [catalogPageSize, setCatalogPageSize] = useState(5);
  const saveCatalogPageSize = useMutation({
    mutationFn: () => saveGlobalSettings({ catalogPageSize }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
      showNotice('Actualizamos el límite de Ver más.');
    },
  });

  useEffect(() => {
    if (settings.data) setCatalogPageSize(settings.data.catalogPageSize);
  }, [settings.data]);

  return <section className="settings-page" aria-labelledby="settings-title">
    <p className="eyebrow">PREFERENCIAS</p>
    <h1 id="settings-title">Configuración</h1>
    {!isAdmin && <OriginSettingsPanel />}
    {isAdmin && <>
      <p className="eyebrow settings-page__global-label">CONFIGURACIÓN GLOBAL</p>
      <section className="settings-page__panel" aria-labelledby="catalog-limit-title">
        <p className="eyebrow">CATÁLOGOS</p>
        <h2 id="catalog-limit-title">Límite de Ver más</h2>
        <p className="intro">Define cuántas entidades muestra inicialmente cada bloque y cuántas suma cada vez que eligen Ver más.</p>
        {settings.isError && <p className="form-error" role="alert">{settings.error.message}</p>}
        {settings.isLoading ? <LoadingSkeleton variant="inline" inlineKind="settings" /> : <form className="settings-page__limit-form" onSubmit={event => { event.preventDefault(); saveCatalogPageSize.mutate(); }}>
          <label>Cantidad por bloque<input type="number" min="1" max="50" required value={catalogPageSize} onChange={event => setCatalogPageSize(Number(event.target.value))} /></label>
          <Button icon="💾" disabled={saveCatalogPageSize.isPending}>{saveCatalogPageSize.isPending ? 'Guardando…' : 'Guardar límite'}</Button>
          {saveCatalogPageSize.error && <p className="form-error" role="alert">{saveCatalogPageSize.error.message}</p>}
        </form>}
      </section>
    </>}
  </section>;
}
