import type { CanvasNode, NodeStyleRef } from './canvas-types';

type NodeConnection = {
  id: string;
  from: { nodeId: string; side: 'left' | 'right' };
  to: { nodeId: string; side: 'left' | 'right' };
};

export function getConnectedNodeIds(startNodeId: string, connections: NodeConnection[]) {
  const visited = new Set<string>();
  const queue = [startNodeId];

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (!nodeId || visited.has(nodeId)) continue;
    visited.add(nodeId);
    connections.forEach((connection) => {
      if (connection.from.nodeId === nodeId && !visited.has(connection.to.nodeId)) {
        queue.push(connection.to.nodeId);
      }
      if (connection.to.nodeId === nodeId && !visited.has(connection.from.nodeId)) {
        queue.push(connection.from.nodeId);
      }
    });
  }

  return visited;
}

export function getIncomingNodeIds(targetNodeId: string, connections: NodeConnection[]) {
  return connections
    .filter((connection) => connection.to.nodeId === targetNodeId)
    .map((connection) => connection.from.nodeId);
}

export function getOutgoingNodeIds(sourceNodeId: string, connections: NodeConnection[]) {
  return connections
    .filter((connection) => connection.from.nodeId === sourceNodeId)
    .map((connection) => connection.to.nodeId);
}

export function getPreferredInheritedStyle(nodeId: string, nodes: CanvasNode[], connections: NodeConnection[]) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const incoming = getIncomingNodeIds(nodeId, connections);
  for (const sourceId of incoming) {
    const style = nodeById.get(sourceId)?.style;
    if (style) return style;
  }
  const connectedIds = Array.from(getConnectedNodeIds(nodeId, connections));
  for (const connectedId of connectedIds) {
    if (connectedId === nodeId) continue;
    const style = nodeById.get(connectedId)?.style;
    if (style) return style;
  }
  return null;
}

export function getDominantStyleForNodeIds(nodeIds: Iterable<string>, nodes: CanvasNode[]) {
  const targetIds = new Set(nodeIds);
  const styles = nodes
    .filter((node) => targetIds.has(node.id) && node.style)
    .map((node) => node.style as NodeStyleRef);
  const manualStyle = styles
    .filter((style) => style.source === 'manual')
    .sort((left, right) => right.updatedAt - left.updatedAt)[0];
  if (manualStyle) return manualStyle;
  return styles.sort((left, right) => right.updatedAt - left.updatedAt)[0] ?? null;
}
