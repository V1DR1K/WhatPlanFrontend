import { StarGlyphs } from "./StarGlyphs";

const normalizedValue = (value?: number) =>
  value === undefined || value === null || !Number.isFinite(value)
    ? undefined
    : Math.max(0, Math.min(5, value));

export function RatingStars({ label, value }: { label: string; value?: number }) {
  const rating = normalizedValue(value);
  if (rating === undefined || rating === 0) {
    return <span className="rating-stars rating-stars--empty">Sin reseñas</span>;
  }

  return (
    <span className="rating-stars" aria-label={`${label}: ${rating.toFixed(1)} de 5 estrellas`} role="img">
      <StarGlyphs value={rating} />
    </span>
  );
}
