"use client";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
}

export default function PageHeader({ eyebrow, title }: PageHeaderProps) {
  return (
    <div
      style={{
        padding: "28px 32px 20px",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--ink-subtle)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: "4px",
        }}
      >
        {eyebrow}
      </div>
      <h1
        style={{
          
          fontWeight: 800,
          fontSize: "22px",
          color: "var(--ink)",
          letterSpacing: "-0.02em",
          margin: 0,
        }}
      >
        {title}
      </h1>
    </div>
  );
}
