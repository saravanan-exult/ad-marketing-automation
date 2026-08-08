import React, { useState, useRef, DragEvent, ChangeEvent } from "react";
import { uploadCampaignFile } from "../../services/api.service";
import { useIsMounted } from "../../hooks/useIsMounted";
import { ValidationResult } from "../../types";

interface UploadStepProps {
  onUploadSuccess: (
    jobId: string,
    validation: ValidationResult,
    file: File,
  ) => void;
}

export const UploadStep: React.FC<UploadStepProps> = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Cloud provider modal state
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMounted = useIsMounted();

  const handleFileSelected = (file: File) => {
    // Validate extensions
    const validExtensions = [".csv", ".xlsx", ".xls"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(ext)) {
      setError(
        "Invalid file type. Please upload a .csv, .xlsx, or .xls campaign performance file.",
      );
      return;
    }
    setError(null);
    setSelectedFile(file);
    setProgress(0);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setProgress(0);
    setError(null);

    abortControllerRef.current = new AbortController();

    try {
      const res = await uploadCampaignFile(
        selectedFile,
        (pct) => {
          if (isMounted.current) setProgress(pct);
        },
        abortControllerRef.current.signal,
      );

      if (isMounted.current) {
        setLoading(false);
        onUploadSuccess(res.jobId, res.validation, selectedFile);
      }
    } catch (err: any) {
      if (axiosIsCancel(err)) {
        // Canceled by user
        if (isMounted.current) {
          setLoading(false);
          setProgress(0);
        }
        return;
      }
      console.error(err);
      if (isMounted.current) {
        setLoading(false);
        setError(
          "Upload failed or backend service unreachable. Please verify server status.",
        );
      }
    }
  };

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setLoading(false);
    setProgress(0);
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setProgress(0);
    setError(null);
  };

  const handleCloudImport = (providerName: string) => {
    setSelectedProvider(providerName);
    setShowCloudModal(true);
  };

  return (
    <div className="panel upload-panel animate-fade">
      <div className="panel-header">
        <h2>Step 1: Ingest Campaign Performance File</h2>
        <p className="subtitle">
          Securely ingest campaign metrics and ad performance reports sourced
          from global advertising channels.
        </p>
      </div>

      <div
        className={`dropzone ${isDragging ? "dragging" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="dropzone-icon">📁</div>
        <h3>Drag & Drop your campaign files here</h3>
        <p>Supports CSV, XLSX, and XLS performance files up to 50MB</p>

        <div className="dropzone-actions">
          <label className="browse-btn">
            Browse Device
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              hidden
            />
          </label>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => handleCloudImport("Google Drive / Cloud Storage")}
          >
            ☁ Import from Cloud
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {selectedFile && (
        <div className="file-preview-card">
          <div className="file-info">
            <span className="file-icon">📄</span>
            <div>
              <p className="file-name">{selectedFile.name}</p>
              <p className="file-size">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>

          {!loading ? (
            <div className="file-actions">
              <button className="primary-btn" onClick={handleUpload}>
                Run Validation Pipeline
              </button>
              <button
                className="icon-btn remove"
                onClick={removeSelectedFile}
                title="Remove file"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="upload-progress-container">
              <div className="progress-info">
                <span>Uploading & Parsing... {progress}%</span>
                <button className="text-btn cancel" onClick={cancelUpload}>
                  Cancel
                </button>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cloud Integration Modal */}
      {showCloudModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Cloud Storage Connector</h3>
            <p>
              Connecting to <strong>{selectedProvider}</strong> (Google Drive,
              Google Cloud Storage, or OneDrive).
            </p>
            <div className="alert alert-info">
              Enterprise OAuth connector ready. Configure client ID and redirect
              URI in backend environment settings to enable live cloud file
              picking.
            </div>
            <div className="modal-actions">
              <button
                className="secondary-btn"
                onClick={() => setShowCloudModal(false)}
              >
                Close
              </button>
              <button
                className="primary-btn"
                onClick={() => {
                  setShowCloudModal(false);
                  alert(
                    "Cloud picker connection simulated. Please use local device upload for immediate ingestion.",
                  );
                }}
              >
                Authenticate & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper for axios cancel check
function axiosIsCancel(err: any): boolean {
  return err && err.code === "ERR_CANCELED";
}
