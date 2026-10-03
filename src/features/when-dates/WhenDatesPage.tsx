import { useInfiniteQuery } from '@tanstack/react-query';
import { useQuery } from '../../lib/locationQuery';
import { useInAppBackGuard } from '../../lib/backGuard';
import { CatalogMediaCard } from '../../components/ui/CatalogMediaCard';
import { CatalogMoreButton } from '../../components/ui/IncrementalCatalog';
import { ExperienceHero } from '../../components/ui/ExperienceHero';
import { SectionShell } from '../../components/ui/SectionShell';
import { AsyncState } from '../../components/ui/AsyncState';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { MediaImage } from '../../components/ui/MediaImage';
import { useSearchParams } from 'react-router-dom';
import { useCatalogPageSize } from '../../lib/settings';
import { getSpecialDates } from '../special-dates/specialDates';
import { getWhenDates } from './whenDates';
import { useZoneContext } from '../../lib/zoneContext';

const displayDate = (date: string) => date.split('-').reverse().join('/');
const recurrenceLabel: Record<string, string> = { ONCE: 'Única', ANNUAL: 'Anual', MONTHLY: 'Mensual' };

export function WhenDatesPage() {
  useInAppBackGuard('/app');
  const [searchParams, setSearchParams] = useSearchParams();
  const querySpecialDateId = Number(searchParams.get('specialDate'));
  const specialDateId = Number.isInteger(querySpecialDateId) && querySpecialDateId > 0 ? querySpecialDateId : undefined;
  const pageSize = useCatalogPageSize();
  const { coupleId, selectedZoneId } = useZoneContext();
  const specialDates = useQuery({ queryKey: ['special-dates', coupleId], queryFn: getSpecialDates });
  const entries = useInfiniteQuery({
    queryKey: ['when-dates', coupleId, selectedZoneId, specialDateId, pageSize],
    queryFn: ({ pageParam, signal }) => getWhenDates(specialDateId, pageParam, pageSize, signal),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const results = entries.data?.pages.flatMap((page) => page.content) ?? [];
  const chooseSpecialDate = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('specialDate', value);
    else next.delete('specialDate');
    setSearchParams(next, { replace: true });
  };
  return <SectionShell className="when-dates-page" section="dates">
    <ExperienceHero
      className="when-dates-hero"
      eyebrow="WHENDATES · RECUERDOS COMPARTIDOS"
      title={<>¿Qué <em>recordamos</em><br />hoy?</>}
      description="Reunimos las visitas, vistas, cocinadas y salidas que coincidieron con sus fechas importantes."
      art={<>💝<span>✦</span><b>📅</b></>}
    />
    <section className="when-dates-controls" aria-label="Filtrar recuerdos">
      <div className="catalog-search-sort">
        <label className="catalog-search-sort__field"><span>Fecha importante</span><select value={specialDateId ?? ''} onChange={(event) => chooseSpecialDate(event.target.value)}><option value="">Todas las fechas</option>{specialDates.data?.map((date) => <option key={date.id} value={date.id}>{date.label}</option>)}</select></label>
      </div>
    </section>
    {specialDates.isError && <p className="form-error" role="alert">No pudimos cargar las fechas importantes para filtrar.</p>}
    {entries.isLoading && <LoadingSkeleton variant="catalog" />}
    {entries.isError && <AsyncState error onRetry={() => entries.refetch()} />}
    {!entries.isLoading && !entries.isError && !results.length && <p className="empty-state" role="status">Todavía no hay recuerdos para estas fechas.</p>}
    <div className="when-dates-grid" aria-busy={entries.isFetching}>{results.map((occurrence) => <WhenDateCard occurrence={occurrence} key={`${occurrence.specialDate.id}:${occurrence.occurredOn}`} />)}</div>
    {entries.hasNextPage && <CatalogMoreButton loading={entries.isFetchingNextPage} onClick={() => entries.fetchNextPage()} />}
  </SectionShell>;
}

function WhenDateCard({ occurrence }: { occurrence: Awaited<ReturnType<typeof getWhenDates>>['content'][number] }) {
  const { specialDate } = occurrence; const countLabel = occurrence.experienceCount === 0 ? 'Sin experiencias vinculadas' : `${occurrence.experienceCount} ${occurrence.experienceCount === 1 ? 'experiencia vinculada' : 'experiencias vinculadas'}`;
  return <CatalogMediaCard ariaLabel={`Ver recuerdo de ${specialDate.label}`} theme="dates" orientation="portrait" to={`/app/when-dates/${specialDate.id}/${occurrence.occurredOn}`} image={occurrence.imageUrl ? <MediaImage className="catalog-media-card__image" src={occurrence.imageUrl} alt={`Portada de ${specialDate.label}`} width={480} height={320} loading="lazy" decoding="async" /> : <span className="when-dates-card__empty" aria-hidden="true">💝</span>} badge={displayDate(occurrence.occurredOn)} eyebrow="FECHA IMPORTANTE" title={specialDate.label} chips={[<span key={specialDate.id}>{recurrenceLabel[specialDate.recurrence]}</span>]} footer={<><span>{countLabel}</span><span>Ver recuerdo →</span></>} />;
}
