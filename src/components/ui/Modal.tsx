import { useContext, useEffect, useId, useLayoutEffect, useRef, useState, type PropsWithChildren, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { SectionThemeContext, sectionThemeStyle } from '../../lib/sectionTheme';
import { useDocumentScrollLock } from '../../lib/useDocumentScrollLock';
import { Button } from './Button';

type ModalProps = {
  className?: string;
  backdropClassName?: string;
  size?: 'compact' | 'standard' | 'wide';
  describedBy?: string;
  description?: string;
  labelledBy?: string;
  onClose: () => void;
  confirmDiscard?: boolean;
  pending?: boolean;
  title?: string;
};

type ModalEntry = { dialog: HTMLElement | null };
const modalStack: ModalEntry[] = [];
export const FOCUSABLE_SELECTOR = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export function getFocusableElements(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]
    .filter((element) => element.getAttribute('aria-hidden') !== 'true');
}

export function Modal({ children, className, backdropClassName, size = 'standard', describedBy, description, labelledBy, onClose, confirmDiscard = false, pending = false, title }: PropsWithChildren<ModalProps>) {
  const dialog = useRef<HTMLElement>(null);
  const discardDialog = useRef<HTMLDivElement>(null);
  const discardReturnFocus = useRef<HTMLElement | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const requestCloseRef = useRef<() => void>(() => undefined);
  const id = useId().replace(/:/g, '');
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const [dirty, setDirty] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const confirmingDiscardRef = useRef(confirmingDiscard);
  confirmingDiscardRef.current = confirmingDiscard;
  const section = useContext(SectionThemeContext);
  useDocumentScrollLock(true);

  const requestClose = () => {
    if (pending) return;
    const shouldConfirmDiscard = confirmDiscard || Boolean(dialog.current?.querySelector('form'));
    if (shouldConfirmDiscard && dirty) {
      discardReturnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setConfirmingDiscard(true);
      return;
    }
    onClose();
  };
  requestCloseRef.current = requestClose;

  const markDirty = (event: SyntheticEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (!target.closest('form')) return;
    if (event.type === 'click') {
      const button = target.closest('button');
      if (button) {
        if (button.hasAttribute('data-modal-dirty')) setDirty(true);
        return;
      }
    }
    setDirty(true);
  };

  useLayoutEffect(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const heading = dialog.current?.querySelector<HTMLElement>('h1, h2, h3, h4, h5, h6');
    if (heading && !labelledBy) heading.id = titleId;
    const initialFocus = getFocusableElements(dialog.current!).find((element) => !element.classList.contains('close')) ?? dialog.current;
    initialFocus?.focus();
  }, [labelledBy, titleId]);

  useLayoutEffect(() => {
    if (!confirmingDiscard) {
      if (discardReturnFocus.current?.isConnected) discardReturnFocus.current.focus();
      discardReturnFocus.current = null;
      return;
    }
    if (!dialog.current) return;
    getFocusableElements(discardDialog.current ?? dialog.current)[0]?.focus();
  }, [confirmingDiscard]);

  useEffect(() => {
    const entry: ModalEntry = { dialog: dialog.current };
    modalStack.push(entry);
    const onKeyDown = (event: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== entry) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        requestCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialog.current) return;
       const focusRoot = confirmingDiscardRef.current && discardDialog.current ? discardDialog.current : dialog.current;
       const focusable = getFocusableElements(focusRoot);
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
      const index = modalStack.indexOf(entry);
      if (index >= 0) modalStack.splice(index, 1);
      if (previousFocus.current?.isConnected) previousFocus.current.focus();
    };
  }, []);

  return <>
    {createPortal(<div className={['modal-backdrop', section && `${section}-shell`, backdropClassName].filter(Boolean).join(' ')} style={section ? sectionThemeStyle(section) : undefined} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
    <section className={['modal', `modal--${size}`, className, section === 'journey' && !className?.split(/\s+/).includes('journey-modal') ? 'journey-modal' : undefined].filter(Boolean).join(' ')} ref={dialog} role="dialog" aria-modal="true" aria-hidden={confirmingDiscard} aria-labelledby={labelledBy ?? titleId} aria-describedby={describedBy ?? descriptionId} tabIndex={-1} onMouseDown={event => event.stopPropagation()} onInputCapture={markDirty} onChangeCapture={markDirty} onClickCapture={markDirty}>
      {title && <h2 id={titleId} className="sr-only">{title}</h2>}
      {!title && !labelledBy && <span id={titleId} className="sr-only">Diálogo de WhatPlan</span>}
      <span id={descriptionId} className="sr-only">{description ?? 'Contenido del diálogo.'}</span>
      <div className="modal__topbar"><Button className="close" icon="✕" type="button" variant="icon" onClick={requestClose} disabled={pending} aria-label="Cerrar" title="Cerrar" /></div>
      <div className="modal__content">{children}</div>
    </section>
    </div>, document.body)}
    {confirmingDiscard && createPortal(<div className="modal-discard-backdrop" role="presentation">
      <div className="modal-discard" ref={discardDialog} role="alertdialog" aria-modal="true" aria-label="Descartar cambios" tabIndex={-1}>
        <div><strong>¿Descartar cambios?</strong><p>Lo que cargaste en este formulario no se guardará.</p><div className="modal-discard__actions"><Button variant="secondary" icon="✏️" type="button" onClick={() => setConfirmingDiscard(false)}>Seguir editando</Button><Button variant="destructive" icon="🗑️" type="button" onClick={onClose}>Descartar</Button></div></div>
      </div>
    </div>, document.body)}
  </>;
}
