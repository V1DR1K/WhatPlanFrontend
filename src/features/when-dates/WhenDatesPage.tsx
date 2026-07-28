import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { CatalogMediaCard } from '../../components/ui/CatalogMediaCard';
import { CatalogMoreButton } from '../../components/ui/IncrementalCatalog';
import { buttonClassName } from '../../components/ui/Button';
import { mediaUrl, session } from '../../lib/api';
import { useCatalogPageSize } from '../../lib/settings';
import { getSpecialDates } from '../special-dates/specialDates';
import { getWhenDates } from './whenDates';

const currentMonth = () => new Date().toISOString().slice(0, 7);
const displayDate = (date: string) => date.split('-').reverse().join('/');
const sectionLabel: Record<string, string> = { FOOD: 'WHEREFOOD', FILM: 'WHICHMOVIE', COOK: 'WHOCOOK', FUN: 'WHYFUN' };
const sectionIcon: Record<string, string> = { FOOD: '🍽️', FILM: '🎬', COOK: '🍳', FUN: '🎲' };

export function WhenDatesPage() {
  const [month, setMonth] = useState(currentMonth);
  const [specialDateId, setSpecialDateId] = useState<number>();
  const pageSize = useCatalogPageSize();
  const specialDates = useQuery({ queryKey: ['special-dates'], queryFn: getSpecialDates });
  const entries = useInfiniteQuery({
    queryKey: ['when-dates', month, specialDateId, pageSize],
    queryFn: ({ pageParam }) => getWhenDates(month, specialDateId, pageParam, pageSize),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const results = entries.data?.pages.flatMap((page) => page.content) ?? [];
  const isAdmin = session.get()?.role === 'ADMIN';
  return <section className="when-dates-page">
    <header className="when-dates-hero">
      <div><p className="eyebrow">WHENDATES · RECUERDOS COMPARTIDOS</p><h1>¿Qué <em>recordamos</em><br />hoy?</h1><p>Reunimos las visitas, vistas, cocinadas y salidas que coincidieron con sus fechas importantes.</p><p className="when-dates-hero__meta">Fechas únicas, anuales o mensuales para volver a celebrar.</p></div>
      <div className="when-dates-hero-art" aria-hidden="true">💝<span>✦</span><b>📅</b></div>
    </header>
    {isAdmin && <nav className="quick-nav quick-nav-action"><Link className={buttonClassName('secondary')} to="/when-dates/settings"><span className="button__icon" aria-hidden="true">⚙️</span><span className="button__label">Gestionar fechas importantes</span></Link></nav>}
    <section className="when-dates-controls" aria-label="Filtrar recuerdos">
      <div className="catalog-search-sort">
        <label className="catalog-search-sort__field"><span>Mes</span><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
        <label className="catalog-search-sort__field"><span>Fecha importante</span><select value={specialDateId ?? ''} onChange={(event) => setSpecialDateId(event.target.value ? Number(event.target.value) : undefined)}><option value="">Todas las fechas</option>{specialDates.data?.map((date) => <option key={date.id} value={date.id}>{date.label}</option>)}</select></label>
      </div>
    </section>
    {entries.isLoading && <p className="muted">Buscando recuerdos…</p>}
    {entries.isError && <p className="form-error">{entries.error.message}</p>}
    {!entries.isLoading && !entries.isError && !results.length && <p className="empty-state">No hay experiencias que coincidan con estas fechas en este mes.</p>}
    <div className="when-dates-grid">{results.map((entry) => <WhenDateCard entry={entry} key={entry.id} specialDateId={specialDateId} />)}</div>
    {entries.hasNextPage && <CatalogMoreButton loading={entries.isFetchingNextPage} onClick={() => entries.fetchNextPage()} />}
  </section>;
}

function WhenDateCard({ entry, specialDateId }: { entry: Awaited<ReturnType<typeof getWhenDates>>['content'][number]; specialDateId?: number }) {
  const specialDate = entry.specialDates.find((value) => value.id === specialDateId) ?? entry.specialDates[0];
  const imageUrl = entry.occurrenceCoverUrls[specialDate.id] ?? entry.imageUrl;
  return <CatalogMediaCard ariaLabel={`Ver recuerdo de ${entry.title}`} theme="dates" orientation="portrait" to={`/when-dates/${specialDate.id}/${entry.date}`} image={imageUrl ? <img className="catalog-media-card__image" src={mediaUrl(imageUrl)} alt={`Foto de ${entry.title}`} loading="lazy" decoding="async" /> : <span className="when-dates-card__empty" aria-hidden="true">{sectionIcon[entry.section]}</span>} badge={displayDate(entry.date)} eyebrow={sectionLabel[entry.section]} title={entry.title} chips={entry.specialDates.map((value) => <span key={value.id}>{value.label}</span>)} footer={<><span>{entry.detail || 'Experiencia compartida'}</span><span>Ver recuerdo →</span></>} />;
}
