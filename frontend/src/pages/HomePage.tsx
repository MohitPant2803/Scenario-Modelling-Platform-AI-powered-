import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

type ProjectTitleOnly = {
  id: string;
  title: string;
  creatorName?: string;
};

type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export default function HomePage() {
  const [projects, setProjects] = useState<ProjectTitleOnly[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api<ProjectTitleOnly[]>("/projects").then(setProjects).catch(console.error);
    api<AuthUser | null>("/auth/me").then(setUser).catch(() => setUser(null));
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return projects;
    return projects.filter((p) => p.title.toLowerCase().includes(term));
  }, [projects, search]);

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
              <Link to="/my-projects" className="inline-action-link">
                Go to my projects -&gt;
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
        <h2 style={{ margin: 0, fontSize: "1.45rem" }}>Projects</h2>
        <p style={{ margin: 0, fontSize: 15, color: "#6b7280" }}>Open a project to view its scenario details.</p>
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
            <Link to={`/projects/${project.id}`} className="project-card">
              <div className="project-card-header">
                <strong className="project-card-title">{project.title}</strong>
                <span className="project-card-arrow">Open</span>
              </div>
              <span className="project-card-meta">By {project.creatorName || "Unknown"}</span>
            </Link>
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? <p style={{ color: "#6b7280" }}>No projects match your search.</p> : null}
    </main>
  );
}
