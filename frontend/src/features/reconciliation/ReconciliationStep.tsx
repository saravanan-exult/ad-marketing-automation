import React from "react";
import { ReconciliationResult } from "../../types";

interface ReconciliationStepProps {
  reconciliation: ReconciliationResult;
  onProceedToDashboard: () => void;
}

export const ReconciliationStep: React.FC<ReconciliationStepProps> = ({
  reconciliation,
  onProceedToDashboard,
}) => {
  return (
    <div className="panel reconciliation-panel animate-fade">
      <div className="panel-header">
        <h2>Step 3: Ad Tech Platform Spend Reconciliation</h2>
        <p className="subtitle">
          Comparing uploaded campaign spend against reported actuals from Ad
          Tech APIs (Threshold: {reconciliation.threshold}% variance).
        </p>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Average Variance</h3>
          <p
            className={
              reconciliation.averageVariance <= reconciliation.threshold
                ? "good"
                : "warning"
            }
          >
            {reconciliation.averageVariance}%
          </p>
        </div>
        <div className="metric-card">
          <h3>Total Reconciled Campaigns</h3>
          <p>{reconciliation.totalRecords}</p>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Campaign ID</th>
              <th>Campaign Name</th>
              <th>Uploaded Spend</th>
              <th>Platform Reported Spend</th>
              <th>Variance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {reconciliation.results.map((res, idx) => (
              <tr key={idx}>
                <td>
                  <code>{res.campaignId}</code>
                </td>
                <td>{res.campaignName}</td>
                <td>${res.uploadedSpend.toLocaleString()}</td>
                <td>${res.platformSpend.toLocaleString()}</td>
                <td>{res.variance}%</td>
                <td>
                  <span
                    className={
                      res.status === "MATCH" ? "success-badge" : "warning-badge"
                    }
                  >
                    {res.status === "MATCH" ? "✓ Match" : "⚠ Review"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel-footer-actions">
        <button
          type="button"
          className="primary-btn"
          onClick={onProceedToDashboard}
        >
          Proceed to Dashboard & Databricks Ingestion
        </button>
      </div>
    </div>
  );
};
