import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react';
import { fetchCachedMedia, isExternalMediaUrl } from '../../lib/api';

type MediaImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  fallbackSrc?: string;
};

export function MediaImage({ alt, className, fallbackSrc, loading = 'lazy', onError, src, ...props }: MediaImageProps) {
  const sources = [...new Set([src, fallbackSrc].filter((value): value is string => Boolean(value)))];
  return <ResolvedMediaImage key={JSON.stringify(sources)} alt={alt} className={className} loading={loading} onError={onError} sources={sources} {...props} />;
}

type ResolvedMediaImageProps = Omit<MediaImageProps, 'src' | 'fallbackSrc'> & { sources: string[] };

function ResolvedMediaImage({ alt, className, loading, onError, sources, ...props }: ResolvedMediaImageProps) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const src = sources[sourceIndex];
  const [resolvedSrc, setResolvedSrc] = useState<string>(() => isExternalMediaUrl(src) ? src : '');
  const [error, setError] = useState<string>();
  const [shouldLoad, setShouldLoad] = useState(loading !== 'lazy');
  const placeholderRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isExternalMediaUrl(src)) {
      setResolvedSrc(src);
      setError(undefined);
      setShouldLoad(true);
      return;
    }
    let active = true;
    let objectUrl: string | undefined;
    setResolvedSrc('');
    setError(undefined);
    const load = () => {
      setShouldLoad(true);
      void fetchCachedMedia(src).then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setResolvedSrc(objectUrl);
      }).catch((reason: unknown) => {
        if (!active) return;
        if (sourceIndex < sources.length - 1) {
          setSourceIndex((current) => current + 1);
          return;
        }
        setError(reason instanceof Error ? reason.message : 'No pudimos cargar la imagen.');
      });
    };
    if (loading !== 'lazy' || typeof IntersectionObserver === 'undefined') {
      load();
      return () => {
        active = false;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    }
    const target = placeholderRef.current;
    if (!target) {
      load();
      return () => { active = false; };
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        load();
      }
    }, { rootMargin: '300px' });
    observer.observe(target);
    return () => {
      active = false;
      observer.disconnect();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [loading, sourceIndex, sources.length, src]);

  if (!resolvedSrc) return <span ref={placeholderRef} className={`media-image-placeholder${error ? ' media-image-placeholder--error' : ''}`} role="img" aria-label={alt} aria-live={error ? 'polite' : undefined} aria-busy={!error}>{error ? 'Imagen no disponible' : shouldLoad ? 'Cargando imagen…' : ''}</span>;
  return <img {...props} alt={alt} className={className} loading={loading} src={resolvedSrc} onError={(event) => {
    const failedSrc = resolvedSrc;
    setResolvedSrc('');
    if (failedSrc.startsWith('blob:')) URL.revokeObjectURL(failedSrc);
    if (sourceIndex < sources.length - 1) setSourceIndex((current) => current + 1);
    else setError('No pudimos cargar la imagen.');
    onError?.(event);
  }} />;
}
