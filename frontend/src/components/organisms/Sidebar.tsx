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
        {isExpanded && <span className="brand-title">AdTech Automation</span>}
        <button
          type="button"
          className="toggle-sidebar-btn"
          onClick={onToggleExpand}
          aria-label={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
          title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          {isExpanded ? "◀" : "▶"}
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
          {isExpanded && <span className="nav-label">2. AI Review</span>}
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
          className={`nav-item ${currentStep === "dashboard" ? "active" : ""}`}
          onClick={() => onSelectStep("dashboard")}
          title="Dashboard & Audit"
        >
          <span className="nav-icon">📊</span>
          {isExpanded && (
            <span className="nav-label">4. Dashboard & Audit</span>
          )}
        </button>

        <button
          type="button"
          className={`nav-item ${currentStep === "assistant" ? "active" : ""}`}
          onClick={() => onSelectStep("assistant")}
          title="RAG Assistant"
        >
          <span className="nav-icon">🤖</span>
          {isExpanded && <span className="nav-label">5. RAG Assistant</span>}
        </button>
      </nav>

      {isExpanded && (
        <div className="sidebar-footer">
          <p className="footer-version">App v2.4</p>
        </div>
      )}
    </aside>
  );
};
