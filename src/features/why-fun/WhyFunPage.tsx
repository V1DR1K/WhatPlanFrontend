import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { EntityCreateButton } from "../../components/ui/EntityCreateButton";
import type { FunCategory } from "../../types/domain";
import { FunVenueCard } from "./FunVenueCard";
import { ActivityForm } from "./ActivityForm";
import { getActivities, getFunCategories } from "./whyFun";

function FilterChips({ label, options, selected, onSelect }: { label: string; options: FunCategory[]; selected?: number; onSelect: (id?: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? options : options.slice(0, 6);
  const choose = (id?: number) => { onSelect(id); setExpanded(false); };
  return <section className="fun-filter"><span>{label}</span><div className="chips"><button aria-pressed={!selected} className={!selected ? "selected" : ""} type="button" onClick={() => choose()}>Todas</button>{visible.map((category) => <button aria-pressed={category.id === selected} key={category.id} className={category.id === selected ? "selected" : ""} type="button" onClick={() => choose(category.id)}>{category.icon} {category.name}</button>)}{options.length > 6 && <button type="button" onClick={() => setExpanded(true)} aria-label={`Ver más ${label.toLowerCase()}`}>•••</button>}</div>{expanded && <Modal onClose={() => setExpanded(false)}><p className="eyebrow">FILTRAR POR {label.toUpperCase()}</p><h2>Elegí una opción</h2><div className="chips fun-filter-dialog"><button aria-pressed={!selected} className={!selected ? "selected" : ""} type="button" onClick={() => choose()}>Todas</button>{options.map((category) => <button aria-pressed={category.id === selected} key={category.id} className={category.id === selected ? "selected" : ""} type="button" onClick={() => choose(category.id)}>{category.icon} {category.name}</button>)}</div></Modal>}</section>;
}

export function WhyFunPage() {
  const [categoryId, setCategoryId] = useState<number>();
  const [subcategoryId, setSubcategoryId] = useState<number>();
  const [creating, setCreating] = useState(false);
  const categories = useQuery({ queryKey: ["fun-categories"], queryFn: getFunCategories });
  const activities = useQuery({ queryKey: ["activities", categoryId, subcategoryId], queryFn: () => getActivities({ categoryId, subcategoryId }) });
  const roots = (categories.data ?? []).filter((category) => !category.parentId);
  const subcategories = (categories.data ?? []).filter((category) => category.parentId === categoryId);
  return <><section className="fun-hero"><div><p className="eyebrow">WHYFUN · SALIDAS PARA REPETIR</p><h1>¿Qué salida<br />repetimos <em>hoy?</em></h1><p>Guarden actividades y registren cada salida con una fecha, fotos y opiniones compartidas.</p></div><div className="fun-hero-art" aria-hidden="true">🎲<span>✦</span><b>🕹️</b></div></section><nav className="quick-nav quick-nav-action"><EntityCreateButton eyebrow="Nueva actividad" icon="🎯" label="Agregar actividad" onClick={() => setCreating(true)} /></nav><section className="fun-controls"><FilterChips label="Categorías" options={roots} selected={categoryId} onSelect={(id) => { setCategoryId(id); setSubcategoryId(undefined); }} />{categoryId && <FilterChips label="Subcategorías" options={subcategories} selected={subcategoryId} onSelect={setSubcategoryId} />}</section>{categories.isError && <p className="form-error">No pudimos cargar las categorías.</p>}{activities.isError ? <p className="form-error">{activities.error.message}</p> : <section className="fun-section"><div className="section-title"><div><p className="eyebrow">CATÁLOGO COMPARTIDO</p><h2>Actividades para salir</h2></div><strong>{activities.data?.length ?? 0} actividades</strong></div>{activities.isLoading ? <p className="muted" aria-busy="true">Cargando actividades…</p> : activities.data?.length ? <div className="fun-grid">{activities.data.map((activity) => <FunVenueCard key={activity.id} activity={activity} />)}</div> : <p className="empty-state">No hay actividades con esos filtros. Agreguen la primera para empezar el historial.</p>}</section>}{creating && <ActivityForm onClose={() => setCreating(false)} />}</>;
}
