import React from "react";

const COLOR_PRIMARY = "#2c3e50";
const COLOR_SECONDARY = "#34495e";
const COLOR_ACTION = "#f39c12";
const COLOR_DECISION = "#ecf0f1";
const COLOR_DECISION_BORDER = "#bdc3c7";

export const Legend: React.FC = () => {
  return (
    <div style={{ marginTop: 24, flexShrink: 0 }}>
      <h3 style={{ fontWeight: 700, color: COLOR_PRIMARY, marginBottom: 8 }}>
        Обозначения:
      </h3>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        <li style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
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
        <li style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
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
  );
};
