import React, { useState } from "react";
import { ValidationResult, CampaignRecord } from "../../types";

interface ReviewStepProps {
  validation: ValidationResult;
  loading: boolean;
  onApproveAndReconcile: (
    approvedCorrections: any[],
    auditNotes: string,
  ) => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  validation,
  loading,
  onApproveAndReconcile,
}) => {
  const [approvals, setApprovals] = useState<Record<string, any>>({});
  const [auditNotes, setAuditNotes] = useState("");

  const handleApprovalChange = (campaignId: string, updates: any) => {
    setApprovals((prev) => ({
      ...prev,
      [campaignId]: { campaignId, updates },
    }));
  };

  const acceptSuggestion = (record: CampaignRecord) => {
    if (!record.suggestedMatch) return;
    handleApprovalChange(record.campaignId, {
      campaignName: record.suggestedMatch,
    });
  };

  const handleSubmit = () => {
    const approvedCorrections = Object.values(approvals);
    onApproveAndReconcile(
      approvedCorrections,
      auditNotes || "Approved via Enterprise Console",
    );
  };

  return (
    <div className="panel review-panel animate-fade">
      <div className="panel-header">
        <h2>Step 2: Validation & AI-Assisted Data Quality</h2>
        <p className="subtitle">
          Review automated schema audits, duplicate checks, categorization
          anomalies, and AI campaign name normalization.
        </p>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Quality Score</h3>
          <p className={validation.qualityScore >= 80 ? "good" : "warning"}>
            {validation.qualityScore}%
          </p>
        </div>
        <div className="metric-card">
          <h3>Total Rows</h3>
          <p>{validation.totalRows}</p>
        </div>
        <div className="metric-card">
          <h3>Duplicates Removed</h3>
          <p>{validation.duplicateCount}</p>
        </div>
        <div className="metric-card">
          <h3>Invalid Categories</h3>
          <p>{validation.invalidCategoryCount}</p>
        </div>
      </div>

      <div className="summary-banner">
        <strong>AI Summary:</strong> {validation.summary}
      </div>

      <div className="section-title-row">
        <h3>Campaign Records & AI Suggestions</h3>
        <span className="record-count">
          {validation.records.length} records parsed
        </span>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Campaign ID</th>
              <th>Campaign Name (Editable)</th>
              <th>Date</th>
              <th>Region</th>
              <th>Platform</th>
              <th>Spend</th>
              <th>Validation Errors</th>
              <th>AI Suggestion</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {validation.records.map((record, index) => {
              const currentName =
                approvals[record.campaignId]?.updates?.campaignName ??
                record.campaignName;
              return (
                <tr key={index}>
                  <td>
                    <code>{record.campaignId}</code>
                  </td>
                  <td>
                    <input
                      type="text"
                      className="table-input"
                      value={currentName}
                      onChange={(e) =>
                        handleApprovalChange(record.campaignId, {
                          campaignName: e.target.value,
                        })
                      }
                    />
                  </td>
                  <td>{record.date}</td>
                  <td>{record.region}</td>
                  <td>{record.platform}</td>
                  <td>${record.spend}</td>
                  <td>
                    {record.errors.length > 0 ? (
                      <span
                        className="error-badge"
                        title={record.errors.join(", ")}
                      >
                        {record.errors.join(", ")}
                      </span>
                    ) : (
                      <span className="success-badge">Valid</span>
                    )}
                  </td>
                  <td>
                    {record.suggestedMatch ? (
                      <span className="suggestion-pill">
                        {record.suggestedMatch} ({record.confidence}%)
                      </span>
                    ) : (
                      <span className="text-muted">No match</span>
                    )}
                  </td>
                  <td>
                    {record.suggestedMatch && (
                      <button
                        type="button"
                        className="small-btn"
                        onClick={() => acceptSuggestion(record)}
                      >
                        Accept AI
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="audit-section">
        <div className="audit-input-group">
          <label htmlFor="auditNotes">
            Approval Audit Notes & Justification:
          </label>
          <input
            id="auditNotes"
            type="text"
            className="text-input"
            value={auditNotes}
            onChange={(e) => setAuditNotes(e.target.value)}
            placeholder="Enter approval justification or reviewer compliance notes..."
          />
        </div>
        <button
          type="button"
          className="primary-btn"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Committing..." : "Approve & Run Spend Reconciliation"}
        </button>
      </div>
    </div>
  );
};
