import { useNavigate } from 'react-router-dom';
import { Modal } from './Modal';
import { Button } from './Button';

export function ReviewPrompt({ name, reviewTo, onClose, actionLabel = 'Reseñar ahora', message = '¿Ya lo disfrutaron? Pueden dejar su reseña ahora o hacerlo más tarde.' }: { name: string; reviewTo: string; onClose: () => void; actionLabel?: string; message?: string }) {
  const navigate = useNavigate();
  return <Modal size="compact" onClose={onClose}><div className="review-prompt"><p className="eyebrow">NUEVO PLAN GUARDADO</p><h2>{name} ya está en la lista</h2><p>{message}</p><div className="modal-form__actions"><Button variant="secondary" icon="✕" type="button" onClick={onClose}>Más tarde</Button><Button icon="💬" type="button" onClick={() => navigate(reviewTo)}>{actionLabel}</Button></div></div></Modal>;
}
