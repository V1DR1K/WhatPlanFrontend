import { useState, type CSSProperties } from "react";
import { useMutation, useQueries } from "@tanstack/react-query";
import { useQuery } from "../../lib/locationQuery";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";
import { EntityDetailHeader } from "../../components/ui/EntityDetailHeader";
import { ImportantDatesLink } from "../../components/ui/ImportantDatesLink";
import { MediaImage } from "../../components/ui/MediaImage";
import { PhotoViewer } from "../../components/ui/PhotoViewer";
import { RatingStars } from "../../components/ui/RatingStars";
import { ExperienceGallery } from "../../components/ui/ExperienceGallery";
import { RecordIterator, type RecordIteratorOption } from "../../components/ui/RecordIterator";
import type { ExperiencePhoto } from "../../types/domain";
import { useZoneContext } from "../../lib/zoneContext";
import { api, session } from "../../lib/api";
import { showNotice } from "../../lib/flash";
import { mapsSearch } from "../places/places";
import { formatPhotoDate, photoDateOrNow } from "../../lib/photoMetadata";
import {
  getTrip,
  getJourneyPointTypes,
  archiveTrip,
  deleteTrip,
  saveResource,
  deleteResource,
  formatDate,
  money,
  sourceHref,
  today,
  formatJourneyDay,
  offsetJourneyDate,
  pointCategoryLabels,
  addPackingForBoth,
  reorderPacking,
  type Point,
  type Source,
  type Stay,
  type Movement,
  type JourneyFile,
  type Packing,
  uploadFile,
} from "./journey";
import { getJourneySourceDetails } from "./journeySourceDetails";
import { JourneyIcon } from "./JourneyIcon";
import { JourneyPackingLists } from "./JourneyPackingLists";
import { JourneyForm } from "./JourneyForm";
import { JourneyDaySummary } from "./JourneyDaySummary";
import { JourneyGalleryTab } from "./JourneyGalleryTab";
import {
  PointEditor,
  StayEditor,
  MovementEditor,
  ReviewEditor,
  useJourneyRefresh,
} from "./JourneyEditors";
import {
  FilePreview,
  FileUpload,
  FileDateEditor,
  FileLinksEditor,
  fileLabel,
  downloadFile,
} from "./JourneyFiles";
const tabs = ["Resumen", "Agenda", "Galería", "Archivos", "Estadías", "Valijas", "Dinero"] as const;
const displayPointCategory = (point: Point) =>
  point.source?.section ?? point.category ?? "GENERAL";
const comparePointSchedule = (a: Point, b: Point) => {
  if (!a.scheduledTime) return b.scheduledTime ? 1 : a.position - b.position;
  if (!b.scheduledTime) return -1;
  return a.scheduledTime.localeCompare(b.scheduledTime) || a.position - b.position;
};
const sameScheduledTime = (a: Point | undefined, b: Point) =>
  Boolean(a) && (a?.scheduledTime ?? "") === (b.scheduledTime ?? "");

function stayGalleryPhoto(file: JourneyFile, position: number): ExperiencePhoto {
  return {
    id: file.id,
    url: file.url,
    thumbnailUrl: file.thumbnailUrl ?? file.url,
    width: file.width ?? 640,
    height: file.height ?? 480,
    position,
    createdBy: "",
    createdAt: file.occurredAt,
  };
}

const formatStayDateTime = (date: string, time?: string | null) =>
  `${formatDate(date)}${time ? ` · ${time.slice(0, 5)}` : ""}`;
export function JourneyDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const context = useZoneContext();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Resumen");
  const detail = useQuery({
    queryKey: ["journey", id],
    queryFn: () => getTrip(id),
    enabled: /^[0-9a-f-]{36}$/i.test(id),
  });
  const sourceRefs = new Map<string, Source>();
  for (const point of detail.data?.points ?? []) {
    if (point.source) sourceRefs.set(`${point.source.section}:${point.source.entityId}`, point.source);
  }
  const linkedSources = [...sourceRefs.values()];
  const linkedSourceQueries = useQueries({
    queries: linkedSources.map((source) => ({
      queryKey: ["journey-source-details", context.coupleId, source.section, source.entityId],
      queryFn: () => getJourneySourceDetails(source),
      enabled: Boolean(context.coupleId && tab === "Agenda"),
    })),
  });
  const sourceDetailsByKey = new Map(
    linkedSources.map((source, index) => [
      `${source.section}:${source.entityId}`,
      linkedSourceQueries[index]?.data,
    ]),
  );
  const pointTypes = useQuery({ queryKey: ["journey-point-types"], queryFn: getJourneyPointTypes });
  const refresh = useJourneyRefresh(id);
  const [day, setDay] = useState("");
  const [editTrip, setEditTrip] = useState(false);
  const [coverPreview, setCoverPreview] = useState(false);
  const [openGalleryManager, setOpenGalleryManager] = useState(false);
  const [point, setPoint] = useState<Point | null>();
  const [completing, setCompleting] = useState(false);
  const [stay, setStay] = useState<Stay | null>();
  const [movement, setMovement] = useState<Movement | null>();
  const [review, setReview] = useState<string | null>();
  const [upload, setUpload] = useState<string | null>();
  const [preview, setPreview] = useState<JourneyFile>();
  const [fileLinks, setFileLinks] = useState<JourneyFile>();
  const [fileDate, setFileDate] = useState<JourneyFile>();
  const [packingEdit, setPackingEdit] = useState<Packing>();
  const [movementPoint, setMovementPoint] = useState<string>();
  const [moneyStage, setMoneyStage] = useState("");
  const [confirm, setConfirm] = useState<{
    resource: string;
    id: string;
    title: string;
  }>();
  const [notice, setNotice] = useState("");
  const [packingUser, setPackingUser] = useState<number | "BOTH">(0);
  const change = useMutation({
    mutationFn: async (action: {
      type: string;
      value?: Point | Packing | Stay;
      ids?: string[];
      userId?: number;
    }) => {
      if (action.type === "point")
        return saveResource<Point>(
          id,
          "points",
          action.value as Point,
          (action.value as Point).id,
        );
      if (action.type === "stay-cover") {
        const selected = action.value as Stay;
        return saveResource<Stay>(
          id,
          "stays",
          { ...selected, photoId: action.ids?.[0] ?? null },
          selected.id,
        );
      }
      if (action.type === "packing")
        return saveResource<Packing>(
          id,
          "packing",
          {
            userId: (action.value as Packing).userId,
            description: (action.value as Packing).description,
            quantity: (action.value as Packing).quantity,
            packed: (action.value as Packing).packed,
          },
          (action.value as Packing).id,
        );
      if (action.type === "packing-order")
        return reorderPacking(id, action.userId!, action.ids ?? []);
      if (action.type === "order")
        return api(`/whither-journey/${id}/points/order`, {
          method: "PUT",
          body: JSON.stringify(action.ids),
        });
    },
    onSuccess: refresh,
    onError: (error, action) => {
      if (action.type === "packing-order") {
        showNotice(error.message || "No se pudo guardar el nuevo orden de la valija.");
      }
    },
  });
  const remove = useMutation({
    mutationFn: async () => {
      if (!confirm) return;
      if (confirm.resource === "archive") return archiveTrip(id);
      if (confirm.resource === "trip") return deleteTrip(id);
      return deleteResource(confirm.resource, confirm.id);
    },
    onSuccess: async () => {
      await refresh();
      if (confirm?.resource === "trip") navigate("/app/whither-journey");
      if (confirm?.resource === "points") setPoint(undefined);
      setConfirm(undefined);
      showNotice("Cambio guardado.");
    },
  });
  const addPacking = useMutation<Packing | Packing[], Error, FormData>({
    mutationFn: (form: FormData) => {
      const description = String(form.get("description"));
      const quantity = Number(form.get("quantity"));
      if (packingUser === "BOTH") return addPackingForBoth(id, description, quantity);
      return saveResource<Packing>(id, "packing", {
        userId: packingUser || detail.data!.members[0].id,
        description,
        quantity,
        packed: false,
      });
    },
    onSuccess: refresh,
  });
  if (detail.isLoading) return <LoadingSkeleton variant="detail" section="journey" />;
  if (!detail.data)
    return (
      <section className="journey-page">
        <Link to="/app/whither-journey">← Volver a viajes</Link>
        <p className="form-error" role="alert">
          {detail.error?.message ?? "No encontramos este viaje."}
        </p>
        <Button variant="secondary" icon={<JourneyIcon name="PENDING" />} onClick={() => void detail.refetch()}>
          Reintentar
        </Button>
      </section>
    );
  const value = detail.data;
  const trip = value.trip;
  const addressStay = value.stays.find((stay) => stay.address || stay.mapsUrl);
  const stayAddressUrl = addressStay ? mapsSearch(addressStay.address) ?? addressStay.mapsUrl : undefined;
  const firstImportantDate = value.dates?.[0];
  const editable = !trip.archived;
  const selectedDay =
    day === "unscheduled"
      ? day
      : day >= trip.startsOn && day <= trip.endsOn
        ? day
        : today() >= trip.startsOn && today() <= trip.endsOn
          ? today()
          : trip.startsOn;
  const points = value.points
    .filter((p) =>
      selectedDay === "unscheduled"
        ? !p.scheduledOn
        : p.scheduledOn === selectedDay,
    )
    .sort(comparePointSchedule);
  const shownBalances = moneyStage
    ? (value.stageBalances?.find((s) =>
        moneyStage === "general"
          ? s.stageId === null
          : s.stageId === moneyStage,
      )?.balances ?? [])
    : value.balances;
  const empty =
    !value.points.length &&
    !value.stays.length &&
    !value.packing.length &&
    !value.movements.length &&
    !value.files.length &&
    !value.reviews.length &&
    !value.dates?.length;
  const completed = value.points.filter((p) => p.status === "COMPLETED").length;
  const tripDayOptions: RecordIteratorOption[] = [];
  for (let date = trip.startsOn; date <= trip.endsOn; date = offsetJourneyDate(date, 1)) {
    const stage = trip.stages.find((entry) => date >= entry.startsOn && date <= entry.endsOn);
    tripDayOptions.push({ value: date, label: formatJourneyDay(date), detail: stage?.cityName });
  }
  tripDayOptions.push({
    value: "unscheduled",
    label: `Sin día asignado (${value.points.filter((p) => !p.scheduledOn).length})`,
    progress: false,
  });
  const requestDelete = (resource: string, itemId: string, title: string) => {
    remove.reset();
    setConfirm({ resource, id: itemId, title });
  };
  const reorder = (index: number, offset: number) => {
    const ids = points.map((p) => p.id);
    [ids[index], ids[index + offset]] = [ids[index + offset], ids[index]];
    change.mutate({ type: "order", ids });
  };
  return (
    <section className="journey-page journey-detail">
      <Link className="section-back" to="/app/whither-journey">
        ← Todos sus viajes
      </Link>
      <EntityDetailHeader
        className="journey-detail__head"
        eyebrow="WHITHER JOURNEY · VIAJE COMPARTIDO"
        title={trip.name}
        media={
          <div className="journey-detail-cover">
            {trip.coverPhotoUrl ? (
              <button
                className="journey-detail-cover__trigger"
                type="button"
                aria-label={"Ver la portada del viaje " + trip.name}
                onClick={() => setCoverPreview(true)}
              >
                <MediaImage
                  className="journey-detail-cover__image"
                  src={trip.coverPhotoUrl}
                  alt={"Foto de portada de " + trip.name}
                  loading="eager"
                />
                <span className="journey-detail-cover__hint" aria-hidden="true">⤢ Ver foto</span>
              </button>
            ) : (
              <div className="journey-detail-cover__empty" aria-label="Viaje sin foto de portada">
                <span className="journey-detail-cover__emoji" aria-hidden="true">✈️</span>
              </div>
            )}
          </div>
        }
        metadata={
          <div className="journey-detail__metadata">
            <p>{formatDate(trip.startsOn)} — {formatDate(trip.endsOn)}{trip.archived ? " · Archivado" : ""}</p>
            <p className="journey-detail__route">{trip.stages[0]?.cityName ?? "Destino del viaje"}</p>
          </div>
        }
        summary={
          <div className="journey-detail__header-summary">
            {value.stays.map((stay) => (
              <div className="journey-stay-summary" key={stay.id}>
                <strong>🏨 {stay.name}</strong>
                <span>Check-in · {formatStayDateTime(stay.startsOn, stay.checkInTime)}</span>
                <span>Check-out · {formatStayDateTime(stay.endsOn, stay.checkOutTime)}</span>
              </div>
            ))}
            <div className="journey-detail__header-actions" aria-label="Accesos del viaje">
              {stayAddressUrl && <a className="button button--secondary" href={stayAddressUrl} target="_blank" rel="noreferrer"><span className="button__icon"><JourneyIcon name="MAPS" /></span><span className="button__label">Dirección</span></a>}
              <ImportantDatesLink
                date={firstImportantDate?.date}
                specialDateId={firstImportantDate?.specialDateId}
              />
            </div>
          </div>
        }
        actions={editable ? (
          <div className="detail-actions">
            <Button variant="secondary" icon={<JourneyIcon name="PHOTO" />} onClick={() => { setTab("Galería"); setOpenGalleryManager(true); }}>{trip.coverPhotoUrl ? "Cambiar portada" : "Elegir portada"}</Button>
            <Button variant="secondary" icon={<JourneyIcon name="EDIT" />} onClick={() => setEditTrip(true)}>Editar viaje</Button>
          </div>
        ) : null}
      />
      <div className="journey-overview">
        <p>
          {completed} de {value.points.length} puntos realizados
        </p>
        <progress
          value={completed}
          max={Math.max(1, value.points.length)}
          aria-label="Progreso del viaje"
        />
        <div className="journey-balances">
          {value.balances.map((b) => (
            <span key={b.currency}>
              Saldo {b.currency}:{" "}
              <strong>{money(b.balance, b.currency)}</strong>
            </span>
          ))}
        </div>
        <div className="journey-review-summary" aria-labelledby="journey-review-title">
          <div className="journey-panel__heading"><div><p className="eyebrow">RESEÑAS</p><h2 id="journey-review-title">¿Cómo estuvo el viaje?</h2></div>
            {editable && <Button variant="secondary" icon={<JourneyIcon name="STAR" />} onClick={() => setReview(null)}>{value.reviews.some((r) => !r.stayId && r.author === session.get()?.username) ? "Editar mi reseña" : "Escribir mi reseña"}</Button>}
          </div>
          {value.reviews.filter((r) => !r.stayId).length ? <div className="journey-review-summary__list">
            {value.reviews.filter((r) => !r.stayId).map((r) => (
              <article className="journey-review-card" key={r.id}>
                <span className="journey-review-card__avatar" aria-hidden="true">{r.author.slice(0, 1).toLocaleUpperCase()}</span>
                <div><strong>{r.author}</strong><RatingStars label={`Reseña de ${r.author}`} value={r.rating} />{r.comment && <p>{r.comment}</p>}</div>
              </article>
            ))}
          </div> : <p className="journey-empty">Todavía no hay reseñas para este viaje.</p>}
        </div>
      </div>
      <div className="journey-tabs" role="tablist" aria-label="Organizar viaje">
        {tabs.map((t) => (
          <button
            type="button"
            key={t}
            id={`journey-tab-${t}`}
            role="tab"
            aria-selected={tab === t}
            aria-controls="journey-panel"
            tabIndex={tab === t ? 0 : -1}
            onClick={() => setTab(t)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                const next =
                  tabs[
                    (tabs.indexOf(t) +
                      (e.key === "ArrowRight" ? 1 : tabs.length - 1)) %
                      tabs.length
                  ];
                setTab(next);
                document.getElementById(`journey-tab-${next}`)?.focus();
              }
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {(change.error || addPacking.error || notice) && (
        <p role="alert" className="form-error">
          {change.error?.message || addPacking.error?.message || notice}
        </p>
      )}
      <section
        id="journey-panel"
        className="journey-panel"
        role="tabpanel"
        aria-labelledby={`journey-tab-${tab}`}
      >
        {tab === "Resumen" && (
          <JourneyDaySummary
            detail={value}
            date={selectedDay === "unscheduled" ? trip.startsOn : selectedDay}
            onDateChange={setDay}
            editable={editable}
          />
        )}
        {tab === "Agenda" && (
          <>
            <div className="journey-panel__heading">
              <h2>Un día a la vez</h2>
              {editable && (
                <Button
                  icon={<JourneyIcon name="ADD" />}
                  onClick={() => {
                    setPoint(null);
                    setCompleting(false);
                  }}
                >
                  Agregar punto
                </Button>
              )}
            </div>
            <div className="journey-day-picker">
              <RecordIterator
                ariaLabel="Días del viaje"
                className="journey-day-stepper"
                hideLabel
                label="Día del viaje"
                options={tripDayOptions}
                value={selectedDay}
                onChange={setDay}
              />
            </div>
            {!points.length && (
              <p className="journey-empty">
                Todavía no hay puntos para este día. Pueden agregar un paseo
                libre o una ficha de sus catálogos.
              </p>
            )}
            <ol className="journey-route">
              {points.map((p, index) => {
                const category = displayPointCategory(p);
                const categoryType = pointTypes.data?.find((type) => type.code === category);
                const sourceDetails = p.source
                  ? sourceDetailsByKey.get(`${p.source.section}:${p.source.entityId}`)
                  : undefined;
                const pointAddress = p.address || sourceDetails?.address;
                const addressUrl = p.address
                  ? mapsSearch(p.address) ?? p.mapsUrl
                  : p.mapsUrl ?? sourceDetails?.mapsUrl ?? mapsSearch(sourceDetails?.address);
                const customActionUrls = new Set((p.extraActions ?? []).map((action) => action.url));
                const linkedActions = (sourceDetails?.actions ?? []).filter((action) => !customActionUrls.has(action.url));
                const canMoveUp = sameScheduledTime(points[index - 1], p);
                const canMoveDown = sameScheduledTime(points[index + 1], p);
                return <li
                  key={p.id}
                  className={`journey-route__point is-${p.status.toLowerCase()}`}
                >
                  <span className="journey-route__marker" aria-hidden="true">
                    {p.status === "COMPLETED" ? "✓" : index + 1}
                  </span>
                  <div>
                    <p className="journey-route__time">
                      {p.scheduledTime?.slice(0, 5) || "Sin horario"} ·{" "}
                      {trip.stages.find((s) => s.id === p.stageId)?.cityName}
                    </p>
                    <h3>{p.title}</h3>
                    <span className="journey-point-category" style={{ "--point-accent": categoryType?.color ?? "#B9DCE9" } as CSSProperties}>
                      <JourneyIcon name={categoryType?.icon ?? "ACTIVITY"} />
                      <span>{categoryType?.name ?? pointCategoryLabels[category] ?? category}</span>
                    </span>
                    <span className="journey-status">
                      {p.status === "COMPLETED"
                        ? "Realizado"
                        : p.status === "CANCELLED"
                          ? "Cancelado"
                          : "Pendiente"}
                    </span>
                    {pointAddress && <p className="journey-point-address"><JourneyIcon name="MAPS" /> <span>{pointAddress}</span></p>}
                    {p.notes && <details className="journey-point-note">
                      <summary><JourneyIcon name="INFO" /> Nota <span aria-hidden="true" /></summary>
                      <p>{p.notes}</p>
                    </details>}
                    <div className="journey-actions journey-actions--point" style={{ "--point-accent": categoryType?.color ?? "#B9DCE9" } as CSSProperties}>
                      <div className={`journey-point-primary-actions${addressUrl ? " journey-point-primary-actions--with-address" : ""}`} aria-label={`Acciones principales de ${p.title}`}>
                        {editable && <Button className="journey-point-status-action" variant={p.status === "COMPLETED" ? "secondary" : undefined}
                          icon={<JourneyIcon name={p.status === "COMPLETED" ? "PENDING" : "CHECK"} />} disabled={change.isPending}
                          onClick={() => {
                            if (p.status === "COMPLETED" || p.status === "CANCELLED") {
                              change.mutate({ type: "point", value: { ...p, status: "PENDING" } });
                            } else if (p.source && !p.source.experienceId) {
                              setPoint(p); setCompleting(true);
                            } else change.mutate({ type: "point", value: { ...p, status: "COMPLETED" } });
                          }}>{p.status === "COMPLETED" ? "Marcar pendiente" : p.status === "CANCELLED" ? "Reactivar punto" : "Marcar realizado"}</Button>}
                        {editable && <Button className="journey-point-expense-action" variant="secondary" icon={<JourneyIcon name="MONEY" />}
                          onClick={() => { setMovementPoint(p.id); setMovement(null); }}>Registrar gasto</Button>}
                        {addressUrl && <a className="button button--primary journey-action-link journey-address-action" href={addressUrl} target="_blank" rel="noreferrer">
                          <span aria-hidden="true">🗺️</span> Dirección <JourneyIcon className="journey-action-link__arrow" name="OPEN" />
                        </a>}
                        {(editable || p.source || p.extraActions?.length) && <details className="journey-point-overflow"
                          onBlur={(event) => {
                            const next = event.relatedTarget;
                            if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
                              event.currentTarget.open = false;
                            }
                          }}>
                          <summary aria-label={`Más acciones de ${p.title}`} title="Más acciones"><span aria-hidden="true">•••</span></summary>
                          <div className="journey-point-overflow__menu">
                            {p.source && <Link className={`button button--secondary journey-action-link journey-action-link--source journey-action-link--${p.source.section.toLowerCase()}`}
                              to={sourceHref(p.source)} onClick={() => context.selectLocation(p.stageId)}>
                              <JourneyIcon name={p.source.section} /> Abrir ficha <JourneyIcon className="journey-action-link__arrow" name="OPEN" />
                            </Link>}
                            {linkedActions.map((action) => <a className={`button button--secondary journey-action-link journey-action-link--source journey-action-link--${p.source?.section.toLowerCase() ?? "custom"}`}
                              href={action.url} key={`${p.id}-source-${action.url}`} target="_blank" rel="noreferrer">
                              <JourneyIcon name={action.icon} /> {action.label} <JourneyIcon className="journey-action-link__arrow" name="OPEN" />
                            </a>)}
                            {p.extraActions?.map((action, actionIndex) => <a className="button button--secondary journey-action-link journey-action-link--custom"
                              href={action.url} key={`${p.id}-${actionIndex}`} target="_blank" rel="noreferrer">
                              <JourneyIcon name={action.icon} /> {action.label} <JourneyIcon className="journey-action-link__arrow" name="OPEN" />
                            </a>)}
                            {editable && <>
                              <Button variant="secondary" icon={<JourneyIcon name="EDIT" />} disabled={change.isPending} onClick={() => { setPoint(p); setCompleting(false); }}>Editar punto</Button>
                              {p.status !== "CANCELLED" && <Button variant="secondary" icon={<JourneyIcon name="CANCEL" />} disabled={change.isPending} onClick={() => change.mutate({ type: "point", value: { ...p, status: "CANCELLED" } })}>Cancelar punto</Button>}
                              <Button variant="secondary" icon={<JourneyIcon name="UP" />} disabled={change.isPending || !canMoveUp} aria-label={`Mover ${p.title} hacia arriba`} onClick={() => reorder(index, -1)}>Subir</Button>
                              <Button variant="secondary" icon={<JourneyIcon name="DOWN" />} disabled={change.isPending || !canMoveDown} aria-label={`Mover ${p.title} hacia abajo`} onClick={() => reorder(index, 1)}>Bajar</Button>
                              <Button variant="destructive" icon={<JourneyIcon name="DELETE" />} onClick={() => requestDelete("points", p.id, "¿Quitar este punto?")}>Quitar punto</Button>
                            </>}
                          </div>
                        </details>}
                      </div>
                    </div>
                  </div>
                </li>;
              })}
            </ol>
          </>
        )}
        {tab === "Galería" && <JourneyGalleryTab detail={value} editable={editable} onRefresh={refresh} managerOpen={openGalleryManager} onManagerOpenChange={setOpenGalleryManager} />}
        {tab === "Archivos" && (
          <>
            <div className="journey-panel__heading">
              <h2>Todo a mano</h2>
              {editable && (
                <Button icon={<JourneyIcon name="UPLOAD" />} onClick={() => setUpload(null)}>Guardar archivo</Button>
              )}
            </div>
            {!value.files.some((file) => file.purpose === "ATTACHMENT") && (
              <p className="journey-empty">
                Guarden reservas, entradas y recibos para encontrarlos durante
                el viaje.
              </p>
            )}
            <ul className="journey-file-list">
              {value.files.filter((f) => f.purpose === "ATTACHMENT").map((f) => (
                <li key={f.id}>
                  {f.contentType.startsWith("image/") && (
                    <MediaImage className="journey-file-thumbnail" src={f.thumbnailUrl ?? f.url} alt={`Miniatura del archivo vinculado a ${fileLabel(f, value)}`} width={f.width ?? 640} height={f.height ?? 480} />
                  )}
                  <div className="journey-file-list__summary">
                    <strong>🔗 {fileLabel(f, value)}</strong>
                    <span className="journey-file-list__date">Fecha del archivo · {formatPhotoDate(f.occurredAt)}</span>
                  </div>
                  <div className="journey-actions">
                    <Button variant="secondary" icon={<JourneyIcon name="EYE" />} onClick={() => setPreview(f)}>
                      Vista previa
                    </Button>
                    <Button
                      variant="secondary"
                      icon={<JourneyIcon name="DOWNLOAD" />}
                      onClick={() =>
                        void downloadFile(f).catch((e) => setNotice(e.message))
                      }
                    >
                      Descargar
                    </Button>
                    {editable && <Button variant="secondary" icon={<JourneyIcon name="CALENDAR" />} onClick={() => setFileDate(f)}>Editar fecha</Button>}
                    {editable && (
                      <Button
                        variant="secondary"
                        icon={<JourneyIcon name="LINK" />}
                        onClick={() => setFileLinks(f)}
                      >
                        Cambiar vínculo
                      </Button>
                    )}{" "}
                    {editable && (
                      <Button
                        variant="destructive"
                        icon={<JourneyIcon name="DELETE" />}
                        onClick={() =>
                          requestDelete("files", f.id, "¿Quitar este archivo?")
                        }
                      >
                        Quitar
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
        {tab === "Estadías" && (
          <>
            <div className="journey-panel__heading">
              <h2>Dónde se quedan</h2>
              {editable && (
                <Button icon={<JourneyIcon name="ADD" />} onClick={() => setStay(null)}>
                  Agregar alojamiento
                </Button>
              )}
            </div>
            {!value.stays.length && (
              <p className="journey-empty">
                Agreguen alojamientos y sus enlaces de reserva.
              </p>
            )}
            <div className="journey-stays">
              {value.stays.map((s) => {
                const stayPhotos = value.files
                  .filter((file) => file.stayId === s.id && file.contentType.startsWith("image/"))
                  .map(stayGalleryPhoto);
                const addressUrl = mapsSearch(s.address) ?? s.mapsUrl;
                return <article key={s.id} className="journey-stay">
                  <div className="journey-stay__content">
                    <div className="journey-stay__info">
                      <h3>{s.name}</h3>
                      <p>
                        {trip.stages.find((st) => st.id === s.stageId)?.cityName}{" "}
                        · Check-in {formatStayDateTime(s.startsOn, s.checkInTime)}
                        · Check-out {formatStayDateTime(s.endsOn, s.checkOutTime)}
                      </p>
                      <p>{s.address}</p>
                      {s.price != null && s.currency && (
                        <p>
                          {money(s.price, s.currency)} · Precio del alojamiento
                        </p>
                      )}
                      {s.source && <p>Lo consiguieron en {s.source}</p>}
                      {value.reviews
                        .filter((r) => r.stayId === s.id)
                        .map((r) => (
                          <div key={r.id} className="journey-stay-review">
                            <strong>{r.author}</strong>
                            <RatingStars label="Alojamiento" value={r.rating} />
                            <p>{r.comment}</p>
                          </div>
                        ))}
                    </div>
                    <div className="journey-stay__gallery">
                      <ExperienceGallery
                        accentLabel="FOTOS DE LA ESTADÍA"
                        emptyIcon="🏨"
                        emptyMessage="Agreguen fotos del alojamiento para verlas acá."
                        name={s.name}
                        photos={stayPhotos}
                        coverPhotoId={s.photoId ?? undefined}
                        maxPhotos={5}
                        limitCount={stayPhotos.length}
                        managerLimitCount={stayPhotos.length}
                        managerLabel="Administrar fotos"
                        manageInModal={editable}
                        onUpload={editable ? async (files, originals) => {
                          for (const [index, file] of files.entries()) {
                            const capturedAt = await photoDateOrNow(originals?.[index] ?? file);
                            await uploadFile(id, file, { stageId: s.stageId, stayId: s.id, occurredAt: capturedAt.toISOString() });
                          }
                          await refresh();
                        } : undefined}
                        onSetCover={editable ? (photo) => change.mutate({ type: "stay-cover", value: s, ids: [String(photo.id)] }) : undefined}
                        onDelete={editable ? (photo) => requestDelete("files", String(photo.id), "¿Quitar esta foto?") : undefined}
                        coverPending={change.isPending}
                      />
                    </div>
                  </div>
                  <div className="journey-stay__actions" aria-label={`Acciones de ${s.name}`}>
                    {s.bookingUrl && (
                      <a className="button button--secondary" href={s.bookingUrl} target="_blank" rel="noreferrer">
                        <span className="button__icon"><JourneyIcon name="TICKET" /></span><span className="button__label">Reserva</span>
                      </a>
                    )}
                    {addressUrl && (
                      <a className="button button--secondary" href={addressUrl} target="_blank" rel="noreferrer">
                        <span className="button__icon"><JourneyIcon name="MAPS" /></span><span className="button__label">Dirección</span>
                      </a>
                    )}
                    {editable && <>
                      <Button variant="secondary" icon={<JourneyIcon name="EDIT" />} onClick={() => setStay(s)}>Editar</Button>
                      <Button variant="secondary" icon={<JourneyIcon name="UPLOAD" />} onClick={() => setUpload(s.id)}>Adjuntar archivo</Button>
                      <Button variant="secondary" icon={<JourneyIcon name="STAR" />} onClick={() => setReview(s.id)}>Mi reseña</Button>
                      <Button variant="destructive" icon={<JourneyIcon name="DELETE" />} onClick={() => requestDelete("stays", s.id, "¿Quitar el alojamiento?")}>Quitar</Button>
                    </>}
                  </div>
                </article>;
              })}
            </div>
          </>
        )}
        {tab === "Valijas" && (
          <>
            <h2>Las valijas de cada uno</h2>
            {editable && (
              <form
                className="journey-packing-add"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  addPacking.mutate(new FormData(form), {
                    onSuccess: () => form.reset(),
                  });
                }}
              >
                <label>
                  Valija
                  <select
                    value={packingUser || value.members[0]?.id || ""}
                    onChange={(e) =>
                      setPackingUser(
                        e.target.value === "BOTH" ? "BOTH" : Number(e.target.value),
                      )
                    }
                  >
                    {value.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.username}
                      </option>
                    ))}
                    {value.members.length === 2 && (
                      <option value="BOTH">Ambos</option>
                    )}
                  </select>
                </label>
                <label>
                  Qué llevar
                  <input
                    name="description"
                    required
                    maxLength={160}
                    placeholder="Pasaporte, cargador…"
                  />
                </label>
                <label>
                  Cantidad
                  <input
                    name="quantity"
                    type="number"
                    required
                    min="1"
                    max="999"
                    defaultValue="1"
                  />
                </label>
                <Button icon={<JourneyIcon name="ADD" />} disabled={addPacking.isPending}>Agregar</Button>
              </form>
            )}
            {editable && (
              <p className="journey-packing-hint">
                <JourneyIcon name="MOVE" />
                Mantené presionado un ítem medio segundo y arrastralo para ordenarlo. Si lo deslizás antes, la página sigue scrolleando. También podés usar las flechas.
              </p>
            )}
            <JourneyPackingLists
              members={value.members}
              packing={value.packing}
              editable={editable}
              disabled={change.isPending}
              onToggle={(item, packed) => change.mutate({ type: "packing", value: { ...item, packed } })}
              onReorder={(userId, ids) => change.mutateAsync({ type: "packing-order", userId, ids })}
              onEdit={setPackingEdit}
              onRemove={(item) => requestDelete("packing", item.id, "¿Quitar de la valija?")}
            />
          </>
        )}
        {tab === "Dinero" && (
          <>
            <div className="journey-panel__heading">
              <h2>Dinero del viaje</h2>
              {editable && (
                <Button
                  icon={<JourneyIcon name="MONEY" />}
                  onClick={() => {
                    setMovementPoint(undefined);
                    setMovement(null);
                  }}
                >
                  Registrar movimiento
                </Button>
              )}
            </div>
            <p className="muted">
              Fondos − gastos + reintegros. Cada moneda conserva su propio
              saldo.
            </p>
            <div className="journey-money-summary">
              {shownBalances.map((b) => (
                <section key={b.currency}>
                  <h3>{b.currency}</h3>
                  <dl>
                    <div>
                      <dt>Llevado / agregado</dt>
                      <dd>{money(b.funds, b.currency)}</dd>
                    </div>
                    <div>
                      <dt>Gastado</dt>
                      <dd>{money(b.expenses, b.currency)}</dd>
                    </div>
                    <div>
                      <dt>Reintegrado</dt>
                      <dd>{money(b.refunds, b.currency)}</dd>
                    </div>
                    <div>
                      <dt>Disponible</dt>
                      <dd>{money(b.balance, b.currency)}</dd>
                    </div>
                  </dl>
                </section>
              ))}
            </div>
            {!value.movements.length && (
              <p className="journey-empty">
                Agreguen el dinero que llevan y los gastos de sus actividades.
              </p>
            )}
            <label className="journey-money-filter">
              Desglose por etapa
              <select
                value={moneyStage}
                onChange={(e) => setMoneyStage(e.target.value)}
              >
                <option value="">Todo el viaje</option>
                <option value="general">Movimientos generales</option>
                {trip.stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.cityName} · {formatDate(s.startsOn)}
                  </option>
                ))}
              </select>
            </label>
            <ul className="journey-money-list">
              {value.movements
                .filter(
                  (m) =>
                    !moneyStage ||
                    (moneyStage === "general"
                      ? !m.stageId
                      : m.stageId === moneyStage),
                )
                .map((m) => (
                  <li key={m.id}>
                    <div>
                      <strong>{m.description}</strong>
                      <span>
                        {m.occurredOn} ·{" "}
                        {m.kind === "FUNDS"
                          ? "Fondos"
                          : m.kind === "REFUND"
                            ? "Reintegro"
                            : "Gasto"}
                        {m.pointId
                          ? ` · ${value.points.find((p) => p.id === m.pointId)?.title ?? "Actividad"}`
                          : ""}
                      </span>
                    </div>
                    <strong>{money(m.amount, m.currency)}</strong>
                    {editable && (
                      <div className="journey-actions">
                        <Button
                          variant="secondary"
                          icon={<JourneyIcon name="EDIT" />}
                          onClick={() => setMovement(m)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="destructive"
                          icon={<JourneyIcon name="DELETE" />}
                          onClick={() =>
                            requestDelete(
                              "movements",
                              m.id,
                              "¿Quitar este movimiento?",
                            )
                          }
                        >
                          Quitar
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
            </ul>
          </>
        )}
      </section>
      {editable && (
        <footer className="journey-footer">
          <Button
            variant="secondary"
            icon={<JourneyIcon name="ARCHIVE" />}
            onClick={() =>
              requestDelete("archive", id, "¿Archivar este viaje?")
            }
          >
            Archivar viaje
          </Button>
          {empty && (
            <Button
              variant="destructive"
              icon={<JourneyIcon name="DELETE" />}
              onClick={() =>
                requestDelete("trip", id, "¿Eliminar este viaje vacío?")
              }
            >
              Eliminar viaje vacío
            </Button>
          )}
        </footer>
      )}
      <datalist id="journey-currencies">
        {["ARS", "USD", "EUR", "BRL", "UYU", "CLP", "GBP", "JPY", "MXN"].map(
          (c) => (
            <option key={c} value={c} />
          ),
        )}
      </datalist>
      {coverPreview && trip.coverPhotoUrl && (
        <PhotoViewer
          photos={[{ src: trip.coverPhotoUrl, alt: "Portada del viaje " + trip.name }]}
          onClose={() => setCoverPreview(false)}
        />
      )}
      {packingEdit && (
        <PackingEditor
          item={packingEdit}
          pending={change.isPending}
          error={change.error?.message}
          onClose={() => setPackingEdit(undefined)}
          onSave={(item) =>
            change.mutate(
              { type: "packing", value: item },
              { onSuccess: () => setPackingEdit(undefined) },
            )
          }
        />
      )}{" "}
      {fileLinks && (
        <FileLinksEditor
          detail={value}
          file={fileLinks}
          onClose={() => setFileLinks(undefined)}
        />
      )}
      {fileDate && (
        <FileDateEditor
          file={fileDate}
          tripId={trip.id}
          onClose={() => setFileDate(undefined)}
        />
      )}
      {editTrip && (
        <JourneyForm trip={trip} onClose={() => setEditTrip(false)} />
      )}{" "}
      {point !== undefined && (
        <PointEditor
          detail={value}
          point={point ?? undefined}
          day={selectedDay === "unscheduled" ? undefined : selectedDay}
          completing={completing}
          onDelete={point ? () => requestDelete("points", point.id, "¿Eliminar este punto por completo?") : undefined}
          onClose={() => setPoint(undefined)}
        />
      )}{" "}
      {stay !== undefined && (
        <StayEditor
          detail={value}
          stay={stay ?? undefined}
          initialStageId={trip.stages.find((stage) => selectedDay >= stage.startsOn && selectedDay <= stage.endsOn)?.id}
          onClose={() => setStay(undefined)}
        />
      )}{" "}
      {movement !== undefined && (
        <MovementEditor
          detail={value}
          movement={movement ?? undefined}
          initialPointId={movementPoint}
          onClose={() => setMovement(undefined)}
        />
      )}{" "}
      {review !== undefined && (
        <ReviewEditor
          detail={value}
          stayId={review ?? undefined}
          onClose={() => setReview(undefined)}
        />
      )}{" "}
      {upload !== undefined && (
        <FileUpload
          detail={value}
          stayId={upload ?? undefined}
          onClose={() => setUpload(undefined)}
        />
      )}{" "}
      {preview && (
        <FilePreview file={preview} onClose={() => setPreview(undefined)} />
      )}{" "}
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={
            remove.error?.message ??
            (confirm.resource === "archive"
              ? "El historial se conserva y los destinos dejan de aparecer en nuevas selecciones."
              : "El contenido vinculado debe reubicarse antes de eliminar este registro.")
          }
          pending={remove.isPending}
          confirmLabel="Confirmar"
          onConfirm={() => remove.mutate()}
          onClose={() => setConfirm(undefined)}
        />
      )}{" "}
      {remove.error && (
        <p className="form-error" role="alert">
          {remove.error.message}
        </p>
      )}
    </section>
  );
}

function PackingEditor({
  item,
  pending,
  error,
  onSave,
  onClose,
}: {
  item: Packing;
  pending: boolean;
  error?: string;
  onSave: (item: Packing) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      className="journey-modal"
      title="Editar elemento de valija"
      onClose={onClose}
      pending={pending}
      confirmDiscard
    >
      <form
        className="journey-form"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          onSave({
            ...item,
            description: String(f.get("description")),
            quantity: Number(f.get("quantity")),
          });
        }}
      >
        <h2>Editar lo que llevan</h2>
        <label>
          Qué llevar
          <input
            name="description"
            required
            maxLength={160}
            defaultValue={item.description}
          />
        </label>
        <label>
          Cantidad
          <input
            name="quantity"
            type="number"
            required
            min="1"
            max="999"
            defaultValue={item.quantity}
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button icon={<JourneyIcon name="CHECK" />} disabled={pending}>Guardar cambios</Button>
      </form>
    </Modal>
  );
}
