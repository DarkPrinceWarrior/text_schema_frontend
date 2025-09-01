import React from "react";

export interface FlowNode {
  id: string;
  label: string;
  type?: string;
  actor?: string;
  sourceSpan?: [number, number];
}

export interface FlowEdge {
  from: string;
  to: string;
  label?: string;
}

export interface FlowLane {
  id: string;
  label: string;
  nodes: string[];
}

export interface FlowData {
  nodes: FlowNode[];
  edges: FlowEdge[];
  lanes?: FlowLane[];
}

export interface NodeData {
  label: React.ReactNode;
  text: string;
  actor?: string;
  isAction?: boolean;
  sourceSpan?: [number, number];
}
