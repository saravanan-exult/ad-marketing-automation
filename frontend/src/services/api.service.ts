import axios, { AxiosProgressEvent } from "axios";
import {
  ValidationResult,
  ReconciliationResult,
  PipelineJob,
  AuditHistoryItem,
  AssistantResult,
} from "../types";

const API_BASE = "http://localhost:3001";

export async function uploadCampaignFile(
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<{ jobId: string; validation: ValidationResult }> {
  const form = new FormData();
  form.append("file", file);

  const res = await axios.post(`${API_BASE}/upload`, form, {
    signal,
    onUploadProgress: (progressEvent: AxiosProgressEvent) => {
      if (progressEvent.total && onProgress) {
        const percent = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total,
        );
        onProgress(percent);
      }
    },
  });

  return res.data;
}

export async function approveCorrectionsApi(
  jobId: string,
  approvedBy: string,
  notes: string,
  approvedCorrections: any[],
  signal?: AbortSignal,
): Promise<{ reconciliation: ReconciliationResult }> {
  const res = await axios.post(
    `${API_BASE}/approve`,
    {
      jobId,
      approvedBy,
      notes,
      approvedCorrections,
    },
    { signal },
  );
  return res.data;
}

export async function fetchHistoryAndStatus(
  signal?: AbortSignal,
): Promise<{ history: AuditHistoryItem[]; pipelineStatus: PipelineJob[] }> {
  const [histRes, statusRes] = await Promise.all([
    axios.get(`${API_BASE}/history`, { signal }),
    axios.get(`${API_BASE}/pipeline-status`, { signal }),
  ]);
  return {
    history: histRes.data,
    pipelineStatus: statusRes.data,
  };
}

export async function queryAssistantApi(
  query: string,
  signal?: AbortSignal,
): Promise<AssistantResult> {
  const res = await axios.post(
    `${API_BASE}/assistant/query`,
    { query },
    { signal },
  );
  return res.data;
}
