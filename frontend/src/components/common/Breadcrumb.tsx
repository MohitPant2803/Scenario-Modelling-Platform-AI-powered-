import type { ReactNode } from "react";

type Item = {
  id: string | null;
  label: string;
  onClick?: () => void;
};

type Props = {
  items: Item[];
  trailing?: ReactNode;
};

export default function Breadcrumb({ items, trailing }: Props) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        alignItems: "center",
        flexWrap: "wrap"
      }}
    >
      <nav aria-label="Breadcrumb" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        {items.map((item, index) => (
          <div key={`${item.id ?? "root"}-${index}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {item.onClick ? (
              <button
                type="button"
                onClick={item.onClick}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  cursor: "pointer",
                  color: "#0f766e",
                  fontWeight: 600
                }}
              >
                {item.label}
              </button>
            ) : (
              <span style={{ color: "#0f172a", fontWeight: 600 }}>{item.label}</span>
            )}
            {index < items.length - 1 ? <span style={{ color: "#94a3b8" }}>{">"}</span> : null}
          </div>
        ))}
      </nav>
      {trailing}
    </div>
  );
}
