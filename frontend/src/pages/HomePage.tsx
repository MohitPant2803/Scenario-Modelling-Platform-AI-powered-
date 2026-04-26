import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/common/Button";
import { api } from "../lib/api";
import type { AuthUser } from "../types";

type ProjectTitleOnly = {
  id: string;
  title: string;
  creatorName?: string;
  status?: "draft" | "published";
  creatorId?: string;
  description?: string;
};

export default function HomePage() {
  const [projects, setProjects] = useState<ProjectTitleOnly[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [search, setSearch] = useState("");
  const [busyProjectId, setBusyProjectId] = useState<string | null>(null);

  const loadProjects = () => {
    api<ProjectTitleOnly[]>("/projects").then(setProjects).catch(console.error);
  };

  useEffect(() => {
    api<AuthUser | null>("/auth/me").then(setUser).catch(() => setUser(null));
    loadProjects();
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return projects;
    const titleMatches = projects.filter((project) => project.title.toLowerCase().includes(term));
    const creatorMatches = projects.filter(
      (project) =>
        !project.title.toLowerCase().includes(term) &&
        (project.creatorName ?? "").toLowerCase().includes(term)
    );

    return [...titleMatches, ...creatorMatches];
  }, [projects, search]);

  const toggleStatus = async (project: ProjectTitleOnly) => {
    setBusyProjectId(project.id);
    try {
      await api(`/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: project.status === "published" ? "draft" : "published" })
      });
      loadProjects();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to update project status");
    } finally {
      setBusyProjectId(null);
    }
  };

  return (
    <main className="stack">
      {user ? (
        <section className="card home-hero">
          <div className="stack" style={{ gap: 10 }}>
            <span className="eyebrow-label">Workspace</span>
            <h1 style={{ margin: 0, fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.05 }}>Build and review scenario projects</h1>
            <p className="home-hero-copy" style={{ margin: 0 }}>
              Open your workspace, organize project content, and continue the analysis you were working on.
            </p>
            <div>
              <Link to={user.role === "super_admin" ? "/access-control" : "/my-projects"} className="inline-action-link">
                {user.role === "super_admin" ? "Open access ->" : "Go to my projects ->"}
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="card home-hero">
          <div className="stack" style={{ gap: 10 }}>
            <span className="eyebrow-label">Public projects</span>
            <p className="home-hero-copy" style={{ margin: 0 }}>
              Browse shared projects and open any title to explore the full scenario details.
            </p>
          </div>
        </section>
      )}

      <div className="stack" style={{ gap: 6 }}>
        <h2 style={{ margin: 0, fontSize: "1.45rem" }}>Published projects</h2>
        <p style={{ margin: 0, fontSize: 15, color: "#6b7280" }}>Open a published project to view its scenario details.</p>
      </div>

      <input
        className="field-input home-search"
        placeholder="Search by title..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <ul className="project-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {filtered.map((project) => (
          <li key={project.id}>
            <div className="project-card">
              <Link to={`/projects/${project.id}`} style={{ color: "inherit", textDecoration: "none", display: "block" }}>
                <div className="project-card-header">
                  <strong className="project-card-title">{project.title}</strong>
                  <span className="project-card-arrow">Open</span>
                </div>
                <span className="project-card-meta">By {project.creatorName || "Unknown"}</span>
              </Link>
              {user && (user.role === "admin" || user.role === "super_admin") ? (
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <Button
                    type="button"
                    variant={project.status === "published" ? "secondary" : "primary"}
                    disabled={busyProjectId === project.id}
                    onClick={() => void toggleStatus(project)}
                  >
                    {project.status === "published" ? "Keep Draft" : "Publish"}
                  </Button>
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? <p style={{ color: "#6b7280" }}>No projects match your search.</p> : null}
    </main>
  );
}
