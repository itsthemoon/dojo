import { useEffect, useRef, type ReactNode } from "react";

// Stack of open dialogs so Escape only closes the topmost one.
const modalStack: symbol[] = [];

const FOCUSABLE = 'input:enabled, select:enabled, textarea:enabled, button:enabled, [href], [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  /** Optional element rendered left of the title (emoji, avatar…). */
  badge?: ReactNode;
}

export function Modal({ title, onClose, children, wide, badge }: ModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const idRef = useRef<symbol | null>(null);
  if (idRef.current === null) idRef.current = Symbol("modal");
  const id = idRef.current;

  useEffect(() => {
    modalStack.push(id);
    const onKey = (e: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== id) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        // Trap focus inside the dialog.
        const focusable = sheetRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        const inside = sheetRef.current?.contains(active);
        if (!inside) {
          e.preventDefault();
          first.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      modalStack.splice(modalStack.indexOf(id), 1);
      window.removeEventListener("keydown", onKey);
    };
  }, [id, onClose]);

  useEffect(() => {
    // Move focus into the dialog, and put it back where it came from on close.
    const opener = document.activeElement as HTMLElement | null;
    const first = sheetRef.current?.querySelector<HTMLElement>(
      "input:enabled, select:enabled, button:enabled:not(.sheet__close)"
    );
    (first ?? sheetRef.current)?.focus();
    return () => {
      if (opener && document.contains(opener)) opener.focus();
    };
  }, []);

  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={sheetRef}
        className={`sheet${wide ? " sheet--wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="sheet__head">
          {badge}
          <h2 className="sheet__title">{title}</h2>
          <button className="sheet__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

interface ConfirmProps {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmSheet({ title, body, confirmLabel, danger, onConfirm, onClose }: ConfirmProps) {
  return (
    <Modal title={title} onClose={onClose}>
      <p style={{ color: "var(--ink-soft)" }}>{body}</p>
      <div className="sheet__footer">
        <button className="btn btn--ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn"
          style={danger ? { background: "var(--danger)", color: "#fff", borderColor: "transparent" } : undefined}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
