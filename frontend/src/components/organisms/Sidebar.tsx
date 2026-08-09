import React from "react";
import { AppStep } from "../../types";

interface SidebarProps {
  currentStep: AppStep;
  onSelectStep: (step: AppStep) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  hasValidation: boolean;
  hasReconciliation: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentStep,
  onSelectStep,
  isExpanded,
  onToggleExpand,
  hasValidation,
  hasReconciliation,
}) => {
  return (
    <aside
      className={`sidebar ${isExpanded ? "expanded" : "collapsed"}`}
      aria-label="Main Navigation"
    >
      <div className="sidebar-header">
        {isExpanded && (
          <span className="brand-title">
            <svg
              width="60"
              height="60"
              viewBox="0 0 680 680"
              role="img"
              style={{
                maxWidth: "60px",
                display: "inline-block",
                verticalAlign: "middle",
              }}
            >
              <path
                d="M170,340
                C170,255 265,255 340,340
                C415,425 510,425 510,340
                C510,255 415,255 340,340
                C265,425 170,425 170,340 Z"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="34"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>

              <path
                d="M340 300 L 352 328 L 380 340 L 352 352 L 340 380 L 328 352 L 300 340 L 328 328 Z"
                fill="#FFFFFF"
              ></path>
            </svg>
            AdTech
          </span>
        )}
        <button
          type="button"
          className="toggle-sidebar-btn"
          onClick={onToggleExpand}
          aria-label={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
          title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          ☰
        </button>
      </div>

      <nav className="sidebar-nav">
        <button
          type="button"
          className={`nav-item ${currentStep === "upload" ? "active" : ""}`}
          onClick={() => onSelectStep("upload")}
          title="Upload & Validate"
        >
          <span className="nav-icon">📤</span>
          {isExpanded && (
            <span className="nav-label">1. Upload & Validate</span>
          )}
        </button>

        <button
          type="button"
          className={`nav-item ${currentStep === "review" ? "active" : ""}`}
          onClick={() => onSelectStep("review")}
          disabled={!hasValidation}
          title="AI Review"
        >
          <span className="nav-icon">🔍</span>
          {isExpanded && <span className="nav-label">2. Review</span>}
        </button>

        <button
          type="button"
          className={`nav-item ${currentStep === "reconciliation" ? "active" : ""}`}
          onClick={() => onSelectStep("reconciliation")}
          disabled={!hasReconciliation}
          title="Reconciliation"
        >
          <span className="nav-icon">⚖</span>
          {isExpanded && <span className="nav-label">3. Reconciliation</span>}
        </button>

        <button
          type="button"
          className={`nav-item ${currentStep === "scheduling" ? "active" : ""}`}
          onClick={() => onSelectStep("scheduling")}
          title="Automated Scheduling"
        >
          <span className="nav-icon">⏱</span>
          {isExpanded && <span className="nav-label">4. Scheduling</span>}
        </button>

        <button
          type="button"
          className={`nav-item ${currentStep === "dashboard" ? "active" : ""}`}
          onClick={() => onSelectStep("dashboard")}
          title="Dashboard & Audit"
        >
          <span className="nav-icon">📊</span>
          {isExpanded && <span className="nav-label">Dashboard & Audit</span>}
        </button>

        <button
          type="button"
          className={`nav-item ${currentStep === "assistant" ? "active" : ""}`}
          onClick={() => onSelectStep("assistant")}
          title="RAG Assistant"
        >
          <span className="nav-icon">🤖</span>
          {isExpanded && <span className="nav-label">Chat Assistant</span>}
        </button>
      </nav>

      {isExpanded && (
        <div className="sidebar-footer">
          <p className="footer-version">App v1.0</p>
        </div>
      )}
    </aside>
  );
};
