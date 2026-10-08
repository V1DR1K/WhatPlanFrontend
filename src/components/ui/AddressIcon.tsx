export function AddressIcon({ className }: { className?: string }) {
  return <span className={['address-icon', className].filter(Boolean).join(' ')} aria-hidden="true">🗺️</span>;
}
