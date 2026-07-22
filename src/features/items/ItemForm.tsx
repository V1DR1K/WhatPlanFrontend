import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { mediaUrl } from "../../lib/api";
import { showNotice } from "../../lib/flash";
import { photoInputAccept, preparePhoto } from "../../lib/photos";
import type { Item } from "../../types/domain";
import { createItem, deleteItem, renameItem, uploadPhoto } from "./items";
import { Modal } from "../../components/ui/Modal";

export function ItemForm({ placeId, visitId, onClose, item }: { placeId: number; visitId: number; onClose: () => void; item?: Item }) {
  const [file, setFile] = useState<File>();
  const [photoError, setPhotoError] = useState<string>();
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
      const saved = item ? await renameItem(item.id, name) : await createItem(visitId, { name });
      try {
        return { saved: file ? await uploadPhoto(saved.id, file) : saved };
      } catch (error) {
        return { saved, photoError: error instanceof Error ? error.message : "No pudimos subir la foto" };
      }
    },
    onSuccess: async ({ photoError: uploadError }) => {
      await invalidate();
      showNotice(uploadError ? `Guardamos el ítem, pero la foto no se subió: ${uploadError}` : item ? "Actualizamos el ítem." : "Ítem agregado a esta visita.", uploadError ? "error" : "success");
      onClose();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteItem(item!.id),
    onSuccess: async () => { await invalidate(); showNotice("Eliminamos el ítem."); onClose(); },
  });
  const photo = file ? URL.createObjectURL(file) : item?.thumbnailUrl ?? item?.photoUrl;
  const preview = photo && (file ? photo : mediaUrl(photo));

  if (confirmingDelete && item) return <ConfirmDialog title="¿Borrar este ítem?" message="Dejará de mostrarse en esta visita." confirmLabel="Borrar ítem" pending={deleteMutation.isPending} onClose={() => setConfirmingDelete(false)} onConfirm={() => deleteMutation.mutate()} />;

  return <Modal onClose={onClose} confirmDiscard pending={mutation.isPending || deleteMutation.isPending}><form onSubmit={(event) => { event.preventDefault(); mutation.mutate(new FormData(event.currentTarget)); }}><p className="eyebrow">{item ? "EDITAR ÍTEM" : "NUEVO ÍTEM"}</p><h2>{item ? "Ajustá el plato" : "¿Qué pidieron?"}</h2><label>Ítem<input name="name" required autoFocus defaultValue={item?.name} placeholder="Ej. Doble cheddar" /></label><label>Foto de la comida <small className="tiny">JPG, PNG, WebP o HEIC · hasta 10 MB</small><input type="file" accept={photoInputAccept} onChange={async event => { const selected = event.target.files?.[0]; setPhotoError(undefined); if (!selected) return setFile(undefined); try { setFile(await preparePhoto(selected)); } catch (error) { setFile(undefined); setPhotoError(error instanceof Error ? error.message : "No pudimos preparar la foto"); event.currentTarget.value = ""; } }} /></label>{photoError && <p className="form-error">{photoError}</p>}{preview && <img className="form-photo-preview" src={preview} alt="Vista previa de la foto" />}<small className="tiny">{item?.photoUrl && !file ? "La foto actual se conservará si no elegís otra." : ""}</small><button className="main-button" disabled={mutation.isPending || deleteMutation.isPending || Boolean(photoError)}>{mutation.isPending ? "Guardando…" : "Guardar cambios"} ✦</button>{item && <button className="danger-button" type="button" disabled={mutation.isPending || deleteMutation.isPending} onClick={() => setConfirmingDelete(true)}>{deleteMutation.isPending ? "Borrando…" : "Borrar ítem"}</button>}{(mutation.error || deleteMutation.error) && <p className="form-error">{(mutation.error || deleteMutation.error)!.message}</p>}</form></Modal>;
}
