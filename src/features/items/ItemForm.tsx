import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteItem, saveItem, uploadPhoto } from "./items";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { StarRating } from "../../components/ui/StarRating";
import type { Item } from "../../types/domain";
export function ItemForm({
  placeId,
  onClose,
  item,
}: {
  placeId: number;
  onClose: () => void;
  item?: Item;
}) {
  const [scores, setScores] = useState({
    taste: item?.taste ?? 4,
    price: item?.price ?? 4,
  });
  const [file, setFile] = useState<File>();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const qc = useQueryClient();
  const invalidateItems = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["items", placeId] }),
      qc.invalidateQueries({ queryKey: ["item-dates", placeId] }),
      qc.invalidateQueries({ queryKey: ["place", placeId] }),
    ]);
  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      const saved = await saveItem(
        placeId,
        {
          name: String(form.get("name")),
          comment: String(form.get("comment")) || undefined,
          ...scores,
          visitDate: String(form.get("visitDate")),
        },
        item?.id,
      );
      return file ? uploadPhoto(saved.id, file) : saved;
    },
    onSuccess: async () => {
      await invalidateItems();
      onClose();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteItem(item!.id),
    onSuccess: async () => {
      await invalidateItems();
      onClose();
    },
  });
  const photo = file
    ? URL.createObjectURL(file)
    : (item?.thumbnailUrl ?? item?.photoUrl);
  if (confirmingDelete && item) return <ConfirmDialog title="¿Borrar este ítem?" message="Dejará de mostrarse en esta visita." confirmLabel="Borrar ítem" pending={deleteMutation.isPending} onClose={() => setConfirmingDelete(false)} onConfirm={() => deleteMutation.mutate()} />;
  return (
    <Modal onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(new FormData(e.currentTarget));
        }}
      >
        <p className="eyebrow">{item ? "EDITAR ÍTEM" : "NUEVA VISITA"}</p>
        <h2>{item ? "Ajustá tu reseña" : "¿Qué pediste?"}</h2>
        <label>
          Ítem
          <input
            name="name"
            required
            autoFocus
            defaultValue={item?.name}
            placeholder="Ej. Doble cheddar"
          />
        </label>
        <label>
          Comentario
          <textarea
            name="comment"
            defaultValue={item?.comment}
            placeholder="Tu observación honesta…"
          />
        </label>
        <label>
          Fecha de visita
          <input
            name="visitDate"
            type="date"
            required
            defaultValue={item?.visitDate ?? new Date().toLocaleDateString("sv-SE")}
          />
        </label>
        <div className="score-grid">
          {(["taste", "price"] as const).map((key) => (
            <label className="score-field" key={key}>
              {key === "taste" ? "😋 Sabor" : "💸 Precio"}
              <StarRating
                label={key}
                value={scores[key]}
                onChange={(value) => setScores({ ...scores, [key]: value })}
              />
            </label>
          ))}
        </div>
        <label>
          Foto de la comida
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0])}
          />
        </label>
        {photo && (
          <img
            className="form-photo-preview"
            src={photo}
            alt="Vista previa de la foto"
          />
        )}
        <small className="tiny">
          {item?.photoUrl && !file
            ? "La foto actual se conservará si no elegís otra."
            : ""}
        </small>
        <button className="main-button" disabled={mutation.isPending || deleteMutation.isPending}>
          {mutation.isPending
            ? "Guardando…"
            : item
              ? "Guardar cambios"
              : "Guardar reseña"}{" "}
          ✦
        </button>
        {item && (
          <button
            className="danger-button"
            type="button"
            disabled={mutation.isPending || deleteMutation.isPending}
            onClick={() => setConfirmingDelete(true)}
          >
            {deleteMutation.isPending ? "Borrando…" : "Borrar ítem"}
          </button>
        )}
        {(mutation.error || deleteMutation.error) && (
          <p className="form-error">{(mutation.error || deleteMutation.error)!.message}</p>
        )}
      </form>
    </Modal>
  );
}
