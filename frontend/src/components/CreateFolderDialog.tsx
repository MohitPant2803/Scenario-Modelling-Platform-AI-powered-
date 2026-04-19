import { useState } from "react";
import { api } from "../lib/api";
import type { FolderDto } from "../types";
import Button from "./common/Button";

type Props = {
  projectId: string;
  parentFolderId: string | null;
  onCreated: (folder: FolderDto) => void;
  onClose: () => void;
  folder?: FolderDto | null;
  ownerId: string;
};

export default function CreateFolderDialog({ projectId, parentFolderId, onCreated, onClose, folder, ownerId }: Props) {
  const [name, setName] = useState(folder?.name ?? "");
  const [description, setDescription] = useState(folder?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = Boolean(folder);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Folder name is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await api<{ id?: string; _id?: string; name: string; description?: string; projectId: string; parentFolderId?: string | null }>(
        isEditing ? `/folders/${folder?.id}` : `/folders/project/${projectId}`,
        {
          method: isEditing ? "PATCH" : "POST",
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim(),
            parentFolderId: parentFolderId ?? null
          })
        }
      );

      onCreated({
        id: response.id ?? response._id ?? "",
        name: response.name,
        description: response.description ?? "",
        projectId: response.projectId,
        parentId: response.parentFolderId ?? null,
        ownerId
      });
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : `Failed to ${isEditing ? "save" : "create"} folder`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className="card modal-card"
        onClick={(event) => event.stopPropagation()}
        style={{ width: "min(420px, 92vw)", padding: 24 }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 16 }}>{isEditing ? "Edit Folder" : "Create Folder"}</h3>

        <form onSubmit={handleSubmit} className="stack" style={{ gap: 12 }}>
          <label className="stack" style={{ gap: 6 }}>
            Folder Name *
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="E.g. Quarterly Analysis"
              style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
              autoFocus
            />
          </label>

          <label className="stack" style={{ gap: 6 }}>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="What belongs in this folder?"
              style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
            />
          </label>

          {error ? <p style={{ color: "#b91c1c", margin: 0, fontSize: 14 }}>{error}</p> : null}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving || !name.trim()}>
              {saving ? (isEditing ? "Saving..." : "Creating...") : isEditing ? "Save Folder" : "Create Folder"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
