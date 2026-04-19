import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/common/Button";
import ProjectDashboard from "../features/project/components/ProjectDashboard";
import { api } from "../lib/api";
import { normalizeProject, type AuthUser, type ProjectDto, type ScenarioTable } from "../types";

type ProjectResponse = {
  id: string;
  creatorId: string;
  title: string;
  description?: string;
  formulasAndInfo?: string;
  tableData?: ScenarioTable;
  graphEnabled?: boolean;
  graphPngDataUrl?: string;
  aiSummary?: string;
  creator?: { name?: string };
};

type DraftState = {
  mode: "create" | "edit";
  id: string | null;
  title: string;
  description: string;
  formulasAndInfo: string;
};

const emptyDraft = (): DraftState => ({
  mode: "create",
  id: null,
  title: "",
  description: "",
  formulasAndInfo: ""
});

export default function MyProjectsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMine = () => {
    api<ProjectResponse[]>("/projects/mine")
      .then((response) => setProjects(response.map(normalizeProject)))
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Failed to load projects"));
  };

  useEffect(() => {
    api<AuthUser | null>("/auth/me")
      .then((currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          loadMine();
        }
      })
      .catch(() => setUser(null));
  }, []);

  const openCreate = () => {
    setDraft(emptyDraft());
    setError(null);
  };

  const openEdit = (project: ProjectDto) => {
    setDraft({
      mode: "edit",
      id: project.id,
      title: project.name,
      description: project.description,
      formulasAndInfo: project.formulasAndInfo
    });
    setError(null);
  };

  const closeDraft = () => setDraft(null);

  const saveProject = async () => {
    if (!draft?.title.trim()) {
      setError("Project title is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await api<ProjectResponse>(draft.id ? `/projects/${draft.id}` : "/projects", {
        method: draft.id ? "PATCH" : "POST",
        body: JSON.stringify({
          title: draft.title,
          description: draft.description,
          formulasAndInfo: draft.formulasAndInfo
        })
      });

      closeDraft();
      if (draft.mode === "create") {
        navigate(`/projects/${response.id}`, { state: { startHierarchyFlow: true } });
        return;
      }
      loadMine();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  const deleteProject = async (project: ProjectDto) => {
    if (!window.confirm(`Delete project "${project.name}" and all nested content?`)) {
      return;
    }

    try {
      await api<{ ok: boolean }>(`/projects/${project.id}`, { method: "DELETE" });
      loadMine();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete project");
    }
  };

  if (!user) {
    return (
      <main className="stack">
        <h1 style={{ marginTop: 0 }}>Projects Dashboard</h1>
        <div className="card">
          <Link to="/login">Log in</Link> or <Link to="/register">sign up</Link> to create and manage projects.
        </div>
      </main>
    );
  }

  return (
    <main className="stack">
      <ProjectDashboard projects={projects} user={user} onCreate={openCreate} onEdit={openEdit} onDelete={deleteProject} />

      {error ? <div className="card" style={{ color: "#b91c1c" }}>{error}</div> : null}

      {draft ? (
        <div
          className="modal-overlay"
          onClick={closeDraft}
        >
          <div className="card modal-card" onClick={(event) => event.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>{draft.mode === "create" ? "Create Project" : "Edit Project"}</h2>
            <div className="stack">
              <label className="stack" style={{ gap: 6 }}>
                Project Name *
                <input
                  value={draft.title}
                  onChange={(event) => setDraft((current) => (current ? { ...current, title: event.target.value } : current))}
                  style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
                />
              </label>
              {draft.mode === "edit" ? (
                <>
                  <label className="stack" style={{ gap: 6 }}>
                    Description
                    <textarea
                      value={draft.description}
                      onChange={(event) => setDraft((current) => (current ? { ...current, description: event.target.value } : current))}
                      rows={3}
                      style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
                  />
                  </label>
                  <label className="stack" style={{ gap: 6 }}>
                    Project Notes
                    <textarea
                      value={draft.formulasAndInfo}
                      onChange={(event) => setDraft((current) => (current ? { ...current, formulasAndInfo: event.target.value } : current))}
                      rows={5}
                      style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
                    />
                  </label>
                </>
              ) : (
                <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
                  We&apos;ll create the project first, then ask whether you want to add a folder or a scenario.
                </p>
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button type="button" variant="ghost" onClick={closeDraft}>
                  Cancel
                </Button>
                <Button type="button" variant="primary" onClick={() => void saveProject()} disabled={saving || !draft.title.trim()}>
                  {saving ? "Saving..." : draft.mode === "create" ? "Create Project" : "Save Project"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
