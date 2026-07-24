import { useEffect, useState } from 'react';

export function useIncrementalLimit(pageSize: number, resetKey: string) {
  const [limit, setLimit] = useState(pageSize);
  useEffect(() => setLimit(pageSize), [pageSize, resetKey]);
  return [limit, () => setLimit((current) => current + pageSize)] as const;
}

export function CatalogMoreButton({ loading = false, onClick }: { loading?: boolean; onClick: () => void }) {
  return <button className="catalog-section-more" disabled={loading} onClick={onClick} type="button">{loading ? 'Cargando…' : '✨ Ver más'}</button>;
}
