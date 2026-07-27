import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { CatalogMediaCard } from '../../components/ui/CatalogMediaCard';
import { mediaUrl } from '../../lib/api';
import { getSpecialDates } from '../special-dates/specialDates';
import { getWhenDates } from './whenDates';

const currentMonth = () => new Date().toISOString().slice(0, 7);
const displayDate = (date: string) => date.split('-').reverse().join('/');
const sectionLabel: Record<string, string> = { FOOD: 'WHEREFOOD', FILM: 'WHICHMOVIE', COOK: 'WHOCOOK', FUN: 'WHYFUN' };
const sectionIcon: Record<string, string> = { FOOD: '🍽️', FILM: '🎬', COOK: '🍳', FUN: '🎲' };

export function WhenDatesPage() {
  const [month, setMonth] = useState(currentMonth);
  const [specialDateId, setSpecialDateId] = useState<number>();
  const specialDates = useQuery({ queryKey: ['special-dates'], queryFn: getSpecialDates });
  const entries = useQuery({ queryKey: ['when-dates', month, specialDateId], queryFn: () => getWhenDates(month, specialDateId) });
  return <section className="when-dates-page">
    <header className="when-dates-hero">
      <div><p className="eyebrow">RECUERDOS COMPARTIDOS</p><h1>when<span>dates</span></h1><p>Vuelvan a las experiencias que coincidieron con sus fechas importantes.</p></div>
      <div aria-hidden="true">💝</div>
    </header>
    <section className="when-dates-controls" aria-label="Filtrar recuerdos">
      <label>Mes<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
      <label>Fecha importante<select value={specialDateId ?? ''} onChange={(event) => setSpecialDateId(event.target.value ? Number(event.target.value) : undefined)}><option value="">Todas las fechas</option>{specialDates.data?.map((date) => <option key={date.id} value={date.id}>{date.label}</option>)}</select></label>
    </section>
    {entries.isLoading && <p className="muted">Buscando recuerdos…</p>}
    {entries.isError && <p className="form-error">{entries.error.message}</p>}
    {!entries.isLoading && !entries.isError && !entries.data?.content.length && <p className="empty-state">No hay experiencias que coincidan con estas fechas en este mes.</p>}
    <div className="when-dates-grid">{entries.data?.content.map((entry) => <WhenDateCard entry={entry} key={entry.id} />)}</div>
  </section>;
}

function WhenDateCard({ entry }: { entry: Awaited<ReturnType<typeof getWhenDates>>['content'][number] }) {
  const specialDate = entry.specialDates[0];
  return <CatalogMediaCard ariaLabel={`Ver recuerdo de ${entry.title}`} theme="dates" orientation="portrait" to={`/when-dates/${specialDate.id}/${entry.date}`} image={entry.imageUrl ? <img src={mediaUrl(entry.imageUrl)} alt={`Foto de ${entry.title}`} /> : <span className="when-dates-card__empty" aria-hidden="true">{sectionIcon[entry.section]}</span>} badge={displayDate(entry.date)} eyebrow={sectionLabel[entry.section]} title={entry.title} chips={entry.specialDates.map((value) => <span key={value.id}>{value.label}</span>)} footer={<><span>{entry.detail || 'Experiencia compartida'}</span><span>Ver recuerdo →</span></>} />;
}
