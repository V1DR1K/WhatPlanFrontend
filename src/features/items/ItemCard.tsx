import type { Item } from "../../types/domain";
import { AdaptivePhoto } from "../../components/ui/AdaptivePhoto";
import { StarRating } from "../../components/ui/StarRating";

export function ItemCard({
  item,
  onEdit,
  canEdit,
}: {
  item: Item;
  onEdit: (item: Item) => void;
  canEdit: boolean;
}) {
  const photoUrl = item.photoUrl ?? item.thumbnailUrl;

  const reviews = item.reviews?.length ? item.reviews : [{ author: item.author, comment: item.comment, taste: item.taste, price: item.price }];
  return (
    <article className="item-card">
      {photoUrl && (
        <AdaptivePhoto
          alt={`Foto de ${item.name}`}
          context="item"
          height={item.photoHeight}
          src={photoUrl}
          width={item.photoWidth}
        />
      )}
      <div>
        <div className="item-card-heading">
          <div>
            <h3>{item.name}</h3>
            <p className="byline">{reviews.length} {reviews.length === 1 ? 'reseña' : 'reseñas'} compartidas</p>
          </div>
          {canEdit && (
            <button
              className="icon-edit"
              onClick={() => onEdit(item)}
              aria-label={`Editar ${item.name}`}
            >
              ✎
            </button>
          )}
        </div>
        {reviews.map(review => <div className="item-review" key={review.author}>
          <p className="byline">Reseña de {review.author}</p>
          {review.comment && <p>{review.comment}</p>}
          <div className="item-scores">
            <span>Sabor <StarRating label={`Sabor de ${review.author}`} value={review.taste} /></span>
            <span>Precio <StarRating label={`Precio de ${review.author}`} value={review.price} /></span>
          </div>
        </div>)}
      </div>
    </article>
  );
}
