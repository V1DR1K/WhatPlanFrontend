import { StarGlyphs } from "./StarGlyphs";

type Props = { value?: number; onChange?: (value: number) => void; label: string };

export function StarRating({ value, onChange, label }: Props) {
  if (!onChange) return <span className="star-control star-control--display" role="img" aria-label={`${label}: ${value ?? 0} de 5 estrellas`}><StarGlyphs value={value ?? 0} /></span>;

  const select = (star: number) => onChange(star);
  return <div className="star-control star-control--input" role="radiogroup" aria-label={label}>{[1, 2, 3, 4, 5].map(star => <button key={star} type="button" role="radio" className={value !== undefined && star <= value ? 'filled' : ''} aria-label={`${star} estrellas`} aria-checked={star === value} tabIndex={star === (value ?? 1) ? 0 : -1} onClick={() => select(star)} onKeyDown={(event) => { if (event.key === 'ArrowRight' || event.key === 'ArrowUp') { event.preventDefault(); select(Math.min(5, star + 1)); } if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') { event.preventDefault(); select(Math.max(1, star - 1)); } if (event.key === 'Home') { event.preventDefault(); select(1); } if (event.key === 'End') { event.preventDefault(); select(5); } }}>★</button>)}</div>;
}
