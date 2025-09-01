import React, { useRef } from "react";
import type { Node } from "reactflow";

interface NodeData {
  label: React.ReactNode;
  text: string;
  actor?: string;
  isAction?: boolean;
  sourceSpan?: [number, number];
}

interface TextEditorProps {
  text: string;
  setText: (text: string) => void;
  onProcessText: () => void;
  isLoading: boolean;
  selectedNodeId: string | null;
  nodes: Node<NodeData>[];
  findHighlightRange: (
    fullText: string,
    nodeText: string | undefined
  ) => [number, number] | null;
  modelSelector: React.ReactNode;
  exportPanel: React.ReactNode;
}

const COLOR_PRIMARY = "#2c3e50";
const COLOR_DECISION_BORDER = "#bdc3c7";
const COLOR_TEXT_HIGHLIGHT = "rgba(255, 243, 205, 0.6)";
const COLOR_TEXT_HIGHLIGHT_BORDER = "#ffeaa7";
const COLOR_SELECTED = "#e74c3c";

export const TextEditor: React.FC<TextEditorProps> = ({
  text,
  setText,
  onProcessText,
  isLoading,
  selectedNodeId,
  nodes,
  findHighlightRange,
  modelSelector,
  exportPanel,
}) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div
      style={{
        height: "100%",
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
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setText(e.target.value)
          }
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
            opacity: 1,
            cursor: "text",
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
              const matchRange = findHighlightRange(text, nodeText);
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
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button
          onClick={onProcessText}
          disabled={isLoading || !text.trim()}
          style={{
            flex: 1,
            backgroundColor: COLOR_PRIMARY,
            color: "#ffffff",
            padding: "10px 16px",
            borderRadius: 8,
            border: "none",
            cursor: isLoading || !text.trim() ? "not-allowed" : "pointer",
            opacity: isLoading || !text.trim() ? 0.6 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {isLoading && (
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
          {isLoading ? "Обработка..." : "Построить схему"}
        </button>
        {exportPanel}
      </div>
      <div style={{ marginTop: 16 }}>
        <h3
          style={{
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 8,
            color: COLOR_PRIMARY,
          }}
        >
          Модель ИИ
        </h3>
        {modelSelector}
      </div>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};
