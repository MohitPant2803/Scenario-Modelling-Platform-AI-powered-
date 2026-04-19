import type { ReactNode } from "react";

type Props = {
  title: string;
  action?: ReactNode;
  children: ReactNode;
};

export default function SectionBlock({ title, action, children }: Props) {
  return (
    <section className="card">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <strong className="section-title">{title}</strong>
        {action}
      </div>
      {children}
    </section>
  );
}
