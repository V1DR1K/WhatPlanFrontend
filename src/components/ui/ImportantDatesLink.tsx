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
  const href = match && date
    ? `/app/when-dates/${match.id}/${date}`
    : "/app/when-dates";

  return (
    <Link className="button button--secondary important-dates-link" to={href}>
      <span aria-hidden="true">💖✨</span> Fechas importantes
    </Link>
  );
}
