import { Link } from "react-router-dom";
import type { SpecialDate } from "../../types/domain";
import { matchingSpecialDates } from "../../features/special-dates/SpecialDateLabels";

type ImportantDatesLinkProps = {
  date?: string;
  specialDates?: SpecialDate[];
  specialDateId?: number;
};

export function ImportantDatesLink({ date, specialDates = [], specialDateId }: ImportantDatesLinkProps) {
  const match = specialDateId
    ? { id: specialDateId }
    : matchingSpecialDates(date, specialDates)[0];

  if (!match || !date) return null;

  const href = `/app/when-dates/${match.id}/${date}`;

  return (
    <Link className="button button--secondary important-dates-link" to={href}>
      <span aria-hidden="true">💖✨</span> Fechas importantes
    </Link>
  );
}
