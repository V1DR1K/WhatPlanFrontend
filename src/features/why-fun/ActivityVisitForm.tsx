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
  const qc = useQueryClient();
  const [scheduledAt, setScheduledAt] = useState(visit?.scheduledAt ?? today());
  const [confirming, setConfirming] = useState(false);
  const invalidate = () => Promise.all([qc.invalidateQueries({ queryKey: ["activity", activity.id] }), qc.invalidateQueries({ queryKey: ["activity-visits", activity.id] }), qc.invalidateQueries({ queryKey: ["activities"] })]);
  const mutation = useMutation({ mutationFn: () => visit ? updateActivityVisit(visit.id, { scheduledAt }) : createActivityVisit(activity.id, { scheduledAt }), onSuccess: async (saved) => { await invalidate(); showNotice(visit ? "Actualizamos la fecha de la salida." : "Salida registrada. Ya pueden sumar fotos y reseñas."); onSaved(saved); onClose(); } });
  const remove = useMutation({ mutationFn: () => deleteActivityVisit(visit!.id), onSuccess: async () => { await invalidate(); showNotice("Eliminamos la salida."); onClose(); } });
  if (confirming && visit) return <ConfirmDialog title="¿Borrar esta salida?" message="También se eliminarán sus fotos y reseñas." confirmLabel="Borrar salida" pending={remove.isPending} onClose={() => setConfirming(false)} onConfirm={() => remove.mutate()} />;
  return <Modal onClose={onClose} confirmDiscard pending={mutation.isPending || remove.isPending}><form onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}><p className="eyebrow">{visit ? "EDITAR SALIDA" : "NUEVA SALIDA"}</p><h2>{activity.name}</h2><label>Fecha<input type="date" required value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></label><Button icon={visit ? "💾" : "📅"} disabled={mutation.isPending || remove.isPending}>{mutation.isPending ? "Guardando…" : visit ? "Guardar salida" : "Registrar salida"}</Button>{visit && <Button variant="destructive" icon="🗑️" type="button" onClick={() => setConfirming(true)}>Borrar salida</Button>}{(mutation.error || remove.error) && <p className="form-error">{(mutation.error || remove.error)!.message}</p>}</form></Modal>;
}
