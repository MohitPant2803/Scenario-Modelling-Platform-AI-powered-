import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  meta?: string;
  caption?: string;
  icon?: ReactNode;
  onClick?: () => void;
  actions?: ReactNode;
  footer?: ReactNode;
  selected?: boolean;
};

export default function Card({ title, subtitle, meta, caption, icon, onClick, actions, footer, selected = false }: Props) {
  return (
    <article
      onClick={onClick}
      style={{
        minHeight: 0,
        borderRadius: 22,
        padding: 22,
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        gap: 16,
        background: selected ? "linear-gradient(180deg, #ecfeff 0%, #ffffff 100%)" : "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        border: selected ? "1px solid #14b8a6" : "1px solid #d8e2ee",
        boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)",
        cursor: onClick ? "pointer" : "default"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div style={{ display: "grid", gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            {icon ? (
              <div
                aria-hidden="true"
                style={{
                  width: 48,
                  height: 48,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 16,
                  background: "#eef6ff",
                  color: "#d97706",
                  flexShrink: 0
                }}
              >
                {icon}
              </div>
            ) : null}
            <div style={{ display: "grid", gap: 6, flex: 1, minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: 22, lineHeight: 1.15 }}>{title}</h3>
              {caption ? <span style={{ color: "#64748b", fontSize: 14 }}>{caption}</span> : null}
            </div>
          </div>

          {meta ? (
            <span
              style={{
                width: "fit-content",
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#0f766e",
                background: "#e6fffb",
                padding: "6px 10px",
                borderRadius: 999
              }}
            >
              {meta}
            </span>
          ) : null}
        </div>

        {actions ? (
          <div onClick={(event) => event.stopPropagation()} style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {actions}
          </div>
        ) : null}
      </div>

      <div className="line-clamp-fade card-subtitle">
        {subtitle || "Open to view details."}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "#64748b",
          fontSize: 13,
          paddingTop: 8,
          borderTop: "1px solid #e2e8f0"
        }}
      >
        <span>{onClick ? "Click to open" : ""}</span>
        {footer}
      </div>
    </article>
  );
}
