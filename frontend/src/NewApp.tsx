import React, { useState, useEffect, useCallback } from "react";
import {
  AppStep,
  ValidationResult,
  ReconciliationResult,
  PipelineJob,
  AuditHistoryItem,
} from "./types";
import {
  approveCorrectionsApi,
  fetchHistoryAndStatus,
} from "./services/api.service";
import { useIsMounted } from "./hooks/useIsMounted";
import { Sidebar } from "./components/organisms/Sidebar";
import { UploadStep } from "./features/upload/UploadStep";
import { ReviewStep } from "./features/review/ReviewStep";
import { ReconciliationStep } from "./features/reconciliation/ReconciliationStep";
import { DashboardStep } from "./features/dashboard/DashboardStep";
import { AssistantStep } from "./features/assistant/AssistantStep";
import "./styles/main.scss";

export function App() {
  const [step, setStep] = useState<AppStep>("upload");
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(true);

  const [_selectedFile, setSelectedFile] = useState<File | null>(null);
  const [_jobId, setJobId] = useState<string>("");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [reconciliation, setReconciliation] =
    useState<ReconciliationResult | null>(null);
  const [history, setHistory] = useState<AuditHistoryItem[]>([]);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineJob[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const isMounted = useIsMounted();

  const loadDashboardData = useCallback(async () => {
    try {
      const data = await fetchHistoryAndStatus();
      if (isMounted.current) {
        setHistory(data.history);
        setPipelineStatus(data.pipelineStatus);
      }
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    }
  }, [isMounted]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData, step]);

  const handleUploadSuccess = (
    newJobId: string,
    newValidation: ValidationResult,
    file: File,
  ) => {
    setJobId(newJobId);
    setValidation(newValidation);
    setSelectedFile(file);
    setStep("review");
  };

  const handleApproveAndReconcile = async (
    approvedCorrections: any[],
    auditNotes: string,
  ) => {
    if (!_jobId) return;
    setLoading(true);
    try {
      const res = await approveCorrectionsApi(
        _jobId,
        "Marketing Admin",
        auditNotes,
        approvedCorrections,
      );
      if (isMounted.current) {
        setReconciliation(res.reconciliation);
        setLoading(false);
        setStep("reconciliation");
      }
    } catch (err) {
      console.error(err);
      if (isMounted.current) {
        setLoading(false);
        alert("Approval and reconciliation failed.");
      }
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        currentStep={step}
        onSelectStep={setStep}
        isExpanded={isSidebarExpanded}
        onToggleExpand={() => setIsSidebarExpanded((prev) => !prev)}
        hasValidation={!!validation}
        hasReconciliation={!!reconciliation}
      />

      <main className="main-content">
        {step === "upload" && (
          <UploadStep onUploadSuccess={handleUploadSuccess} />
        )}

        {step === "review" && validation && (
          <ReviewStep
            validation={validation}
            loading={loading}
            onApproveAndReconcile={handleApproveAndReconcile}
          />
        )}

        {step === "reconciliation" && reconciliation && (
          <ReconciliationStep
            reconciliation={reconciliation}
            onProceedToDashboard={() => setStep("dashboard")}
          />
        )}

        {step === "dashboard" && (
          <DashboardStep
            pipelineStatus={pipelineStatus}
            history={history}
            onRefresh={loadDashboardData}
          />
        )}

        {step === "assistant" && <AssistantStep />}
      </main>
    </div>
  );
}

export default App;
