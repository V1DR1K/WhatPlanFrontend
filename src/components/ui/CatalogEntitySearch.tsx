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
        aria-controls={`${id}-results`}
        aria-expanded={open && matches.length > 0}
        autoComplete="off"
        id={`${id}-input`}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        role="combobox"
        type="search"
        value={value}
      />
      {open && matches.length > 0 && (
        <div className="catalog-entity-search__results" id={`${id}-results`} role="listbox">
          {matches.map((candidate) => (
            <button
              key={candidate.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(candidate.title);
                setOpen(false);
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
