import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { fetchMedia, isExternalMediaUrl } from '../../lib/api';

type MediaImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
};

export function MediaImage({ alt, className, src, ...props }: MediaImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string>(() => isExternalMediaUrl(src) ? src : '');
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (isExternalMediaUrl(src)) {
      setResolvedSrc(src);
      setError(undefined);
      return;
    }
    const controller = new AbortController();
    let active = true;
    let objectUrl: string | undefined;
    setResolvedSrc('');
    setError(undefined);
    void fetchMedia(src, controller.signal).then((blob) => {
      objectUrl = URL.createObjectURL(blob);
      if (!active) {
        URL.revokeObjectURL(objectUrl);
        return;
      }
      setResolvedSrc(objectUrl);
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'No pudimos cargar la imagen.');
    });
    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (!resolvedSrc) return <span className={`media-image-placeholder${error ? ' media-image-placeholder--error' : ''}`} role="img" aria-label={alt} aria-live={error ? 'polite' : undefined} aria-busy={!error}>{error ? 'Imagen no disponible' : 'Cargando imagen…'}</span>;
  return <img {...props} alt={alt} className={className} src={resolvedSrc} onError={() => { const failedSrc = resolvedSrc; setResolvedSrc(''); if (failedSrc.startsWith('blob:')) URL.revokeObjectURL(failedSrc); setError('No pudimos cargar la imagen.'); }} />;
}
