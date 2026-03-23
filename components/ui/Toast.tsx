"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  CSSProperties,
} from "react";
import { createPortal } from "react-dom";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  title: string;
  message?: string;
  type: ToastType;
  exiting?: boolean;
}

interface ToastContextValue {
  toast: (title: string, message?: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

const accentColors: Record<ToastType, string> = {
  success: "var(--green)",
  error: "#DC2626",
  info: "var(--orange)",
};

function ToastPanel({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const panelStyle: CSSProperties = {
    background: "white",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    padding: "14px 16px",
    minWidth: "280px",
    boxShadow: "0 4px 24px rgba(28,28,26,0.12)",
    borderLeft: `3px solid ${accentColors[item.type]}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
  };

  const titleStyle: CSSProperties = {
    fontWeight: 600,
    fontSize: "14px",
    color: "var(--ink)",
    margin: 0,
  };

  const messageStyle: CSSProperties = {
    fontWeight: 400,
    fontSize: "13px",
    color: "var(--ink-muted)",
    margin: 0,
    marginTop: "2px",
  };

  const closeStyle: CSSProperties = {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "var(--ink-subtle)",
    fontSize: "16px",
    lineHeight: 1,
    padding: "0 2px",
    flexShrink: 0,
  };

  return (
    <div
      style={panelStyle}
      className={item.exiting ? "toast-exit" : "toast-enter"}
    >
      <div>
        <p style={titleStyle}>{item.title}</p>
        {item.message && <p style={messageStyle}>{item.message}</p>}
      </div>
      <button type="button" style={closeStyle} onClick={onClose} aria-label="Close">
        &times;
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const toast = useCallback(
    (title: string, message?: string, type: ToastType = "info") => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, title, message, type }]);
      setTimeout(() => removeToast(id), 4000);
    },
    [removeToast]
  );

  const containerStyle: CSSProperties = {
    position: "fixed",
    top: "16px",
    right: "16px",
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {mounted &&
        createPortal(
          <div style={containerStyle}>
            {toasts.map((t) => (
              <ToastPanel
                key={t.id}
                item={t}
                onClose={() => removeToast(t.id)}
              />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
