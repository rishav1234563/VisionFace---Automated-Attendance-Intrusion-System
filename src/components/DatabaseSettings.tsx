import React, { useState } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Code,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { AttendanceLog, IntrusionLog, SystemConfig, User } from '../types';
import { dbService, DEFAULT_CONFIG } from '../services/db';
import { soundService } from '../services/audio';

interface DatabaseSettingsProps {
  users: User[];
  logs: AttendanceLog[];
  intrusions: IntrusionLog[];
  config: SystemConfig;
  onRefreshAll: () => void;
  darkTheme: boolean;
}

export const DatabaseSettings: React.FC<DatabaseSettingsProps> = ({
  users,
  logs,
  intrusions,
  config,
  onRefreshAll,
  darkTheme,
}) => {
  const [activeTableTab, setActiveTableTab] = useState<'users' | 'attendance' | 'intrusions' | 'config'>('users');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Export full JSON database
  const handleExportJSON = () => {
    soundService.playClick();
    const data = {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      users,
      attendance_logs: logs,
      intrusion_logs: intrusions,
      system_config: config,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visionface_db_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setStatusMessage('Database JSON backup downloaded successfully.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Import JSON database backup
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (parsed.users) dbService.saveUsers(parsed.users);
        if (parsed.attendance_logs) dbService.saveAttendanceLogs(parsed.attendance_logs);
        if (parsed.intrusion_logs) dbService.saveIntrusionLogs(parsed.intrusion_logs);
        if (parsed.system_config) dbService.saveConfig(parsed.system_config);

        onRefreshAll();
        soundService.playSuccessChime();
        setStatusMessage('Database successfully restored from JSON backup.');
        setTimeout(() => setStatusMessage(null), 4000);
      } catch (err) {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  // Reset to factory defaults
  const handleResetDefaults = () => {
    if (confirm('Are you sure you want to reset all tables to factory demo data? Any new enrollments will be wiped.')) {
      soundService.playClick();
      dbService.resetAllToDefaults();
      onRefreshAll();
      setStatusMessage('Database reset to factory demo seed data.');
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">⚙️</span>
          <h1 className="text-2xl font-bold tracking-tight">
            Database & Vision Engine Settings
          </h1>
        </div>
        <p className="text-xs text-slate-500 font-mono">
          st.expander + SQLite/IndexedDB Relational Model & Mathematical Vector Pipeline
        </p>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-lg border text-xs flex items-center gap-2 bg-emerald-950/30 border-emerald-800 text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Database Management Action Bar */}
      <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
        darkTheme ? 'bg-[#161B22] border-[#262730]' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">
              Persistent Storage Engine
            </div>
            <div className="text-[11px] text-slate-400">
              Users: {users.length} · Attendance: {logs.length} · Intrusions: {intrusions.length}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export JSON */}
          <button
            onClick={handleExportJSON}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
              darkTheme ? 'border-[#30363D] hover:bg-[#21262D]' : 'border-slate-300 hover:bg-slate-100'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export DB (JSON)</span>
          </button>

          {/* Import JSON */}
          <label className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border cursor-pointer transition-colors ${
            darkTheme ? 'border-[#30363D] hover:bg-[#21262D]' : 'border-slate-300 hover:bg-slate-100'
          }`}>
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Restore DB (JSON)</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </label>

          {/* Reset to Factory Defaults */}
          <button
            onClick={handleResetDefaults}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-red-600/10 text-red-400 border border-red-800/40 hover:bg-red-600/20 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>

      {/* Raw Table Inspector (st.tabs) */}
      <div className={`p-4 rounded-xl border flex flex-col gap-3 ${
        darkTheme ? 'bg-[#161B22] border-[#262730]' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between border-b pb-2 border-inherit">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Raw Table Inspector (st.json)
          </span>
          {/* Table Select Tabs */}
          <div className="flex items-center gap-1">
            {(['users', 'attendance', 'intrusions', 'config'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTableTab(tab)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  activeTableTab === tab
                    ? 'bg-[#FF4B4B] text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* JSON Viewer */}
        <div className="bg-black/60 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-emerald-400 max-h-80 overflow-y-auto">
          <pre>
{JSON.stringify(
  activeTableTab === 'users'
    ? users.map(u => ({ ...u, face_image: u.face_image.slice(0, 30) + '...', embedding: `[128-d float array (len=${u.embedding?.length})]` }))
    : activeTableTab === 'attendance'
    ? logs
    : activeTableTab === 'intrusions'
    ? intrusions.map(i => ({ ...i, image_snapshot: i.image_snapshot.slice(0, 30) + '...' }))
    : config,
  null,
  2
)}
          </pre>
        </div>
      </div>

      {/* Algorithm & Mathematical Reference Card */}
      <div className={`p-5 rounded-xl border flex flex-col gap-3 ${
        darkTheme ? 'bg-[#161B22] border-[#262730]' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-[#FF4B4B]" />
          <h3 className="text-xs font-bold uppercase tracking-wider">
            Vector Mathematical Verification Specification
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400 font-mono">
          <div className="p-3 rounded-lg bg-black/30 border border-slate-700/50 flex flex-col gap-1">
            <span className="font-bold text-slate-200">1. Euclidean Distance</span>
            <div className="text-emerald-400 text-[11px] py-1">
              d = √( Σ (qᵢ - pᵢ)² )
            </div>
            <p className="text-[10px] text-slate-500 font-sans leading-tight">
              Calculates L2 geometric distance between probe embedding and enrolled profile. Matches if d ≤ {config.distance_threshold}.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-black/30 border border-slate-700/50 flex flex-col gap-1">
            <span className="font-bold text-slate-200">2. L2 Unit Normalization</span>
            <div className="text-blue-400 text-[11px] py-1">
              v̂ = v / ||v||₂
            </div>
            <p className="text-[10px] text-slate-500 font-sans leading-tight">
              Normalizes all 128-d vectors onto a unit hypersphere, making matching invariant to ambient room lighting and exposure.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-black/30 border border-slate-700/50 flex flex-col gap-1">
            <span className="font-bold text-slate-200">3. Cooldown Logic</span>
            <div className="text-purple-400 text-[11px] py-1">
              Δt ≥ {config.cooldown_minutes} minutes
            </div>
            <p className="text-[10px] text-slate-500 font-sans leading-tight">
              Guarantees each employee is logged only once per attendance window, preventing multiple scans while standing near camera.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
