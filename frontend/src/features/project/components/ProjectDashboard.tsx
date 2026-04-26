import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import { FolderIcon } from "../../../components/common/ItemIcons";
import type { AuthUser, ProjectDto } from "../../../types";

type Props = {
  projects: ProjectDto[];
  user: AuthUser | null;
  onCreate?: () => void;
  onEdit: (project: ProjectDto) => void;
  onDelete: (project: ProjectDto) => void;
  onToggleStatus: (project: ProjectDto) => void;
  title?: string;
  description?: string;
  showCreate?: boolean;
};

export default function ProjectDashboard({
  projects,
  user,
  onCreate,
  onEdit,
  onDelete,
  onToggleStatus,
  title = "Projects Dashboard",
  description = "Manage only your own documents here.",
  showCreate = true
}: Props) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filteredProjects = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return projects;
    }
    return projects.filter((project) => project.name.toLowerCase().includes(term));
  }, [projects, search]);

  return (
    <section className="stack">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>{title}</h1>
          <p style={{ margin: "8px 0 0", color: "#64748b" }}>{description}</p>
        </div>
        {user && showCreate && onCreate ? (
          <Button variant="primary" type="button" onClick={onCreate}>
            Create Project
          </Button>
        ) : null}
      </div>

      <input
        placeholder="Search projects"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        style={{ padding: 14, borderRadius: 16, border: "1px solid #cbd5e1", background: "#ffffff" }}
      />

      {filteredProjects.length === 0 ? (
        <div className="card">No projects match this search.</div>
      ) : (
        <div className="responsive-grid">
          {filteredProjects.map((project) => {
            const canManage = user?.role === "super_admin" || user?.role === "admin" || user?.id === project.ownerId;

            return (
              <Card
                key={project.id}
                title={project.name}
                meta={project.status === "published" ? "Published project" : "Draft project"}
                caption={`Created by ${project.ownerName || (project.ownerId === user?.id ? "you" : "Unknown")}`}
                subtitle={project.description || "Open this project to browse folders and scenarios."}
                onClick={() => navigate(`/projects/${project.id}`)}
                icon={<FolderIcon />}
                footer={<span style={{ color: project.status === "published" ? "#0f766e" : "#9a3412", fontWeight: 700 }}>Open project</span>}
                actions={
                  canManage ? (
                    <>
                      <Button
                        type="button"
                        variant={project.status === "published" ? "secondary" : "primary"}
                        onClick={() => onToggleStatus(project)}
                      >
                        {project.status === "published" ? "Keep Draft" : "Publish"}
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => onEdit(project)}>
                        Edit
                      </Button>
                      <Button type="button" variant="danger" onClick={() => onDelete(project)}>
                        Delete
                      </Button>
                    </>
                  ) : undefined
                }
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
