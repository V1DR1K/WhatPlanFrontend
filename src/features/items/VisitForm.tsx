import { LocationFields, useExperienceDraft } from '../journey/LocationFields';
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { showNotice } from "../../lib/flash";
import type { PlaceVisitSummary } from "../../types/domain";
import { createVisit, deleteVisit, updateVisit } from "./items";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";

const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());

export function VisitForm({ placeId, physicalCity, visit, onClose, onSaved, onDeleted }: { placeId: number; physicalCity?:number; visit?: PlaceVisitSummary; onClose: () => void; onSaved: (visit: PlaceVisitSummary) => void; onDeleted?: () => void }) {
  const location = useExperienceDraft("FOOD", placeId, visit?.id, physicalCity);
  const [visitedOn, setVisitedOn] = useState(visit?.visitedOn ?? new URLSearchParams(window.location.search).get("journeyDate") ?? today());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const queryClient = useQueryClient();
  const invalidate = (visitId?: number) => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["places"] }),
    queryClient.invalidateQueries({ queryKey: ["visits", placeId] }),
    queryClient.invalidateQueries({ queryKey: ["place", placeId] }),
    ...(visitId ? [queryClient.removeQueries({ queryKey: ["visit", visitId] })] : []),
  ]);
  const mutation = useMutation({
    mutationFn: () => visit ? updateVisit(visit.id, visitedOn, location.binding) : createVisit(placeId, visitedOn, location.binding),
    onSuccess: async saved => {
      await Promise.all([queryClient.invalidateQueries({queryKey:["journey"]}),queryClient.invalidateQueries({queryKey:["when-dates"]}),queryClient.invalidateQueries({queryKey:["experience-location"]})]);
      await queryClient.invalidateQueries({ queryKey: ["journey-day"] });
      await invalidate(visit?.id);
      onSaved(saved);
      showNotice(visit ? "Actualizamos la fecha de la visita." : "Visita registrada. Ahora pueden sumar fotos y reseñas.");
      onClose();
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteVisit(visit!.id),
    onSuccess: async () => {
      await invalidate(visit!.id);
      await queryClient.invalidateQueries({ queryKey: ["journey-day"] });
      showNotice("Eliminamos la visita, sus fotos y sus reseñas.");
      onDeleted?.();
      onClose();
    },
  });

  if (confirmingDelete && visit) return <ConfirmDialog title="¿Borrar esta visita?" message="También se eliminarán las fotos y reseñas cargadas en esta fecha." confirmLabel="Borrar visita" pending={remove.isPending} onClose={() => setConfirmingDelete(false)} onConfirm={() => remove.mutate()} />;

  return <Modal size="compact" onClose={onClose} confirmDiscard pending={mutation.isPending || remove.isPending}>
    <form onSubmit={event => { event.preventDefault(); mutation.mutate(); }}>
      <p className="eyebrow">{visit ? "EDITAR VISITA" : "NUEVA VISITA"}</p>
      <h2>{visit ? "¿Qué día fueron?" : "Registren la visita"}</h2>
      <p className="muted">Las fotos y reseñas quedan guardadas en esta fecha.</p>
      <LocationFields cityId={location.cityId} stageId={location.stageId} physicalCity={physicalCity} disabled={location.loading} onChange={(city, stage) => { location.setCityId(city); location.setStageId(stage); }} />
      {location.error && <p className="form-error" role="alert">{location.error.message}</p>}
      <label>Fecha de visita<input type="date" required max={today()} value={visitedOn} onChange={event => setVisitedOn(event.target.value)} /></label>
      <div className="modal-form__actions">
        {visit && <Button variant="destructive" icon="🗑️" type="button" disabled={location.loading || !!location.error || mutation.isPending || remove.isPending} onClick={() => setConfirmingDelete(true)}>Borrar visita</Button>}
        <Button icon={visit ? "💾" : "📅"} disabled={location.loading || !!location.error || mutation.isPending || remove.isPending}>{mutation.isPending ? "Guardando…" : visit ? "Guardar visita" : "Registrar visita"}</Button>
      </div>
      {(mutation.error || remove.error) && <p className="form-error" role="alert">{(mutation.error || remove.error)!.message}</p>}
    </form>
  </Modal>;
}
