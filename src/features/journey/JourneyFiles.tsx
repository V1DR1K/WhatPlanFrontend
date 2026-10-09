import { useZoneContext } from "../../lib/zoneContext";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { fetchMedia } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { PhotoViewer } from "../../components/ui/PhotoViewer";
import { JourneyIcon } from "./JourneyIcon";
import { localDateTimeToIso, photoDateOrNow, toLocalDateTimeInput } from "../../lib/photoMetadata";
import { preparePhoto } from "../../lib/photos";
import {
  relinkFile,
  updateFileDate,
  uploadFile,
  type Detail,
  type JourneyFile,
} from "./journey";
import { useJourneyRefresh } from "./JourneyEditors";
import { JourneyPdfViewer } from "./JourneyPdfViewer";
export function FilePreview({
  file,
  onClose,
}: {
  file: JourneyFile;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  const [pdfData, setPdfData] = useState<Uint8Array>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    setUrl("");
    setPdfData(undefined);
    setError("");
    setLoading(true);
    void fetchMedia(file.url, controller.signal)
      .then(async (blob) => {
        if (!controller.signal.aborted) {
          const contentType = file.contentType || blob.type || "application/pdf";
          const previewBlob = blob.type === contentType
            ? blob
            : new Blob([blob], { type: contentType });
          objectUrl = URL.createObjectURL(previewBlob);
          setUrl(objectUrl);
          if (!contentType.startsWith("image/")) {
            const data = new Uint8Array(await previewBlob.arrayBuffer());
            if (!controller.signal.aborted) setPdfData(data);
          }
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "No pudimos abrir el archivo.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.contentType, file.url]);
  if (url && file.contentType.startsWith("image/"))
    return (
      <PhotoViewer photos={[{ src: url, alt: "Foto guardada en el viaje" }]} onClose={onClose} />
    );
  const downloadName = `documento-${file.id}.pdf`;
  return (
    <Modal className="journey-modal" onClose={onClose} size="wide" title="Vista previa del archivo">
      <div className="journey-file-preview">
        <h2>{file.contentType.startsWith("image/") ? "Vista previa de imagen" : "Documento PDF"}</h2>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {loading && !error && <p role="status">Abriendo archivo…</p>}
        {!loading && !error && pdfData && url && (
          <JourneyPdfViewer data={pdfData} url={url} downloadName={downloadName} />
        )}
      </div>
    </Modal>
  );
}
export function FileUpload({
  detail,
  stayId,
  onClose,
}: {
  detail: Detail;
  stayId?: string;
  onClose: () => void;
}) {
  const { maxUploadBytes } = useZoneContext();
  const maxMegabytes = (maxUploadBytes / 1024 / 1024).toLocaleString("es-AR");
  const refresh = useJourneyRefresh(detail.trip.id);
  const [file, setFile] = useState<File>();
  const [previewUrl, setPreviewUrl] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [preparingFile, setPreparingFile] = useState(false);
  const [selectionError, setSelectionError] = useState("");
  const [linkType, setLinkType] = useState(stayId ? "stay" : "trip");
  const [linkId, setLinkId] = useState(stayId ?? "");
  const upload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Elegí un archivo.");
      if (file.size > maxUploadBytes)
        throw new Error(`El archivo supera los ${maxMegabytes} MB.`);
      const links: {
        stageId?: string;
        pointId?: string;
        stayId?: string;
        movementId?: string;
        hotelPhoto?: boolean;
      } = {};
      if (linkType === "stage") links.stageId = linkId;
      if (linkType === "point") {
        links.pointId = linkId;
        links.stageId = detail.points.find((p) => p.id === linkId)?.stageId;
      }
      if (linkType === "stay") {
        links.stayId = linkId;
        links.stageId = detail.stays.find((s) => s.id === linkId)?.stageId;
        links.hotelPhoto = Boolean(file?.type.startsWith("image/"));
      }
      if (linkType === "movement") {
        links.movementId = linkId;
        links.stageId =
          detail.movements.find((m) => m.id === linkId)?.stageId ?? undefined;
      }
      return uploadFile(detail.trip.id, file, {
        ...links,
        occurredAt: localDateTimeToIso(occurredAt),
      });
    },
    onSuccess: async () => {
      await refresh();
      onClose();
    },
  });
  useEffect(() => {
    if (!file?.type.startsWith("image/")) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const choices =
    linkType === "stage"
      ? detail.trip.stages.map((s) => ({ id: s.id, name: s.cityName }))
      : linkType === "point"
        ? detail.points.map((p) => ({ id: p.id, name: p.title }))
        : linkType === "stay"
          ? detail.stays.map((s) => ({ id: s.id, name: s.name }))
          : detail.movements.map((m) => ({ id: m.id, name: m.description }));
  const selectFile = async (source?: File) => {
    setFile(undefined);
    setSelectionError("");
    if (!source) return;
    setPreparingFile(true);
    try {
      const capturedAt = await photoDateOrNow(source);
      const ready = source.type.startsWith("image/") || /\.hei[cf]$/i.test(source.name)
        ? await preparePhoto(source)
        : source;
      setOccurredAt(toLocalDateTimeInput(capturedAt));
      setFile(ready);
    } catch (error) {
      setSelectionError(error instanceof Error ? error.message : "No pudimos preparar el archivo.");
    } finally {
      setPreparingFile(false);
    }
  };
  return (
    <Modal
      className="journey-modal"
      onClose={onClose}
      confirmDiscard
      pending={upload.isPending}
      title="Guardar archivo"
    >
      <form
        className="journey-form"
        onSubmit={(e) => {
          e.preventDefault();
          upload.mutate();
        }}
      >
        <h2>Reservas, entradas y recibos</h2>
        <p className="muted">
          PDF, JPEG, PNG, WebP o HEIC. Hasta {maxMegabytes} MB.
        </p>
        <label>
          Archivo
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
            disabled={preparingFile}
            onChange={(e) => { const selected = e.currentTarget.files?.[0]; e.currentTarget.value = ""; void selectFile(selected); }}
          />
        </label>
        {preparingFile && <p role="status">Leyendo la fecha de la foto…</p>}
        {selectionError && <p className="form-error" role="alert">{selectionError}</p>}
        {file && (previewUrl
          ? <div className="journey-file-upload-preview"><img src={previewUrl} alt="Vista previa de la imagen seleccionada" /><span>Imagen lista para guardar</span></div>
          : <div className="journey-file-upload-preview"><span aria-hidden="true">📄</span><span>PDF listo para guardar</span></div>)}
        {file && <label>
          Fecha y hora del archivo
          <input type="datetime-local" required value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} />
        </label>}
        <label>
          Vincular a
          <select
            value={linkType}
            onChange={(e) => {
              setLinkType(e.target.value);
              setLinkId("");
            }}
          >
            <option value="trip">Todo el viaje</option>
            <option value="stage">Destino</option>
            <option value="point">Punto de agenda</option>
            <option value="stay">Alojamiento</option>
            <option value="movement">Movimiento de dinero</option>
          </select>
        </label>
        {linkType !== "trip" && (
          <label>
            Registro
            <select
              required
              value={linkId}
              onChange={(e) => setLinkId(e.target.value)}
            >
              <option value="">Elegí un registro</option>
              {choices.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {linkType === "stay" && (
          <p className="muted">Las imágenes vinculadas al alojamiento aparecen en su carrusel de fotos.</p>
        )}
        {upload.error && (
          <p className="form-error" role="alert">
            {upload.error.message}
          </p>
        )}
        <Button icon={<JourneyIcon name="UPLOAD" />} disabled={upload.isPending || preparingFile || !file || !occurredAt}>
          {upload.isPending ? "Guardando…" : "Guardar archivo"}
        </Button>
      </form>
    </Modal>
  );
}
export function fileLabel(file: JourneyFile, detail: Detail) {
  if (file.movementId)
    return (
      detail.movements.find((m) => m.id === file.movementId)?.description ??
      "Movimiento"
    );
  if (file.stayId)
    return (
      detail.stays.find((s) => s.id === file.stayId)?.name ?? "Alojamiento"
    );
  if (file.pointId)
    return (
      detail.points.find((p) => p.id === file.pointId)?.title ?? "Actividad"
    );
  if (file.stageId)
    return (
      detail.trip.stages.find((s) => s.id === file.stageId)?.cityName ??
      "Destino"
    );
  return "Todo el viaje";
}
export async function downloadFile(file: JourneyFile) {
  const blob = await fetchMedia(file.url);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const extension = file.contentType === "application/pdf"
    ? "pdf"
    : file.contentType === "image/png"
      ? "png"
      : file.contentType === "image/webp"
        ? "webp"
        : "jpg";
  a.download = `archivo-${file.id}.${extension}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function FileLinksEditor({
  detail,
  file,
  onClose,
}: {
  detail: Detail;
  file: JourneyFile;
  onClose: () => void;
}) {
  const refresh = useJourneyRefresh(detail.trip.id);
  const [type, setType] = useState(
    file.movementId
      ? "movement"
      : file.stayId
        ? "stay"
        : file.pointId
          ? "point"
          : file.stageId
            ? "stage"
            : "trip",
  );
  const [id, setId] = useState(
    file.movementId ?? file.stayId ?? file.pointId ?? file.stageId ?? "",
  );
  const options =
    type === "stage"
      ? detail.trip.stages.map((s) => ({ id: s.id, name: s.cityName }))
      : type === "point"
        ? detail.points.map((p) => ({ id: p.id, name: p.title }))
        : type === "stay"
          ? detail.stays.map((s) => ({ id: s.id, name: s.name }))
          : detail.movements.map((m) => ({ id: m.id, name: m.description }));
  const save = useMutation({
    mutationFn: () =>
      relinkFile(file.id, {
        stageId: type === "stage" ? id : null,
        pointId: type === "point" ? id : null,
        stayId: type === "stay" ? id : null,
        movementId: type === "movement" ? id : null,
      }),
    onSuccess: async () => {
      await refresh();
      onClose();
    },
  });
  return (
    <Modal
      className="journey-modal"
      title="Cambiar vínculo del archivo"
      onClose={onClose}
      pending={save.isPending}
      confirmDiscard
    >
      <form
        className="journey-form"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <h2>Vincular archivo</h2>
        <label>
          Vincular a
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setId("");
            }}
          >
            <option value="trip">Todo el viaje</option>
            <option value="stage">Destino</option>
            <option value="point">Punto de agenda</option>
            <option value="stay">Alojamiento</option>
            <option value="movement">Movimiento de dinero</option>
          </select>
        </label>
        {type !== "trip" && (
          <label>
            Registro
            <select required value={id} onChange={(e) => setId(e.target.value)}>
              <option value="">Elegí un registro</option>
              {options.map((o) => (
                <option value={o.id} key={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {save.error && (
          <p className="form-error" role="alert">
            {save.error.message}
          </p>
        )}
        <Button icon={<JourneyIcon name="LINK" />} disabled={save.isPending}>Guardar vínculo</Button>
      </form>
    </Modal>
  );
}

export function FileDateEditor({ file, tripId, onClose }: { file: JourneyFile; tripId: string; onClose: () => void }) {
  const refresh = useJourneyRefresh(tripId);
  const [occurredAt, setOccurredAt] = useState(toLocalDateTimeInput(file.occurredAt));
  const save = useMutation({
    mutationFn: () => updateFileDate(file.id, localDateTimeToIso(occurredAt)),
    onSuccess: async () => {
      await refresh();
      onClose();
    },
  });

  return <Modal className="journey-modal" title="Editar fecha del archivo" onClose={onClose} pending={save.isPending}>
    <form className="journey-form" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
      <h2>¿Cuándo fue?</h2>
      <p className="muted">La fecha de la cámara se usa automáticamente cuando está disponible.</p>
      <label>Fecha y hora<input type="datetime-local" required value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} /></label>
      {save.error && <p className="form-error" role="alert">{save.error.message}</p>}
      <Button icon={<JourneyIcon name="CALENDAR" />} disabled={save.isPending || !occurredAt}>{save.isPending ? "Guardando…" : "Guardar fecha"}</Button>
    </form>
  </Modal>;
}
