import { useState, type FormEventHandler, type ReactNode } from "react";
import { Button } from "./Button";
import { ConfirmDialog } from "./ConfirmDialog";
import { Modal } from "./Modal";

type ReviewDeleteAction = {
  title: string;
  message: string;
  confirmLabel: string;
  pending: boolean;
  onConfirm: () => void;
};

type ReviewDialogShellProps = {
  children: ReactNode;
  eyebrow: string;
  title: ReactNode;
  context?: ReactNode;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  pending: boolean;
  submitLabel: string;
  submitIcon: string;
  error?: string;
  className?: string;
  formClassName?: string;
  deleteAction?: ReviewDeleteAction;
};

/** Shared modal frame and save/delete states; each review keeps its own fields and rules. */
export function ReviewDialogShell({
  children,
  className,
  context,
  deleteAction,
  error,
  eyebrow,
  formClassName = "modal-form--paired modal-form--review",
  onClose,
  onSubmit,
  pending,
  submitIcon,
  submitLabel,
  title,
}: ReviewDialogShellProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <>
      <Modal size="wide" className={className} onClose={onClose} confirmDiscard pending={pending}>
        <form className={formClassName} onSubmit={onSubmit}>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          {context && <p className="muted">{context}</p>}
          {children}
          <div className="modal-form__actions">
            {deleteAction && (
              <Button
                variant="destructive"
                icon="🗑️"
                type="button"
                disabled={pending}
                onClick={() => setConfirmingDelete(true)}
              >
                Borrar reseña
              </Button>
            )}
            <Button icon={submitIcon} disabled={pending}>{submitLabel}</Button>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
        </form>
      </Modal>
      {confirmingDelete && deleteAction && (
        <ConfirmDialog
          title={deleteAction.title}
          message={deleteAction.message}
          confirmLabel={deleteAction.confirmLabel}
          pending={deleteAction.pending}
          onClose={() => setConfirmingDelete(false)}
          onConfirm={deleteAction.onConfirm}
        />
      )}
    </>
  );
}
