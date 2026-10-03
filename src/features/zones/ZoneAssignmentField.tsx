import { LocationFields } from '../journey/LocationFields';
export function ZoneAssignmentField({ value, onChange, stageId = null, onStageChange }: { value: number | null; onChange: (id: number | null) => void; stageId?: string | null; onStageChange?: (id: string | null) => void }) {
  return <LocationFields cityId={value} stageId={stageId} onChange={(city, stage) => { onChange(city); onStageChange?.(stage); }} />;
}
