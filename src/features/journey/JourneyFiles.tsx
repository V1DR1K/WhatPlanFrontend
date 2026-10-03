import { useZoneContext } from "../../lib/zoneContext";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { fetchMedia } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { PhotoViewer } from "../../components/ui/PhotoViewer";
import {
  relinkFile,
  uploadFile,
  type Detail,
  type JourneyFile,
} from "./journey";
import { useJourneyRefresh } from "./JourneyEditors";
export function FilePreview({
  file,
  onClose,
}: {
  file: JourneyFile;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    void fetchMedia(file.url, controller.signal)
      .then((blob) => {
        if (!controller.signal.aborted) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "No pudimos abrir el archivo.",
          );
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.url]);
  if (url && file.contentType.startsWith("image/"))
    return (
      <PhotoViewer photos={[{ src: url, alt: file.name }]} onClose={onClose} />
    );
  return (
    <Modal onClose={onClose} size="wide" title={file.name}>
      <div className="journey-file-preview">
        <h2>{file.name}</h2>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {!url && !error && <p role="status">Abriendo archivo…</p>}
        {url && (
          <>
            <div className="journey-file-preview__controls">
              <label>
                Página
                <input
                  type="number"
                  min="1"
                  value={page}
                  onChange={(e) => setPage(Math.max(1, Number(e.target.value)))}
                />
              </label>
              <label>
                Zoom
                <select
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                >
                  {[50, 75, 100, 125, 150, 200].map((v) => (
                    <option key={v} value={v}>
                      {v}%
                    </option>
                  ))}
                </select>
              </label>
              <a
                className="button button--secondary"
                href={url}
                download={file.name}
              >
                Descargar original
              </a>
            </div>
            <iframe
              title={`PDF: ${file.name}`}
              src={`${url}#page=${page}&zoom=${zoom}`}
            />
            <p className="muted">
              Si su navegador no muestra el PDF, pueden descargar el original.
            </p>
          </>
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
  const [linkType, setLinkType] = useState(stayId ? "stay" : "trip");
  const [linkId, setLinkId] = useState(stayId ?? "");
  const [hotelPhoto, setHotelPhoto] = useState(!!stayId);
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
        links.hotelPhoto = hotelPhoto;
      }
      if (linkType === "movement") {
        links.movementId = linkId;
        links.stageId =
          detail.movements.find((m) => m.id === linkId)?.stageId ?? undefined;
      }
      return uploadFile(detail.trip.id, file, links);
    },
    onSuccess: async () => {
      await refresh();
      onClose();
    },
  });
  const choices =
    linkType === "stage"
      ? detail.trip.stages.map((s) => ({ id: s.id, name: s.cityName }))
      : linkType === "point"
        ? detail.points.map((p) => ({ id: p.id, name: p.title }))
        : linkType === "stay"
          ? detail.stays.map((s) => ({ id: s.id, name: s.name }))
          : detail.movements.map((m) => ({ id: m.id, name: m.description }));
  return (
    <Modal
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
          PDF, JPEG, PNG o WebP. Hasta {maxMegabytes} MB; guardamos el original.
        </p>
        <label>
          Archivo
          <input
            type="file"
            required
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0])}
          />
        </label>
        <label>
          Vincular a
          <select
            value={linkType}
            onChange={(e) => {
              setLinkType(e.target.value);
              setLinkId("");
              setHotelPhoto(false);
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
          <label className="journey-checkbox">
            <input
              type="checkbox"
              checked={hotelPhoto}
              onChange={(e) => setHotelPhoto(e.target.checked)}
            />
            Usar como foto del alojamiento
          </label>
        )}
        {upload.error && (
          <p className="form-error" role="alert">
            {upload.error.message}
          </p>
        )}
        <Button disabled={upload.isPending || !file}>
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
  a.download = file.name;
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
        <h2>Vincular {file.name}</h2>
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
        <Button disabled={save.isPending}>Guardar vínculo</Button>
      </form>
    </Modal>
  );
}
