import { useState, type CSSProperties, type MouseEventHandler } from "react";
import { mediaUrl } from "../../lib/api";

export type PhotoOrientation = "landscape" | "portrait" | "square";

export function getPhotoOrientation(
  width?: number,
  height?: number,
  fallback: PhotoOrientation = "landscape",
): PhotoOrientation {
  if (
    typeof width !== "number" ||
    typeof height !== "number" ||
    width <= 0 ||
    height <= 0
  ) return fallback;
  if (width === height) return "square";
  return height > width ? "portrait" : "landscape";
}

export function photoAspectRatioStyle(
  width?: number,
  height?: number,
  property = "--media-aspect-ratio",
): CSSProperties | undefined {
  if (
    typeof width !== "number" ||
    typeof height !== "number" ||
    width <= 0 ||
    height <= 0
  ) return undefined;
  return { [property]: `${width} / ${height}` } as CSSProperties;
}

export function photoSource(
  mode: "full" | "thumbnail",
  fullSrc?: string | null,
  thumbnailSrc?: string | null,
) {
  return (mode === "full" ? fullSrc ?? thumbnailSrc : thumbnailSrc ?? fullSrc) ?? undefined;
}

type ResponsiveImageProps = {
  alt: string;
  className?: string;
  fullSrc?: string | null;
  height?: number;
  loading?: "eager" | "lazy";
  mode?: "full" | "thumbnail";
  onClick?: MouseEventHandler<HTMLImageElement>;
  thumbnailSrc?: string | null;
  width?: number;
};

export function ResponsiveImage({
  alt,
  className,
  fullSrc,
  height,
  loading = "lazy",
  mode = "thumbnail",
  onClick,
  thumbnailSrc,
  width,
}: ResponsiveImageProps) {
  const src = photoSource(mode, fullSrc, thumbnailSrc);
  if (!src) return null;
  return <img className={className} src={mediaUrl(src)} alt={alt} width={width} height={height} loading={loading} decoding="async" onClick={onClick} />;
}

type AdaptivePhotoProps = {
  alt: string;
  context: "place" | "item";
  fullSrc?: string | null;
  height?: number;
  src?: string;
  thumbnailSrc?: string | null;
  width?: number;
};

export function AdaptivePhoto({
  alt,
  context,
  fullSrc,
  height,
  src,
  thumbnailSrc,
  width,
}: AdaptivePhotoProps) {
  const [expanded, setExpanded] = useState(false);
  const resolvedFullSrc = fullSrc ?? src;
  const orientation = getPhotoOrientation(width, height);
  const ratioStyle = photoAspectRatioStyle(width, height, "--photo-aspect-ratio");
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
        <ResponsiveImage className="adaptive-photo__image" alt={alt} fullSrc={resolvedFullSrc} height={height} loading="eager" mode="full" thumbnailSrc={thumbnailSrc} width={width} />
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
          <ResponsiveImage
            alt={`Foto ampliada: ${alt}`}
            fullSrc={resolvedFullSrc}
            loading="eager"
            mode="full"
            onClick={(event) => event.stopPropagation()}
            thumbnailSrc={thumbnailSrc}
          />
        </div>
      )}
    </>
  );
}
