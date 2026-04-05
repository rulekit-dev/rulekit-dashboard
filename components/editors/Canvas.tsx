"use client";

import React, { useCallback, useMemo, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Connection,
  addEdge,
  reconnectEdge,
  type Node,
  type Edge,
  type OnConnect,
  type OnReconnect,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import type { DSL, RuleNode as RuleNodeType, DSLEdge } from "@/lib/types";
import InputNode from "./NodeTypes/InputNode";
import RuleNode from "./NodeTypes/RuleNode";
import OutputNode from "./NodeTypes/OutputNode";

const nodeTypes = {
  input: InputNode,
  rule: RuleNode,
  output: OutputNode,
};

const EDGE_STYLE = { stroke: "var(--border-med)", strokeWidth: 1.5 };

export interface SimulationNodeState {
  phase: "active" | "matched" | "unmatched" | "done-matched" | "done-unmatched" | "done";
}

interface CanvasProps {
  dsl: DSL;
  onChange: (dsl: DSL) => void;
  onOpenTable?: (ruleId: string) => void;
  simulationStates?: Record<string, SimulationNodeState>;
  simulationOutput?: Record<string, unknown> | null;
}

function layoutNodes(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 200 });

  for (const node of nodes) {
    g.setNode(node.id, { width: 200, height: node.type === "rule" ? 100 : 80 });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  // Ensure input→output are placed left-to-right even without rules
  if (!edges.some((e) => e.source === "__input__" && e.target === "__output__")) {
    g.setEdge("__input__", "__output__");
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    const w = 200;
    const h = node.type === "rule" ? 100 : 80;
    return {
      ...node,
      position: { x: pos.x - w / 2, y: pos.y - h / 2 },
    };
  });
}

function buildNodes(
  dsl: DSL,
  onEditTable: (id: string) => void,
  onRename: (id: string, name: string) => void,
  simulationStates?: Record<string, SimulationNodeState>,
  simulationOutput?: Record<string, unknown> | null,
): Node[] {
  const nodes: Node[] = [];

  const inputPhase = simulationStates?.["__input__"]?.phase;
  nodes.push({
    id: "__input__",
    type: "input",
    position: { x: 0, y: 0 },
    data: { simulationPhase: inputPhase },
  });

  for (const node of dsl.nodes) {
    const simPhase = simulationStates?.[node.id]?.phase;
    nodes.push({
      id: node.id,
      type: "rule",
      position: { x: 0, y: 0 },
      data: { node, onEditTable, onRename, simulationPhase: simPhase },
    });
  }

  // Find leaf nodes (no outgoing edges) to derive output
  const sourcesSet = new Set(dsl.edges.map((e) => e.from));
  const leafNodes = dsl.nodes.filter((n) => !sourcesSet.has(n.id));
  const defaultOutput: Record<string, unknown> = {};
  for (const leaf of leafNodes) {
    for (const col of leaf.outputColumns) {
      defaultOutput[col] = "";
    }
  }

  const outputPhase = simulationStates?.["__output__"]?.phase;
  nodes.push({
    id: "__output__",
    type: "output",
    position: { x: 0, y: 0 },
    data: {
      defaultOutput,
      simulationPhase: outputPhase,
      simulationOutput: outputPhase ? simulationOutput : undefined,
    },
  });

  return nodes;
}

function buildEdgesFromDsl(dsl: DSL): Edge[] {
  const edges: Edge[] = [];

  // Input → entry node
  if (dsl.entry) {
    edges.push({
      id: `__input__-${dsl.entry}`,
      source: "__input__",
      target: dsl.entry,
      style: EDGE_STYLE,
    });
  }

  // DSL edges
  for (const e of dsl.edges) {
    edges.push({
      id: `${e.from}-${e.to}`,
      source: e.from,
      target: e.to,
      style: EDGE_STYLE,
    });
  }

  // Leaf nodes → Output
  const sourcesSet = new Set(dsl.edges.map((de) => de.from));
  for (const node of dsl.nodes) {
    if (!sourcesSet.has(node.id)) {
      edges.push({
        id: `${node.id}-__output__`,
        source: node.id,
        target: "__output__",
        style: EDGE_STYLE,
      });
    }
  }

  return edges;
}

function DraggableComponent({ type, icon, label }: { type: string; icon: string; label: string }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/rulekit-node", type);
        e.dataTransfer.effectAllowed = "move";
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...componentCardStyle,
        borderColor: hovered ? "var(--orange)" : "var(--border)",
        background: hovered ? "var(--orange-dim)" : "var(--surface)",
        transform: hovered ? "translateY(-1px)" : "none",
        boxShadow: hovered ? "0 2px 8px rgba(240,90,40,0.12)" : "none",
      }}
    >
      <div style={componentIconStyle}>{icon}</div>
      <span style={componentLabelStyle}>{label}</span>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: "auto", opacity: hovered ? 0.7 : 0.3, transition: "opacity 0.15s" }}>
        <circle cx="4" cy="3" r="1" fill="currentColor" />
        <circle cx="8" cy="3" r="1" fill="currentColor" />
        <circle cx="4" cy="6" r="1" fill="currentColor" />
        <circle cx="8" cy="6" r="1" fill="currentColor" />
        <circle cx="4" cy="9" r="1" fill="currentColor" />
        <circle cx="8" cy="9" r="1" fill="currentColor" />
      </svg>
    </div>
  );
}

interface HandleMenuState {
  x: number;
  y: number;
  sourceNodeId: string;
  sourceHandleType: "source" | "target";
}

function CanvasInner({ dsl, onChange, onOpenTable, simulationStates, simulationOutput }: CanvasProps) {
  const reactFlowInstance = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [handleMenu, setHandleMenu] = useState<HandleMenuState | null>(null);
  const connectStartRef = useRef<{ nodeId: string; handleType: "source" | "target" } | null>(null);
  const isInitialLoad = useRef(true);

  const handleEditTable = useCallback(
    (id: string) => { onOpenTable?.(id); },
    [onOpenTable]
  );

  const handleRename = useCallback(
    (id: string, name: string) => {
      onChange({
        ...dsl,
        nodes: dsl.nodes.map((n) => (n.id === id ? { ...n, name } : n)),
      });
    },
    [dsl, onChange]
  );

  // Initial build: nodes + edges from DSL, laid out together
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes = buildNodes(dsl, handleEditTable, handleRename, undefined, undefined);
    const edges = buildEdgesFromDsl(dsl);
    const laid = layoutNodes(nodes, edges);
    return { initialNodes: laid, initialEdges: edges };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes when DSL changes, preserve existing positions
  const prevNodeIdsRef = useRef(new Set(dsl.nodes.map((n) => n.id)));

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    const currentNodeIds = new Set(dsl.nodes.map((n) => n.id));
    const prevNodeIds = prevNodeIdsRef.current;

    const deletedIds = new Set<string>();
    prevNodeIds.forEach((id) => {
      if (!currentNodeIds.has(id)) deletedIds.add(id);
    });

    prevNodeIdsRef.current = currentNodeIds;

    const newNodes = buildNodes(dsl, handleEditTable, handleRename, simulationStates, simulationOutput);

    // Remove edges that reference deleted nodes
    setEdges((prevEdges) =>
      prevEdges.filter(
        (e) => !deletedIds.has(e.source) && !deletedIds.has(e.target)
      )
    );

    setNodes((prevNodes) => {
      const posMap = new Map<string, { x: number; y: number }>();
      prevNodes.forEach((n) => posMap.set(n.id, n.position));

      return newNodes.map((n) => {
        const existingPos = posMap.get(n.id);
        if (existingPos) {
          return { ...n, position: existingPos };
        }
        // Fallback: place between input and output
        const ruleNodes = prevNodes.filter((pn) => !pn.id.startsWith("__"));
        const inputNode = prevNodes.find((pn) => pn.id === "__input__");
        const outputNode = prevNodes.find((pn) => pn.id === "__output__");
        const midY = prevNodes.reduce((sum, pn) => sum + pn.position.y, 0) / (prevNodes.length || 1);
        if (ruleNodes.length === 0 && inputNode && outputNode) {
          return { ...n, position: { x: (inputNode.position.x + outputNode.position.x) / 2, y: midY } };
        }
        const maxRuleX = ruleNodes.reduce((max, pn) => Math.max(max, pn.position.x), inputNode?.position.x ?? 0);
        return { ...n, position: { x: maxRuleX + 250, y: midY } };
      });
    });
  }, [dsl, handleEditTable, handleRename, setNodes, setEdges]);

  // Update node data when simulation states change (preserve positions)
  useEffect(() => {
    setNodes((prevNodes) =>
      prevNodes.map((n) => {
        if (n.id === "__input__") {
          const phase = simulationStates?.["__input__"]?.phase;
          return { ...n, data: { ...n.data, simulationPhase: phase } };
        }
        if (n.id === "__output__") {
          const phase = simulationStates?.["__output__"]?.phase;
          return {
            ...n,
            data: {
              ...n.data,
              simulationPhase: phase,
              simulationOutput: phase ? simulationOutput : undefined,
            },
          };
        }
        const phase = simulationStates?.[n.id]?.phase;
        return { ...n, data: { ...n.data, simulationPhase: phase } };
      })
    );
  }, [simulationStates, simulationOutput, setNodes]);

  // Animate highlighted edges during simulation
  useEffect(() => {
    if (!simulationStates || Object.keys(simulationStates).length === 0) {
      setEdges((prev) => prev.map((e) => ({ ...e, style: EDGE_STYLE, animated: false })));
      return;
    }
    setEdges((prev) =>
      prev.map((e) => {
        const sourceState = simulationStates[e.source];
        const isActive =
          sourceState?.phase === "active" ||
          sourceState?.phase === "matched" ||
          sourceState?.phase === "done-matched" ||
          sourceState?.phase === "done";
        return {
          ...e,
          animated: isActive,
          style: isActive
            ? { stroke: "var(--orange)", strokeWidth: 2 }
            : { stroke: "var(--border-med)", strokeWidth: 1.5, opacity: 0.4 },
        };
      })
    );
  }, [simulationStates, setEdges]);

  // Deferred edge sync: store pending edges, flush via useEffect
  const pendingEdgeSyncRef = useRef<Edge[] | null>(null);

  useEffect(() => {
    if (pendingEdgeSyncRef.current === null) return;
    const rfEdges = pendingEdgeSyncRef.current;
    pendingEdgeSyncRef.current = null;

    const nodeIds = new Set(dsl.nodes.map((n) => n.id));
    const dslEdges: DSLEdge[] = rfEdges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target) && !e.source.startsWith("__") && !e.target.startsWith("__"))
      .map((e) => {
        const existing = dsl.edges.find((de) => de.from === e.source && de.to === e.target);
        return { from: e.source, to: e.target, ...(existing?.map ? { map: existing.map } : {}) };
      });
    if (JSON.stringify(dslEdges) !== JSON.stringify(dsl.edges)) {
      onChange({ ...dsl, edges: dslEdges });
    }
  }); // runs after every render to flush pending sync

  const scheduleSyncEdges = useCallback((rfEdges: Edge[]) => {
    pendingEdgeSyncRef.current = rfEdges;
  }, []);

  // Manual handle-to-handle connect
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const next = addEdge({ ...connection, style: EDGE_STYLE }, eds);
        scheduleSyncEdges(next);
        return next;
      });
    },
    [setEdges, scheduleSyncEdges]
  );

  const onReconnect: OnReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      setEdges((eds) => {
        const next = reconnectEdge(oldEdge, newConnection, eds);
        scheduleSyncEdges(next);
        return next;
      });
    },
    [setEdges, scheduleSyncEdges]
  );

  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      setEdges((eds) => {
        const next = eds.filter((e) => !deletedEdges.find((de) => de.id === e.id));
        scheduleSyncEdges(next);
        return next;
      });
    },
    [setEdges, scheduleSyncEdges]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Backspace" || event.key === "Delete") {
        const selectedNodes = nodes.filter((n) => n.selected && n.type === "rule" && !n.id.startsWith("__"));
        if (selectedNodes.length === 0) return;
        const idsToDelete = new Set(selectedNodes.map((n) => n.id));
        const newNodes = dsl.nodes.filter((n) => !idsToDelete.has(n.id));
        const newEdges = dsl.edges.filter((e) => !idsToDelete.has(e.from) && !idsToDelete.has(e.to));
        const newEntry = idsToDelete.has(dsl.entry) ? (newNodes[0]?.id ?? "") : dsl.entry;
        onChange({ ...dsl, nodes: newNodes, edges: newEdges, entry: newEntry });
      }
    },
    [nodes, dsl, onChange]
  );

  const makeNewNode = useCallback((): RuleNodeType => ({
    id: crypto.randomUUID(),
    name: `Rule ${dsl.nodes.length + 1}`,
    strategy: "first_match",
    inputColumns: [],
    outputColumns: [],
    rows: [],
  }), [dsl.nodes.length]);

  // Immediately insert a ReactFlow node at a given position
  const insertRfNode = useCallback(
    (ruleNode: RuleNodeType, position: { x: number; y: number }) => {
      setNodes((prev) => [
        ...prev,
        {
          id: ruleNode.id,
          type: "rule" as const,
          position,
          data: { node: ruleNode, onEditTable: handleEditTable, onRename: handleRename },
        },
      ]);
    },
    [setNodes, handleEditTable, handleRename]
  );

  // Drop from sidebar: add node at drop position, no edges
  const addRuleAt = useCallback((position: { x: number; y: number }) => {
    const newNode = makeNewNode();
    insertRfNode(newNode, position);
    const entry = dsl.nodes.length === 0 ? newNode.id : dsl.entry;
    onChange({ ...dsl, nodes: [...dsl.nodes, newNode], entry });
  }, [dsl, onChange, makeNewNode, insertRfNode]);

  // Add node + connect to a specific handle
  const addRuleAndConnect = useCallback(
    (sourceNodeId: string, sourceHandleType: "source" | "target") => {
      const newNode = makeNewNode();
      const newEdge: DSLEdge = sourceHandleType === "source"
        ? { from: sourceNodeId, to: newNode.id }
        : { from: newNode.id, to: sourceNodeId };

      // Position relative to the source node
      const sourceRfNode = nodes.find((n) => n.id === sourceNodeId);
      const position = sourceRfNode
        ? { x: sourceRfNode.position.x + (sourceHandleType === "source" ? 250 : -250), y: sourceRfNode.position.y }
        : { x: 0, y: 0 };
      insertRfNode(newNode, position);

      setEdges((eds) => [
        ...eds,
        { id: `${newEdge.from}-${newEdge.to}`, source: newEdge.from, target: newEdge.to, style: EDGE_STYLE },
      ]);

      const entry = dsl.nodes.length === 0 ? newNode.id : dsl.entry;
      onChange({ ...dsl, nodes: [...dsl.nodes, newNode], edges: [...dsl.edges, newEdge], entry });
    },
    [dsl, onChange, setEdges, makeNewNode, nodes, insertRfNode]
  );

  // Track connection drag start
  const onConnectStart = useCallback(
    (_event: MouseEvent | TouchEvent, params: { nodeId: string | null; handleType: "source" | "target" | null }) => {
      if (params.nodeId && params.handleType) {
        connectStartRef.current = { nodeId: params.nodeId, handleType: params.handleType };
      }
    },
    []
  );

  // Connection drag ended on empty canvas → show menu
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const target = event.target as Element;
      const targetIsPane = target?.classList?.contains("react-flow__pane");
      if (!targetIsPane || !connectStartRef.current) {
        connectStartRef.current = null;
        return;
      }

      const clientX = "changedTouches" in event ? event.changedTouches[0].clientX : event.clientX;
      const clientY = "changedTouches" in event ? event.changedTouches[0].clientY : event.clientY;

      setHandleMenu({
        x: clientX,
        y: clientY,
        sourceNodeId: connectStartRef.current.nodeId,
        sourceHandleType: connectStartRef.current.handleType,
      });
      connectStartRef.current = null;
    },
    []
  );

  // Click on handle dot → show menu
  const handlePaneClick = useCallback(() => {
    setHandleMenu(null);
  }, []);

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const target = event.target as HTMLElement;
      const isHandle = target.classList.contains("react-flow__handle");
      if (!isHandle) return;

      event.stopPropagation();

      const pos = target.dataset.handlepos;
      const handleType: "source" | "target" = pos === "right" ? "source" : "target";

      setHandleMenu({
        x: event.clientX,
        y: event.clientY,
        sourceNodeId: node.id,
        sourceHandleType: handleType,
      });
    },
    []
  );

  const handleAddFromMenu = useCallback(
    (type: string) => {
      if (!handleMenu) return;
      if (type === "rule") {
        addRuleAndConnect(handleMenu.sourceNodeId, handleMenu.sourceHandleType);
      }
      setHandleMenu(null);
    },
    [handleMenu, addRuleAndConnect]
  );

  // Drag and drop from sidebar
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/rulekit-node");
      if (!type) return;
      if (type === "rule") {
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        addRuleAt(position);
      }
    },
    [addRuleAt, reactFlowInstance]
  );

  const handleFitView = useCallback(() => {
    reactFlowInstance.fitView();
  }, [reactFlowInstance]);

  // Close menu on outside click
  useEffect(() => {
    if (!handleMenu) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-handle-menu]")) return;
      setHandleMenu(null);
    };
    setTimeout(() => window.addEventListener("click", handler), 0);
    return () => window.removeEventListener("click", handler);
  }, [handleMenu]);

  return (
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      {/* Component sidebar */}
      <div style={sidebarStyle}>
        <div style={sidebarTitleStyle}>Components</div>
        <DraggableComponent type="rule" icon="R" label="Rule" />
        <div style={sidebarHintStyle}>Drag onto canvas, or click a handle dot to add & connect</div>
      </div>

      {/* Canvas */}
      <div ref={reactFlowWrapper} style={{ flex: 1, position: "relative" }} onKeyDown={handleKeyDown} tabIndex={0}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onReconnect={onReconnect}
          onEdgesDelete={onEdgesDelete}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onNodeClick={onNodeClick}
          onPaneClick={handlePaneClick}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode={["Backspace", "Delete"]}
          proOptions={{ hideAttribution: true }}
          snapToGrid
          snapGrid={[10, 10]}
          connectionLineStyle={{ stroke: "var(--orange)", strokeWidth: 1.5 }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(28,28,26,0.12)" />
          <MiniMap style={{ background: "white" }} />
          <Controls position="bottom-left" style={{ marginBottom: 60 }} />
        </ReactFlow>

        {/* Fit view button */}
        <button onClick={handleFitView} style={fitBtnStyle} title="Fit view">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 5V2C1 1.44772 1.44772 1 2 1H5M9 1H12C12.5523 1 13 1.44772 13 2V5M13 9V12C13 12.5523 12.5523 13 12 13H9M5 13H2C1.44772 13 1 12.5523 1 12V9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>

        {/* Handle menu */}
        {handleMenu && (
          <div
            data-handle-menu
            style={{
              ...menuStyle,
              left: handleMenu.x,
              top: handleMenu.y,
            }}
          >
            <div style={menuTitleStyle}>Add & connect</div>
            <button
              style={menuItemStyle}
              onClick={() => handleAddFromMenu("rule")}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <div style={{ ...componentIconStyle, width: 18, height: 18, fontSize: 9 }}>R</div>
              <span>Rule</span>
              <span style={menuHintStyle}>New rule node</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Canvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}

// Styles
const sidebarStyle: React.CSSProperties = {
  width: 160,
  borderRight: "1px solid var(--border)",
  background: "var(--white)",
  padding: "12px",
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  overflowY: "auto",
};

const sidebarTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--ink-subtle)",
  marginBottom: 4,
};

const componentCardStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  cursor: "grab",
  userSelect: "none",
  transition: "all 0.15s ease",
};

const sidebarHintStyle: React.CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 10,
  color: "var(--ink-subtle)",
  textAlign: "center",
  lineHeight: 1.4,
  marginTop: 4,
};

const componentIconStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: "50%",
  background: "var(--orange-dim)",
  color: "var(--orange)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 10,
  fontFamily: "var(--font-nunito)",
  fontWeight: 700,
  flexShrink: 0,
};

const componentLabelStyle: React.CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--ink)",
};

const fitBtnStyle: React.CSSProperties = {
  position: "absolute",
  top: 12,
  left: 12,
  background: "white",
  border: "1px solid var(--border-med)",
  borderRadius: 6,
  padding: "6px",
  cursor: "pointer",
  boxShadow: "0 1px 5px rgba(28,28,26,0.07)",
  zIndex: 5,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--ink-muted)",
};

const menuStyle: React.CSSProperties = {
  position: "fixed",
  background: "var(--white)",
  border: "1px solid var(--border-med)",
  borderRadius: 10,
  boxShadow: "0 4px 16px rgba(28,28,26,0.12)",
  zIndex: 50,
  padding: 6,
  minWidth: 180,
};

const menuTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 10,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--ink-subtle)",
  padding: "6px 10px 4px",
};

const menuItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "8px 10px",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  borderRadius: 6,
  fontFamily: "var(--font-nunito)",
  fontSize: 12,
  color: "var(--ink)",
  textAlign: "left",
};

const menuHintStyle: React.CSSProperties = {
  marginLeft: "auto",
  fontSize: 10,
  color: "var(--ink-subtle)",
  fontFamily: "var(--font-nunito)",
};
