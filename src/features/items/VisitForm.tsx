import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { showNotice } from "../../lib/flash";
import type { PlaceVisitSummary } from "../../types/domain";
import { createVisit, deleteVisit, updateVisit } from "./items";
import { Modal } from "../../components/ui/Modal";

const today = () => new Date().toLocaleDateString("sv-SE");

export function VisitForm({ placeId, visit, onClose, onSaved, onDeleted }: { placeId: number; visit?: PlaceVisitSummary; onClose: () => void; onSaved: (visit: PlaceVisitSummary) => void; onDeleted?: () => void }) {
  const [visitedOn, setVisitedOn] = useState(visit?.visitedOn ?? today());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const queryClient = useQueryClient();
  const invalidate = (visitId?: number) => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["visits", placeId] }),
    queryClient.invalidateQueries({ queryKey: ["place", placeId] }),
    ...(visitId ? [queryClient.removeQueries({ queryKey: ["visit", visitId] })] : []),
  ]);
  const mutation = useMutation({
    mutationFn: () => visit ? updateVisit(visit.id, visitedOn) : createVisit(placeId, visitedOn),
    onSuccess: async saved => {
      await invalidate(visit?.id);
      onSaved(saved);
      showNotice(visit ? "Actualizamos la fecha de la visita." : "Visita registrada. Ahora podés sumar los ítems que pidieron.");
      onClose();
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteVisit(visit!.id),
    onSuccess: async () => {
      await invalidate(visit!.id);
      showNotice("Eliminamos la visita y sus ítems asociados.");
      onDeleted?.();
      onClose();
    },
  });

  if (confirmingDelete && visit) return <ConfirmDialog title="¿Borrar esta visita?" message="También se eliminarán los ítems y reseñas cargados en esta fecha." confirmLabel="Borrar visita" pending={remove.isPending} onClose={() => setConfirmingDelete(false)} onConfirm={() => remove.mutate()} />;

  return <Modal onClose={onClose} confirmDiscard pending={mutation.isPending || remove.isPending}><form onSubmit={event => { event.preventDefault(); mutation.mutate(); }}><p className="eyebrow">{visit ? "EDITAR VISITA" : "NUEVA VISITA"}</p><h2>{visit ? "¿Qué día fueron?" : "Registren la visita"}</h2><p className="muted">La visita se guarda por separado. Después pueden añadir todos los ítems que pidieron.</p><label>Fecha de visita<input type="date" required max={today()} value={visitedOn} onChange={event => setVisitedOn(event.target.value)} /></label><button className="action-button" disabled={mutation.isPending || remove.isPending}>{mutation.isPending ? "Guardando…" : visit ? "Guardar visita" : "Registrar visita"} 🍽️</button>{visit && <button className="action-button action-button--delete" type="button" disabled={mutation.isPending || remove.isPending} onClick={() => setConfirmingDelete(true)}>Borrar visita</button>}{(mutation.error || remove.error) && <p className="form-error">{(mutation.error || remove.error)!.message}</p>}</form></Modal>;
}
