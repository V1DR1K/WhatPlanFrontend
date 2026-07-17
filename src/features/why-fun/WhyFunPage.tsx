import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { LoadMore } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import type { FunCategory } from '../../types/domain';
import { FunVenueCard } from './FunVenueCard';
import { FunVenueForm } from './FunVenueForm';
import { getFunCategories, getFunVenues } from './whyFun';

function FilterChips({ label, allLabel, categories, selected, onSelect }: { label: string; allLabel: string; categories: FunCategory[]; selected?: number; onSelect: (id?: number) => void }) {
 const [showAll, setShowAll] = useState(false);
 const options = showAll ? categories : categories.slice(0, 6);
 const choose = (id?: number) => { onSelect(id); setShowAll(false); };
 return <section className="fun-filter"><span>{label}</span><div className="chips"><button className={!selected ? 'selected' : ''} onClick={() => choose()}>{allLabel}</button>{options.map(category => <button key={category.id} className={category.id === selected ? 'selected' : ''} onClick={() => choose(category.id)}>{category.icon} {category.name}</button>)}{categories.length > 6 && <button className="food-filter-more" onClick={() => setShowAll(true)} aria-label={`Ver más ${label.toLowerCase()}`}>•••</button>}</div>{showAll && <Modal onClose={() => setShowAll(false)}><p className="eyebrow">FILTRAR POR {label.toUpperCase()}</p><h2>Elegí una opción</h2><div className="chips fun-filter-dialog"><button className={!selected ? 'selected' : ''} onClick={() => choose()}>{allLabel}</button>{categories.map(category => <button key={category.id} className={category.id === selected ? 'selected' : ''} onClick={() => choose(category.id)}>{category.icon} {category.name}</button>)}</div></Modal>}</section>
}

export function WhyFunPage() {
 const [categoryId, setCategoryId] = useState<number>();
 const [subcategoryId, setSubcategoryId] = useState<number>();
 const [creating, setCreating] = useState(false);
 const categories = useQuery({ queryKey: ['fun-categories'], queryFn: getFunCategories });
 const roots = (categories.data ?? []).filter(category => !category.parentId);
 const subcategories = (categories.data ?? []).filter(category => category.parentId === categoryId);
 const venues = useInfiniteQuery({ queryKey: ['fun-venues', categoryId, subcategoryId], queryFn: ({ pageParam }) => getFunVenues({ categoryId, subcategoryId, cursor: pageParam }), initialPageParam: undefined as number | undefined, getNextPageParam: page => page.nextCursor ?? undefined });
 const list = venues.data?.pages.flatMap(page => page.content) ?? [];
 const chooseCategory = (id?: number) => { setCategoryId(id); setSubcategoryId(undefined); };

 return <><section className="fun-hero"><div><p className="eyebrow">SALIR A JUGAR</p><h1>¿Qué vamos a<br/><em>hacer</em> hoy?</h1><p>Los lugares para competir, jugar, explorar y volver a pasarla bien.</p></div><div className="fun-hero-art">🎲<span>✦</span><b>🕹️</b></div></section><nav className="quick-nav quick-nav-action"><button className="module-add-button module-add-button--fun" onClick={() => setCreating(true)}><span className="module-add-icon">＋</span><span><small>NUEVO PLAN</small>Agendar salida</span><b>🎯</b></button></nav><section className="fun-controls"><FilterChips label="Categorías" allLabel="Todo" categories={roots} selected={categoryId} onSelect={chooseCategory} />{categoryId && <FilterChips label="Subcategorías" allLabel="Todas" categories={subcategories} selected={subcategoryId} onSelect={setSubcategoryId} />}</section><section className="fun-section"><div className="section-title"><div><p className="eyebrow">PARA SALIR</p><h2>Planes guardados</h2></div><strong>{list.length} lugares</strong></div>{venues.isError ? <p className="form-error">{venues.error.message}</p> : list.length ? <div className="fun-grid">{list.map(venue => <FunVenueCard key={venue.id} venue={venue} />)}</div> : !venues.isLoading && <p className="empty-state">Todavía no guardaron ninguna salida. Agenden la primera.</p>}<LoadMore enabled={venues.hasNextPage} onClick={() => venues.fetchNextPage()} loading={venues.isFetchingNextPage} label="Ver más planes" /></section>{creating && <FunVenueForm onClose={() => setCreating(false)}/>}</>;
}
