import { useEffect, useRef, useState } from "react";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import { ChartIcon, FolderIcon } from "../../../components/common/ItemIcons";
import type { HierarchyNode } from "../../../types";
import { parseScenarioContent } from "../../scenario/utils";

type Props = {
  title: string;
  description?: string;
  nodes: HierarchyNode[];
  canEdit: boolean;
  onOpenFolder: (nodeId: string) => void;
  onOpenScenario: (nodeId: string) => void;
  onCreateFolder: () => void;
  onCreateScenario: () => void;
  onEditNode: (node: HierarchyNode) => void;
  onDeleteNode: (node: HierarchyNode) => void;
};

export default function FolderView({
  title,
  description,
  nodes,
  canEdit,
  onOpenFolder,
  onOpenScenario,
  onCreateFolder,
  onCreateScenario,
  onEditNode,
  onDeleteNode
}: Props) {
  const descriptionRef = useRef<HTMLParagraphElement | null>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [showDescriptionToggle, setShowDescriptionToggle] = useState(false);

  useEffect(() => {
    const element = descriptionRef.current;
    if (!element || !description) {
      setShowDescriptionToggle(false);
      setDescriptionExpanded(false);
      return;
    }

    const checkOverflow = () => {
      const lineHeight = Number.parseFloat(window.getComputedStyle(element).lineHeight || "24");
      const maxHeight = lineHeight * 2;
      setShowDescriptionToggle(element.scrollHeight > maxHeight + 1);
    };

    checkOverflow();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => checkOverflow());
    observer.observe(element);

    return () => observer.disconnect();
  }, [description]);

  const getScenarioPreview = (content?: string) => {
    const parsedDescription = parseScenarioContent(content ?? "").description.trim();
    return parsedDescription || "Open this scenario to inspect the full analysis.";
  };

  return (
    <section className="stack">
      <div className="card" style={{ display: "grid", gap: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>{title}</h2>
          {description ? (
            <div style={{ display: "grid", gap: 4, marginTop: 8 }}>
              <p
                ref={descriptionRef}
                className={descriptionExpanded ? "folder-description" : "folder-description folder-description-clamped"}
                style={{ margin: 0 }}
              >
                {description}
              </p>
              {showDescriptionToggle ? (
                <button
                  type="button"
                  className="inline-text-button"
                  onClick={() => setDescriptionExpanded((current) => !current)}
                >
                  {descriptionExpanded ? "read less" : "read more"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {canEdit ? (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button type="button" variant="primary" onClick={onCreateFolder}>
              Create Folder
            </Button>
            <Button type="button" variant="secondary" onClick={onCreateScenario}>
              Create Scenario
            </Button>
          </div>
        ) : null}
      </div>

      {nodes.length === 0 ? (
        <div className="card" style={{ color: "#64748b" }}>
          {canEdit ? "This folder is empty. Create a folder or scenario to get started." : "This folder is empty."}
        </div>
      ) : (
        <div className="responsive-grid">
          {nodes.map((node) => (
            <Card
              key={node.id}
              title={node.name}
              meta={node.type}
              caption={node.type === "folder" ? "Nested folder" : "Scenario item"}
              subtitle={
                node.type === "folder"
                  ? node.description || "Open this folder to keep drilling down."
                  : getScenarioPreview(node.content)
              }
              icon={node.type === "folder" ? <FolderIcon /> : <ChartIcon />}
              onClick={() => (node.type === "folder" ? onOpenFolder(node.id) : onOpenScenario(node.id))}
              actions={
                canEdit ? (
                  <>
                    <Button type="button" variant="secondary" onClick={() => onEditNode(node)}>
                      Edit
                    </Button>
                    <Button type="button" variant="danger" onClick={() => onDeleteNode(node)}>
                      Delete
                    </Button>
                  </>
                ) : undefined
              }
              footer={<span>{node.type === "folder" ? "Open folder" : "View scenario"}</span>}
            />
          ))}
        </div>
      )}
    </section>
  );
}
