import React from "react";

interface CustomNodeContentProps {
  label: string;
  actor?: string;
  isAction: boolean;
}

const COLOR_SECONDARY = "#34495e";

export const CustomNodeContent: React.FC<CustomNodeContentProps> = ({
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
