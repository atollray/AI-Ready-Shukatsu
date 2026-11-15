import { AlertTriangle, CheckCircle2, Info, RotateCcw, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
}

interface ToastViewportProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="gh-toast-viewport" aria-live="polite">
      {toasts.map((toast) => {
        const icon =
          toast.variant === "error" ? (
            <AlertTriangle size={15} style={{ color: "var(--danger-fg)", flexShrink: 0 }} />
          ) : toast.variant === "success" ? (
            <CheckCircle2 size={15} style={{ color: "var(--success-fg)", flexShrink: 0 }} />
          ) : (
            <Info size={15} style={{ color: "var(--accent-fg)", flexShrink: 0 }} />
          );

        return (
          <output key={toast.id} className={`gh-toast gh-toast-${toast.variant}`}>
            <span className="gh-toast-msg">
              {icon}
              <span>{toast.message}</span>
            </span>

            <span className="gh-row-gap" style={{ gap: "4px", flexShrink: 0 }}>
              {toast.actionLabel && toast.onAction ? (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={async () => {
                    onDismiss(toast.id);
                    await toast.onAction?.();
                  }}
                >
                  <RotateCcw size={12} />
                  <span>{toast.actionLabel}</span>
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn-sm btn-invisible"
                onClick={() => onDismiss(toast.id)}
                aria-label="通知を閉じる"
                style={{ padding: "0 4px", height: "24px" }}
              >
                <X size={13} />
              </button>
            </span>
          </output>
        );
      })}
    </div>
  );
}
