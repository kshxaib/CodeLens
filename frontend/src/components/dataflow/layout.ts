import dagre from 'dagre';
import { Position, type Node, type Edge } from '@xyflow/react';

const NODE_WIDTH = 280;
const NODE_HEIGHT = 110;

export interface DataFlowLayoutOptions {
  direction?: 'TB' | 'LR';
  nodeWidth?: number;
  nodeHeight?: number;
}

export const getDataFlowLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  options: DataFlowLayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } => {
  const { direction = 'LR', nodeWidth = NODE_WIDTH, nodeHeight = NODE_HEIGHT } = options;
  const isHorizontal = direction === 'LR';

  const dagreGraph = new dagre.graphlib.Graph({ multigraph: true, compound: true });
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: isHorizontal ? 70 : 80,
    ranksep: isHorizontal ? 120 : 130,
    edgesep: 40,
    marginx: 50,
    marginy: 50,
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
