import React, { useState, useEffect, useCallback, useRef } from "react";
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  BackgroundVariant,
  MarkerType,
  type Node,
  type Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import ELK from "elkjs/lib/elk.bundled.js";
import { toPng } from "html-to-image";

// --- Типы данных ---
interface FlowNode {
  id: string;
  label: string;
  type?: string;
  actor?: string;
  sourceSpan?: [number, number];
}
interface FlowEdge {
  from: string;
  to: string;
  label?: string;
}
interface FlowLane {
  id: string;
  label: string;
  nodes: string[];
}
interface FlowData {
  nodes: FlowNode[];
  edges: FlowEdge[];
  lanes?: FlowLane[];
}

// Тип данных узла React Flow
interface NodeData {
  // React-нода для стандартного рендера
  label: React.ReactNode;
  // Исходный редактируемый текст названия узла
  text: string;
  actor?: string;
  isAction?: boolean;
  sourceSpan?: [number, number];
}
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

// Кастомный компонент для узла
interface CustomNodeContentProps {
  label: string;
  actor?: string;
  isAction: boolean;
}
const CustomNodeContent: React.FC<CustomNodeContentProps> = ({
  label,
  actor,
  isAction,
}) => (
  <div
    style={{
      padding: "5px",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    }}
  >
    <div style={{ fontWeight: "bold", marginBottom: actor ? "4px" : "0" }}>
      {label}
    </div>
    {actor && (
      <div
        style={{
          fontSize: "12px",
          color: isAction ? "#ffffff" : COLOR_SECONDARY,
          fontStyle: "italic",
          opacity: 0.9,
        }}
      >
        {actor}
      </div>
    )}
  </div>
);

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const [text, setText] = useState(DEFAULT_TEXT);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Состояние контекстного меню
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    target: "node" | "edge";
    id: string;
  } | null>(null);

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
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
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/process-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
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
  }, [text, setNodes, setEdges]);

  // Убираем автоматическое построение схемы при загрузке
  // useEffect(() => {
  //   void processText();
  // }, []);

  // Эффект для подсветки узла
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
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
    if (!contextMenu || contextMenu.target !== "node") return;
    const node = nodes.find((n) => n.id === contextMenu.id);
    if (!node) return;
    const current = (node.data as NodeData).text ?? "";
    const next = window.prompt("Введите новое название узла", current);
    if (next != null && next !== current) {
      setNodes((nds) =>
        nds.map((n) => {
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
  }, [contextMenu, nodes, setNodes]);

  const handleDeleteFromContext = useCallback(() => {
    if (!contextMenu) return;
    const { target, id } = contextMenu;
    if (target === "node") {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    } else {
      setEdges((eds) => eds.filter((e) => e.id !== id));
    }
    setContextMenu(null);
  }, [contextMenu, setNodes, setEdges]);

  // Закрываем меню по клику в пустом месте/панели
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const menuItemStyle: React.CSSProperties = {
    padding: "8px 12px",
    cursor: "pointer",
    userSelect: "none",
  };

  // Поиск диапазона подсветки в тексте по тексту узла с учетом вариаций пробелов/регистра
  const escapeRegex = useCallback(
    (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    []
  );

  const findHighlightRange = useCallback(
    (
      fullText: string,
      nodeText: string | undefined,
      hint?: [number, number] | undefined
    ): [number, number] | null => {
      if (!nodeText) return null;
      const trimmed = nodeText.trim();
      if (!trimmed) return null;

      const searchInWindow = (
        startIdx: number,
        endIdx: number
      ): [number, number] | null => {
        const safeStart = Math.max(0, startIdx);
        const safeEnd = Math.min(fullText.length, endIdx);
        if (safeStart >= safeEnd) return null;
        const windowText = fullText.slice(safeStart, safeEnd);
        const escaped = escapeRegex(trimmed);
        const pattern = escaped.replace(/\\s+/g, "\\s+");
        const re = new RegExp(pattern, "i");
        const match = re.exec(windowText);
        if (match && typeof match.index === "number") {
          const absStart = safeStart + match.index;
          return [absStart, absStart + match[0].length];
        }
        return null;
      };

      // 1) Пытаемся найти рядом с подсказкой sourceSpan
      if (hint) {
        const [hs, he] = hint;
        const r1 = searchInWindow(hs - 200, he + 200);
        if (r1) return r1;
      }

      // 2) Пытаемся найти по всему тексту (регистронезависимо, гибко к пробелам)
      const r2 = searchInWindow(0, fullText.length);
      if (r2) return r2;

      // 3) Жесткий поиск как запасной вариант
      const exactPos = fullText.indexOf(trimmed);
      if (exactPos >= 0) return [exactPos, exactPos + trimmed.length];
      const lowerPos = fullText.toLowerCase().indexOf(trimmed.toLowerCase());
      if (lowerPos >= 0) return [lowerPos, lowerPos + trimmed.length];

      // 4) Возвращаем исходный hint, если есть
      return hint ?? null;
    },
    [escapeRegex]
  );

  // Функция экспорта схемы в PNG
  const exportToPng = useCallback(async () => {
    if (!reactFlowWrapper.current || nodes.length === 0) return;

    setIsExporting(true);
    setError(null); // Очищаем предыдущие ошибки

    try {
      // Небольшая задержка для корректного рендеринга
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Находим элемент ReactFlow
      const reactFlowElement = reactFlowWrapper.current.querySelector(
        ".react-flow__viewport"
      );
      if (!reactFlowElement) {
        throw new Error("Не найден элемент схемы");
      }

      // Генерируем PNG напрямую из viewport
      const dataUrl = await toPng(reactFlowElement as HTMLElement, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        skipAutoScale: true,
        cacheBust: true,
        filter: (node) => {
          if (!node.classList) return true;
          return (
            !node.classList.contains("react-flow__controls") &&
            !node.classList.contains("react-flow__minimap") &&
            !node.classList.contains("react-flow__panel")
          );
        },
      });

      // Создаем ссылку для скачивания
      const link = document.createElement("a");
      link.download = "process-schema.png";
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Ошибка при экспорте:", error);
      setError("Не удалось экспортировать схему. Попробуйте еще раз.");
    } finally {
      setIsExporting(false);
    }
  }, [nodes]);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "Inter, system-ui, Arial, sans-serif",
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
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            marginBottom: 16,
            color: COLOR_PRIMARY,
          }}
        >
          Текст процесса
        </h2>
        <div style={{ position: "relative", flex: 1 }}>
          <textarea
            ref={textAreaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Введите описание процесса..."
            style={{
              width: "100%",
              height: "100%",
              padding: 12,
              border: `2px solid ${COLOR_DECISION_BORDER}`,
              borderRadius: 8,
              resize: "none",
              outline: "none",
              boxSizing: "border-box",
              backgroundColor: "#ffffff",
              fontSize: "14px",
              lineHeight: "1.5",
              fontFamily: "inherit",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: "none",
              padding: 12,
              fontSize: "14px",
              lineHeight: "1.5",
              fontFamily: "inherit",
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
              overflow: "hidden",
              borderRadius: 8,
            }}
          >
            {selectedNodeId &&
              (() => {
                const selectedNode = nodes.find((n) => n.id === selectedNodeId);
                const nodeText = (selectedNode?.data as any)?.text as
                  | string
                  | undefined;
                const matchRange = findHighlightRange(
                  text,
                  nodeText,
                  (selectedNode?.data as any)?.sourceSpan
                );
                if (matchRange) {
                  const [start, end] = matchRange;
                  const before = text.substring(0, start);
                  const highlighted = text.substring(start, end);
                  const after = text.substring(end);
                  return (
                    <>
                      <span style={{ color: "transparent" }}>{before}</span>
                      <span
                        style={{
                          backgroundColor: COLOR_TEXT_HIGHLIGHT,
                          border: `1px solid ${COLOR_TEXT_HIGHLIGHT_BORDER}`,
                          borderRadius: "4px",
                          padding: "2px 3px",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                          color: "transparent",
                          outline: `2px solid ${COLOR_SELECTED}`,
                          outlineOffset: "1px",
                        }}
                      >
                        {highlighted}
                      </span>
                      <span style={{ color: "transparent" }}>{after}</span>
                    </>
                  );
                }
                return null;
              })()}
          </div>
        </div>
        <button
          onClick={processText}
          disabled={isLoading || !text.trim()}
          style={{
            marginTop: 16,
            width: "100%",
            backgroundColor: COLOR_PRIMARY,
            color: "#ffffff",
            padding: "10px 16px",
            borderRadius: 8,
            border: "none",
            cursor: isLoading || !text.trim() ? "not-allowed" : "pointer",
            opacity: isLoading || !text.trim() ? 0.6 : 1,
          }}
        >
          {isLoading ? "Обработка..." : "Построить схему"}
        </button>
        <button
          onClick={exportToPng}
          disabled={isExporting || nodes.length === 0}
          style={{
            marginTop: 8,
            width: "100%",
            backgroundColor: COLOR_ACTION,
            color: "#ffffff",
            padding: "10px 16px",
            borderRadius: 8,
            border: "none",
            cursor:
              isExporting || nodes.length === 0 ? "not-allowed" : "pointer",
            opacity: isExporting || nodes.length === 0 ? 0.6 : 1,
          }}
        >
          {isExporting ? "Экспорт..." : "Экспорт в PNG"}
        </button>
        {error && (
          <div style={{ marginTop: 8, color: "red", fontSize: 14 }}>
            {error}
          </div>
        )}
        <div style={{ marginTop: 24, flexShrink: 0 }}>
          <h3
            style={{ fontWeight: 700, color: COLOR_PRIMARY, marginBottom: 8 }}
          >
            Обозначения:
          </h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <li
              style={{ display: "flex", alignItems: "center", marginBottom: 4 }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  marginRight: 8,
                  backgroundColor: COLOR_ACTION,
                }}
              ></span>
              <span style={{ color: COLOR_SECONDARY }}>Действие</span>
            </li>
            <li
              style={{ display: "flex", alignItems: "center", marginBottom: 4 }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  marginRight: 8,
                  backgroundColor: COLOR_DECISION,
                  border: `1px solid ${COLOR_DECISION_BORDER}`,
                }}
              ></span>
              <span style={{ color: COLOR_SECONDARY }}>Решение / Другое</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Правая панель */}
      <div
        ref={reactFlowWrapper}
        style={{ width: "66.666%", height: "100%", position: "relative" }}
      >
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            onNodeClick={onNodeClick}
            onNodeContextMenu={onNodeContextMenu}
            onEdgeContextMenu={onEdgeContextMenu}
            onPaneClick={closeContextMenu}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
            <Controls />
            <MiniMap />
          </ReactFlow>

          {/* Контекстное меню */}
          {contextMenu && (
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
                <div onClick={handleEditFromContext} style={menuItemStyle}>
                  ✏️ Редактировать
                </div>
              )}
              <div
                onClick={handleDeleteFromContext}
                style={{ ...menuItemStyle, color: "#c0392b" }}
              >
                🗑 Удалить
              </div>
            </div>
          )}
        </ReactFlowProvider>
      </div>
    </div>
  );
}

export default App;
