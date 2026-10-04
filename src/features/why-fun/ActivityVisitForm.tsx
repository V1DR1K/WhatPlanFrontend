import { LocationFields, useExperienceDraft } from '../journey/LocationFields';
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { showNotice } from "../../lib/flash";
import type { Activity, ActivityVisit } from "../../types/domain";
import { createActivityVisit, deleteActivityVisit, updateActivityVisit } from "./whyFun";

const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());

export function ActivityVisitForm({ activity, visit, onClose, onSaved }: { activity: Activity; visit?: ActivityVisit; onClose: () => void; onSaved: (visit: ActivityVisit) => void }) {
  const location = useExperienceDraft("FUN", activity.id, visit?.id, activity.zoneId);
  const qc = useQueryClient();
  const [scheduledAt, setScheduledAt] = useState(visit?.scheduledAt ?? new URLSearchParams(window.location.search).get("journeyDate") ?? today());
  const [confirming, setConfirming] = useState(false);
  const invalidate = () => Promise.all([qc.invalidateQueries({ queryKey: ["activity", activity.id] }), qc.invalidateQueries({ queryKey: ["activity-visits", activity.id] }), qc.invalidateQueries({ queryKey: ["activities"] }), qc.invalidateQueries({ queryKey: ["journey-day"] })]);
  const mutation = useMutation({ mutationFn: () => visit ? updateActivityVisit(visit.id, { scheduledAt, ...location.binding }) : createActivityVisit(activity.id, { scheduledAt, ...location.binding }), onSuccess: async (saved) => { await Promise.all([qc.invalidateQueries({queryKey:["journey"]}),qc.invalidateQueries({queryKey:["when-dates"]}),qc.invalidateQueries({queryKey:["experience-location"]})]); await invalidate(); showNotice(visit ? "Actualizamos la fecha de la salida." : "Salida registrada. Ya pueden sumar fotos y reseñas."); onSaved(saved); onClose(); } });
  const remove = useMutation({ mutationFn: () => deleteActivityVisit(visit!.id), onSuccess: async () => { await invalidate(); showNotice("Eliminamos la salida."); onClose(); } });
  if (confirming && visit) return <ConfirmDialog title="¿Borrar esta salida?" message="También se eliminarán sus fotos y reseñas." confirmLabel="Borrar salida" pending={remove.isPending} onClose={() => setConfirming(false)} onConfirm={() => remove.mutate()} />;
  return <Modal size="compact" onClose={onClose} confirmDiscard pending={mutation.isPending || remove.isPending}><form onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}><p className="eyebrow">{visit ? "EDITAR SALIDA" : "NUEVA SALIDA"}</p><h2>{activity.name}</h2><LocationFields cityId={location.cityId} stageId={location.stageId} physicalCity={activity.zoneId} disabled={location.loading} onChange={(city, stage) => { location.setCityId(city); location.setStageId(stage); }} />{location.error && <p className="form-error" role="alert">{location.error.message}</p>}<label>Fecha<input type="date" required value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></label><Button icon={visit ? "💾" : "📅"} disabled={location.loading || !!location.error || mutation.isPending || remove.isPending}>{mutation.isPending ? "Guardando…" : visit ? "Guardar salida" : "Registrar salida"}</Button>{visit && <Button variant="destructive" icon="🗑️" type="button" disabled={location.loading || !!location.error || mutation.isPending || remove.isPending} onClick={() => setConfirming(true)}>Borrar salida</Button>}{(mutation.error || remove.error) && <p className="form-error" role="alert">{(mutation.error || remove.error)!.message}</p>}</form></Modal>;
}
