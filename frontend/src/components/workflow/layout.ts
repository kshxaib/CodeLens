import dagre from 'dagre';
import { Position, type Node, type Edge } from '@xyflow/react';

const NODE_WIDTH = 260;
const NODE_HEIGHT = 90;

export interface WorkflowLayoutOptions {
  direction?: 'TB' | 'LR';
  nodeWidth?: number;
  nodeHeight?: number;
}

export const getWorkflowLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  options: WorkflowLayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } => {
  const { direction = 'TB', nodeWidth = NODE_WIDTH, nodeHeight = NODE_HEIGHT } = options;
  const isHorizontal = direction === 'LR';

  const dagreGraph = new dagre.graphlib.Graph({ multigraph: true, compound: true });
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: isHorizontal ? 60 : 70,
    ranksep: isHorizontal ? 100 : 110,
    edgesep: 30,
    marginx: 40,
    marginy: 40,
    acyclicer: 'greedy',
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: nodeWidth,
      height: nodeHeight,
    });
  });

  edges.forEach((edge) => {
    if (dagreGraph.hasNode(edge.source) && dagreGraph.hasNode(edge.target)) {
      dagreGraph.setEdge(edge.source, edge.target, {}, edge.id);
    }
  });

  dagre.layout(dagreGraph);

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
