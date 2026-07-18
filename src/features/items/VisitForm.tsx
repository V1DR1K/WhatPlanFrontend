import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createItem, createVisit, updateVisit, uploadPhoto } from "./items";
import { Modal } from "../../components/ui/Modal";
import type { PlaceVisitSummary } from "../../types/domain";

export function VisitForm({ placeId, visit, onClose, onSaved }: { placeId: number; visit?: PlaceVisitSummary; onClose: () => void; onSaved: (visit: PlaceVisitSummary) => void }) {
  const [visitedOn, setVisitedOn] = useState(visit?.visitedOn ?? new Date().toLocaleDateString("sv-SE"));
  const [file, setFile] = useState<File>();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      if (visit) return updateVisit(visit.id, visitedOn);
      const savedVisit = await createVisit(placeId, visitedOn);
      const item = await createItem(savedVisit.id, { name: String(form.get("name")) });
      if (file) await uploadPhoto(item.id, file);
      return savedVisit;
    },
    onSuccess: async (saved) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["visits", placeId] }),
        queryClient.invalidateQueries({ queryKey: ["visit", saved.id] }),
        queryClient.invalidateQueries({ queryKey: ["place", placeId] }),
      ]);
      onSaved(saved);
      onClose();
    },
  });
  const preview = file && URL.createObjectURL(file);
  return <Modal onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); mutation.mutate(new FormData(event.currentTarget)); }}><p className="eyebrow">{visit ? "EDITAR VISITA" : "NUEVA VISITA"}</p><h2>{visit ? "¿Cuándo fueron?" : "¿Qué pidieron?"}</h2><label>Fecha de visita<input type="date" required value={visitedOn} onChange={(event) => setVisitedOn(event.target.value)} /></label>{!visit && <><label>Ítem<input name="name" required autoFocus placeholder="Ej. Doble cheddar" /></label><label>Foto de la comida<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0])} /></label>{preview && <img className="form-photo-preview" src={preview} alt="Vista previa de la foto" />}</>}<button className="main-button" disabled={mutation.isPending}>{mutation.isPending ? "Guardando…" : visit ? "Guardar fecha" : "Guardar visita"} ✦</button>{mutation.error && <p className="form-error">{mutation.error.message}</p>}</form></Modal>;
}
