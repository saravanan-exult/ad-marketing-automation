import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

interface CampaignRecord {
  campaignName: string;
  date: string;
  region: string;
  spend: string;
  impressions: string;
  platform: string;
  campaignId: string;
  errors: string[];
  suggestedMatch: string | null;
  confidence: number | null;
}

interface ValidationResult {
  fileName: string;
  totalRows: number;
  parsedRows: number;
  missingColumns: string[];
  additionalColumns: string[];
  duplicateCount: number;
  missingCount: number;
  invalidDateCount: number;
  invalidCategoryCount: number;
  qualityScore: number;
  summary: string;
  records: CampaignRecord[];
}

function App() {
  const [step, setStep] = useState<
    "upload" | "review" | "reconciliation" | "dashboard" | "assistant"
  >("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string>("");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [reconciliation, setReconciliation] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [pipelineStatus, setPipelineStatus] = useState<any[]>([]);
  const [assistantQuery, setAssistantQuery] = useState("");
  const [assistantResult, setAssistantResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [approvals, setApprovals] = useState<Record<string, any>>({});
  const [auditNotes, setAuditNotes] = useState("");

  const uploadFile = async () => {
    if (!selectedFile) return;
    setLoading(true);
    const form = new FormData();
    form.append("file", selectedFile);
    try {
      const res = await axios.post("http://localhost:3001/upload", form);
      setJobId(res.data.jobId);
      setValidation(res.data.validation);
      setLoading(false);
      setStep("review");
    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("Upload failed. Ensure backend is running.");
    }
  };

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

  const submitApprovals = async () => {
    setLoading(true);
    try {
      const approvedCorrections = Object.values(approvals);
      const res = await axios.post("http://localhost:3001/approve", {
        jobId,
        approvedBy: "Marketing Admin",
        notes: auditNotes || "Approved via React Console",
        approvedCorrections,
      });
      setReconciliation(res.data.reconciliation);
      setLoading(false);
      setStep("reconciliation");
    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("Approval failed.");
    }
  };

  const loadDashboardData = async () => {
    try {
      const [histRes, statusRes] = await Promise.all([
        axios.get("http://localhost:3001/history"),
        axios.get("http://localhost:3001/pipeline-status"),
      ]);
      setHistory(histRes.data);
      setPipelineStatus(statusRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const queryAssistant = async () => {
    if (!assistantQuery) return;
    try {
      const res = await axios.post("http://localhost:3001/assistant/query", {
        query: assistantQuery,
      });
      setAssistantResult(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [step]);

  return (
    <div className="app-shell">
      <header className="navbar">
        <h1>Adobe AdTech Marketing Automation & AI Platform</h1>
        <nav>
          <button
            className={step === "upload" ? "active" : ""}
            onClick={() => setStep("upload")}
          >
            1. Upload & Validate
          </button>
          <button
            className={step === "review" ? "active" : ""}
            onClick={() => setStep("review")}
            disabled={!validation}
          >
            2. AI Review
          </button>
          <button
            className={step === "reconciliation" ? "active" : ""}
            onClick={() => setStep("reconciliation")}
            disabled={!reconciliation}
          >
            3. Reconciliation
          </button>
          <button
            className={step === "dashboard" ? "active" : ""}
            onClick={() => setStep("dashboard")}
          >
            4. Dashboard & Audit
          </button>
          <button
            className={step === "assistant" ? "active" : ""}
            onClick={() => setStep("assistant")}
          >
            5. RAG Assistant
          </button>
        </nav>
      </header>

      <main className="content">
        {step === "upload" && (
          <div className="panel">
            <h2>Step 1: Ingest Campaign Performance File</h2>
            <p>
              Upload campaign CSV or Excel files sourced from Google Ads, Meta,
              Amazon DSP, or Adobe Experience Cloud.
            </p>
            <div className="upload-box">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              {selectedFile && (
                <p>
                  Selected file: {selectedFile.name} (
                  {(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
              <button
                className="primary-btn"
                onClick={uploadFile}
                disabled={!selectedFile || loading}
              >
                {loading
                  ? "Validating & Parsing..."
                  : "Run Validation Pipeline"}
              </button>
            </div>
          </div>
        )}

        {step === "review" && validation && (
          <div className="panel">
            <h2>Step 2: Validation & AI-Assisted Data Quality</h2>
            <div className="metrics-grid">
              <div className="metric-card">
                <h3>Quality Score</h3>
                <p
                  className={validation.qualityScore >= 80 ? "good" : "warning"}
                >
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

            <p className="summary-banner">
              <strong>AI Summary:</strong> {validation.summary}
            </p>

            <h3>Campaign Records & AI Suggestions</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Campaign ID</th>
                    <th>Campaign Name (Uploaded)</th>
                    <th>Date</th>
                    <th>Region</th>
                    <th>Platform</th>
                    <th>Spend</th>
                    <th>Errors</th>
                    <th>AI Suggestion</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {validation.records.map((record, index) => (
                    <tr key={index}>
                      <td>{record.campaignId}</td>
                      <td>
                        <input
                          type="text"
                          defaultValue={record.campaignName}
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
                          <span className="error-badge">
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
                          "No match"
                        )}
                      </td>
                      <td>
                        {record.suggestedMatch && (
                          <button
                            className="small-btn"
                            onClick={() => acceptSuggestion(record)}
                          >
                            Accept AI
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="audit-section">
              <label>Approval Audit Notes:</label>
              <input
                type="text"
                value={auditNotes}
                onChange={(e) => setAuditNotes(e.target.value)}
                placeholder="Enter approval justification or reviewer notes..."
              />
              <button
                className="primary-btn"
                onClick={submitApprovals}
                disabled={loading}
              >
                {loading
                  ? "Committing..."
                  : "Approve & Run Spend Reconciliation"}
              </button>
            </div>
          </div>
        )}

        {step === "reconciliation" && reconciliation && (
          <div className="panel">
            <h2>Step 3: Ad Tech Platform Spend Reconciliation</h2>
            <p>
              Comparing uploaded campaign spend against reported actuals from Ad
              Tech APIs (Threshold: {reconciliation.threshold}% variance).
            </p>
            <div className="metrics-grid">
              <div className="metric-card">
                <h3>Average Variance</h3>
                <p>{reconciliation.averageVariance}%</p>
              </div>
              <div className="metric-card">
                <h3>Total Reconciled Campaigns</h3>
                <p>{reconciliation.totalRecords}</p>
              </div>
            </div>

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
                {reconciliation.results.map((res: any, idx: number) => (
                  <tr key={idx}>
                    <td>{res.campaignId}</td>
                    <td>{res.campaignName}</td>
                    <td>${res.uploadedSpend.toLocaleString()}</td>
                    <td>${res.platformSpend.toLocaleString()}</td>
                    <td>{res.variance}%</td>
                    <td>
                      <span
                        className={
                          res.status === "MATCH"
                            ? "success-badge"
                            : "warning-badge"
                        }
                      >
                        {res.status === "MATCH" ? "✓ Match" : "⚠ Review"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              className="primary-btn"
              onClick={() => setStep("dashboard")}
              style={{ marginTop: "20px" }}
            >
              Proceed to Dashboard & Databricks Ingestion
            </button>
          </div>
        )}

        {step === "dashboard" && (
          <div className="panel">
            <h2>Step 4: Pipeline Dashboard & Audit History</h2>
            <p>
              Real-time tracking of ingestion runs, data quality trends, and
              Databricks sink synchronization.
            </p>

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
                  {pipelineStatus.map((job, idx) => (
                    <tr key={idx}>
                      <td>
                        <code>{job.jobId.slice(0, 8)}...</code>
                      </td>
                      <td>{job.fileName}</td>
                      <td>
                        <span className="success-badge">{job.status}</span>
                      </td>
                      <td>{new Date(job.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3>Ingestion Audit History</h3>
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
                  {history.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.fileName}</td>
                      <td>{item.validation?.qualityScore}%</td>
                      <td>{item.validation?.duplicateCount}</td>
                      <td>{item.status}</td>
                      <td>{item.audit?.notes || "Pending review"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {step === "assistant" && (
          <div className="panel">
            <h2>Step 5: RAG-Powered Ingestion Assistant</h2>
            <p>
              Query ingestion logs, validation results, and pipeline metrics in
              natural language with source attribution.
            </p>
            <div className="assistant-box">
              <input
                type="text"
                value={assistantQuery}
                onChange={(e) => setAssistantQuery(e.target.value)}
                placeholder="e.g. Why did yesterday's upload fail? How many campaigns were matched?"
              />
              <button className="primary-btn" onClick={queryAssistant}>
                Ask Assistant
              </button>
            </div>

            {assistantResult && (
              <div className="assistant-response">
                <h3>Answer</h3>
                <p>{assistantResult.answer}</p>
                <h4>Cited Sources:</h4>
                <ul>
                  {assistantResult.sources.map((s: any, idx: number) => (
                    <li key={idx}>
                      File: {s.fileName} (Job ID: {s.jobId.slice(0, 8)})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
