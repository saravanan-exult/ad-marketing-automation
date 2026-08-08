import React from "react";
import { PipelineJob, AuditHistoryItem } from "../../types";

interface DashboardStepProps {
  pipelineStatus: PipelineJob[];
  history: AuditHistoryItem[];
  onRefresh: () => void;
}

export const DashboardStep: React.FC<DashboardStepProps> = ({
  pipelineStatus,
  history,
  onRefresh,
}) => {
  return (
    <div className="panel dashboard-panel animate-fade">
      <div className="panel-header header-with-action">
        <div>
          <h2>Step 4: Pipeline Dashboard & Audit History</h2>
          <p className="subtitle">
            Real-time tracking of ingestion runs, data quality trends, and
            Databricks sink synchronization.
          </p>
        </div>
        <button type="button" className="secondary-btn" onClick={onRefresh}>
          🔄 Refresh Status
        </button>
      </div>

      <h3>Pipeline Execution Status</h3>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Job ID</th>
              <th>File Name</th>
              <th>Status</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {pipelineStatus.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-muted">
                  No active pipeline executions found.
                </td>
              </tr>
            ) : (
              pipelineStatus.map((job, idx) => (
                <tr key={idx}>
                  <td>
                    <code>{job.jobId}</code>
                  </td>
                  <td>{job.fileName}</td>
                  <td>
                    <span className="success-badge">{job.status}</span>
                  </td>
                  <td>{new Date(job.createdAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginTop: "2rem" }}>Ingestion Audit History</h3>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>File Name</th>
              <th>Quality Score</th>
              <th>Duplicates</th>
              <th>Status</th>
              <th>Audit Details</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-muted">
                  No audit history recorded yet.
                </td>
              </tr>
            ) : (
              history.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.fileName}</td>
                  <td>
                    <span
                      className={
                        item.validation?.qualityScore >= 80
                          ? "good-text"
                          : "warning-text"
                      }
                    >
                      {item.validation?.qualityScore ?? 0}%
                    </span>
                  </td>
                  <td>{item.validation?.duplicateCount ?? 0}</td>
                  <td>
                    <span className="success-badge">{item.status}</span>
                  </td>
                  <td>{item.audit?.notes || "Pending review"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
