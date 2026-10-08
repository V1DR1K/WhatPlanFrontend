import { Children, cloneElement, isValidElement, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type PropsWithChildren, type ReactElement, type ReactNode, type SyntheticEvent } from 'react';
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

type ModalElementProps = { children?: ReactNode; className?: string; type?: string };
type CancelInsertionState = { inserted: boolean };

function elementText(children: ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(elementText).join(' ');
  if (isValidElement<ModalElementProps>(children)) return elementText(children.props.children);
  return Children.toArray(children).map(elementText).join(' ');
}

function isButtonElement(element: ReactElement<ModalElementProps>) {
  return element.type === Button || element.type === 'button';
}

function isSubmitButton(element: ReactElement<ModalElementProps>) {
  return isButtonElement(element) && (element.props.type === undefined || element.props.type === 'submit');
}

function containsSubmitButton(children: ReactNode): boolean {
  return Children.toArray(children).some((child) => {
    if (!isValidElement<ModalElementProps>(child)) return false;
    return isSubmitButton(child) || containsSubmitButton(child.props.children);
  });
}

function containsCancelButton(children: ReactNode): boolean {
  return Children.toArray(children).some((child) => {
    if (!isValidElement<ModalElementProps>(child)) return false;
    const isCancel = isButtonElement(child) && /\bcancelar\b/i.test(elementText(child.props.children));
    return isCancel || containsCancelButton(child.props.children);
  });
}

function isActionGroup(element: ReactElement<ModalElementProps>) {
  return element.props.className?.split(/\s+/).some((name) => name === 'modal-form__actions' || name === 'journey-form__actions');
}

function cancelButton(onCancel: () => void) {
  return <Button key="modal-cancel" data-modal-cancel type="button" variant="secondary" icon="✕" onClick={onCancel}>Cancelar</Button>;
}

function insertCancelBeforeSubmit(children: ReactNode, onCancel: () => void, state: CancelInsertionState): ReactNode {
  if (state.inserted) return children;

  const nodes = Children.toArray(children);
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (!isValidElement<ModalElementProps>(node)) continue;

    if (isActionGroup(node) && containsSubmitButton(node.props.children)) {
      if (!containsCancelButton(node.props.children)) {
        nodes[index] = cloneElement(node, {}, cancelButton(onCancel), node.props.children);
      }
      state.inserted = true;
      return nodes;
    }

    if (isSubmitButton(node)) {
      nodes[index] = (
        <div key={node.key ?? `modal-actions-${index}`} className="modal-form__actions">
          {cancelButton(onCancel)}
          {node}
        </div>
      );
      state.inserted = true;
      return nodes;
    }

    if (node.props.children !== undefined) {
      const nested = insertCancelBeforeSubmit(node.props.children, onCancel, state);
      if (state.inserted) {
        nodes[index] = cloneElement(node, {}, nested);
        return nodes;
      }
    }
  }
  return nodes;
}

function addCancelButtons(children: ReactNode, onCancel: () => void): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement<ModalElementProps>(child)) return child;

    if (child.type === 'form') {
      if (containsCancelButton(child.props.children)) return child;
      const state = { inserted: false };
      const formChildren = insertCancelBeforeSubmit(child.props.children, onCancel, state);
      return state.inserted ? cloneElement(child, {}, formChildren) : child;
    }

    if (child.props.children === undefined) return child;
    return cloneElement(child, {}, addCancelButtons(child.props.children, onCancel));
  });
}

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
  const childrenWithCancelButtons = addCancelButtons(children, () => requestCloseRef.current());
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
      if (!button) return;
      if (button.hasAttribute('data-modal-dirty')) {
        setDirty(true);
        return;
      }
      if (button.hasAttribute('data-modal-cancel') || button.type === 'submit' || button.classList.contains('button--destructive')) return;
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
      <div className="modal__content">{childrenWithCancelButtons}</div>
    </section>
    </div>, document.body)}
    {confirmingDiscard && createPortal(<div className="modal-discard-backdrop" role="presentation">
      <div className="modal-discard" ref={discardDialog} role="alertdialog" aria-modal="true" aria-label="Descartar cambios" tabIndex={-1}>
        <div><strong>¿Descartar cambios?</strong><p>Lo que cargaste en este formulario no se guardará.</p><div className="modal-discard__actions"><Button variant="destructive" icon="🗑️" type="button" onClick={onClose}>Descartar</Button><Button variant="secondary" icon="✏️" type="button" onClick={() => setConfirmingDiscard(false)}>Seguir editando</Button></div></div>
      </div>
    </div>, document.body)}
  </>;
}
