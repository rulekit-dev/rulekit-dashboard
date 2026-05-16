"use client";

import { useState, useMemo } from "react";

export interface DataTableColumn<T> {
  key: string;
  label: string;
  width?: string;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  searchable?: boolean;
  /** Return a string used for sorting/searching; defaults to render output */
  value?: (row: T) => string;
  render: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  loading?: boolean;
  loadingRows?: number;
  pageSize?: number;
  /** Shown as a full-width bottom row CTA */
  addLabel?: string;
  onAdd?: () => void;
}

type SortDir = "asc" | "desc";

const COLS = <T,>(columns: DataTableColumn<T>[]) =>
  columns.map(c => c.width || "1fr").join(" ");

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyTitle = "No data",
  emptyDescription,
  emptyAction,
  loading,
  loadingRows = 4,
  pageSize = 10,
  addLabel,
  onAdd,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  const searchableCols = columns.filter(c => c.searchable && c.value);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || searchableCols.length === 0) return rows;
    return rows.filter(row =>
      searchableCols.some(c => c.value!(row).toLowerCase().includes(q))
    );
  }, [rows, search, searchableCols]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find(c => c.key === sortKey);
    if (!col?.value) return filtered;
    return [...filtered].sort((a, b) => {
      const av = col.value!(a);
      const bv = col.value!(b);
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filtered, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  }

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
  }

  const hasSearch = searchableCols.length > 0;
  const hasSort = columns.some(c => c.sortable);
  const showToolbar = hasSearch && !loading;
  const showPagination = !loading && sorted.length > pageSize;

  return (
    <div style={{ display: "flex", flexDirection: "column", borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)" }}>

      {/* ── Toolbar ── */}
      {showToolbar && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 16px",
          background: "var(--white)",
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{
              position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)",
              color: "var(--ink-subtle)", pointerEvents: "none",
            }}>
              <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M8 8l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder={`Search ${searchableCols.map(c => c.label.toLowerCase()).join(", ")}…`}
              style={{
                width: "100%", boxSizing: "border-box",
                fontFamily: "var(--font-sans)", fontSize: 12,
                padding: "6px 10px 6px 28px",
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 7, outline: "none", color: "var(--ink)",
                transition: "border-color 0.15s",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "var(--ink)")}
              onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
            />
          </div>
          {search && (
            <span style={{ fontSize: 11, color: "var(--ink-subtle)" }}>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
          {search && (
            <button onClick={() => handleSearch("")} style={{
              fontSize: 11, fontWeight: 500, color: "var(--ink-muted)",
              background: "none", border: "none", cursor: "pointer", padding: 0,
            }}>
              Clear
            </button>
          )}
          {onAdd && (
            <div style={{ marginLeft: "auto" }}>
              <ToolbarAddButton label={addLabel || "Add new"} onClick={onAdd} />
            </div>
          )}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: COLS(columns),
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}>
        {columns.map((col) => (
          <div
            key={col.key}
            onClick={col.sortable ? () => toggleSort(col.key) : undefined}
            style={{
              padding: "10px 20px",
              display: "flex", alignItems: "center", gap: 5,
              justifyContent: col.align === "right" ? "flex-end" : col.align === "center" ? "center" : "flex-start",
              cursor: col.sortable ? "pointer" : "default",
              userSelect: "none",
              transition: "color 0.12s",
            }}
            onMouseEnter={e => { if (col.sortable) (e.currentTarget.querySelector("span") as HTMLElement | null)?.style.setProperty("color", "var(--ink)"); }}
            onMouseLeave={e => { (e.currentTarget.querySelector("span") as HTMLElement | null)?.style.setProperty("color", "var(--ink-muted)"); }}
          >
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: sortKey === col.key ? "var(--ink)" : "var(--ink-muted)",
              letterSpacing: "0.01em",
              transition: "color 0.12s",
            }}>
              {col.label}
            </span>
            {col.sortable && (
              <span style={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
                <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
                  <path d="M3.5 0L7 5H0L3.5 0Z" fill={sortKey === col.key && sortDir === "asc" ? "var(--ink)" : "var(--border-med)"} />
                </svg>
                <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
                  <path d="M3.5 5L0 0H7L3.5 5Z" fill={sortKey === col.key && sortDir === "desc" ? "var(--ink)" : "var(--border-med)"} />
                </svg>
              </span>
            )}
          </div>
        ))}
      </div>

      {/* ── Body ── */}
      <div style={{ background: "var(--white)" }}>
        {loading ? (
          Array.from({ length: loadingRows }).map((_, i) => (
            <div key={i} style={{
              display: "grid",
              gridTemplateColumns: COLS(columns),
              borderBottom: i < loadingRows - 1 ? "1px solid var(--border)" : "none",
            }}>
              {columns.map((col, ci) => (
                <div key={col.key} style={{ padding: "16px 20px" }}>
                  <div style={{
                    height: 11, borderRadius: 99,
                    background: "var(--surface-2)",
                    width: `${40 + ((i * 3 + ci * 7) % 40)}%`,
                    animation: "dt-shimmer 1.6s ease-in-out infinite",
                    animationDelay: `${(i * columns.length + ci) * 60}ms`,
                  }} />
                </div>
              ))}
            </div>
          ))
        ) : paged.length === 0 ? (
          search.trim() ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              padding: "64px 24px", gap: 10,
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 11,
                background: "var(--surface)", border: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="7.5" cy="7.5" r="4.5" stroke="var(--ink-subtle)" strokeWidth="1.5" />
                  <path d="M11 11l3.5 3.5" stroke="var(--ink-subtle)" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M6 7.5h3M7.5 6v3" stroke="var(--ink-subtle)" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
                </svg>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>No results for &ldquo;{search.trim()}&rdquo;</div>
              <div style={{ fontSize: 12, color: "var(--ink-subtle)" }}>Try a different search term</div>
              <button
                onClick={() => handleSearch("")}
                style={{
                  marginTop: 4, fontSize: 12, fontWeight: 600,
                  color: "var(--ink)", background: "var(--surface)",
                  border: "1px solid var(--border)", borderRadius: 7,
                  padding: "6px 14px", cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Clear search
              </button>
            </div>
          ) : (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              padding: "64px 24px", gap: 10,
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 11,
                background: "var(--surface)", border: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="2" y="2" width="6" height="6" rx="1.5" fill="var(--ink-subtle)" opacity="0.5" />
                  <rect x="10" y="2" width="6" height="6" rx="1.5" fill="var(--ink-subtle)" />
                  <rect x="2" y="10" width="6" height="6" rx="1.5" fill="var(--ink-subtle)" opacity="0.2" />
                  <rect x="10" y="10" width="6" height="6" rx="1.5" fill="var(--ink-subtle)" opacity="0.5" />
                </svg>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{emptyTitle}</div>
              {emptyDescription && <div style={{ fontSize: 12, color: "var(--ink-subtle)" }}>{emptyDescription}</div>}
              {emptyAction && <div style={{ marginTop: 4 }}>{emptyAction}</div>}
            </div>
          )
        ) : (
          paged.map((row, i) => (
            <DataTableRow
              key={rowKey(row)}
              row={row}
              index={i}
              columns={columns}
              isLast={i === paged.length - 1 && !showPagination && !onAdd}
              onClick={onRowClick}
            />
          ))
        )}
      </div>

      {/* ── Pagination ── */}
      {showPagination && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 20px",
          background: "var(--white)",
          borderTop: "1px solid var(--border)",
        }}>
          <span style={{ fontSize: 11, color: "var(--ink-subtle)" }}>
            {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <PageBtn label="←" disabled={safePage === 1} onClick={() => setPage(p => p - 1)} />
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | "…")[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "…"
                  ? <span key={`e${i}`} style={{ padding: "0 4px", fontSize: 12, color: "var(--ink-subtle)", lineHeight: "28px" }}>…</span>
                  : <PageBtn key={p} label={String(p)} active={p === safePage} onClick={() => setPage(p as number)} />
              )}
            <PageBtn label="→" disabled={safePage === totalPages} onClick={() => setPage(p => p + 1)} />
          </div>
        </div>
      )}


      {/* ── Add row ── */}
      {onAdd && !loading && (
        <button
          onClick={onAdd}
          style={{
            width: "100%", padding: "13px 20px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            background: "var(--white)",
            border: "none",
            borderTop: "1px dashed var(--border-med)",
            cursor: "pointer",
            transition: "background 0.12s",
            fontFamily: "var(--font-sans)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "var(--surface)";
            (e.currentTarget.querySelector(".dt-add-text") as HTMLElement).style.color = "var(--ink)";
            (e.currentTarget.querySelector(".dt-add-icon") as HTMLElement).style.stroke = "var(--ink)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "var(--white)";
            (e.currentTarget.querySelector(".dt-add-text") as HTMLElement).style.color = "var(--ink-subtle)";
            (e.currentTarget.querySelector(".dt-add-icon") as HTMLElement).style.stroke = "var(--ink-subtle)";
          }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path className="dt-add-icon" d="M6.5 1.5v10M1.5 6.5h10" stroke="var(--ink-subtle)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="dt-add-text" style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-subtle)", transition: "color 0.12s" }}>
            {addLabel || "Add new"}
          </span>
        </button>
      )}

      <style>{`
        @keyframes dt-shimmer {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}

function DataTableRow<T>({ row, index, columns, isLast, onClick }: {
  row: T; index: number; columns: DataTableColumn<T>[];
  isLast: boolean; onClick?: (row: T) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="animate-row"
      onClick={() => onClick?.(row)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "grid",
        gridTemplateColumns: COLS(columns),
        borderBottom: isLast ? "none" : "1px solid var(--border)",
        background: hovered ? "var(--surface)" : "transparent",
        transition: "background 0.1s",
        cursor: onClick ? "pointer" : "default",
        animationDelay: `${index * 30}ms`,
        position: "relative",
      }}
    >
      {onClick && (
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
          background: "var(--ink)",
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.1s",
          borderRadius: "0 2px 2px 0",
        }} />
      )}
      {columns.map(col => (
        <div key={col.key} style={{
          padding: "0 20px",
          display: "flex", alignItems: "center", minHeight: 54,
          justifyContent: col.align === "right" ? "flex-end" : col.align === "center" ? "center" : "flex-start",
        }}>
          {col.render(row, index)}
        </div>
      ))}
    </div>
  );
}

function PageBtn({ label, onClick, disabled, active }: {
  label: string; onClick: () => void; disabled?: boolean; active?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        minWidth: 28, height: 28, padding: "0 6px",
        borderRadius: 6, border: `1px solid ${active ? "var(--ink)" : hovered && !disabled ? "var(--border-med)" : "var(--border)"}`,
        background: active ? "var(--ink)" : hovered && !disabled ? "var(--surface)" : "transparent",
        color: active ? "#fff" : disabled ? "var(--ink-subtle)" : "var(--ink-muted)",
        fontSize: 12, fontWeight: active ? 700 : 500,
        cursor: disabled ? "default" : "pointer",
        transition: "all 0.12s",
        fontFamily: "var(--font-sans)",
      }}
    >
      {label}
    </button>
  );
}

function ToolbarAddButton({ label, onClick }: { label: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "6px 12px", borderRadius: 7, border: "none",
        background: hovered ? "rgba(28,28,26,0.9)" : "var(--ink)",
        color: "#fff", cursor: "pointer",
        fontSize: 12, fontWeight: 600,
        fontFamily: "var(--font-sans)", letterSpacing: "-0.01em",
        transition: "opacity 0.15s", whiteSpace: "nowrap",
      }}
    >
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
        <path d="M5.5 1v9M1 5.5h9" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {label}
    </button>
  );
}
