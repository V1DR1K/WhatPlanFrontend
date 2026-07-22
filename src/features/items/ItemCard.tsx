import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Item } from "../../types/domain";
import { deleteItem } from "./items";
import { AdaptivePhoto } from "../../components/ui/AdaptivePhoto";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { StarRating } from "../../components/ui/StarRating";
import { showNotice } from "../../lib/flash";
import { session } from "../../lib/api";

export function ItemCard({ item, username, onEditItem, onEditReview }: { item: Item; username?: string; onEditItem: (item: Item) => void; onEditReview: (item: Item) => void }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => deleteItem(item.id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["places"] }),
        queryClient.invalidateQueries({ queryKey: ["visit"] }),
        queryClient.invalidateQueries({ queryKey: ["visits"] }),
        queryClient.invalidateQueries({ queryKey: ["place"] }),
      ]);
      showNotice("Eliminamos el ítem.");
    },
  });
  const hasPhoto = item.photoUrl ?? item.thumbnailUrl;
  const ownReview = item.reviews.find((review) => review.author === username);
  const canManageItem = session.get()?.role === "ADMIN" || item.createdBy === username;

  if (confirmingDelete) return <ConfirmDialog title="¿Borrar este ítem?" message={remove.error ? remove.error.message : "Dejará de mostrarse en esta visita."} confirmLabel="Borrar ítem" pending={remove.isPending} onClose={() => setConfirmingDelete(false)} onConfirm={() => remove.mutate()} />;

  return <article className="item-card">{hasPhoto && <AdaptivePhoto alt={`Foto de ${item.name}`} context="item" fullSrc={item.photoUrl} height={item.photoHeight} thumbnailSrc={item.thumbnailUrl} width={item.photoWidth} />}<div><div className="item-card-heading"><div><h3>{item.name}</h3><p className="byline">Agregado por {item.createdBy}</p></div><div className="item-card-actions">{canManageItem && <><button className="icon-edit" type="button" onClick={() => onEditItem(item)} aria-label={`Editar ${item.name}`}>✎</button><button className="icon-edit item-delete-button" type="button" onClick={() => setConfirmingDelete(true)} aria-label={`Borrar ${item.name}`}>×</button></>}<button className="secondary-button" type="button" onClick={() => onEditReview(item)}>{ownReview ? "Editar mi reseña" : "Escribir mi reseña"}</button></div></div><div className="item-review-columns">{item.reviews.map((review) => <section className="item-review" key={review.author}><h4>{review.author === username ? "Tu reseña" : `Reseña de ${review.author}`}</h4>{review.comment && <p>{review.comment}</p>}<div className="item-scores"><span>Sabor <StarRating label={`Sabor de ${review.author}`} value={review.taste} /></span><span>Precio <StarRating label={`Precio de ${review.author}`} value={review.price} /></span></div></section>)}</div></div></article>;
}
