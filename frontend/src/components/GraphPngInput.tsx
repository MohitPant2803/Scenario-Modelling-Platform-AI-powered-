import { useRef, type ChangeEvent, type ClipboardEvent } from "react";
import Button from "./common/Button";

const MAX_BYTES = 4 * 1024 * 1024;

type Props = {
  value: string;
  onChange: (dataUrl: string) => void;
  readOnly?: boolean;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function GraphPngInput({ value, onChange, readOnly = false }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file (PNG or JPEG).");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      alert("Image is too large (max ~4 MB). Try a smaller PNG.");
      event.target.value = "";
      return;
    }

    try {
      const url = await readFileAsDataUrl(file);
      onChange(url);
    } catch {
      alert("Could not read that file.");
    }

    event.target.value = "";
  };

  const onPaste = (event: ClipboardEvent) => {
    if (readOnly) return;
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (item.kind === "file" && item.type.startsWith("image/")) {
        event.preventDefault();
        const file = item.getAsFile();
        if (!file || file.size > MAX_BYTES) {
          alert("Pasted image is too large (max ~4 MB).");
          return;
        }

        void readFileAsDataUrl(file)
          .then(onChange)
          .catch(() => alert("Could not read pasted image."));
        return;
      }
    }
  };

  return (
    <div className="stack" onPaste={onPaste}>
      {!readOnly ? (
        <p className="muted-text" style={{ margin: 0, fontSize: 14, lineHeight: 1.7 }}>
          Paste a graph screenshot (Ctrl+V) here, or upload PNG / JPEG. Optional - used on the project page and for AI summary.
        </p>
      ) : null}

      {!readOnly ? (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label className="stack" style={{ gap: 8, fontSize: 14, color: "#314155" }}>
            <span style={{ fontWeight: 600 }}>Upload image</span>
            <span style={{ position: "relative", display: "inline-flex" }}>
              <input
                ref={fileInputRef}
                className="file-input-hidden"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => void onFile(event)}
              />
              <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                Choose File
              </Button>
            </span>
          </label>

          {value ? (
            <Button type="button" variant="ghost" onClick={() => onChange("")}>
              Remove image
            </Button>
          ) : null}
        </div>
      ) : null}

      {value ? (
        <div className="surface-subtle" style={{ padding: 10, maxWidth: "100%" }}>
          <img src={value} alt="Graph" style={{ maxWidth: "100%", height: "auto", display: "block" }} />
        </div>
      ) : !readOnly ? (
        <div
          tabIndex={0}
          style={{
            border: "2px dashed #cad5e2",
            borderRadius: 14,
            padding: 20,
            textAlign: "center",
            color: "#6b7688",
            fontSize: 14,
            background: "linear-gradient(180deg, #fbfcfe 0%, #f6f9fc 100%)"
          }}
        >
          Paste graph (PNG) from clipboard or upload
        </div>
      ) : null}
    </div>
  );
}
