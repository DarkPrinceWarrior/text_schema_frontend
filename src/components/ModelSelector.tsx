import React, { useState, useEffect } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

interface Model {
  id: string;
  name: string;
  description: string;
}

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  isLoading?: boolean;
}

const COLOR_PRIMARY = "#2c3e50";
const COLOR_DECISION_BORDER = "#bdc3c7";
const COLOR_DANGER = "#e74c3c";

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  isLoading = false,
}) => {
  const [models, setModels] = useState<Model[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch(`${API_URL}/models`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        setModels(data.models);
        setError(null);

        // Автоматически выбираем первую модель, если ничего не выбрано
        if (!selectedModel && data.models.length > 0) {
          onModelChange(data.models[0].id);
        }
      } catch (e) {
        console.error("Ошибка при загрузке моделей:", e);
        setError("Не удалось загрузить список моделей");
      } finally {
        setLoadingModels(false);
      }
    };

    fetchModels();
  }, [API_URL, selectedModel, onModelChange]);

  const selectedModelData = models.find((m) => m.id === selectedModel);

  if (loadingModels) {
    return (
      <div
        style={{
          padding: "10px 16px",
          borderRadius: 8,
          border: `2px solid ${COLOR_DECISION_BORDER}`,
          backgroundColor: "#f8f9fa",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: "14px",
          color: COLOR_PRIMARY,
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            border: "2px solid transparent",
            borderTop: `2px solid ${COLOR_PRIMARY}`,
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        Загрузка моделей...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: "10px 16px",
          borderRadius: 8,
          border: `2px solid ${COLOR_DANGER}`,
          backgroundColor: "#fdf2f2",
          fontSize: "14px",
          color: COLOR_DANGER,
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "10px 16px",
            borderRadius: 8,
            border: `2px solid ${COLOR_DECISION_BORDER}`,
            backgroundColor: "#ffffff",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.6 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "14px",
            color: COLOR_PRIMARY,
            outline: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <div style={{ fontWeight: 600 }}>
              {selectedModelData?.name || "Выберите модель"}
            </div>
            {selectedModelData && (
              <div style={{ fontSize: "12px", color: "#6c757d", marginTop: 2 }}>
                {selectedModelData.description}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ transition: "transform 0.2s" }}>▼</span>
          </div>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="start"
          sideOffset={4}
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 8,
            border: `2px solid ${COLOR_DECISION_BORDER}`,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            maxHeight: "300px",
            overflowY: "auto",
            minWidth: "var(--radix-dropdown-menu-trigger-width)",
            zIndex: 1000,
          }}
        >
          {models.map((model) => (
            <DropdownMenu.Item
              key={model.id}
              onSelect={() => onModelChange(model.id)}
              style={{
                padding: "12px 16px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                borderBottom: `1px solid ${COLOR_DECISION_BORDER}`,
                outline: "none",
                backgroundColor:
                  model.id === selectedModel ? "#f8f9fa" : "transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f8f9fa";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  model.id === selectedModel ? "#f8f9fa" : "transparent";
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    color: COLOR_PRIMARY,
                    fontSize: "14px",
                  }}
                >
                  {model.name}
                </span>
              </div>
              <span
                style={{ fontSize: "12px", color: "#6c757d", marginTop: 2 }}
              >
                {model.description}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: "#adb5bd",
                  marginTop: 2,
                  fontFamily: "monospace",
                }}
              >
                {model.id}
              </span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
