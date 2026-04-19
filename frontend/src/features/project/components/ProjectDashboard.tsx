import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import { FolderIcon } from "../../../components/common/ItemIcons";
import { api } from "../../../lib/api";
import { normalizeProject, type AuthUser, type ProjectDto } from "../../../types";

type ProjectListItem = {
  id: string;
  title: string;
  description?: string;
  creatorName?: string;
};

type Props = {
  projects: ProjectDto[];
  user: AuthUser | null;
  onCreate: () => void;
  onEdit: (project: ProjectDto) => void;
  onDelete: (project: ProjectDto) => void;
};

export default function ProjectDashboard({ projects, user, onCreate, onEdit, onDelete }: Props) {
  const navigate = useNavigate();
  const [allProjects, setAllProjects] = useState<ProjectListItem[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api<ProjectListItem[]>("/projects").then(setAllProjects).catch(console.error);
  }, []);

  const ownerProjectIds = useMemo(() => new Set(projects.map((project) => project.id)), [projects]);
  const mergedProjects = useMemo(() => {
    const projectMap = new Map(projects.map((project) => [project.id, project]));
    return allProjects.map((project) => {
      const ownedProject = projectMap.get(project.id);
      return ownedProject
        ? ownedProject
        : normalizeProject({
            id: project.id,
            creatorId: "",
            title: project.title,
            description: project.description,
            creatorName: project.creatorName
          });
    });
  }, [allProjects, projects]);

  const filteredProjects = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return mergedProjects;
    }
    return mergedProjects.filter((project) => project.name.toLowerCase().includes(term));
  }, [mergedProjects, search]);

  return (
    <section className="stack">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>Projects Dashboard</h1>
          <p style={{ margin: "8px 0 0", color: "#64748b" }}>Browse every project in one clean grid. Owner controls only appear on your own projects.</p>
        </div>
        {user ? (
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
            const isOwner = ownerProjectIds.has(project.id) && user?.id === project.ownerId;

            return (
              <Card
                key={project.id}
                title={project.name}
                meta="Project"
                caption={`Created by ${isOwner ? "you" : project.ownerName || "Unknown"}`}
                subtitle={project.description || "Open this project to browse folders and scenarios."}
                onClick={() => navigate(`/projects/${project.id}`)}
                icon={<FolderIcon />}
                footer={<span style={{ color: "#0f766e", fontWeight: 700 }}>Open project</span>}
                actions={
                  isOwner ? (
                    <>
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
