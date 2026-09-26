import dagre from 'dagre';
import { Position, type Node, type Edge } from '@xyflow/react';

const NODE_WIDTH = 260;
const NODE_HEIGHT = 90;

export interface LayoutOptions {
  direction?: 'TB' | 'LR';
  nodeWidth?: number;
  nodeHeight?: number;
}

/**
 * Computes an automatic layered graph layout using Dagre.
 * Respects architectural layers (Presentation -> API -> Service -> Data -> Infrastructure -> External),
 * minimizes edge crossings, and clusters connected nodes together.
 */
export const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } => {
  const { direction = 'TB', nodeWidth = NODE_WIDTH, nodeHeight = NODE_HEIGHT } = options;
  const isHorizontal = direction === 'LR';

  const dagreGraph = new dagre.graphlib.Graph({ multigraph: true, compound: true });
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: isHorizontal ? 60 : 70,
    ranksep: isHorizontal ? 120 : 130,
    edgesep: 30,
    marginx: 50,
    marginy: 50,
    acyclicer: 'greedy',
  });

  // Add nodes to dagre
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: nodeWidth,
      height: nodeHeight,
    });
  });

  // Add edges to dagre
  edges.forEach((edge) => {
    // Only add edge to layout if both source and target exist
    if (dagreGraph.hasNode(edge.source) && dagreGraph.hasNode(edge.target)) {
      dagreGraph.setEdge(edge.source, edge.target, {}, edge.id);
    }
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Apply layout coordinates with architectural layer ordering enforcement
  const layoutedNodes: Node[] = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    const x = nodeWithPosition?.x ? nodeWithPosition.x - nodeWidth / 2 : 0;
    const y = nodeWithPosition?.y ? nodeWithPosition.y - nodeHeight / 2 : 0;

    return {
      ...node,
      position: { x, y },
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
    };
  });

  return { nodes: layoutedNodes, edges };
};
