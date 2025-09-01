import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  useNodesState,
  useEdgesState,
  MarkerType,
  type Node,
  type Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import ELK from "elkjs/lib/elk.bundled.js";
import Fuse from "fuse.js";

// Компоненты
import { FlowDiagram } from "./components/FlowDiagram";
import { TextEditor } from "./components/TextEditor";
import { ExportPanel } from "./components/ExportPanel";
import { ModelSelector } from "./components/ModelSelector";

import { Legend } from "./components/Legend";
import { CustomNodeContent } from "./components/CustomNodeContent";

// Типы
import type { FlowData, NodeData } from "./types";

type RFNode = Node<NodeData>;

// Константы конфигурации
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;
const COLOR_PRIMARY = "#2c3e50";
const COLOR_SECONDARY = "#34495e";
const COLOR_ACTION = "#f39c12";
const COLOR_DECISION = "#ecf0f1";
const COLOR_DECISION_BORDER = "#bdc3c7";
const COLOR_SELECTED = "#e74c3c";
const COLOR_TEXT_HIGHLIGHT = "rgba(255, 243, 205, 0.6)";
const COLOR_TEXT_HIGHLIGHT_BORDER = "#ffeaa7";
const DEFAULT_TEXT =
  "Процесс начинается, когда клиент подает заявку. Система регистрирует заявку. Затем, специалист поддержки проверяет ее. Если заявка полная, специалист ее обрабатывает. Иначе, он связывается с клиентом для уточнений, после чего снова проверяет заявку.";

// --- Раскладка ELKjs ---
const elk = new ELK();
const getLayoutedElements = async (nodes: RFNode[], edges: Edge[]) => {
  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.spacing.nodeNode": "80",
      "elk.layered.spacing.nodeNodeBetweenLayers": "100",
      "elk.edgeRouting": "ORTHOGONAL",
    },
    children: nodes.map((node: RFNode) => ({
      ...node,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
    edges: edges.map((edge: Edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };
  try {
    const layoutedGraph = await elk.layout(graph);
    const children = layoutedGraph.children ?? [];
    return {
      nodes: children.map((node: any) => ({
        ...(nodes.find((n: RFNode) => n.id === node.id) as RFNode),
        position: { x: node.x, y: node.y },
      })),
      edges,
    };
  } catch {
    return { nodes, edges };
  }
};

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const [text, setText] = useState(DEFAULT_TEXT);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("");

  // Состояние контекстного меню
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    target: "node" | "edge";
    id: string;
  } | null>(null);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onNodeClick = useCallback((event: React.MouseEvent, node: RFNode) => {
    setSelectedNodeId(node.id);
  }, []);

  const processText = useCallback(async () => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      setError("Введите описание процесса для построения схемы");
      return;
    }
    if (!selectedModel) {
      setError("Выберите модель для обработки текста");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/process-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, model: selectedModel }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: FlowData = await response.json();

      const reactFlowNodes: RFNode[] = data.nodes.map((node) => {
        const isAction = node.type === "action" && Boolean(node.actor);
        const labelText = node.label;
        return {
          id: node.id,
          type: "default",
          data: {
            // Рендерим визуал
            label: (
              <CustomNodeContent
                label={labelText}
                actor={node.actor}
                isAction={isAction}
              />
            ),
            // Храним исходный текст, чтобы редактировать
            text: labelText,
            actor: node.actor,
            isAction,
            sourceSpan: node.sourceSpan,
          },
          position: { x: 0, y: 0 },
          style: {
            backgroundColor: isAction ? COLOR_ACTION : COLOR_DECISION,
            borderColor: isAction ? COLOR_ACTION : COLOR_DECISION_BORDER,
            color: isAction ? "#ffffff" : COLOR_PRIMARY,
            borderRadius: 8,
            width: NODE_WIDTH,
            textAlign: "center",
            padding: 0,
          },
        };
      });

      const reactFlowEdges: Edge[] = data.edges.map((edge, i) => ({
        id: `e-${edge.from}-${edge.to}-${i}`,
        source: edge.from,
        target: edge.to,
        label: edge.label,
        type: "smoothstep",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: COLOR_SECONDARY },
        style: { stroke: COLOR_SECONDARY },
        labelBgStyle: {
          fill: "#fff",
          stroke: COLOR_DECISION_BORDER,
          fillOpacity: 0.7,
        },
        labelStyle: { fill: COLOR_PRIMARY },
      }));

      const layoutResult = await getLayoutedElements(
        reactFlowNodes,
        reactFlowEdges
      );
      if (layoutResult && layoutResult.nodes.length > 0) {
        setNodes(layoutResult.nodes);
        setEdges(layoutResult.edges);
      } else {
        // Если раскладка не удалась, используем исходные данные
        setNodes(reactFlowNodes);
        setEdges(reactFlowEdges);
      }
    } catch (e) {
      console.error("Ошибка при обработке текста:", e);
      setError(
        "Не удалось получить или обработать схему. Убедитесь, что бэкенд-сервер запущен."
      );
    } finally {
      setIsLoading(false);
    }
  }, [text, selectedModel, setNodes, setEdges]);

  // Убираем автоматическое построение схемы при загрузке
  // useEffect(() => {
  //   void processText();
  // }, []);

  // Эффект для подсветки узла
  useEffect(() => {
    setNodes((nds: RFNode[]) =>
      nds.map((node: RFNode) => ({
        ...node,
        style: {
          ...node.style,
          boxShadow:
            node.id === selectedNodeId
              ? `0 0 0 3px ${COLOR_SELECTED}, 0 0 16px rgba(231, 76, 60, 0.22)`
              : "none",
          transition: "box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        },
      }))
    );
  }, [selectedNodeId, setNodes]);

  // Убрали нативное выделение текста через selectionRange, оставили только визуальную подсветку overlay

  // Контекстное меню — обработчики
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: RFNode) => {
      event.preventDefault();
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        target: "node",
        id: node.id,
      });
    },
    []
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        target: "edge",
        id: edge.id,
      });
    },
    []
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleEditFromContext = useCallback(() => {
    if (!contextMenu || contextMenu.target !== "node" || !isEditMode) return;
    const node = nodes.find((n: RFNode) => n.id === contextMenu.id);
    if (!node) return;
    const current = (node.data as NodeData).text ?? "";
    const next = window.prompt("Введите новое название узла", current);
    if (next != null && next !== current) {
      setNodes((nds: RFNode[]) =>
        nds.map((n: RFNode) => {
          if (n.id !== contextMenu.id) return n;
          const nd = n.data as NodeData;
          const updatedData: NodeData = {
            ...nd,
            text: next,
            label: (
              <CustomNodeContent
                label={next}
                actor={nd.actor}
                isAction={!!nd.isAction}
              />
            ),
          };
          return { ...n, data: updatedData };
        })
      );
    }
    setContextMenu(null);
  }, [contextMenu, nodes, setNodes, isEditMode]);

  const handleDeleteFromContext = useCallback(() => {
    if (!contextMenu || !isEditMode) return;
    const { target, id } = contextMenu;
    if (target === "node") {
      setNodes((nds: RFNode[]) => nds.filter((n: RFNode) => n.id !== id));
      setEdges((eds: Edge[]) =>
        eds.filter((e: Edge) => e.source !== id && e.target !== id)
      );
    } else {
      setEdges((eds: Edge[]) => eds.filter((e: Edge) => e.id !== id));
    }
    setContextMenu(null);
  }, [contextMenu, setNodes, setEdges, isEditMode]);

  // Закрываем меню по клику в пустом месте/панели
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const findHighlightRange = useCallback(
    (
      fullText: string,
      nodeText: string | undefined
    ): [number, number] | null => {
      if (!nodeText?.trim()) return null;

      const sentences = fullText
        .split(/[.!?]+/)
        .filter((s) => s.trim().length > 0)
        .map((sentence) => {
          const trimmed = sentence.trim();
          const startPos = fullText.indexOf(trimmed);
          return {
            text: trimmed,
            startPos,
            endPos: startPos + trimmed.length,
          };
        });

      if (sentences.length === 0) return null;

      const fuse = new Fuse(sentences, {
        keys: ["text"],
        includeScore: true,
        threshold: 0.8,
        ignoreLocation: true,
        minMatchCharLength: 2,
      });

      const results = fuse.search(nodeText.trim());

      if (results.length > 0 && 1 - (results[0].score || 1) > 0.2) {
        return [results[0].item.startPos, results[0].item.endPos];
      }

      return null;
    },
    []
  );

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        backgroundColor: "#f0f0f0",
      }}
    >
      {/* Левая панель */}
      <div
        style={{
          width: "33.333%",
          height: "100%",
          padding: 16,
          borderRight: `1px solid ${COLOR_DECISION_BORDER}`,
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          backgroundColor: "#ffffff",
        }}
      >
        <TextEditor
          text={text}
          setText={setText}
          onProcessText={processText}
          isLoading={isLoading}
          selectedNodeId={selectedNodeId}
          nodes={nodes}
          findHighlightRange={findHighlightRange}
          modelSelector={
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={(modelId) => {
                setSelectedModel(modelId);
                setError(null); // Убираем ошибку при выборе модели
              }}
              isLoading={isLoading}
            />
          }
          exportPanel={
            <ExportPanel
              nodes={nodes}
              edges={edges}
              reactFlowWrapper={reactFlowWrapper}
              setError={setError}
            />
          }
        />

        {error && (
          <div style={{ marginTop: 8, color: "red", fontSize: 14 }}>
            {error}
          </div>
        )}

        <Legend />
      </div>

      {/* Правая панель */}
      <div
        ref={reactFlowWrapper}
        style={{ width: "66.666%", height: "100%", position: "relative" }}
      >
        <FlowDiagram
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
          onPaneClick={closeContextMenu}
          contextMenu={contextMenu}
          onEditFromContext={handleEditFromContext}
          onDeleteFromContext={handleDeleteFromContext}
          isEditMode={isEditMode}
          onToggleEditMode={setIsEditMode}
        />
      </div>
    </div>
  );
}

export default App;
