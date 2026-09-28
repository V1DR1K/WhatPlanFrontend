import { useState } from 'react';
import { MediaImage } from './MediaImage';
import { PhotoViewer } from './PhotoViewer';

export function ExpandablePhoto({ src, alt, imageClassName, width, height }: {
  src: string;
  alt: string;
  imageClassName?: string;
  width?: number;
  height?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  return <>
    <button className="photo-viewer-trigger" type="button" aria-label={`Ampliar ${alt.toLowerCase()}`} aria-expanded={expanded} onClick={() => setExpanded(true)}>
      <MediaImage className={imageClassName} src={src} alt={alt} width={width} height={height} loading="eager" />
    </button>
    {expanded && <PhotoViewer photos={[{ src, alt, width, height }]} onClose={() => setExpanded(false)} />}
  </>;
}
