import React, { useState, useEffect, useCallback } from "react";
import { ScheduleItem } from "../../types";
import {
  fetchSchedulesApi,
  createScheduleApi,
  toggleScheduleApi,
  deleteScheduleApi,
  triggerScheduleApi,
} from "../../services/api.service";
import { useIsMounted } from "../../hooks/useIsMounted";

export const SchedulingStep: React.FC = () => {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Form State
  const [sourceName, setSourceName] = useState<string>("Meta Business Suite");
  const [customSource, setCustomSource] = useState<string>("");
  const [frequency, setFrequency] = useState<string>("DAILY");
  const [executionTime, setExecutionTime] = useState<string>("07:00 AM");
  const [notificationEmail, setNotificationEmail] = useState<string>(
    "marketing-alerts@company.com",
  );
  const [notificationWebhook, setNotificationWebhook] = useState<string>(
    "https://hooks.slack.com/services/adtech/alerts",
  );

  const isMounted = useIsMounted();

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSchedulesApi();
      if (isMounted.current) {
        setSchedules(data);
        setLoading(false);
      }
    } catch (err: any) {
      if (isMounted.current) {
        setLoading(false);
        setActionMessage({
          type: "error",
          text: "Failed to load automated schedules.",
        });
      }
    }
  }, [isMounted]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetSource = sourceName === "Custom" ? customSource : sourceName;
    if (!targetSource.trim()) {
      setActionMessage({
        type: "error",
        text: "Please select or provide a valid source name.",
      });
      return;
    }

    setSubmitting(true);
    setActionMessage(null);

    try {
      const newSched = await createScheduleApi({
        sourceName: targetSource,
        frequency,
        executionTime,
        notificationEmail,
        notificationWebhook,
      });

      if (isMounted.current) {
        setSchedules((prev) => [...prev, newSched]);
        setSubmitting(false);
        setActionMessage({
          type: "success",
          text: `Automated schedule created for ${targetSource}!`,
        });
        if (sourceName === "Custom") setCustomSource("");
      }
    } catch (err: any) {
      if (isMounted.current) {
        setSubmitting(false);
        setActionMessage({
          type: "error",
          text: "Failed to create schedule. Please check backend connection.",
        });
      }
    }
  };

  const handleToggle = async (scheduleId: string) => {
    try {
      const updated = await toggleScheduleApi(scheduleId);
      if (isMounted.current) {
        setSchedules((prev) =>
          prev.map((s) => (s.scheduleId === scheduleId ? updated : s)),
        );
        setActionMessage({
          type: "success",
          text: `Schedule status updated to ${updated.status}.`,
        });
      }
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: "Failed to toggle schedule status.",
      });
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (!window.confirm("Are you sure you want to delete this schedule?"))
      return;
    try {
      await deleteScheduleApi(scheduleId);
      if (isMounted.current) {
        setSchedules((prev) => prev.filter((s) => s.scheduleId !== scheduleId));
        setActionMessage({
          type: "success",
          text: "Automated schedule deleted.",
        });
      }
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: "Failed to delete schedule.",
      });
    }
  };

  const handleTriggerNow = async (scheduleId: string, source: string) => {
    setActionMessage({
      type: "success",
      text: `Triggering manual run for ${source}...`,
    });
    try {
      const res = await triggerScheduleApi(scheduleId);
      if (isMounted.current) {
        setActionMessage({
          type: "success",
          text: `⚡ Ingestion job ${res.jobId.slice(0, 8)} triggered for ${source}! ${res.validationSummary}`,
        });
        loadSchedules();
      }
    } catch (err: any) {
      if (isMounted.current) {
        setActionMessage({
          type: "error",
          text: `Failed to trigger execution for ${source}.`,
        });
      }
    }
  };

  const activeCount = schedules.filter((s) => s.status === "ACTIVE").length;

  return (
    <div className="scheduling-step-container">
      <div className="step-header">
        <h2>⏱ Step 7 — Automated Source Ingestion & Scheduling</h2>
        <p className="subtitle">
          Configure per-source automated ingestion triggers (e.g. Meta at 7 AM,
          Google Ads at 8 AM) with automated error notifications via Email &
          Webhook.
        </p>
      </div>

      {actionMessage && (
        <div className={`alert-banner alert-${actionMessage.type}`}>
          <span>{actionMessage.text}</span>
          <button
            type="button"
            className="close-btn"
            onClick={() => setActionMessage(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Active Automated Schedules</span>
          <span className="metric-value">{activeCount}</span>
          <span className="metric-sub">Across all configured sources</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Total Configured Sources</span>
          <span className="metric-value">{schedules.length}</span>
          <span className="metric-sub">Meta, Google Ads, Amazon DSP, etc.</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Notification Channels</span>
          <span className="metric-value">
            {
              schedules.filter(
                (s) => s.notificationEmail || s.notificationWebhook,
              ).length
            }
          </span>
          <span className="metric-sub">Email alerts & Webhooks</span>
        </div>
      </div>

      {/* Form & Table Layout */}
      <div className="scheduling-layout">
        {/* Form Box */}
        <div className="card schedule-form-card">
          <h3>➕ Add Automated Source Trigger</h3>
          <form onSubmit={handleCreateSchedule} className="schedule-form">
            <div className="form-group">
              <label htmlFor="source-select">Ad Tech Source Platform</label>
              <select
                id="source-select"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
              >
                <option value="Meta Business Suite">
                  Meta Business Suite (Facebook/Instagram)
                </option>
                <option value="Google Ads">Google Ads</option>
                <option value="Amazon DSP">Amazon DSP</option>
                <option value="Adobe Analytics">Adobe Analytics</option>
                <option value="SharePoint Folder">
                  SharePoint / Google Drive Connector
                </option>
                <option value="Custom">Custom Source Platform</option>
              </select>
            </div>

            {sourceName === "Custom" && (
              <div className="form-group">
                <label htmlFor="custom-source">Custom Source Name</label>
                <input
                  id="custom-source"
                  type="text"
                  placeholder="e.g. TikTok Ads or Regional Server"
                  value={customSource}
                  onChange={(e) => setCustomSource(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-row">
              <div className="form-group flex-1">
                <label htmlFor="frequency-select">Trigger Frequency</label>
                <select
                  id="frequency-select"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                >
                  <option value="DAILY">Daily</option>
                  <option value="HOURLY">Hourly</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MANUAL">Manual Trigger Only</option>
                </select>
              </div>

              <div className="form-group flex-1">
                <label htmlFor="exec-time">Execution Time / Window</label>
                <input
                  id="exec-time"
                  type="text"
                  placeholder="e.g. 07:00 AM or 08:00 AM"
                  value={executionTime}
                  onChange={(e) => setExecutionTime(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="notif-email">Failure Notification Email</label>
              <input
                id="notif-email"
                type="email"
                placeholder="alerts@yourcompany.com"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="notif-webhook">
                Failure Notification Webhook URL
              </label>
              <input
                id="notif-webhook"
                type="url"
                placeholder="https://hooks.slack.com/services/..."
                value={notificationWebhook}
                onChange={(e) => setNotificationWebhook(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={submitting}
            >
              {submitting ? "Saving Schedule..." : "📅 Save Source Schedule"}
            </button>
          </form>
        </div>

        {/* Schedules Table Card */}
        <div className="card schedule-list-card">
          <div className="card-header-flex">
            <h3>📋 Configured Source Schedules</h3>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={loadSchedules}
            >
              🔄 Refresh
            </button>
          </div>

          {loading ? (
            <div className="loading-state">Loading active schedules...</div>
          ) : schedules.length === 0 ? (
            <div className="empty-state">
              No automated schedules configured yet.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Source Platform</th>
                    <th>Frequency & Time</th>
                    <th>Notifications</th>
                    <th>Status</th>
                    <th>Next Expected Run</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((sched) => (
                    <tr key={sched.scheduleId}>
                      <td>
                        <strong>{sched.sourceName}</strong>
                        <div className="text-muted small">
                          ID: {sched.scheduleId}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-info">
                          {sched.frequency}
                        </span>
                        <div className="small">
                          {sched.executionTime || "07:00 AM"}
                        </div>
                      </td>
                      <td>
                        {sched.notificationEmail && (
                          <div className="small">
                            ✉ {sched.notificationEmail}
                          </div>
                        )}
                        {sched.notificationWebhook && (
                          <div
                            className="small text-truncate"
                            style={{ maxWidth: "160px" }}
                          >
                            🔗 Webhook configured
                          </div>
                        )}
                        {!sched.notificationEmail &&
                          !sched.notificationWebhook && (
                            <span className="text-muted small">None</span>
                          )}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            sched.status === "ACTIVE"
                              ? "badge-success"
                              : "badge-warning"
                          }`}
                        >
                          {sched.status}
                        </span>
                      </td>
                      <td className="small">
                        {sched.nextRunAt
                          ? new Date(sched.nextRunAt).toLocaleString()
                          : "On Demand"}
                      </td>
                      <td>
                        <div className="action-button-group">
                          <button
                            type="button"
                            className="btn btn-primary btn-xs"
                            title="Trigger Immediate Execution"
                            onClick={() =>
                              handleTriggerNow(
                                sched.scheduleId,
                                sched.sourceName,
                              )
                            }
                          >
                            ⚡ Trigger
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary btn-xs"
                            onClick={() => handleToggle(sched.scheduleId)}
                            title={
                              sched.status === "ACTIVE"
                                ? "Pause Schedule"
                                : "Resume Schedule"
                            }
                          >
                            {sched.status === "ACTIVE" ? "⏸ Pause" : "▶ Resume"}
                          </button>

                          <button
                            type="button"
                            className="btn btn-danger btn-xs"
                            onClick={() => handleDelete(sched.scheduleId)}
                            title="Delete Schedule"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
