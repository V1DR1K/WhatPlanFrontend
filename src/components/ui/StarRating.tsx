type Props = { value?: number; onChange?: (value: number) => void; label: string };

export function StarRating({ value, onChange, label }: Props) {
  return <div className={`star-control ${onChange ? 'star-control--input' : 'star-control--display'}`} role={onChange ? 'radiogroup' : undefined} aria-label={label}>{[1, 2, 3, 4, 5].map(star => <button key={star} type="button" className={value !== undefined && star <= value ? 'filled' : ''} disabled={!onChange} aria-label={`${star} estrellas`} aria-checked={star === value} onClick={() => onChange?.(star)}>★</button>)}</div>;
}
