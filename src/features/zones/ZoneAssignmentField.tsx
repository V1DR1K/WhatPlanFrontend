import { useZoneContext } from '../../lib/zoneContext';

export function ZoneAssignmentField({ value, onChange }: { value: number | null; onChange: (id: number | null) => void }) {
  const { zones, loading } = useZoneContext();
  return <label className="zone-assignment-field">
    Zona del registro
    <select required value={value ?? ''} onChange={event => onChange(event.target.value ? Number(event.target.value) : null)} disabled={loading}>
      <option value="">Elegí una Zona</option>
      {zones.map(zone => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
    </select>
  </label>;
}
