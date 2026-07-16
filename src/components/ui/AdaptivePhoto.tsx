import { useState, type CSSProperties } from "react";

export type PhotoOrientation = "landscape" | "portrait";

export function getPhotoOrientation(width?: number, height?: number): PhotoOrientation {
  return typeof width === "number" &&
    typeof height === "number" &&
    width > 0 &&
    height > width
    ? "portrait"
    : "landscape";
}

type AdaptivePhotoProps = {
  alt: string;
  context: "place" | "item";
  height?: number;
  src: string;
  width?: number;
};

export function AdaptivePhoto({
  alt,
  context,
  height,
  src,
  width,
}: AdaptivePhotoProps) {
  const [expanded, setExpanded] = useState(false);
  const orientation = getPhotoOrientation(width, height);
  const ratioStyle =
    typeof width === "number" &&
    typeof height === "number" &&
    width > 0 &&
    height > 0
      ? ({ "--photo-aspect-ratio": `${width} / ${height}` } as CSSProperties)
      : undefined;
  return (
    <>
      <button
        aria-expanded={expanded}
        aria-label={`Ampliar ${alt.toLowerCase()}`}
        className={`adaptive-photo adaptive-photo--${context} adaptive-photo--${orientation}`}
        onClick={() => setExpanded(true)}
        style={ratioStyle}
        type="button"
      >
        <img className="adaptive-photo__image" src={src} alt={alt} />
      </button>
      {expanded && (
        <div
          aria-label={alt}
          aria-modal="true"
          className="photo-lightbox"
          onClick={() => setExpanded(false)}
          role="dialog"
        >
          <button
            className="photo-lightbox-close"
            type="button"
            aria-label="Cerrar foto ampliada"
            onClick={() => setExpanded(false)}
          >
            ×
          </button>
          <img
            src={src}
            alt={`Foto ampliada: ${alt}`}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
