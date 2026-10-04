import { getSpecialDates } from "../special-dates/specialDates";
import { linkDate } from "./journey";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useQuery } from "../../lib/locationQuery";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { MediaImage } from "../../components/ui/MediaImage";
import { StarRating } from "../../components/ui/StarRating";
import { useZoneContext } from "../../lib/zoneContext";
import { session } from "../../lib/api";
import { showNotice } from "../../lib/flash";
import {
  getSources,
  getExperiences,
  getJourneyPointTypes,
  saveResource,
  saveReview,
  sections,
  sourceHref,
  today,
  type Detail,
  type Point,
  type PointCategory,
  type JourneyPointAction,
  type Stay,
  type Movement,
  type Section,
  type Review,
  normalizeAmountInput,
  formatAmountInput,
} from "./journey";
import { JourneyIcon } from "./JourneyIcon";
import { journeyPointIconOptions } from "./journeyPointIcons";
export function useJourneyRefresh(id: string) {
  const client = useQueryClient();
  return () =>
    Promise.all(
      [
        "journey",
        "journeys",
        "journey-day",
        "journey-days",
        "location-context",
        "experience-location",
        "when-dates",
        "when-date",
        "places",
        "recipes",
        "films",
        "activities",
      ].map((key) =>
        client.invalidateQueries({
          queryKey: key === "journey" ? [key, id] : [key],
        }),
      ),
    );
}
function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim() || null;
}
function FormError({ error }: { error: Error | null }) {
  return error ? (
    <p className="form-error" role="alert">
      {error.message}
    </p>
  ) : null;
}
function StageSelect({
  detail,
  value,
  onChange,
  optional = false,
}: {
  detail: Detail;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
}) {
  return (
    <label>
      Destino
      <select
        required={!optional}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {optional && <option value="">Todo el viaje</option>}
        {detail.trip.stages.map((s) => (
          <option key={s.id} value={s.id}>
            {s.cityName} · {s.startsOn} / {s.endsOn}
          </option>
        ))}
      </select>
    </label>
  );
}
export function PointEditor({
  detail,
  point,
  day,
  completing = false,
  onClose,
}: {
  detail: Detail;
  point?: Point;
  day?: string;
  completing?: boolean;
  onClose: () => void;
}) {
  const refresh = useJourneyRefresh(detail.trip.id);
  const context = useZoneContext();
  const [stageId, setStageId] = useState(
    point?.stageId ??
      detail.trip.stages.find(
        (s) => day && day >= s.startsOn && day <= s.endsOn,
      )?.id ??
      detail.trip.stages[0].id,
  );
  const stage = detail.trip.stages.find((s) => s.id === stageId)!;
  const [section, setSection] = useState<Section | "">(
    point?.source?.section ?? "",
  );
  const [category, setCategory] = useState<PointCategory>(
    point?.source?.section ?? point?.category ?? "GENERAL",
  );
  const [entityId, setEntityId] = useState(point?.source?.entityId ?? 0);
  const [experienceId, setExperienceId] = useState(
    point?.source?.experienceId ?? 0,
  );
  const [title, setTitle] = useState(point?.title ?? "");
  const [status, setStatus] = useState<Point["status"]>(
    completing ? "COMPLETED" : (point?.status ?? "PENDING"),
  );
  const [scheduledOn, setScheduledOn] = useState(
    point?.scheduledOn ?? day ?? "",
  );
  const [extraActions, setExtraActions] = useState<JourneyPointAction[]>(point?.extraActions ?? []);
  const pointTypes = useQuery({ queryKey: ["journey-point-types"], queryFn: getJourneyPointTypes });
  const catalog = useQuery({
    queryKey: ["journey-sources", section, stage.cityId],
    queryFn: () => getSources(
      section as Section,
      section === "FOOD" || section === "FUN" ? stage.cityId : undefined,
    ),
    enabled: !!section,
  });
  const experiences = useQuery({
    queryKey: [
      "journey-experiences",
      section,
      entityId,
      stage.startsOn,
      stage.endsOn,
    ],
    queryFn: () =>
      getExperiences(
        { section: section as Section, entityId },
        stage.startsOn,
        stage.endsOn,
      ),
    enabled: !!section && !!entityId,
  });
  const save = useMutation({
    mutationFn: (form: FormData) =>
      saveResource<Point>(
        detail.trip.id,
        "points",
        {
          stageId,
          title,
          scheduledOn: scheduledOn || null,
          scheduledTime: text(form, "scheduledTime"),
          notes: text(form, "notes"),
          mapsUrl: text(form, "mapsUrl"),
          position: point?.position ?? detail.points.length,
          status,
          category,
          extraActions,
          source:
            section && entityId
              ? { section, entityId, experienceId: experienceId || null }
              : null,
        },
        point?.id,
      ),
    onSuccess: async () => {
      await refresh();
      showNotice("Punto del recorrido guardado.");
      onClose();
    },
  });
  const linked = !!point?.source?.experienceId;
  const register = point?.source
    ? `${sourceHref(point.source)}?${new URLSearchParams({ journeyPoint: point.id, journeyStage: point.stageId, journeySection: point.source.section, journeyEntity: String(point.source.entityId), journeyDate: point.scheduledOn ?? today(), journeyAction: "register" })}`
    : "";
  const selectedSource = catalog.data?.find((source) => source.entityId === entityId)
    ?? (point?.source && point.source.entityId === entityId ? {
      section: point.source.section,
      entityId,
      title: point.title,
      cityId: stage.cityId,
      href: sourceHref(point.source),
      thumbnailUrl: null,
    } : undefined);
  return (
    <Modal
      className="journey-modal"
      onClose={onClose}
      size="wide"
      confirmDiscard
      pending={save.isPending}
      title={
        completing
          ? "Completar actividad"
          : point
            ? "Editar punto"
            : "Agregar punto"
      }
    >
      <form
        className="journey-form"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(new FormData(e.currentTarget));
        }}
      >
        <h2>
          {completing
            ? "¿Qué hicieron en este punto?"
            : point
              ? "Editar punto del recorrido"
              : "Agregar al recorrido"}
        </h2>
        <StageSelect detail={detail} value={stageId} onChange={setStageId} />
        <section className="journey-point-link-editor" aria-labelledby="journey-point-link-title">
          <h3 id="journey-point-link-title">Tipo y ficha relacionada</h3>
          <label className="journey-point-type-select">
            Tipo de punto
            <select
              value={category}
              disabled={pointTypes.isLoading}
              onChange={(e) => setCategory(e.target.value as PointCategory)}
            >
              {(pointTypes.data ?? []).map((type) => (
                <option key={type.code} value={type.code}>{type.name}</option>
              ))}
            </select>
          </label>
          {pointTypes.error && <FormError error={pointTypes.error} />}
          <label>
            Vincular ficha existente
            <select
              value={section}
              disabled={linked}
              onChange={(e) => {
                const selected = e.target.value as Section | "";
                setSection(selected);
                setEntityId(0);
                setExperienceId(0);
                if (selected) setCategory(selected);
              }}
            >
              <option value="">Sin ficha vinculada</option>
              {Object.entries(sections).map(([key, name]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </select>
          </label>
          {!!section && <>
            <label>
              Ficha
              <select
                required
                value={entityId || ""}
                disabled={linked || catalog.isLoading}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setEntityId(id);
                  setExperienceId(0);
                  if (!title) setTitle(catalog.data?.find((source) => source.entityId === id)?.title ?? "");
                }}
              >
                <option value="">Elegí una ficha</option>
                {point?.source && !catalog.data?.some((source) => source.entityId === point.source?.entityId) && (
                  <option value={point.source.entityId}>{point.title}</option>
                )}
                {catalog.data?.map((source) => <option key={source.entityId} value={source.entityId}>{source.title}</option>)}
              </select>
            </label>
            {selectedSource && <div className="journey-source-preview">
              {selectedSource.thumbnailUrl
                ? <MediaImage src={selectedSource.thumbnailUrl} alt={`Vista previa de ${selectedSource.title}`} width={88} height={88} loading="eager" />
                : <span className={`journey-source-preview__icon journey-source-preview__icon--${section.toLowerCase()}`}><JourneyIcon name={section} /></span>}
              <div><small>{sections[section]} · {detail.trip.stages.find((item) => item.cityId === selectedSource.cityId)?.cityName ?? "Ficha compartida"}</small><strong>{selectedSource.title}</strong></div>
            </div>}
            {!entityId && <p className="journey-source-preview__empty">Elegí una ficha para ver su vista previa.</p>}
            {!!entityId && <>
              <label>
                Experiencia vinculada
                <select
                  value={experienceId || ""}
                  required={status === "COMPLETED"}
                  disabled={linked || experiences.isLoading}
                  onChange={(e) => setExperienceId(Number(e.target.value))}
                >
                  <option value="">Todavía no registrada</option>
                  {experiences.data?.filter((experience) => experience.date >= stage.startsOn && experience.date <= stage.endsOn && (!experience.stageId || experience.stageId === stageId)).map((experience) => (
                    <option key={experience.id} value={experience.id}>{experience.date} · #{experience.id}</option>
                  ))}
                </select>
              </label>
              {experiences.data?.length === 0 && <small>Todavía no hay experiencias registradas para esta ficha y período.</small>}
            </>}
          </>}
          <FormError error={catalog.error} />
          <FormError error={experiences.error} />
        </section>
        <label>
          Actividad
          <input
            required
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <div className="form-columns">
          <label>
            Día
            <input
              type="date"
              min={stage.startsOn}
              max={stage.endsOn}
              value={scheduledOn}
              onChange={(e) => setScheduledOn(e.target.value)}
            />
          </label>
          <label>
            Hora
            <input
              name="scheduledTime"
              type="time"
              defaultValue={point?.scheduledTime ?? ""}
            />
          </label>
        </div>
        <label>
          Notas
          <textarea
            name="notes"
            maxLength={4000}
            defaultValue={point?.notes ?? ""}
          />
        </label>
        <label>
          Google Maps
          <input
            type="url"
            name="mapsUrl"
            maxLength={1000}
            placeholder="https://maps.google.com/…"
            defaultValue={point?.mapsUrl ?? ""}
          />
        </label>
        <fieldset className="journey-point-action-editor">
          <legend>Botones adicionales</legend>
          <div className="journey-point-action-editor__heading">
            <p>Agreguen enlaces útiles al recorrido, como reservas, entradas o menús.</p>
            <Button
              variant="secondary"
              icon={<JourneyIcon name="LINK" />}
              type="button"
              data-modal-dirty
              disabled={extraActions.length >= 8}
              onClick={() => setExtraActions([...extraActions, { label: "", icon: "LINK", url: "" }])}
            >Agregar enlace</Button>
          </div>
          {extraActions.map((action, index) => <div className="journey-point-action-editor__row" key={index}>
            <strong>Botón {index + 1}</strong>
            <label>Nombre<input required maxLength={40} value={action.label} onChange={(event) => setExtraActions(extraActions.map((value, i) => i === index ? { ...value, label: event.target.value } : value))} placeholder="Por ejemplo, Reservar" /></label>
            <label>Ícono<select value={action.icon} onChange={(event) => setExtraActions(extraActions.map((value, i) => i === index ? { ...value, icon: event.target.value } : value))}>{journeyPointIconOptions.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
            <label>Enlace<input required type="url" maxLength={1000} value={action.url} onChange={(event) => setExtraActions(extraActions.map((value, i) => i === index ? { ...value, url: event.target.value } : value))} placeholder="https://…" /></label>
            <Button className="journey-point-action-editor__remove" variant="tertiary" icon={<JourneyIcon name="DELETE" />} type="button" data-modal-dirty aria-label={`Quitar botón ${index + 1}`} onClick={() => setExtraActions(extraActions.filter((_, i) => i !== index))}>Quitar</Button>
          </div>)}
          {extraActions.length === 8 && <small>Pueden agregar hasta ocho enlaces por punto.</small>}
        </fieldset>
        <label>
          Estado
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Point["status"])}
          >
            <option value="PENDING">Pendiente</option>
            <option value="COMPLETED">Realizado</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </label>
        {status === "COMPLETED" &&
          section &&
          !experienceId &&
          point?.source && (
            <p>
              Elijan una experiencia ya registrada o{" "}
              <Link
                to={register}
                onClick={() => context.selectLocation(stageId)}
              >
                registren la experiencia en {sections[section]}
              </Link>
              .
            </p>
          )}
        <FormError error={experiences.error} />
        <FormError error={save.error} />
        <Button
          disabled={
            save.isPending ||
            (!!section && !entityId) ||
            (status === "COMPLETED" && !!section && !experienceId)
          }
        >
          {save.isPending ? "Guardando…" : "Guardar punto"}
        </Button>
      </form>
    </Modal>
  );
}
export function StayEditor({
  detail,
  stay,
  initialStageId,
  onClose,
}: {
  detail: Detail;
  stay?: Stay;
  initialStageId?: string;
  onClose: () => void;
}) {
  const refresh = useJourneyRefresh(detail.trip.id);
  const [stageId, setStageId] = useState(
    stay?.stageId ?? initialStageId ?? (detail.trip.stages.length === 1 ? detail.trip.stages[0].id : ""),
  );
  const stage = detail.trip.stages.find((s) => s.id === stageId)!;
  const save = useMutation({
    mutationFn: (form: FormData) =>
      saveResource<Stay>(
        detail.trip.id,
        "stays",
        {
          stageId,
          name: text(form, "name")!,
          startsOn: text(form, "startsOn")!,
          endsOn: text(form, "endsOn")!,
          address: text(form, "address"),
          price: normalizeAmountInput(text(form, "price") ?? "") || null,
          currency: text(form, "currency"),
          source: text(form, "source"),
          bookingUrl: text(form, "bookingUrl"),
          mapsUrl: text(form, "mapsUrl"),
          photoId: stay?.photoId ?? null,
        },
        stay?.id,
      ),
    onSuccess: async () => {
      await refresh();
      showNotice("Alojamiento guardado.");
      onClose();
    },
  });
  return (
    <Modal
      className="journey-modal"
      onClose={onClose}
      size="wide"
      confirmDiscard
      pending={save.isPending}
      title="Alojamiento"
    >
      <form
        className="journey-form"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(new FormData(e.currentTarget));
        }}
      >
        <h2>{stay ? "Editar alojamiento" : "¿Dónde se quedan?"}</h2>
        <StageSelect detail={detail} value={stageId} onChange={setStageId} />
        <label>
          Nombre
          <input
            name="name"
            required
            maxLength={160}
            defaultValue={stay?.name}
          />
        </label>
        <div className="form-columns">
          <label>
            Llegada
            <input
              name="startsOn"
              type="date"
              required
              min={stage.startsOn}
              max={stage.endsOn}
              defaultValue={stay?.startsOn ?? stage.startsOn}
            />
          </label>
          <label>
            Salida
            <input
              name="endsOn"
              type="date"
              required
              min={stage.startsOn}
              max={stage.endsOn}
              defaultValue={stay?.endsOn ?? stage.endsOn}
            />
          </label>
        </div>
        <label>
          Dirección
          <input
            name="address"
            maxLength={300}
            defaultValue={stay?.address ?? ""}
          />
        </label>
        <div className="form-columns">
          <label>
            Precio del alojamiento
            <input
              type="text"
              inputMode="decimal"
              name="price"
              min="0"
              step="0.0001"
              defaultValue={stay?.price == null ? "" : formatAmountInput(String(stay.price))}
              onBlur={(e) => { e.currentTarget.value = formatAmountInput(e.currentTarget.value); }}
            />
          </label>
          <label>
            Moneda
            <input
              name="currency"
              pattern="[A-Z]{3}"
              maxLength={3}
              defaultValue={stay?.currency ?? "ARS"}
              list="journey-currencies"
            />
          </label>
        </div>
        <p className="muted">
          El precio no se descuenta del saldo. Registren los pagos en Dinero.
        </p>
        <label>
          Dónde lo consiguieron
          <input
            name="source"
            maxLength={300}
            defaultValue={stay?.source ?? ""}
            placeholder="Booking, recomendación…"
          />
        </label>
        <label>
          Enlace de reserva
          <input
            name="bookingUrl"
            type="url"
            maxLength={1000}
            defaultValue={stay?.bookingUrl ?? ""}
          />
        </label>
        <label>
          Google Maps
          <input
            name="mapsUrl"
            type="url"
            maxLength={1000}
            defaultValue={stay?.mapsUrl ?? ""}
          />
        </label>
        <FormError error={save.error} />
        <Button disabled={save.isPending}>
          {save.isPending ? "Guardando…" : "Guardar alojamiento"}
        </Button>
      </form>
    </Modal>
  );
}
export function MovementEditor({
  detail,
  movement,
  initialPointId,
  initialStageId,
  onClose,
}: {
  detail: Detail;
  movement?: Movement;
  initialPointId?: string;
  initialStageId?: string;
  onClose: () => void;
}) {
  const refresh = useJourneyRefresh(detail.trip.id);
  const initialPoint = detail.points.find((p) => p.id === initialPointId);
  const [stageId, setStageId] = useState(
    movement?.stageId ?? initialPoint?.stageId ?? initialStageId ?? (detail.trip.stages.length === 1 ? detail.trip.stages[0].id : ""),
  );
  const [pointId, setPointId] = useState(
    movement?.pointId ?? initialPointId ?? "",
  );
  const [stayId, setStayId] = useState(movement?.stayId ?? "");
  const save = useMutation({
    mutationFn: (form: FormData) =>
      saveResource<Movement>(
        detail.trip.id,
        "movements",
        {
          stageId: stageId || null,
          pointId: pointId || null,
          stayId: stayId || null,
          kind: text(form, "kind") as Movement["kind"],
          description: text(form, "description")!,
          amount: normalizeAmountInput(text(form, "amount") ?? ""),
          currency: text(form, "currency")!,
          occurredOn: text(form, "occurredOn")!,
        },
        movement?.id,
      ),
    onSuccess: async () => {
      await refresh();
      showNotice("Movimiento guardado.");
      onClose();
    },
  });
  return (
    <Modal
      className="journey-modal"
      onClose={onClose}
      size="wide"
      confirmDiscard
      pending={save.isPending}
      title="Movimiento de dinero"
    >
      <form
        className="journey-form"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(new FormData(e.currentTarget));
        }}
      >
        <h2>{movement ? "Editar movimiento" : "Registrar dinero"}</h2>
        <label>
          Tipo
          <select name="kind" defaultValue={movement?.kind ?? "EXPENSE"}>
            <option value="EXPENSE">Gasto</option>
            <option value="FUNDS">Dinero llevado o agregado</option>
            <option value="REFUND">Reintegro</option>
          </select>
        </label>
        <label>
          Descripción
          <input
            name="description"
            required
            maxLength={160}
            defaultValue={movement?.description}
          />
        </label>
        <div className="form-columns">
          <label>
            Importe
            <input
              name="amount"
              type="text"
              inputMode="decimal"
              required
              min="0.0001"
              max="99999999999999.9999"
              step="0.0001"
              defaultValue={movement?.amount == null ? "" : formatAmountInput(String(movement.amount))}
              onBlur={(e) => { e.currentTarget.value = formatAmountInput(e.currentTarget.value); }}
            />
          </label>
          <label>
            Moneda
            <input
              name="currency"
              required
              pattern="[A-Z]{3}"
              maxLength={3}
              list="journey-currencies"
              defaultValue={movement?.currency ?? "ARS"}
            />
          </label>
        </div>
        <label>
          Fecha del movimiento
          <input
            name="occurredOn"
            required
            type="date"
            defaultValue={movement?.occurredOn ?? today()}
          />
        </label>
        <StageSelect
          detail={detail}
          value={stageId}
          optional
          onChange={(v) => {
            setStageId(v);
            setPointId("");
            setStayId("");
          }}
        />
        <div className="form-columns">
          <label>
            Actividad
            <select
              value={pointId}
              onChange={(e) => {
                const point = detail.points.find(
                  (p) => p.id === e.target.value,
                );
                setPointId(e.target.value);
                if (point) setStageId(point.stageId);
              }}
            >
              <option value="">Sin actividad</option>
              {detail.points
                .filter((p) => !stageId || p.stageId === stageId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Alojamiento
            <select
              value={stayId}
              onChange={(e) => {
                const stay = detail.stays.find((s) => s.id === e.target.value);
                setStayId(e.target.value);
                if (stay) setStageId(stay.stageId);
              }}
            >
              <option value="">Sin alojamiento</option>
              {detail.stays
                .filter((s) => !stageId || s.stageId === stageId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <FormError error={save.error} />
        <Button disabled={save.isPending}>
          {save.isPending ? "Guardando…" : "Guardar movimiento"}
        </Button>
      </form>
    </Modal>
  );
}
export function ReviewEditor({
  detail,
  stayId,
  onClose,
}: {
  detail: Detail;
  stayId?: string;
  onClose: () => void;
}) {
  const refresh = useJourneyRefresh(detail.trip.id);
  const own: Review | undefined = detail.reviews.find(
    (r) =>
      r.author === session.get()?.username && r.stayId === (stayId ?? null),
  );
  const [rating, setRating] = useState(own?.rating ?? 0);
  const [comment, setComment] = useState(own?.comment ?? "");
  const save = useMutation({
    mutationFn: () => saveReview(detail.trip.id, rating, comment, stayId),
    onSuccess: async () => {
      await refresh();
      showNotice("Reseña guardada.");
      onClose();
    },
  });
  return (
    <Modal
      className="journey-modal"
      onClose={onClose}
      confirmDiscard
      pending={save.isPending}
      title={stayId ? "Reseñar alojamiento" : "Reseñar viaje"}
    >
      <form
        className="journey-form"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <h2>
          {stayId ? "¿Cómo estuvo la estadía?" : "¿Cómo estuvo el viaje?"}
        </h2>
        <StarRating
          label="Puntuación"
          value={rating || undefined}
          onChange={setRating}
        />
        <label>
          Su recuerdo
          <textarea
            value={comment}
            maxLength={2000}
            onChange={(e) => setComment(e.target.value)}
          />
        </label>
        <FormError error={save.error} />
        <Button disabled={save.isPending || !rating}>
          {save.isPending ? "Guardando…" : "Guardar mi reseña"}
        </Button>
      </form>
    </Modal>
  );
}

export function JourneyDateEditor({
  detail,
  onClose,
}: {
  detail: Detail;
  onClose: () => void;
}) {
  const refresh = useJourneyRefresh(detail.trip.id);
  const templates = useQuery({
    queryKey: ["special-dates"],
    queryFn: getSpecialDates,
  });
  const [stageId, setStageId] = useState(detail.trip.stages[0].id);
  const [dateId, setDateId] = useState("");
  const stage = detail.trip.stages.find((s) => s.id === stageId)!;
  const save = useMutation({
    mutationFn: (form: FormData) =>
      linkDate(detail.trip.id, {
        stageId,
        date: String(form.get("date")),
        specialDateId: dateId ? Number(dateId) : undefined,
        label: dateId ? undefined : String(form.get("label")),
      }),
    onSuccess: async () => {
      await refresh();
      onClose();
    },
  });
  return (
    <Modal
      className="journey-modal"
      title="Vincular fecha importante"
      onClose={onClose}
      pending={save.isPending}
      confirmDiscard
    >
      <form
        className="journey-form"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(new FormData(e.currentTarget));
        }}
      >
        <h2>Una fecha para recordar</h2>
        <p className="muted">
          Quedará en WhenDates y en este viaje, aunque todavía no hayan
          registrado experiencias.
        </p>
        <StageSelect detail={detail} value={stageId} onChange={setStageId} />
        <label>
          Fecha importante
          <select value={dateId} onChange={(e) => setDateId(e.target.value)}>
            <option value="">Crear una fecha única</option>
            {templates.data?.map((d) => (
              <option value={d.id} key={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        {!dateId && (
          <label>
            Nombre
            <input
              name="label"
              required
              maxLength={160}
              placeholder="Nuestro aniversario en viaje"
            />
          </label>
        )}
        <label>
          Día
          <input
            name="date"
            type="date"
            required
            min={stage.startsOn}
            max={stage.endsOn}
            defaultValue={stage.startsOn}
            key={stageId}
          />
        </label>
        <FormError error={save.error ?? templates.error} />
        <Button disabled={save.isPending}>Vincular fecha</Button>
      </form>
    </Modal>
  );
}
