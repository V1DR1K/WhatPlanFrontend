import { Button } from "./Button";

export type RecordIteratorOption = {
  value: string;
  label: string;
  detail?: string;
  progress?: boolean;
};

export function RecordIterator({
  ariaLabel,
  className,
  hideLabel = false,
  label,
  onChange,
  options,
  value,
}: {
  ariaLabel: string;
  className?: string;
  hideLabel?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: RecordIteratorOption[];
  value: string;
}) {
  const selected = options.find((option) => option.value === value);
  const sequence = options.filter((option) => option.progress !== false);
  const index = sequence.findIndex((option) => option.value === value);
  const currentIsNavigable = index >= 0;
  const move = (direction: -1 | 1) => {
    const next = sequence[index + direction];
    if (next) onChange(next.value);
  };

  return (
    <div className={["record-iterator", className].filter(Boolean).join(" ")} aria-label={ariaLabel}>
      <Button
        type="button"
        variant="icon"
        aria-label={`${label} anterior`}
        disabled={!currentIsNavigable || index <= 0}
        onClick={() => move(-1)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </Button>
      <div className="record-iterator__current" aria-live="polite">
        <label>
          <span className={hideLabel ? "sr-only" : undefined}>{label}</span>
          <span className="record-iterator__selected" aria-hidden="true">{selected?.label ?? ""}</span>
          <select value={value} onChange={(event) => onChange(event.target.value)}>
            {options.map((option) => (
              <option value={option.value} key={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        {selected?.detail && <small>{selected.detail}</small>}
        {currentIsNavigable && <small>{index + 1} de {sequence.length}</small>}
      </div>
      <Button
        type="button"
        variant="icon"
        aria-label={`${label} siguiente`}
        disabled={!currentIsNavigable || index >= sequence.length - 1}
        onClick={() => move(1)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </Button>
    </div>
  );
}
