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
import type { DSL, Rule } from "@/lib/types";
import InputNode from "./NodeTypes/InputNode";
import RuleNode from "./NodeTypes/RuleNode";
import OutputNode from "./NodeTypes/OutputNode";

const nodeTypes = {
  input: InputNode,
  rule: RuleNode,
  output: OutputNode,
};

const EDGE_STYLE = { stroke: "var(--border-med)", strokeWidth: 1.5 };

interface CanvasProps {
  dsl: DSL;
  onChange: (dsl: DSL) => void;
  onOpenTable?: (ruleId: string) => void;
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

  // Always connect input→output so dagre places them left-to-right even without rules
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
  onEditTable: (id: string) => void
): Node[] {
  const schemaFields = Object.keys(dsl.schema);
  const nodes: Node[] = [];

  nodes.push({
    id: "__input__",
    type: "input",
    position: { x: 0, y: 0 },
    data: { schema: dsl.schema },
  });

  for (const rule of dsl.rules) {
    nodes.push({
      id: rule.id,
      type: "rule",
      position: { x: 0, y: 0 },
      data: { rule, schemaFields, onEditTable },
    });
  }

  nodes.push({
    id: "__output__",
    type: "output",
    position: { x: 0, y: 0 },
    data: { defaultOutput: dsl.default },
  });

  return nodes;
}

// Build default edges for initial load (all rules connected input→rule→output)
function buildDefaultEdges(dsl: DSL): Edge[] {
  const edges: Edge[] = [];
  for (const rule of dsl.rules) {
    edges.push({
      id: `input-${rule.id}`,
      source: "__input__",
      target: rule.id,
      style: EDGE_STYLE,
    });
    edges.push({
      id: `${rule.id}-output`,
      source: rule.id,
      target: "__output__",
      style: EDGE_STYLE,
    });
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

function CanvasInner({ dsl, onChange, onOpenTable }: CanvasProps) {
  const reactFlowInstance = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [handleMenu, setHandleMenu] = useState<HandleMenuState | null>(null);
  const connectStartRef = useRef<{ nodeId: string; handleType: "source" | "target" } | null>(null);
  const isInitialLoad = useRef(true);

  const handleEditTable = useCallback(
    (id: string) => { onOpenTable?.(id); },
    [onOpenTable]
  );

  // Initial build: nodes + default edges, laid out together
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes = buildNodes(dsl, handleEditTable);
    const edges = buildDefaultEdges(dsl);
    const laid = layoutNodes(nodes, edges);
    return { initialNodes: laid, initialEdges: edges };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes when DSL changes, but preserve existing edges + only remove edges for deleted rules
  const prevRuleIdsRef = useRef(new Set(dsl.rules.map((r) => r.id)));

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    const currentRuleIds = new Set(dsl.rules.map((r) => r.id));
    const prevRuleIds = prevRuleIdsRef.current;

    // Find deleted rule IDs
    const deletedIds = new Set<string>();
    prevRuleIds.forEach((id) => {
      if (!currentRuleIds.has(id)) deletedIds.add(id);
    });

    prevRuleIdsRef.current = currentRuleIds;

    // Rebuild nodes (always reflects DSL)
    const newNodes = buildNodes(dsl, handleEditTable);

    // Remove edges that reference deleted nodes, keep everything else
    setEdges((prevEdges) =>
      prevEdges.filter(
        (e) => !deletedIds.has(e.source) && !deletedIds.has(e.target)
      )
    );

    // Layout nodes with current edges
    setNodes((prevNodes) => {
      // Preserve existing positions for nodes that haven't changed
      const posMap = new Map<string, { x: number; y: number }>();
      prevNodes.forEach((n) => posMap.set(n.id, n.position));

      return newNodes.map((n) => {
        const existingPos = posMap.get(n.id);
        if (existingPos) {
          return { ...n, position: existingPos };
        }
        // New node: position it to the right of the rightmost existing node
        const maxX = prevNodes.reduce((max, pn) => Math.max(max, pn.position.x), 0);
        const midY = prevNodes.reduce((sum, pn) => sum + pn.position.y, 0) / (prevNodes.length || 1);
        return { ...n, position: { x: maxX + 250, y: midY } };
      });
    });
  }, [dsl, handleEditTable, setNodes, setEdges]);

  // Manual handle-to-handle connect
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge({ ...connection, style: EDGE_STYLE }, eds)
      );
    },
    [setEdges]
  );

  const onReconnect: OnReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
    },
    [setEdges]
  );

  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      setEdges((eds) => eds.filter((e) => !deletedEdges.find((de) => de.id === e.id)));
    },
    [setEdges]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Backspace" || event.key === "Delete") {
        const selectedNodes = nodes.filter((n) => n.selected && n.type === "rule");
        if (selectedNodes.length === 0) return;
        const idsToDelete = new Set(selectedNodes.map((n) => n.id));
        const newRules = dsl.rules.filter((r) => !idsToDelete.has(r.id));
        onChange({ ...dsl, rules: newRules });
      }
    },
    [nodes, dsl, onChange]
  );

  // Drop from sidebar: add rule, no edges
  const addRuleOnly = useCallback(() => {
    const newRule: Rule = {
      id: crypto.randomUUID(),
      name: `Rule ${dsl.rules.length + 1}`,
      inputColumns: [],
      outputColumns: [],
      rows: [],
    };
    onChange({ ...dsl, rules: [...dsl.rules, newRule] });
  }, [dsl, onChange]);

  // Add rule + connect to a specific handle
  const addRuleAndConnect = useCallback(
    (sourceNodeId: string, sourceHandleType: "source" | "target") => {
      const newRuleId = crypto.randomUUID();
      const newRule: Rule = {
        id: newRuleId,
        name: `Rule ${dsl.rules.length + 1}`,
        inputColumns: [],
        outputColumns: [],
        rows: [],
      };

      // Pre-add the edge so it's there when the DSL sync runs
      if (sourceHandleType === "source") {
        setEdges((eds) => [
          ...eds,
          { id: `${sourceNodeId}-${newRuleId}`, source: sourceNodeId, target: newRuleId, style: EDGE_STYLE },
        ]);
      } else {
        setEdges((eds) => [
          ...eds,
          { id: `${newRuleId}-${sourceNodeId}`, source: newRuleId, target: sourceNodeId, style: EDGE_STYLE },
        ]);
      }

      onChange({ ...dsl, rules: [...dsl.rules, newRule] });
    },
    [dsl, onChange, setEdges]
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
      if (type === "rule") addRuleOnly();
    },
    [addRuleOnly]
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
