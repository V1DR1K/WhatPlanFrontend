import type { CSSProperties } from "react";

export function StarGlyphs({ value }: { value: number }) {
  return (
    <span className="star-glyphs" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.max(0, Math.min(100, (value - star + 1) * 100));
        return (
          <span
            className="rating-stars__star"
            key={star}
            style={{ "--rating-fill": `${fill}%` } as CSSProperties}
          >
            ★
          </span>
        );
      })}
    </span>
  );
}
