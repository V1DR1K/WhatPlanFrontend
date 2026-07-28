import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { CatalogMediaCard } from '../../components/ui/CatalogMediaCard';
import { CatalogMoreButton } from '../../components/ui/IncrementalCatalog';
import { ExperienceHero } from '../../components/ui/ExperienceHero';
import { mediaUrl } from '../../lib/api';
import { useCatalogPageSize } from '../../lib/settings';
import { getSpecialDates } from '../special-dates/specialDates';
import { getWhenDates } from './whenDates';

const displayDate = (date: string) => date.split('-').reverse().join('/');
const recurrenceLabel: Record<string, string> = { ONCE: 'Única', ANNUAL: 'Anual', MONTHLY: 'Mensual' };

export function WhenDatesPage() {
  const [specialDateId, setSpecialDateId] = useState<number>();
  const pageSize = useCatalogPageSize();
  const specialDates = useQuery({ queryKey: ['special-dates'], queryFn: getSpecialDates });
  const entries = useInfiniteQuery({
    queryKey: ['when-dates', specialDateId, pageSize],
    queryFn: ({ pageParam }) => getWhenDates(specialDateId, pageParam, pageSize),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const results = entries.data?.pages.flatMap((page) => page.content) ?? [];
  return <section className="when-dates-page">
    <ExperienceHero
      className="when-dates-hero"
      eyebrow="WHENDATES · RECUERDOS COMPARTIDOS"
      title={<>¿Qué <em>recordamos</em><br />hoy?</>}
      description="Reunimos las visitas, vistas, cocinadas y salidas que coincidieron con sus fechas importantes."
      art={<>💝<span>✦</span><b>📅</b></>}
    />
    <section className="when-dates-controls" aria-label="Filtrar recuerdos">
      <div className="catalog-search-sort">
        <label className="catalog-search-sort__field"><span>Fecha importante</span><select value={specialDateId ?? ''} onChange={(event) => setSpecialDateId(event.target.value ? Number(event.target.value) : undefined)}><option value="">Todas las fechas</option>{specialDates.data?.map((date) => <option key={date.id} value={date.id}>{date.label}</option>)}</select></label>
      </div>
    </section>
    {entries.isLoading && <p className="muted">Buscando recuerdos…</p>}
    {entries.isError && <p className="form-error">{entries.error.message}</p>}
    {!entries.isLoading && !entries.isError && !results.length && <p className="empty-state">Todavía no hay recuerdos para estas fechas.</p>}
    <div className="when-dates-grid">{results.map((occurrence) => <WhenDateCard occurrence={occurrence} key={`${occurrence.specialDate.id}:${occurrence.occurredOn}`} />)}</div>
    {entries.hasNextPage && <CatalogMoreButton loading={entries.isFetchingNextPage} onClick={() => entries.fetchNextPage()} />}
  </section>;
}

function WhenDateCard({ occurrence }: { occurrence: Awaited<ReturnType<typeof getWhenDates>>['content'][number] }) {
  const { specialDate } = occurrence; const countLabel = occurrence.experienceCount === 0 ? 'Sin experiencias vinculadas' : `${occurrence.experienceCount} ${occurrence.experienceCount === 1 ? 'experiencia vinculada' : 'experiencias vinculadas'}`;
  return <CatalogMediaCard ariaLabel={`Ver recuerdo de ${specialDate.label}`} theme="dates" orientation="portrait" to={`/when-dates/${specialDate.id}/${occurrence.occurredOn}`} image={occurrence.imageUrl ? <img className="catalog-media-card__image" src={mediaUrl(occurrence.imageUrl)} alt={`Portada de ${specialDate.label}`} loading="lazy" decoding="async" /> : <span className="when-dates-card__empty" aria-hidden="true">💝</span>} badge={displayDate(occurrence.occurredOn)} eyebrow="FECHA IMPORTANTE" title={specialDate.label} chips={[<span key={specialDate.id}>{recurrenceLabel[specialDate.recurrence]}</span>]} footer={<><span>{countLabel}</span><span>Ver recuerdo →</span></>} />;
}
