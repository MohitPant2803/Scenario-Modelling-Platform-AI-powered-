import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

const styles: Record<Variant, CSSProperties> = {
  primary: {
    background: "linear-gradient(180deg, #1f5f67 0%, #174851 100%)",
    border: "1px solid #174851",
    color: "#f8fbfc"
  },
  secondary: {
    background: "linear-gradient(180deg, #ffffff 0%, #f6f8fb 100%)",
    border: "1px solid #cdd8e5",
    color: "#243447"
  },
  danger: {
    background: "linear-gradient(180deg, #fff6f7 0%, #ffeff1 100%)",
    border: "1px solid #efb3bc",
    color: "#8f1d38"
  },
  ghost: {
    background: "transparent",
    border: "1px solid transparent",
    color: "#58677a"
  }
};

export default function Button({ variant = "secondary", children, style, className, ...props }: Props) {
  return (
    <button
      {...props}
      className={className}
      style={{
        padding: "10px 16px",
        borderRadius: 12,
        cursor: props.disabled ? "not-allowed" : "pointer",
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: "0.01em",
        lineHeight: 1.2,
        opacity: props.disabled ? 0.6 : 1,
        transition: "transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease",
        boxShadow:
          variant === "primary"
            ? "0 12px 24px rgba(23, 72, 81, 0.18)"
            : variant === "secondary"
              ? "0 4px 14px rgba(148, 163, 184, 0.12)"
              : "none",
        ...styles[variant],
        ...style
      }}
    >
      {children}
    </button>
  );
}
