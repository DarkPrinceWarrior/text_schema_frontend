import React, { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'reactflow';
import 'reactflow/dist/style.css';
import ELK from 'elkjs/lib/elk.bundled.js';

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
  label: React.ReactNode;
  sourceSpan?: [number, number];
}
type RFNode = Node<NodeData>;

// Константы конфигурации
const API_URL = 'http://127.0.0.1:8000';
const NODE_WIDTH = 180;
const NODE_HEIGHT = 60; 
const COLOR_PRIMARY = '#2c3e50';
const COLOR_SECONDARY = '#34495e';
const COLOR_ACTION = '#f39c12';
const COLOR_DECISION = '#ecf0f1';
const COLOR_DECISION_BORDER = '#bdc3c7';
const DEFAULT_TEXT =
  'Процесс начинается, когда клиент подает заявку. Система регистрирует заявку. Затем, специалист поддержки проверяет ее. Если заявка полная, специалист ее обрабатывает. Иначе, он связывается с клиентом для уточнений, после чего снова проверяет заявку.';

// --- Раскладка ELKjs ---
const elk = new ELK();
const getLayoutedElements = async (nodes: RFNode[], edges: Edge[]) => {
  const graph = {
    id: 'root',
    layoutOptions: { 
        'elk.algorithm': 'layered',
        'elk.direction': 'DOWN',
        'elk.spacing.nodeNode': '80',
        'elk.layered.spacing.nodeNodeBetweenLayers': '100',
        'elk.edgeRouting': 'ORTHOGONAL',
    },
    children: nodes.map((node: RFNode) => ({ ...node, width: NODE_WIDTH, height: NODE_HEIGHT })),
    edges: edges.map((edge: Edge) => ({ id: edge.id, sources: [edge.source], targets: [edge.target] })),
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
const CustomNodeContent: React.FC<CustomNodeContentProps> = ({ label, actor, isAction }) => (
  <div style={{ padding: '5px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
    <div style={{ fontWeight: 'bold', marginBottom: actor ? '4px' : '0' }}>{label}</div>
    {actor && (
      <div style={{ fontSize: '12px', color: isAction ? '#ffffff' : COLOR_SECONDARY, fontStyle: 'italic', opacity: 0.9 }}>
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
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const onNodeClick = useCallback((event: React.MouseEvent, node: RFNode) => {
    setSelectedNodeId(node.id);
  }, []);

  const processText = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/process-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: FlowData = await response.json();

      const reactFlowNodes: RFNode[] = data.nodes.map((node) => {
        const isAction = node.type === 'action' && Boolean(node.actor);
        return {
          id: node.id,
          type: 'default',
          data: { 
            label: <CustomNodeContent label={node.label} actor={node.actor} isAction={isAction} />,
            sourceSpan: node.sourceSpan
          },
          position: { x: 0, y: 0 },
          style: {
            backgroundColor: isAction ? COLOR_ACTION : COLOR_DECISION,
            borderColor: isAction ? COLOR_ACTION : COLOR_DECISION_BORDER,
            color: isAction ? '#ffffff' : COLOR_PRIMARY,
            borderRadius: 8, width: NODE_WIDTH, textAlign: 'center', padding: 0,
          },
        };
      });

      const reactFlowEdges: Edge[] = data.edges.map((edge, i) => ({
        id: `e-${edge.from}-${edge.to}-${i}`,
        source: edge.from, target: edge.to, label: edge.label,
        type: 'smoothstep', animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: COLOR_SECONDARY },
        style: { stroke: COLOR_SECONDARY },
        labelBgStyle: { fill: '#fff', stroke: COLOR_DECISION_BORDER, fillOpacity: 0.7 },
        labelStyle: { fill: COLOR_PRIMARY },
      }));
      
      const layoutResult = await getLayoutedElements(reactFlowNodes, reactFlowEdges);
      if (layoutResult) {
        setNodes(layoutResult.nodes);
        setEdges(layoutResult.edges);
      }
    } catch (e) {
      setError('Не удалось получить или обработать схему. Убедитесь, что бэкенд-сервер запущен.');
    } finally {
      setIsLoading(false);
    }
  }, [text, setNodes, setEdges]);

  // Запускаем обработку только один раз при первой загрузке
  useEffect(() => {
    void processText();
  }, []); // Пустой массив зависимостей означает "выполнить один раз"

  // Эффект для подсветки узла и текста
  useEffect(() => {
    // Подсветка узла
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        style: {
          ...node.style,
          boxShadow: node.id === selectedNodeId ? `0 0 0 3px ${COLOR_ACTION}` : 'none',
          transition: 'box-shadow 0.2s ease-in-out',
        },
      }))
    );
    
    // Подсветка текста
    const selectedNode = nodes.find((n) => n.id === selectedNodeId);
    if (selectedNode?.data?.sourceSpan && textAreaRef.current) {
      const [start, end] = selectedNode.data.sourceSpan;
      textAreaRef.current.focus();
      textAreaRef.current.setSelectionRange(start, end);
    }
  }, [selectedNodeId, nodes, setNodes]);

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter, system-ui, Arial, sans-serif', backgroundColor: '#f0f0f0' }}>
      {/* Левая панель */}
      <div style={{ width: '33.333%', height: '100%', padding: 16, borderRight: `1px solid ${COLOR_DECISION_BORDER}`, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', backgroundColor: '#ffffff' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: COLOR_PRIMARY }}>Текст процесса</h2>
        <textarea
          ref={textAreaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Введите описание процесса..."
          style={{ width: '100%', flex: 1, padding: 12, border: `1px solid ${COLOR_DECISION_BORDER}`, borderRadius: 8, resize: 'none', outline: 'none', boxSizing: 'border-box', backgroundColor: '#ffffff' }}
        />
        <button
          onClick={processText}
          disabled={isLoading}
          style={{ marginTop: 16, width: '100%', backgroundColor: COLOR_PRIMARY, color: '#ffffff', padding: '10px 16px', borderRadius: 8, border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1 }}
        >
          {isLoading ? 'Обработка...' : 'Построить схему'}
        </button>
        {error && (<div style={{ marginTop: 8, color: 'red', fontSize: 14 }}>{error}</div>)}
        <div style={{ marginTop: 24, flexShrink: 0 }}>
          <h3 style={{ fontWeight: 700, color: COLOR_PRIMARY, marginBottom: 8 }}>Обозначения:</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ width: 16, height: 16, borderRadius: 4, marginRight: 8, backgroundColor: COLOR_ACTION }}></span>
                <span style={{ color: COLOR_SECONDARY }}>Действие</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ width: 16, height: 16, borderRadius: 4, marginRight: 8, backgroundColor: COLOR_DECISION, border: `1px solid ${COLOR_DECISION_BORDER}` }}></span>
                <span style={{ color: COLOR_SECONDARY }}>Решение / Другое</span>
              </li>
          </ul>
        </div>
      </div>
      {/* Правая панель */}
      <div style={{ width: '66.666%', height: '100%' }}>
        <ReactFlowProvider>
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView onNodeClick={onNodeClick}>
            <Background variant={'dots'} gap={24} size={1} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
}

export default App;
