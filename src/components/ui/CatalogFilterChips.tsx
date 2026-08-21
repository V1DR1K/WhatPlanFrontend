import { useState } from "react";
import { Modal } from "./Modal";

export type CatalogFilterOption = { id: string | number; label: string };

type CatalogFilterChipsProps = {
  allLabel: string;
  label: string;
  onChange: (value?: string | number) => void;
  options: CatalogFilterOption[];
  value?: string | number;
};

export function CatalogFilterChips({ allLabel, label, onChange, options, value }: CatalogFilterChipsProps) {
  const [showMore, setShowMore] = useState(false);
  const isSelected = (option?: CatalogFilterOption) => option ? option.id === value : value === undefined || value === "";
  const choose = (option?: CatalogFilterOption) => { onChange(option?.id); setShowMore(false); };
  const chip = (option: CatalogFilterOption | undefined, text: string) => <button aria-pressed={isSelected(option)} className={isSelected(option) ? "selected" : ""} key={option?.id ?? "all"} onClick={() => choose(option)} type="button">{text}</button>;
  return <section className="catalog-filter" aria-label={`Filtrar por ${label.toLowerCase()}`}>
    <span>{label}</span>
    <div className="chips">{chip(undefined, allLabel)}{options.slice(0, 5).map((option) => chip(option, option.label))}{options.length > 5 && <button aria-label={`Ver más ${label.toLowerCase()}`} className="catalog-filter__more" onClick={() => setShowMore(true)} type="button">Ver más</button>}</div>
    {showMore && <Modal onClose={() => setShowMore(false)}><h2>Filtrar por {label.toLowerCase()}</h2><div className="chips catalog-filter__dialog">{chip(undefined, allLabel)}{options.map((option) => chip(option, option.label))}</div></Modal>}
  </section>;
}
