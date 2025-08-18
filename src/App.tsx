import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Position,
  MarkerType,
  type Node,
  type Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';

// Константы конфигурации (без "магических" значений)
const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';
const NODE_WIDTH = 180;
const NODE_HEIGHT = 50;
const COLOR_PRIMARY = '#2c3e50';
const COLOR_SECONDARY = '#34495e';
const COLOR_MUTED = '#bdc3c7';
const DEFAULT_TEXT =
  'При ДТП: 1) Обеспечьте безопасность, выставьте знак. 2) Если есть пострадавшие — вызовите 112. 3) Зафиксируйте обстоятельства. 4) Если ущерб незначителен и участники согласны — оформите извещение, иначе вызовите ГИБДД.';

// Авто-раскладка графа на основе dagre
function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
): { nodes: Node[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    } as Node;
  });

  return { nodes: layoutedNodes, edges };
}

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const [text, setText] = useState(DEFAULT_TEXT);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const processText = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/process-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: {
        nodes: Array<{ id: string; label: string; type?: string }>;
        edges: Array<{ from: string; to: string; label?: string }>;
      } = await response.json();

      const reactFlowNodes: Node[] = data.nodes.map((node) => ({
        id: node.id,
        type: 'default',
        data: { label: node.label },
        position: { x: 0, y: 0 },
        style:
          node.type === 'decision'
            ? {
                backgroundColor: COLOR_SECONDARY,
                borderColor: COLOR_PRIMARY,
                color: '#ffffff',
                borderRadius: 8,
                width: NODE_WIDTH,
                textAlign: 'center',
              }
            : {
                backgroundColor: COLOR_MUTED,
                borderColor: COLOR_SECONDARY,
                borderRadius: 8,
                width: NODE_WIDTH,
                textAlign: 'center',
              },
      }));

      const reactFlowEdges: Edge[] = data.edges.map((edge, i) => ({
        id: `e-${edge.from}-${edge.to}-${i}`,
        source: edge.from,
        target: edge.to,
        label: edge.label,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed },
      }));

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        reactFlowNodes,
        reactFlowEdges
      );

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    } catch (e) {
      setError(
        'Не удалось получить или обработать схему. Убедитесь, что бэкенд-сервер запущен.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [text, setNodes, setEdges]);

  useEffect(() => {
    void processText();
  }, [processText]);

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        fontFamily: 'Inter, system-ui, Arial, sans-serif',
        backgroundColor: COLOR_MUTED,
      }}
    >
      {/* Левая панель: Редактор текста */}
      <div
        style={{
          width: '33.333%',
          height: '100%',
          padding: 16,
          borderRight: `1px solid ${COLOR_SECONDARY}`,
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: COLOR_PRIMARY }}>
          Текст процесса
        </h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Введите описание процесса, инструкции или регламента..."
          style={{
            width: '100%',
            flex: 1,
            padding: 12,
            border: `1px solid ${COLOR_SECONDARY}`,
            borderRadius: 8,
            resize: 'none',
            outline: 'none',
            boxSizing: 'border-box',
            backgroundColor: '#ffffff',
          }}
        />
        <button
          onClick={processText}
          disabled={isLoading}
          style={{
            marginTop: 16,
            width: '100%',
            backgroundColor: COLOR_PRIMARY,
            color: '#ffffff',
            padding: '10px 16px',
            borderRadius: 8,
            border: 'none',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {isLoading ? 'Обработка...' : 'Построить схему'}
        </button>
        {error && (
          <div style={{ marginTop: 8, color: COLOR_SECONDARY, fontSize: 14 }}>{error}</div>
        )}
      </div>

      {/* Правая панель: Схема */}
      <div style={{ width: '66.666%', height: '100%' }}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
}

export default App;


