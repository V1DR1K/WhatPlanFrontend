export type CatalogSort =
  | "rating-desc"
  | "rating-asc"
  | "date-desc"
  | "date-asc";

export type CatalogSortValue = CatalogSort | "";

export const catalogSortOptions: ReadonlyArray<{
  value: CatalogSortValue;
  label: string;
}> = [
  { value: "", label: "Última modificación primero" },
  { value: "rating-desc", label: "Mejor puntuación" },
  { value: "rating-asc", label: "Menor puntuación" },
  { value: "date-desc", label: "Modificados recientemente" },
  { value: "date-asc", label: "Modificados hace más tiempo" },
];

export function catalogSortFromQuery(value: string | null): CatalogSortValue {
  return catalogSortOptions.some((option) => option.value === value)
    ? (value as CatalogSortValue)
    : "";
}
