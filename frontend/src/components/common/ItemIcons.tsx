import type { CSSProperties } from "react";

const iconStyle: CSSProperties = {
  width: 28,
  height: 28,
  display: "block"
};

export function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={iconStyle}>
      <path d="M3 7.75A2.75 2.75 0 0 1 5.75 5h4.05c.56 0 1.1.22 1.5.62l1.03 1.03c.14.14.33.22.53.22h5.37A2.75 2.75 0 0 1 21 9.62v6.63A2.75 2.75 0 0 1 18.25 19H5.75A2.75 2.75 0 0 1 3 16.25V7.75Z" fill="#FBBF24"/>
      <path d="M3 10.25A2.25 2.25 0 0 1 5.25 8h13.5A2.25 2.25 0 0 1 21 10.25v6A2.75 2.75 0 0 1 18.25 19H5.75A2.75 2.75 0 0 1 3 16.25v-6Z" fill="#FCD34D"/>
      <path d="M3 10.5h18" stroke="#F59E0B" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  );
}

export function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={iconStyle}>
      <path d="M5.75 4h12.5A1.75 1.75 0 0 1 20 5.75v12.5A1.75 1.75 0 0 1 18.25 20H5.75A1.75 1.75 0 0 1 4 18.25V5.75A1.75 1.75 0 0 1 5.75 4Z" fill="#DBEAFE"/>
      <path d="M8 15.5V12" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M12 15.5V8.5" stroke="#0F766E" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M16 15.5V10.25" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M7 17h10" stroke="#64748B" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
