"use client";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
}

export default function PageHeader({ eyebrow, title }: PageHeaderProps) {
  return (
    <div
      style={{
        padding: "24px 28px 18px",
        borderBottom: "1px solid var(--border)",
        background: "var(--white)",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          fontWeight: 600,
          color: "var(--ink-subtle)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: "3px",
          fontFamily: "var(--font-sans)",
        }}
      >
        {eyebrow}
      </div>
      <h1
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 700,
          fontSize: "20px",
          color: "var(--ink)",
          letterSpacing: "-0.03em",
          margin: 0,
        }}
      >
        {title}
      </h1>
    </div>
  );
}
