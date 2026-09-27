import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Mail,
  Webhook,
  CheckCircle,
  Clock,
  Eye,
  Trash2,
  Send,
  FileText
} from 'lucide-react';
import { IntrusionLog, SystemConfig } from '../types';
import { dbService } from '../services/db';
import { soundService } from '../services/audio';

interface IntrusionMonitorProps {
  intrusions: IntrusionLog[];
  config: SystemConfig;
  onUpdateConfig: (partial: Partial<SystemConfig>) => void;
  onIntrusionsUpdated: (list: IntrusionLog[]) => void;
  darkTheme: boolean;
}

export const IntrusionMonitor: React.FC<IntrusionMonitorProps> = ({
  intrusions,
  config,
  onUpdateConfig,
  onIntrusionsUpdated,
  darkTheme,
}) => {
  const [selectedIncident, setSelectedIncident] = useState<IntrusionLog | null>(
    intrusions.length > 0 ? intrusions[0] : null
  );
  const [activeTab, setActiveTab] = useState<'log' | 'webhook_preview' | 'smtp_preview'>('log');
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  // Status triage update
  const handleUpdateStatus = (id: string, status: IntrusionLog['status']) => {
    soundService.playClick();
    const updated = dbService.updateIntrusionStatus(id, status);
    onIntrusionsUpdated(updated);
    if (selectedIncident?.id === id) {
      setSelectedIncident({ ...selectedIncident, status });
    }
  };

  // Delete incident
  const handleDeleteIncident = (id: string) => {
    soundService.playClick();
    const updated = intrusions.filter(i => i.id !== id);
    dbService.saveIntrusionLogs(updated);
    onIntrusionsUpdated(updated);
    if (selectedIncident?.id === id) {
      setSelectedIncident(updated.length > 0 ? updated[0] : null);
    }
  };

  // Dispatch manual test alert
  const handleSimulateAlert = () => {
    soundService.playClick();
    setDispatchStatus('Dispatching security alert to SMTP relay & Webhook listener...');
    setTimeout(() => {
      setDispatchStatus('Alert dispatched successfully to security-ops@facility.internal (HTTP 200 OK)');
      setTimeout(() => setDispatchStatus(null), 4000);
    }, 800);
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🚨</span>
            <h1 className="text-2xl font-bold tracking-tight">
              Intrusion Detection & Incident Monitor
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-mono">
            FR-3 Perimeter Security: Snapshot Capture, Restricted Hours Enforcement & Automated Alerting
          </p>
        </div>

        {/* Restricted Mode Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onUpdateConfig({ restricted_mode: !config.restricted_mode })}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all ${
              config.restricted_mode
                ? 'bg-red-600 hover:bg-red-500 text-white border-red-700 shadow-md animate-pulse'
                : darkTheme
                ? 'bg-[#161B22] border-[#30363D] text-slate-300 hover:bg-[#21262D]'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Restricted Mode: {config.restricted_mode ? 'ARMED (ACTIVE)' : 'STANDBY'}</span>
          </button>
        </div>
      </div>

      {dispatchStatus && (
        <div className="p-3 rounded-lg border text-xs flex items-center gap-2 bg-blue-950/30 border-blue-800 text-blue-300">
          <Send className="w-4 h-4 text-blue-400 shrink-0" />
          <span>{dispatchStatus}</span>
        </div>
      )}

      {/* Main Grid: Incident List on Left (7 cols), Detail & Alert Inspector on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Incidents Ledger (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className={`p-4 rounded-xl border flex flex-col gap-3 ${
            darkTheme ? 'bg-[#161B22] border-[#262730]' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between border-b pb-2 border-inherit">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Security Incidents ({intrusions.length})
              </span>
              <span className="text-[11px] font-mono text-red-400">
                Auto-Snapshots on Unrecognized Subject
              </span>
            </div>

            <div className="flex flex-col gap-2 max-h-[520px] overflow-y-auto pr-1">
              {intrusions.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500 flex flex-col items-center gap-2">
                  <CheckCircle className="w-8 h-8 text-emerald-500/40" />
                  <span>No security intrusions recorded. Perimeter is secure.</span>
                </div>
              ) : (
                intrusions.map(item => {
                  const isSelected = selectedIncident?.id === item.id;
                  const time = new Date(item.timestamp).toLocaleTimeString();
                  const date = new Date(item.timestamp).toLocaleDateString();

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedIncident(item)}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-red-500 bg-red-950/20 shadow-xs'
                          : darkTheme
                          ? 'bg-[#0E1117] border-[#262730] hover:border-slate-600'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <img
                          src={item.image_snapshot}
                          alt="Intruder Snapshot"
                          className="w-12 h-12 rounded-md object-cover border shrink-0 bg-slate-800"
                        />
                        <div className="overflow-hidden flex flex-col gap-0.5">
                          <div className="font-semibold text-red-400 flex items-center gap-1.5 truncate">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>Unrecognized Face Match (d={item.best_distance.toFixed(2)})</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {date} at {time}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 truncate">
                            Source: {item.ip_source || 'Turnstile-Cam-01'}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          item.status === 'Pending'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                            : item.status === 'Acknowledged'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        }`}>
                          {item.status}
                        </span>

                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteIncident(item.id);
                          }}
                          className="p-1 rounded text-slate-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Incident Dossier & Alert Dispatcher (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {selectedIncident ? (
            <div className={`p-4 rounded-xl border flex flex-col gap-4 ${
              darkTheme ? 'bg-[#161B22] border-[#262730]' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between border-b pb-2 border-inherit">
                <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Incident Dossier #{selectedIncident.id.slice(-6)}</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {new Date(selectedIncident.timestamp).toLocaleString()}
                </span>
              </div>

              {/* High-Res Snapshot Preview */}
              <div className="relative aspect-4/3 rounded-lg overflow-hidden border border-slate-700 bg-black flex items-center justify-center">
                <img
                  src={selectedIncident.image_snapshot}
                  alt="Full Intruder Snapshot"
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 text-[10px] font-mono text-red-400 border border-red-800">
                  TARGET: UNRECOGNIZED
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/75 text-[10px] font-mono text-slate-300">
                  DIST: {selectedIncident.best_distance.toFixed(3)}
                </div>
              </div>

              {/* Status Triage Controls */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-mono uppercase text-slate-400 font-semibold">
                  Triage Status:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Pending', 'Acknowledged', 'Resolved'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => handleUpdateStatus(selectedIncident.id, st)}
                      className={`py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
                        selectedIncident.status === st
                          ? 'bg-[#FF4B4B] text-white shadow-xs'
                          : darkTheme
                          ? 'bg-[#0E1117] border border-[#30363D] text-slate-300 hover:bg-[#21262D]'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabs for Dispatch Previews */}
              <div className="flex items-center gap-1 border-b border-inherit pb-1 text-xs">
                <button
                  onClick={() => setActiveTab('log')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    activeTab === 'log'
                      ? 'bg-slate-500/20 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Incident Notes
                </button>
                <button
                  onClick={() => setActiveTab('smtp_preview')}
                  className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                    activeTab === 'smtp_preview'
                      ? 'bg-slate-500/20 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  <span>SMTP Alert</span>
                </button>
                <button
                  onClick={() => setActiveTab('webhook_preview')}
                  className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                    activeTab === 'webhook_preview'
                      ? 'bg-slate-500/20 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Webhook className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Webhook Payload</span>
                </button>
              </div>

              {/* Tab 1: Notes */}
              {activeTab === 'log' && (
                <div className="flex flex-col gap-2 text-xs">
                  <div className="p-3 rounded-lg bg-black/30 border border-slate-700/60 flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-slate-400">Notes / Log Entry:</span>
                    <p className="text-slate-300 text-xs">
                      {selectedIncident.notes || 'No security notes attached.'}
                    </p>
                  </div>
                  <button
                    onClick={handleSimulateAlert}
                    className="w-full py-2 rounded-lg bg-[#FF4B4B] hover:bg-[#ff3333] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Dispatch Immediate Alert to Security</span>
                  </button>
                </div>
              )}

              {/* Tab 2: SMTP Email Preview */}
              {activeTab === 'smtp_preview' && (
                <div className="p-3 rounded-lg bg-black/40 border border-slate-700/60 flex flex-col gap-2 font-mono text-[11px]">
                  <div className="text-slate-400 border-b border-slate-800 pb-1.5 flex flex-col gap-0.5">
                    <div><span className="text-slate-500">To:</span> security-desk@facility.internal</div>
                    <div><span className="text-slate-500">From:</span> visionface-bot@visionlabs.org</div>
                    <div><span className="text-slate-500">Subject:</span> [URGENT ALERT] Intrusion at Entrance Gate</div>
                  </div>
                  <div className="text-slate-300 text-[10px] leading-relaxed">
                    Perimeter Intrusion Detected at {new Date(selectedIncident.timestamp).toLocaleTimeString()}:<br />
                    - Camera Source: {selectedIncident.ip_source || 'Turnstile-Cam-01'}<br />
                    - Min Euclidean Distance: {selectedIncident.best_distance.toFixed(3)} (Threshold: {config.distance_threshold})<br />
                    - Snapshot Hash: sha256-{selectedIncident.id.slice(-8)}<br />
                    - Status: Alert dispatched via SMTP relay.
                  </div>
                </div>
              )}

              {/* Tab 3: Webhook JSON Payload */}
              {activeTab === 'webhook_preview' && (
                <div className="p-2.5 rounded-lg bg-black/50 border border-slate-700/60 font-mono text-[10px] text-emerald-400 overflow-x-auto max-h-40">
                  <pre>
{JSON.stringify(
  {
    event: 'PERIMETER_INTRUSION_DETECTED',
    incident_id: selectedIncident.id,
    timestamp: selectedIncident.timestamp,
    device: selectedIncident.ip_source || 'Turnstile-Cam-01',
    euclidean_distance: selectedIncident.best_distance,
    threshold_limit: config.distance_threshold,
    alert_status: 'DISPATCHED_HTTP_200',
  },
  null,
  2
)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className={`p-8 rounded-xl border text-center text-xs text-slate-500 ${
              darkTheme ? 'bg-[#161B22] border-[#262730]' : 'bg-white border-slate-200'
            }`}>
              Select an incident from the ledger to inspect details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
