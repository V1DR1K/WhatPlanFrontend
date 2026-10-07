import { CatalogFilterChips } from "./CatalogFilterChips";
import type { ReviewStatusFilter } from "../../lib/reviewStatus";

export function CatalogReviewFilter({
  value,
  onChange,
}: {
  value: ReviewStatusFilter;
  onChange: (value: ReviewStatusFilter) => void;
}) {
  return (
    <CatalogFilterChips
      allLabel="Todos"
      label="Reseñas"
      options={[
        { id: "REVIEWED", label: "Con reseña" },
        { id: "UNREVIEWED", label: "Sin reseña" },
      ]}
      value={value === "ALL" ? undefined : value}
      onChange={(selected) => onChange(selected === "REVIEWED" || selected === "UNREVIEWED" ? selected : "ALL")}
    />
  );
}
