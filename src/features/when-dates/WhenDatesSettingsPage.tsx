import { Link } from 'react-router-dom';
import { SpecialDatesManager } from '../special-dates/SpecialDatesManager';

export function WhenDatesSettingsPage() {
  return <section className="when-dates-page special-dates-settings" aria-labelledby="when-dates-settings-title">
    <Link className="when-date-detail__back" to="/when-dates">← Volver a WhenDates</Link>
    <p className="eyebrow">CONFIGURACIÓN DE WHENDATES</p>
    <h1 id="when-dates-settings-title">Fechas importantes</h1>
    <SpecialDatesManager />
  </section>;
}
