import React, { useCallback, useState } from "react";
import { toPng } from "html-to-image";
import type { Node as FlowNode, Edge } from "reactflow";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  DownloadIcon,
  ImageIcon,
  FileTextIcon,
  CodeIcon,
  TableIcon,
} from "@radix-ui/react-icons";

interface NodeData {
  label: React.ReactNode;
  text: string;
  actor?: string;
  isAction?: boolean;
  sourceSpan?: [number, number];
}

interface ExportPanelProps {
  nodes: FlowNode[];
  edges: Edge[];
  reactFlowWrapper: React.RefObject<HTMLDivElement>;
  setError: (error: string | null) => void;
}

const COLOR_ACTION = "#f39c12";
const COLOR_PRIMARY = "#2c3e50";

export const ExportPanel: React.FC<ExportPanelProps> = ({
  nodes,
  edges,
  reactFlowWrapper,
  setError,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const exportToPng = useCallback(async () => {
    if (!reactFlowWrapper.current || nodes.length === 0) return;

    setIsExporting(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const reactFlowElement = reactFlowWrapper.current.querySelector(
        ".react-flow__viewport"
      );
      if (!reactFlowElement) {
        throw new Error("Не найден элемент схемы");
      }

      const dataUrl = await toPng(reactFlowElement as HTMLElement, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        skipAutoScale: true,
        cacheBust: true,
        skipFonts: true,
        filter: (node) => {
          if (!node.classList) return true;
          return (
            !node.classList.contains("react-flow__controls") &&
            !node.classList.contains("react-flow__minimap") &&
            !node.classList.contains("react-flow__panel")
          );
        },
      });

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
  }, [nodes, reactFlowWrapper, setError]);

  const exportToBpmn = useCallback(() => {
    if (nodes.length === 0) return;

    try {
      const bpmnXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
${nodes
  .map((node) => {
    const nodeData = node.data as NodeData;
    const taskType = nodeData.isAction ? "bpmn:task" : "bpmn:exclusiveGateway";
    return `    <${taskType} id="${node.id}" name="${nodeData.text}" />`;
  })
  .join("\n")}
${edges
  .map(
    (edge) =>
      `    <bpmn:sequenceFlow id="${edge.id}" sourceRef="${edge.source}" targetRef="${edge.target}" />`
  )
  .join("\n")}
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
${nodes
  .map((node) => {
    return `      <bpmndi:BPMNShape id="${node.id}_di" bpmnElement="${node.id}">
        <dc:Bounds x="${node.position.x}" y="${node.position.y}" width="100" height="80" />
      </bpmndi:BPMNShape>`;
  })
  .join("\n")}
${edges
  .map((edge) => {
    return `      <bpmndi:BPMNEdge id="${edge.id}_di" bpmnElement="${edge.id}">
        <di:waypoint x="150" y="150" />
        <di:waypoint x="250" y="150" />
      </bpmndi:BPMNEdge>`;
  })
  .join("\n")}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

      const blob = new Blob([bpmnXml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = "process-schema.bpmn";
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Ошибка при экспорте в BPMN:", error);
      setError("Не удалось экспортировать в BPMN. Попробуйте еще раз.");
    }
  }, [nodes, edges, setError]);

  const exportToJson = useCallback(() => {
    if (nodes.length === 0) return;

    try {
      const exportData = {
        nodes: nodes.map((node) => ({
          id: node.id,
          label: (node.data as NodeData).text,
          actor: (node.data as NodeData).actor,
          type: (node.data as NodeData).isAction ? "action" : "decision",
          position: node.position,
        })),
        edges: edges.map((edge) => ({
          id: edge.id,
          from: edge.source,
          to: edge.target,
          label: edge.label,
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = "process-schema.json";
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Ошибка при экспорте в JSON:", error);
      setError("Не удалось экспортировать в JSON. Попробуйте еще раз.");
    }
  }, [nodes, edges, setError]);

  const exportToMermaid = useCallback(() => {
    if (nodes.length === 0) return;

    try {
      let mermaidText = "graph TD\n";

      nodes.forEach((node) => {
        const nodeData = node.data as NodeData;
        const shape = nodeData.isAction ? "[]" : "{}";
        const leftBracket = shape[0];
        const rightBracket = shape[1];
        mermaidText += `    ${node.id}${leftBracket}"${nodeData.text}"${rightBracket}\n`;
      });

      edges.forEach((edge) => {
        const label = edge.label ? `|"${edge.label}"` : "";
        mermaidText += `    ${edge.source} -->${label} ${edge.target}\n`;
      });

      const blob = new Blob([mermaidText], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = "process-schema.mmd";
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Ошибка при экспорте в Mermaid:", error);
      setError("Не удалось экспортировать в Mermaid. Попробуйте еще раз.");
    }
  }, [nodes, edges, setError]);

  const handleExportFormat = async (format: string) => {
    switch (format) {
      case "png":
        await exportToPng();
        break;
      case "bpmn":
        exportToBpmn();
        break;
      case "mermaid":
        exportToMermaid();
        break;
      case "json":
        exportToJson();
        break;
    }
  };

  const isDisabled = isExporting || nodes.length === 0;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild disabled={isDisabled}>
        <button
          disabled={isDisabled}
          style={{
            minWidth: 140,
            backgroundColor: COLOR_ACTION,
            color: "#ffffff",
            padding: "10px 16px",
            borderRadius: 8,
            border: "none",
            cursor: isDisabled ? "not-allowed" : "pointer",
            opacity: isDisabled ? 0.6 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {isExporting && (
            <div
              style={{
                width: 12,
                height: 12,
                border: "2px solid transparent",
                borderTop: "2px solid #ffffff",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
          )}
          <DownloadIcon />
          <span>{isExporting ? "Экспорт..." : "Экспорт"}</span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={5}
          style={{
            minWidth: 220,
            backgroundColor: "#ffffff",
            borderRadius: 8,
            padding: 4,
            boxShadow:
              "0px 10px 38px -10px rgba(22, 23, 24, 0.35), 0px 10px 20px -15px rgba(22, 23, 24, 0.2)",
            border: "1px solid #e1e5e9",
            animationDuration: "400ms",
            animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
            willChange: "transform, opacity",
            zIndex: 1000,
          }}
        >
          <DropdownMenu.Item
            onSelect={() => handleExportFormat("png")}
            style={{
              fontSize: 14,
              lineHeight: 1,
              color: COLOR_PRIMARY,
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              height: 40,
              padding: "0 12px",
              position: "relative",
              userSelect: "none",
              outline: "none",
              cursor: "pointer",
            }}
            className="dropdown-item"
          >
            <ImageIcon style={{ marginRight: 8 }} />
            PNG (изображение)
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onSelect={() => handleExportFormat("bpmn")}
            style={{
              fontSize: 14,
              lineHeight: 1,
              color: COLOR_PRIMARY,
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              height: 40,
              padding: "0 12px",
              position: "relative",
              userSelect: "none",
              outline: "none",
              cursor: "pointer",
            }}
            className="dropdown-item"
          >
            <TableIcon style={{ marginRight: 8 }} />
            BPMN (бизнес-процесс)
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onSelect={() => handleExportFormat("mermaid")}
            style={{
              fontSize: 14,
              lineHeight: 1,
              color: COLOR_PRIMARY,
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              height: 40,
              padding: "0 12px",
              position: "relative",
              userSelect: "none",
              outline: "none",
              cursor: "pointer",
            }}
            className="dropdown-item"
          >
            <CodeIcon style={{ marginRight: 8 }} />
            Mermaid (диаграмма)
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onSelect={() => handleExportFormat("json")}
            style={{
              fontSize: 14,
              lineHeight: 1,
              color: COLOR_PRIMARY,
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              height: 40,
              padding: "0 12px",
              position: "relative",
              userSelect: "none",
              outline: "none",
              cursor: "pointer",
            }}
            className="dropdown-item"
          >
            <FileTextIcon style={{ marginRight: 8 }} />
            JSON (данные)
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .dropdown-item:hover,
          .dropdown-item:focus {
            background-color: #f8f9fa !important;
          }

          @keyframes slideDownAndFade {
            from {
              opacity: 0;
              transform: translateY(-2px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          [data-side="bottom"] {
            animation: slideDownAndFade 400ms cubic-bezier(0.16, 1, 0.3, 1);
          }
        `}
      </style>
    </DropdownMenu.Root>
  );
};
