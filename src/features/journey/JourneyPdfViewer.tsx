import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

const zoomLevels = [50, 75, 100, 125, 150, 200];

export function JourneyPdfViewer({
  data,
  url,
  downloadName,
}: {
  data: Uint8Array;
  url: string;
  downloadName: string;
}) {
  const [pdf, setPdf] = useState<PDFDocumentProxy>();
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [containerWidth, setContainerWidth] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let active = true;
    let destroyTask: (() => void) | undefined;
    setPdf(undefined);
    setPage(1);
    setPageCount(0);
    setError("");
    void import("pdfjs-dist")
      .then((pdfjs) => {
        if (!active) return undefined;
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        const task = pdfjs.getDocument({
          data: data.slice(),
          disableFontFace: true,
          standardFontDataUrl: `${import.meta.env.BASE_URL}pdfjs/standard_fonts/`,
        });
        destroyTask = () => { void task.destroy(); };
        return task.promise;
      })
      .then((loaded) => {
        if (!active || !loaded) return;
        setPdf(loaded);
        setPageCount(loaded.numPages);
      })
      .catch(() => {
        if (active) setError("No pudimos abrir este PDF. Descargá el original para revisarlo.");
      });
    return () => {
      active = false;
      destroyTask?.();
    };
  }, [data]);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const updateWidth = () => setContainerWidth(element.clientWidth);
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    updateWidth();
    return () => observer.disconnect();
  }, [pdf]);

  useEffect(() => {
    const element = canvas.current;
    if (!pdf || !element || !containerWidth) return;
    let active = true;
    let cancelRender: (() => void) | undefined;
    setRendering(true);
    setError("");

    void (async () => {
      try {
        const pdfPage = await pdf.getPage(page);
        if (!active) return;
        const baseViewport = pdfPage.getViewport({ scale: 1 });
        const scale = (containerWidth / baseViewport.width) * (zoom / 100);
        const viewport = pdfPage.getViewport({ scale });
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        element.width = Math.ceil(viewport.width * pixelRatio);
        element.height = Math.ceil(viewport.height * pixelRatio);
        element.style.width = `${viewport.width}px`;
        element.style.height = `${viewport.height}px`;
        const task = pdfPage.render({
          canvas: element,
          viewport,
          transform: pixelRatio === 1
            ? undefined
            : [pixelRatio, 0, 0, pixelRatio, 0, 0],
        });
        cancelRender = () => task.cancel();
        await task.promise;
      } catch {
        if (active) setError("No pudimos mostrar esta página del PDF.");
      } finally {
        if (active) setRendering(false);
      }
    })();

    return () => {
      active = false;
      cancelRender?.();
    };
  }, [containerWidth, page, pdf, zoom]);

  return (
    <>
      <div className="journey-file-preview__controls">
        {pageCount > 0 && <>
          <label>
            Página ({pageCount})
            <input
              type="number"
              min="1"
              max={pageCount}
              value={page}
              onChange={(event) => {
                const next = event.currentTarget.valueAsNumber;
                if (Number.isFinite(next)) {
                  setPage(Math.min(pageCount, Math.max(1, Math.trunc(next))));
                }
              }}
            />
          </label>
          <label>
            Zoom
            <select value={zoom} onChange={(event) => setZoom(Number(event.target.value))}>
              {zoomLevels.map((value) => <option key={value} value={value}>{value}%</option>)}
            </select>
          </label>
        </>}
        <a className="button button--secondary" href={url} download={downloadName}>
          Descargar original
        </a>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!pdf && !error && <p role="status">Preparando documento PDF…</p>}
      {pdf && (
        <div
          className="journey-file-preview__canvas-scroll"
          ref={container}
          aria-busy={rendering}
        >
          <canvas
            className={`journey-file-preview__canvas${rendering ? " is-rendering" : ""}`}
            ref={canvas}
            role="img"
            aria-label={`Página ${page} de ${pageCount} del documento PDF`}
          />
          {rendering && <p className="journey-file-preview__rendering" role="status">Renderizando página…</p>}
        </div>
      )}
    </>
  );
}
