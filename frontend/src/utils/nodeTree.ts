import type { HierarchyNode, TreeNode } from "../types";

export function getChildren(nodes: HierarchyNode[], nodeId: string | null): HierarchyNode[] {
  return nodes.filter((node) => node.parentId === nodeId);
}

export function hasCircularParent(nodes: HierarchyNode[], nodeId: string, parentId: string | null): boolean {
  if (!parentId) {
    return false;
  }

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  let cursor: string | null = parentId;

  while (cursor) {
    if (cursor === nodeId) {
      return true;
    }
    cursor = nodeMap.get(cursor)?.parentId ?? null;
  }

  return false;
}

export function buildTree(nodes: HierarchyNode[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const node of nodes) {
    nodeMap.set(node.id, { ...node, children: [] });
  }

  for (const node of nodes) {
    const treeNode = nodeMap.get(node.id);
    if (!treeNode) {
      continue;
    }

    if (!node.parentId) {
      roots.push(treeNode);
      continue;
    }

    if (hasCircularParent(nodes, node.id, node.parentId)) {
      roots.push(treeNode);
      continue;
    }

    const parent = nodeMap.get(node.parentId);
    if (!parent) {
      roots.push(treeNode);
      continue;
    }

    parent.children.push(treeNode);
  }

  return roots;
}

export function addNode(nodes: HierarchyNode[], node: HierarchyNode): HierarchyNode[] {
  const next = nodes.filter((item) => item.id !== node.id);
  next.push(node);
  return next;
}

export function deleteNode(nodes: HierarchyNode[], nodeId: string): HierarchyNode[] {
  const descendants = new Set<string>([nodeId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (!descendants.has(node.id) && node.parentId && descendants.has(node.parentId)) {
        descendants.add(node.id);
        changed = true;
      }
    }
  }

  return nodes.filter((node) => !descendants.has(node.id));
}
