"use client";

import React, { CSSProperties, useEffect } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md";
  preventBackdropClose?: boolean;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "sm",
  preventBackdropClose = false,
}: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const backdropStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(28,28,26,0.4)",
    backdropFilter: "blur(4px)",
    zIndex: 9998,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const panelStyle: CSSProperties = {
    background: "white",
    borderRadius: "14px",
    padding: "28px",
    maxWidth: size === "sm" ? "480px" : "640px",
    width: "100%",
    position: "relative",
    maxHeight: "90vh",
    overflowY: "auto",
  };

  const headerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "20px",
  };

  const titleStyle: CSSProperties = {
    fontWeight: 700,
    fontSize: "18px",
    color: "var(--ink)",
    margin: 0,
  };

  const closeButtonStyle: CSSProperties = {
    background: "transparent",
    border: "1px solid var(--border-med)",
    borderRadius: "8px",
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "var(--ink-muted)",
    fontSize: "16px",
    lineHeight: 1,
    padding: 0,
    flexShrink: 0,
  };

  const footerStyle: CSSProperties = {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
    marginTop: "24px",
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !preventBackdropClose) {
      onClose();
    }
  };

  return createPortal(
    <div
      style={backdropStyle}
      className="modal-backdrop"
      onClick={handleBackdropClick}
    >
      <div style={panelStyle} className="modal-panel">
        <div style={headerStyle}>
          <h2 style={titleStyle}>{title}</h2>
          <button
            type="button"
            style={closeButtonStyle}
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div>{children}</div>
        {footer && <div style={footerStyle}>{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
