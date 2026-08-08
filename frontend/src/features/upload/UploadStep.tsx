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
        <div className="dropzone-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
            width="100px"
            height="100px"
            role="img"
            aria-labelledby="title desc"
          >
            <title id="title">Excel document icon</title>
            <desc id="desc">
              A green circular icon with a white XLS spreadsheet document.
            </desc>
            <defs>
              <clipPath id="iconClip">
                <circle cx="256" cy="256" r="240" />
              </clipPath>
            </defs>
            <g clip-path="url(#iconClip)">
              <rect width="512" height="512" fill="#45be63" />
              <path
                fill="#fff"
                d="M160 112h144c66.3 0 120 53.7 120 120v184c-31.5 51.7-91.6 80-168 80s-136.5-28.3-168-80V184c0-39.8 32.2-72 72-72Z"
              />

              <path
                fill="#d9f2e0"
                d="M304 112c66.3 0 120 53.7 120 120v24c0-79.5-40.3-136-120-144Z"
              />

              <path
                fill="#16a43a"
                d="M113 209h16.4l11.9 37.5 12.1-37.5h16.2l-20.2 51 21.5 50h-16.7l-13-38.4-12.8 38.4H112l21-50.1L113 209Zm64.3 0h15.8v84.7h29.1V310h-44.9v-101Zm70.2-1c15.6 0 24.7 8.2 24.7 25.1v6.3h-15.7v-7.8c0-5.9-2.8-8.6-8.3-8.6-5.2 0-8.2 2.6-8.2 8.3 0 6.7 4.5 11.1 14.4 18.2 12.5 9.2 18.4 17.3 18.4 31.5 0 19.4-9.4 30.4-25.6 30.4-15.8 0-25.2-9.4-25.2-27.6v-6.5h15.8v7.7c0 7.1 2.8 10.3 9.1 10.3 5.9 0 9.2-3.7 9.2-10.8 0-7.7-4.8-13.1-14.5-20.1-13.9-10.1-18.6-17.9-18.6-30.2 0-16.2 9.4-25.2 25.5-25.2Z"
              />

              <rect
                x="112"
                y="329"
                width="288"
                height="114"
                rx="18"
                fill="#d9f2e0"
              />
              <path
                fill="#fff"
                d="M130 346h117v30H130zm135 0h118v30H265zm-135 48h117v29H130zm135 0h118v29H265z"
              />
            </g>
          </svg>
        </div>
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
