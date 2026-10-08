import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useAdminScope } from '../../lib/adminScope';
import { sectionThemeStyle, type SectionId } from '../../lib/sectionTheme';
import { getAdminCouple } from './admin';

const sections: { id: SectionId; label: string; path: string }[] = [
  { id: 'food', label: '🍽️ Dónde comemos', path: '/app/food' },
  { id: 'film', label: '🎬 Qué miramos', path: '/app/films' },
  { id: 'cook', label: '🍳 Qué cocinamos', path: '/app/how-cook' },
  { id: 'fun', label: '🎲 Qué hacemos', path: '/app/why-fun' },
  { id: 'dates', label: '💝 Fechas', path: '/app/when-dates' },
  { id: 'journey', label: '✈️ Viajes', path: '/app/whither-journey' },
];

export function AdminCoupleTabs() {
  const { coupleId, clearCouple } = useAdminScope();
  const location = useLocation();
  const navigate = useNavigate();
  const couple = useQuery({
    queryKey: ['admin', 'couple', coupleId],
    queryFn: () => getAdminCouple(coupleId!),
    enabled: Boolean(coupleId),
  });
  if (!coupleId) return null;

  const memberNames = couple.data?.members.filter(member => member.status === 'ACTIVE')
    .map(member => member.displayName).join(' y ');
  const label = memberNames || (couple.data?.status === 'CLOSED' ? 'Pareja cerrada' : `Pareja ${coupleId.slice(0, 8)}`);
  const activeSection = sections.find(section => location.pathname === section.path || location.pathname.startsWith(`${section.path}/`))?.id;

  return <>
    <section className="async-state" aria-label="Espacio de pareja administrado">
      <div className="section-title section-title--with-actions">
        <div><p className="eyebrow">ADMINISTRACIÓN DE PAREJA</p><h2>{label}</h2><p>Las secciones muestran los datos de este espacio.</p></div>
        <Button variant="secondary" onClick={() => { clearCouple(); navigate('/app/admin'); }}>Volver al panel</Button>
      </div>
    </section>
    <nav className="quick-nav chips" aria-label="Secciones de la pareja">
      {sections.map(section => <button key={section.id} type="button"
        className={activeSection === section.id ? 'active' : ''}
        style={sectionThemeStyle(section.id)}
        aria-current={activeSection === section.id ? 'page' : undefined}
        onClick={() => navigate(section.path)}>{section.label}</button>)}
    </nav>
  </>;
}
