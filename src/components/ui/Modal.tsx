import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Button } from './Button';

type ModalProps = {
  onClose: () => void;
  confirmDiscard?: boolean;
  pending?: boolean;
};

export function Modal({ children, onClose, confirmDiscard = false, pending = false }: PropsWithChildren<ModalProps>) {
  const dialog = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const requestCloseRef = useRef<() => void>(() => undefined);
  const [dirty, setDirty] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const requestClose = () => {
    if (pending) return;
    if (confirmDiscard && dirty) {
      setConfirmingDiscard(true);
      return;
    }
    onClose();
  };
  requestCloseRef.current = requestClose;

  useEffect(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestCloseRef.current();
      }
      if (event.key !== 'Tab' || !dialog.current) return;
      const focusable = [...dialog.current.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocus.current?.focus();
    };
  }, []);

  return <div className="modal-backdrop" role="presentation" onMouseDown={requestClose}>
    <section className="modal" ref={dialog} role="dialog" aria-modal="true" onMouseDown={event => event.stopPropagation()} onInputCapture={() => setDirty(true)} onChangeCapture={() => setDirty(true)}>
      <button className="close" type="button" onClick={requestClose} disabled={pending} aria-label="Cerrar">×</button>
      {children}
      {confirmingDiscard && <div className="modal-discard" role="alertdialog" aria-modal="true" aria-label="Descartar cambios">
        <div><strong>¿Descartar cambios?</strong><p>Lo que cargaste en este formulario no se guardará.</p><Button variant="secondary" type="button" onClick={() => setConfirmingDiscard(false)}>Seguir editando</Button><Button variant="destructive" icon="×" type="button" onClick={onClose}>Descartar</Button></div>
      </div>}
    </section>
  </div>;
}
