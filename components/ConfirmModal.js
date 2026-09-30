"use client";

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-ink/50 flex items-center justify-center p-4 z-50"
      onClick={onCancel}
    >
      <div
        className="bg-paper border-2 border-ink max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="text-xl font-display mb-2">{title}</h2>}
        <p className="text-sm text-ink/80 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary text-sm">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className="btn-primary text-sm">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
