import Dagre, { type Label } from "@dagrejs/dagre";
import { api } from "../utils/api";
import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactFlow, {
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  applyEdgeChanges,
  applyNodeChanges,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { getFnTypeDef } from "event-processing";

const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[]
): {
  nodes: Node[];
  edges: Edge[];
} => {
  g.setGraph({
    rankdir: "RL",
    nodesep: 25, // Horizontal spacing between nodes
    ranksep: 100, // Vertical spacing between ranks (layers of nodes)
  });

  edges.forEach((edge) => g.setEdge(edge.source, edge.target));

  const nodeLabelMap: Record<string, Label> = {};
  nodes.forEach((node) => {
    nodeLabelMap[node.id] = {
      width: 200,
      height: 100,
    };
  });
  Object.entries(nodeLabelMap).forEach(([key, value]) => g.setNode(key, value));

  Dagre.layout(g);

  return {
    nodes: nodes.map((node) => {
      const { x, y } = g.node(node.id);

      return { ...node, position: { x, y } };
    }),
    edges,
  };
};

export default function Page() {
  const { data: engine } = api.editor.getLatestEngine.useQuery();
  useEffect(() => {
    const nodes: Node[] =
      engine?.nodeDefs.map((nodeDef) => {
        return {
          id: nodeDef.id,
          sourcePosition: Position.Left,
          targetPosition: Position.Right,
          data: {
            label: (
              <div className="flex flex-col text-left">
                <div className="text-md">{nodeDef.name}</div>
                <div className="text-gray-400">{nodeDef.fn.type}</div>
              </div>
            ),
          },
          position: { x: 100, y: 125 },
        };
      }) ?? [];

    const edges: Edge[] =
      engine?.nodeDefs.flatMap((nodeDef) => {
        const fnTypeDef = getFnTypeDef(nodeDef.fn.type);
        const dataPaths = fnTypeDef.getDataPaths(nodeDef.inputs);
        const deps = new Set(dataPaths.map((path) => path.nodeId));
        return Array.from(deps).map((dep) => {
          return {
            id: `${nodeDef.id}-${dep}`,
            source: nodeDef.id,
            target: dep,
            // type: "smoothstep",
            label: dataPaths
              .filter((path) => path.nodeId === dep)
              .map((path) => path.path.join("."))
              .join(", "),
          };
        });
      }) ?? [];

    if (nodes.length === 0) return;

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [engine]);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  return (
    <div className="w-screen h-dvh">
      <ReactFlow
        nodes={nodes}
        onNodesChange={onNodesChange}
        edges={edges}
        onEdgesChange={onEdgesChange}
        fitView
      />
    </div>
  );
}
