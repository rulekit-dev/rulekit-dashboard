"use client";

import React, { useEffect, useState, CSSProperties } from "react";
import Button from "@/components/ui/Button";

interface SaveBarProps {
  dirty: boolean;
  saving: boolean;
  publishing: boolean;
  onDiscard: () => void;
  onSave: () => void;
  onPublish: () => void;
  publishSuccess?: boolean;
}

export default function SaveBar({
  dirty,
  saving,
  publishing,
  onDiscard,
  onSave,
  onPublish,
  publishSuccess = false,
}: SaveBarProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (publishSuccess) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
    setShowSuccess(false);
  }, [publishSuccess]);

  const visible = dirty || saving || publishing;

  const barStyle: CSSProperties = {
    position: "fixed",
    bottom: 0,
    left: "240px",
    right: 0,
    zIndex: 100,
    background: "var(--white)",
    borderTop: "1px solid var(--border)",
    padding: "12px 32px",
    transform: visible ? "translateY(0)" : "translateY(100%)",
    transition: "transform 0.25s ease",
  };

  const innerStyle: CSSProperties = {
    maxWidth: "1100px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  };

  const leftStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    visibility: dirty ? "visible" : "hidden",
  };

  const dotStyle: CSSProperties = {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "var(--orange)",
    flexShrink: 0,
  };

  const labelStyle: CSSProperties = {
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--ink-muted)",
  };

  const rightStyle: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    gap: "8px",
    alignItems: "center",
  };

  const publishButtonStyle: CSSProperties = showSuccess
    ? {
        background: "#16A34A",
        borderColor: "#16A34A",
      }
    : {};

  return (
    <>
      <style>{`
        @keyframes savebar-slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
      <div style={barStyle}>
        <div style={innerStyle}>
          <div style={leftStyle}>
            <span style={dotStyle} />
            <span style={labelStyle}>Unsaved changes</span>
          </div>
          <div style={rightStyle}>
            <Button
              variant="ghost"
              size="sm"
              disabled={!dirty}
              onClick={onDiscard}
            >
              Discard
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!dirty}
              loading={saving}
              onClick={onSave}
            >
              Save draft
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={publishing && !showSuccess}
              onClick={onPublish}
              style={publishButtonStyle}
            >
              {showSuccess ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ verticalAlign: "middle" }}>
                    <path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Published!
                </span>
              ) : (
                "Publish"
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
