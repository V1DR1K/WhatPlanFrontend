import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createItem, deleteItem, renameItem, uploadPhoto } from "./items";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import type { Item } from "../../types/domain";

export function ItemForm({ placeId, visitId, onClose, item }: { placeId: number; visitId: number; onClose: () => void; item?: Item }) {
  const [file, setFile] = useState<File>();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const queryClient = useQueryClient();
  const invalidate = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["visit", visitId] }),
    queryClient.invalidateQueries({ queryKey: ["visits", placeId] }),
    queryClient.invalidateQueries({ queryKey: ["place", placeId] }),
  ]);
  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      const name = String(form.get("name"));
      const saved = item
        ? await renameItem(item.id, name)
        : await createItem(visitId, { name });
      return file ? uploadPhoto(saved.id, file) : saved;
    },
    onSuccess: async () => { await invalidate(); onClose(); },
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteItem(item!.id),
    onSuccess: async () => { await invalidate(); onClose(); },
  });
  const photo = file ? URL.createObjectURL(file) : (item?.thumbnailUrl ?? item?.photoUrl);

  if (confirmingDelete && item) return <ConfirmDialog title="¿Borrar este ítem?" message="Dejará de mostrarse en esta visita." confirmLabel="Borrar ítem" pending={deleteMutation.isPending} onClose={() => setConfirmingDelete(false)} onConfirm={() => deleteMutation.mutate()} />;

  return <Modal onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); mutation.mutate(new FormData(event.currentTarget)); }}><p className="eyebrow">{item ? "EDITAR ÍTEM COMPARTIDO" : "NUEVO ÍTEM"}</p><h2>{item ? "Ajustá el plato" : "¿Qué pidieron?"}</h2><label>Ítem<input name="name" required autoFocus defaultValue={item?.name} placeholder="Ej. Doble cheddar" /></label><label>Foto de la comida<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0])} /></label>{photo && <img className="form-photo-preview" src={photo} alt="Vista previa de la foto" />}<small className="tiny">{item?.photoUrl && !file ? "La foto actual se conservará si no elegís otra." : ""}</small><button className="main-button" disabled={mutation.isPending || deleteMutation.isPending}>{mutation.isPending ? "Guardando…" : "Guardar cambios"} ✦</button>{item && <button className="danger-button" type="button" disabled={mutation.isPending || deleteMutation.isPending} onClick={() => setConfirmingDelete(true)}>{deleteMutation.isPending ? "Borrando…" : "Borrar ítem"}</button>}{(mutation.error || deleteMutation.error) && <p className="form-error">{(mutation.error || deleteMutation.error)!.message}</p>}</form></Modal>;
}
