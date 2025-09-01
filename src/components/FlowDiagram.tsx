import React, { useRef, useCallback } from "react";
import ReactFlow, {
  ReactFlowProvider,
  Controls,
  ControlButton,
  Background,
  MiniMap,
  BackgroundVariant,
  addEdge,
  MarkerType,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
} from "reactflow";
import "reactflow/dist/style.css";

interface NodeData {
  label: React.ReactNode;
  text: string;
  actor?: string;
  isAction?: boolean;
  sourceSpan?: [number, number];
}

interface FlowDiagramProps {
  nodes: Node<NodeData>[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onNodeClick: (event: React.MouseEvent, node: Node<NodeData>) => void;
  onNodeContextMenu: (event: React.MouseEvent, node: Node<NodeData>) => void;
  onEdgeContextMenu: (event: React.MouseEvent, edge: Edge) => void;
  onPaneClick: () => void;
  contextMenu: {
    x: number;
    y: number;
    target: "node" | "edge";
    id: string;
  } | null;
  onEditFromContext: () => void;
  onDeleteFromContext: () => void;
  isEditMode: boolean;
  onToggleEditMode: (enabled: boolean) => void;
}

const COLOR_SECONDARY = "#34495e";

export const FlowDiagram: React.FC<FlowDiagramProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  onNodeContextMenu,
  onEdgeContextMenu,
  onPaneClick,
  contextMenu,
  onEditFromContext,
  onDeleteFromContext,
  isEditMode,
  onToggleEditMode,
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      if (!isEditMode || !params.source || !params.target) return;

      const newEdge: Edge = {
        id: `e-${params.source}-${params.target}-${Date.now()}`,
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        type: "smoothstep",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: COLOR_SECONDARY },
        style: { stroke: COLOR_SECONDARY },
        labelBgStyle: {
          fill: "#fff",
          stroke: "#bdc3c7",
          fillOpacity: 0.7,
        },
        labelStyle: { fill: "#2c3e50" },
      };

      onEdgesChange([{ type: "add", item: newEdge }]);
    },
    [isEditMode, onEdgesChange]
  );

  const menuItemStyle: React.CSSProperties = {
    padding: "8px 12px",
    cursor: "pointer",
    userSelect: "none",
  };

  return (
    <div
      ref={reactFlowWrapper}
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={isEditMode ? onNodesChange : undefined}
          onEdgesChange={isEditMode ? onEdgesChange : undefined}
          onConnect={onConnect}
          fitView
          onNodeClick={onNodeClick}
          onNodeContextMenu={isEditMode ? onNodeContextMenu : undefined}
          onEdgeContextMenu={isEditMode ? onEdgeContextMenu : undefined}
          onPaneClick={onPaneClick}
          nodesDraggable={isEditMode}
          nodesConnectable={isEditMode}
          elementsSelectable={true}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
          <Controls showInteractive={false}>
            <ControlButton
              onClick={() => onToggleEditMode(!isEditMode)}
              title={
                isEditMode
                  ? "Выключить режим редактирования"
                  : "Включить режим редактирования"
              }
            >
              {isEditMode ? "🔒" : "✏️"}
            </ControlButton>
          </Controls>
          <MiniMap />
        </ReactFlow>

        {/* Контекстное меню */}
        {contextMenu && isEditMode && (
          <div
            style={{
              position: "fixed",
              top: contextMenu.y,
              left: contextMenu.x,
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: 8,
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              zIndex: 1000,
              overflow: "hidden",
              minWidth: 160,
            }}
          >
            {contextMenu.target === "node" && (
              <div onClick={onEditFromContext} style={menuItemStyle}>
                ✏️ Редактировать
              </div>
            )}
            <div
              onClick={onDeleteFromContext}
              style={{ ...menuItemStyle, color: "#c0392b" }}
            >
              🗑 Удалить
            </div>
          </div>
        )}
      </ReactFlowProvider>
    </div>
  );
};
