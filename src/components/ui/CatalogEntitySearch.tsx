import { useId, useState } from "react";

export type CatalogSearchCandidate = {
  id: number;
  title: string;
  updatedAt?: string;
};

const dateLabel = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "Sin modificaciones";

export function CatalogEntitySearch({
  label,
  placeholder,
  value,
  candidates,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  candidates: CatalogSearchCandidate[];
  onChange: (value: string) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const term = value.trim().toLocaleLowerCase("es");
  const matches = term
    ? candidates
        .filter((candidate) => candidate.title.toLocaleLowerCase("es").includes(term))
        .slice(0, 10)
    : [];

  return (
    <div className="catalog-search-sort__field catalog-entity-search">
      <label htmlFor={`${id}-input`}>{label}</label>
      <input
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `${id}-option-${matches[activeIndex]?.id}` : undefined}
        aria-controls={`${id}-results`}
        aria-expanded={open}
        autoComplete="off"
        id={`${id}-input`}
        onBlur={(event) => { const next = event.relatedTarget instanceof Node ? event.relatedTarget : null; if (!event.currentTarget.parentElement?.contains(next)) setOpen(false); }}
        onChange={(event) => {
           onChange(event.target.value);
           setOpen(true);
           setActiveIndex(-1);
         }}
         onFocus={() => setOpen(true)}
         onKeyDown={(event) => {
           if (!matches.length) return;
           if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActiveIndex((current) => (current + 1) % matches.length); }
           if (event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActiveIndex((current) => (current - 1 + matches.length) % matches.length); }
           if (event.key === "Enter" && activeIndex >= 0) { event.preventDefault(); onChange(matches[activeIndex].title); setOpen(false); setActiveIndex(-1); }
           if (event.key === "Escape") { event.preventDefault(); setOpen(false); setActiveIndex(-1); }
         }}
        placeholder={placeholder}
        role="combobox"
        type="search"
        value={value}
      />
      {open && matches.length > 0 && (
        <div className="catalog-entity-search__results" id={`${id}-results`} role="listbox">
          {matches.map((candidate, index) => (
            <button
              aria-selected={index === activeIndex}
              key={candidate.id}
              id={`${id}-option-${candidate.id}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(candidate.title);
                setOpen(false);
                setActiveIndex(-1);
              }}
              role="option"
              type="button"
            >
              <strong>{candidate.title}</strong>
              <small>Modificada: {dateLabel(candidate.updatedAt)}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
