import React, { useState } from "react";
import { AssistantResult } from "../../types";
import { queryAssistantApi } from "../../services/api.service";

export const AssistantStep: React.FC = () => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [assistantResult, setAssistantResult] =
    useState<AssistantResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await queryAssistantApi(query);
      setAssistantResult(res);
    } catch (err) {
      console.error(err);
      setError(
        "Failed to query RAG assistant. Please check backend connection.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel assistant-panel animate-fade">
      <div className="panel-header">
        <h2>Step 5: RAG-Powered Ingestion Assistant</h2>
        <p className="subtitle">
          Query ingestion logs, validation results, and pipeline metrics in
          natural language with source attribution.
        </p>
      </div>

      <form onSubmit={handleQuery} className="assistant-box">
        <input
          type="text"
          className="text-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Why did yesterday's upload fail? How many campaigns were matched?"
        />
        <button
          type="submit"
          className="primary-btn"
          disabled={loading || !query.trim()}
        >
          {loading ? "Searching Knowledge Base..." : "Ask Assistant"}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {assistantResult && (
        <div className="assistant-response">
          <h3>Answer</h3>
          <p className="answer-text">{assistantResult.answer}</p>
          <h4>Cited Sources:</h4>
          <ul>
            {assistantResult.sources.map((s, idx) => (
              <li key={idx}>
                File: <strong>{s.fileName}</strong> (Job ID:{" "}
                <code>{s.jobId}</code>)
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
