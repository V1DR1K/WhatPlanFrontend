import { useCallback, useEffect, useRef, useState, type PointerEvent, type SyntheticEvent, type WheelEvent } from 'react';
import { Button } from './Button';
import { MediaImage } from './MediaImage';
import { Modal } from './Modal';

export type ViewerPhoto = { src: string; alt: string; width?: number; height?: number };
type Point = { x: number; y: number };

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;
const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
const distance = (first: Point, second: Point) => Math.hypot(first.x - second.x, first.y - second.y);
const midpoint = (first: Point, second: Point) => ({ x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 });
const fittedImageSize = (stage: HTMLElement, width: number, height: number) => {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const fit = Math.min(1, stage.clientWidth / width, stage.clientHeight / height);
  return { width: width * fit, height: height * fit };
};

export function PhotoViewer({ photos, initialIndex = 0, onClose, onIndexChange }: {
  photos: ViewerPhoto[];
  initialIndex?: number;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
}) {
  const [index, setIndex] = useState(() => Math.min(Math.max(initialIndex, 0), photos.length - 1));
  const [scale, setScale] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [fitted, setFitted] = useState<{ src: string; width: number; height: number }>();
  const scaleRef = useRef(scale);
  const offsetRef = useRef(offset);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const dragStart = useRef<{ point: Point; offset: Point; pointerType: string } | undefined>(undefined);
  const pinchStart = useRef<{ distance: number; scale: number; midpoint: Point; offset: Point } | undefined>(undefined);

  const clampOffset = useCallback((point: Point, zoom: number): Point => {
    const stage = stageRef.current;
    const image = stage?.querySelector('img');
    if (!stage || !image || zoom <= MIN_ZOOM) return { x: 0, y: 0 };
    const naturalWidth = image.naturalWidth || photos[index]?.width || image.clientWidth;
    const naturalHeight = image.naturalHeight || photos[index]?.height || image.clientHeight;
    const fitted = fittedImageSize(stage, naturalWidth, naturalHeight);
    const maxX = Math.max(0, (fitted.width * zoom - stage.clientWidth) / 2);
    const maxY = Math.max(0, (fitted.height * zoom - stage.clientHeight) / 2);
    return { x: Math.max(-maxX, Math.min(maxX, point.x)), y: Math.max(-maxY, Math.min(maxY, point.y)) };
  }, [index, photos]);

  const updateOffset = useCallback((next: Point, zoom = scaleRef.current) => {
    const clamped = clampOffset(next, zoom);
    offsetRef.current = clamped;
    setOffset(clamped);
  }, [clampOffset]);

  const updateScale = useCallback((next: number) => {
    const clamped = clampZoom(next);
    scaleRef.current = clamped;
    setScale(clamped);
    updateOffset(offsetRef.current, clamped);
  }, [updateOffset]);

  const resetView = useCallback(() => {
    scaleRef.current = MIN_ZOOM;
    offsetRef.current = { x: 0, y: 0 };
    setScale(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
    pointers.current.clear();
    dragStart.current = undefined;
    pinchStart.current = undefined;
  }, []);

  const fitPhoto = useCallback((image?: HTMLImageElement | null) => {
    const stage = stageRef.current;
    const loadedImage = image ?? stage?.querySelector('img');
    if (!stage || !loadedImage?.naturalWidth || !loadedImage.naturalHeight) return;
    setFitted({ src: photos[index].src, ...fittedImageSize(stage, loadedImage.naturalWidth, loadedImage.naturalHeight) });
    updateOffset(offsetRef.current);
  }, [index, photos, updateOffset]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(() => fitPhoto());
    observer.observe(stage);
    fitPhoto();
    return () => observer.disconnect();
  }, [fitPhoto]);

  const move = useCallback((direction: -1 | 1) => {
    if (photos.length < 2) return;
    const next = (index + direction + photos.length) % photos.length;
    resetView();
    setFitted(undefined);
    setIndex(next);
    onIndexChange?.(next);
  }, [index, onIndexChange, photos.length, resetView]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.matches('input, textarea, select')) return;
      if (event.key === 'ArrowRight' && photos.length > 1) { event.preventDefault(); move(1); }
      if (event.key === 'ArrowLeft' && photos.length > 1) { event.preventDefault(); move(-1); }
      if (event.key === '+' || event.key === '=') { event.preventDefault(); updateScale(scaleRef.current + ZOOM_STEP); }
      if (event.key === '-' || event.key === '_') { event.preventDefault(); updateScale(scaleRef.current - ZOOM_STEP); }
      if (event.key === '0') { event.preventDefault(); resetView(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [move, photos.length, resetView, updateScale]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1) {
      dragStart.current = { point: { x: event.clientX, y: event.clientY }, offset: offsetRef.current, pointerType: event.pointerType };
    } else if (pointers.current.size === 2) {
      const [first, second] = [...pointers.current.values()];
      pinchStart.current = { distance: distance(first, second), scale: scaleRef.current, midpoint: midpoint(first, second), offset: offsetRef.current };
      dragStart.current = undefined;
    }
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2 && pinchStart.current) {
      const [first, second] = [...pointers.current.values()];
      const gesture = pinchStart.current;
      updateScale(gesture.scale * distance(first, second) / Math.max(gesture.distance, 1));
      const center = midpoint(first, second);
      updateOffset({ x: gesture.offset.x + center.x - gesture.midpoint.x, y: gesture.offset.y + center.y - gesture.midpoint.y });
    } else if (pointers.current.size === 1 && dragStart.current && scaleRef.current > MIN_ZOOM) {
      const start = dragStart.current;
      updateOffset({ x: start.offset.x + event.clientX - start.point.x, y: start.offset.y + event.clientY - start.point.y });
    }
  };

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>, allowSwipe = true) => {
    const start = dragStart.current;
    if (allowSwipe && pointers.current.size === 1 && start?.pointerType === 'touch' && scaleRef.current === MIN_ZOOM) {
      const dx = event.clientX - start.point.x;
      const dy = event.clientY - start.point.y;
      if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.3) move(dx < 0 ? 1 : -1);
    }
    pointers.current.delete(event.pointerId);
    const remaining = [...pointers.current.values()][0];
    dragStart.current = remaining ? { point: remaining, offset: offsetRef.current, pointerType: 'touch' } : undefined;
    pinchStart.current = undefined;
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    updateScale(scaleRef.current + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
  };

  const onImageLoad = (event: SyntheticEvent<HTMLImageElement>) => fitPhoto(event.currentTarget);

  const photo = photos[index];
  if (!photo) return null;
  const imageFitted = fitted?.src === photo.src;
  return <Modal size="wide" className="photo-viewer" backdropClassName="photo-viewer-backdrop" onClose={onClose} title={`Imagen ampliada: ${photo.alt}`}>
    <div className="photo-viewer__layout">
      <div className={`photo-viewer__stage${scale > MIN_ZOOM ? ' is-zoomed' : ''}`} ref={stageRef} onWheel={onWheel} onDoubleClick={() => updateScale(scale > MIN_ZOOM ? MIN_ZOOM : 2)} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={(event) => onPointerEnd(event, false)}>
        <MediaImage key={photo.src} className={`photo-viewer__image${imageFitted ? ' is-fitted' : ''}`} src={photo.src} alt={photo.alt} loading="eager" draggable={false} onLoad={onImageLoad} style={{ width: imageFitted ? fitted.width : undefined, height: imageFitted ? fitted.height : undefined, transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }} />
      </div>
      <div className={`photo-viewer__toolbar${photos.length > 1 ? ' photo-viewer__toolbar--multiple' : ''}`} aria-label="Controles de imagen">
        {photos.length > 1 && <Button type="button" variant="secondary" icon="‹" onClick={() => move(-1)} aria-label="Imagen anterior">Anterior</Button>}
        <div className="photo-viewer__zoom">
          <Button type="button" variant="secondary" icon="−" onClick={() => updateScale(scale - ZOOM_STEP)} disabled={scale <= MIN_ZOOM} aria-label="Alejar" title="Alejar" />
          <output aria-live="polite">{Math.round(scale * 100)}%</output>
          <Button type="button" variant="secondary" icon="+" onClick={() => updateScale(scale + ZOOM_STEP)} disabled={scale >= MAX_ZOOM} aria-label="Acercar" title="Acercar" />
          <Button type="button" variant="secondary" onClick={resetView} disabled={scale === MIN_ZOOM} aria-label="Ajustar imagen" title="Ajustar imagen">Ajustar</Button>
        </div>
        {photos.length > 1 && <Button type="button" variant="secondary" icon="›" onClick={() => move(1)} aria-label="Imagen siguiente">Siguiente</Button>}
      </div>
      {photos.length > 1 && <p className="photo-viewer__count" aria-live="polite">{index + 1} de {photos.length}</p>}
    </div>
  </Modal>;
}
