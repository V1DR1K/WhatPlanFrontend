import { Modal } from './Modal';
import { Button } from './Button';

export function ConfirmDialog({ title, message, confirmLabel, pending, onClose, onConfirm }: { title: string; message: string; confirmLabel: string; pending?: boolean; onClose: () => void; onConfirm: () => void }) {
 return <Modal onClose={onClose}><div className="confirm-dialog"><p className="eyebrow">CONFIRMAR ACCIÓN</p><h2>{title}</h2><p>{message}</p><div className="confirm-dialog__actions"><Button variant="secondary" type="button" disabled={pending} onClick={onClose}>Cancelar</Button><Button variant="destructive" icon="×" type="button" disabled={pending} onClick={onConfirm}>{pending ? 'Procesando…' : confirmLabel}</Button></div></div></Modal>;
}
