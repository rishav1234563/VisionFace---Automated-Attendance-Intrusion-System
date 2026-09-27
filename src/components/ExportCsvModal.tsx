import React, { useState, useMemo } from 'react';
import { Download, X, Copy, Check, FileSpreadsheet, Sliders, CheckSquare, Square } from 'lucide-react';
import { AttendanceLog } from '../types';
import { soundService } from '../services/audio';

interface ExportCsvModalProps {
  logs: AttendanceLog[];
  filteredLogs: AttendanceLog[];
  onClose: () => void;
  darkTheme: boolean;
}

type ExportScope = 'filtered' | 'all' | 'today';
type DelimiterType = ',' | ';' | '\t';

interface ColumnOption {
  key: string;
  label: string;
  accessor: (log: AttendanceLog) => string | number;
}

const AVAILABLE_COLUMNS: ColumnOption[] = [
  { key: 'id', label: 'Record ID', accessor: log => log.id },
  { key: 'employee_id', label: 'Employee ID', accessor: log => log.employee_id },
  { key: 'user_name', label: 'Full Name', accessor: log => log.user_name },
  { key: 'department', label: 'Department', accessor: log => log.department },
  { key: 'date', label: 'Date', accessor: log => new Date(log.timestamp).toLocaleDateString() },
  { key: 'time', label: 'Time', accessor: log => new Date(log.timestamp).toLocaleTimeString() },
  { key: 'status', label: 'Status', accessor: log => log.status },
  { key: 'confidence', label: 'Confidence (%)', accessor: log => `${log.confidence.toFixed(1)}%` },
  { key: 'distance', label: 'Euclidean Distance (d)', accessor: log => log.distance.toFixed(3) },
  { key: 'device_id', label: 'Turnstile / Device ID', accessor: log => log.device_id || 'KIOSK-GATE-01' },
];

export const ExportCsvModal: React.FC<ExportCsvModalProps> = ({
  logs,
  filteredLogs,
  onClose,
  darkTheme,
}) => {
  const [scope, setScope] = useState<ExportScope>('filtered');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'employee_id',
    'user_name',
    'department',
    'date',
    'time',
    'status',
    'confidence',
    'distance',
  ]);
  const [delimiter, setDelimiter] = useState<DelimiterType>(',');
  const [includeHeaders, setIncludeHeaders] = useState<boolean>(true);
  const [customFilename, setCustomFilename] = useState<string>(
    `attendance_report_${new Date().toISOString().slice(0, 10)}`
  );
  const [copied, setCopied] = useState<boolean>(false);

  // Determine logs to export based on scope
  const targetLogs = useMemo(() => {
    if (scope === 'filtered') return filteredLogs;
    if (scope === 'today') {
      const todayStr = new Date().toDateString();
      return logs.filter(l => new Date(l.timestamp).toDateString() === todayStr);
    }
    return logs;
  }, [scope, filteredLogs, logs]);

  // Generate CSV text
  const csvContent = useMemo(() => {
    const activeCols = AVAILABLE_COLUMNS.filter(c => selectedColumns.includes(c.key));
    const lines: string[] = [];

    // Header row
    if (includeHeaders) {
      const headerRow = activeCols
        .map(c => `"${c.label.replace(/"/g, '""')}"`)
        .join(delimiter);
      lines.push(headerRow);
    }

    // Data rows
    targetLogs.forEach(log => {
      const row = activeCols.map(c => {
        const val = String(c.accessor(log));
        // Quote if string contains delimiter, quote, or newline
        if (val.includes(delimiter) || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return `"${val.replace(/"/g, '""')}"`;
      });
      lines.push(row.join(delimiter));
    });

    return lines.join('\n');
  }, [targetLogs, selectedColumns, delimiter, includeHeaders]);

  // Toggle single column
  const toggleColumn = (key: string) => {
    if (selectedColumns.includes(key)) {
      if (selectedColumns.length > 1) {
        setSelectedColumns(selectedColumns.filter(k => k !== key));
      }
    } else {
      setSelectedColumns([...selectedColumns, key]);
    }
  };

  // Select all or reset
  const handleSelectAllColumns = () => {
    setSelectedColumns(AVAILABLE_COLUMNS.map(c => c.key));
  };

  const handleDeselectAll = () => {
    // Keep at least employee_id and user_name
    setSelectedColumns(['employee_id', 'user_name']);
  };

  // Download CSV
  const handleDownload = () => {
    soundService.playClick();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const ext = delimiter === '\t' ? 'tsv' : 'csv';
    const cleanName = customFilename.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'attendance_export';
    link.href = url;
    link.setAttribute('download', `${cleanName}.${ext}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onClose();
  };

  // Copy to clipboard
  const handleCopyClipboard = async () => {
    soundService.playClick();
    try {
      await navigator.clipboard.writeText(csvContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  // Monospace preview snippet (first 6 rows)
  const previewLines = useMemo(() => {
    const split = csvContent.split('\n');
    return split.slice(0, 6).join('\n') + (split.length > 6 ? `\n... [${split.length - 6} more rows]` : '');
  }, [csvContent]);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div
        className={`rounded-2xl border shadow-2xl max-w-2xl w-full p-6 flex flex-col gap-5 max-h-[92vh] overflow-y-auto transition-colors ${
          darkTheme
            ? 'bg-[#161B22] border-[#30363D] text-slate-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 border-inherit">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Export Attendance Logs to CSV
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Streamlit st.download_button · Standard RFC 4180 Format
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-500/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Controls Grid */}
        <div className="flex flex-col gap-4 text-xs">
          {/* 1. Scope Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold uppercase tracking-wider text-slate-400 text-[11px]">
              1. Export Record Scope
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setScope('filtered')}
                className={`p-2.5 rounded-lg border text-left transition-colors flex flex-col gap-0.5 ${
                  scope === 'filtered'
                    ? 'border-[#FF4B4B] bg-[#FF4B4B]/10 text-white font-semibold'
                    : darkTheme
                    ? 'border-[#30363D] bg-[#0E1117] text-slate-300 hover:bg-[#21262D]'
                    : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>Current Filtered</span>
                <span className="text-[10px] font-mono text-emerald-400 font-normal">
                  {filteredLogs.length} records
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScope('all')}
                className={`p-2.5 rounded-lg border text-left transition-colors flex flex-col gap-0.5 ${
                  scope === 'all'
                    ? 'border-[#FF4B4B] bg-[#FF4B4B]/10 text-white font-semibold'
                    : darkTheme
                    ? 'border-[#30363D] bg-[#0E1117] text-slate-300 hover:bg-[#21262D]'
                    : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>All Database Logs</span>
                <span className="text-[10px] font-mono text-blue-400 font-normal">
                  {logs.length} records
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScope('today')}
                className={`p-2.5 rounded-lg border text-left transition-colors flex flex-col gap-0.5 ${
                  scope === 'today'
                    ? 'border-[#FF4B4B] bg-[#FF4B4B]/10 text-white font-semibold'
                    : darkTheme
                    ? 'border-[#30363D] bg-[#0E1117] text-slate-300 hover:bg-[#21262D]'
                    : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>Today's Check-ins</span>
                <span className="text-[10px] font-mono text-purple-400 font-normal">
                  {
                    logs.filter(
                      l => new Date(l.timestamp).toDateString() === new Date().toDateString()
                    ).length
                  } records
                </span>
              </button>
            </div>
          </div>

          {/* 2. Column Selection */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold uppercase tracking-wider text-slate-400 text-[11px]">
                2. Select Columns ({selectedColumns.length}/{AVAILABLE_COLUMNS.length})
              </label>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectAllColumns}
                  className="text-emerald-400 hover:underline"
                >
                  Select All
                </button>
                <span className="text-slate-500">·</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-slate-400 hover:underline"
                >
                  Minimal
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded-lg bg-black/20 border border-inherit">
              {AVAILABLE_COLUMNS.map(col => {
                const isSelected = selectedColumns.includes(col.key);
                return (
                  <button
                    key={col.key}
                    type="button"
                    onClick={() => toggleColumn(col.key)}
                    className={`flex items-center gap-2 p-1.5 rounded text-left transition-colors ${
                      isSelected
                        ? 'text-slate-100 font-medium'
                        : 'text-slate-500 hover:text-slate-400'
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-3.5 h-3.5 text-[#FF4B4B] shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                    <span className="truncate">{col.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. CSV Options & Filename */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-semibold uppercase tracking-wider text-slate-400 text-[11px]">
                3. Delimiter Format
              </label>
              <select
                value={delimiter}
                onChange={e => setDelimiter(e.target.value as DelimiterType)}
                className={`p-2 rounded-md border outline-hidden text-xs ${
                  darkTheme
                    ? 'bg-[#0E1117] border-[#30363D] text-slate-200'
                    : 'bg-white border-slate-300'
                }`}
              >
                <option value=",">Comma ( , ) - Standard CSV</option>
                <option value=";">Semicolon ( ; ) - Excel Europe</option>
                <option value="&#9;">Tab ( \t ) - TSV / Google Sheets</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold uppercase tracking-wider text-slate-400 text-[11px]">
                File Name
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={customFilename}
                  onChange={e => setCustomFilename(e.target.value)}
                  className={`p-2 rounded-l-md border border-r-0 outline-hidden text-xs font-mono w-full ${
                    darkTheme
                      ? 'bg-[#0E1117] border-[#30363D] text-slate-200'
                      : 'bg-white border-slate-300'
                  }`}
                />
                <span
                  className={`px-2.5 py-2 border rounded-r-md text-xs font-mono text-slate-400 ${
                    darkTheme ? 'bg-[#21262D] border-[#30363D]' : 'bg-slate-100 border-slate-300'
                  }`}
                >
                  .{delimiter === '\t' ? 'tsv' : 'csv'}
                </span>
              </div>
            </div>
          </div>

          {/* Include headers checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="include_headers"
              checked={includeHeaders}
              onChange={e => setIncludeHeaders(e.target.checked)}
              className="accent-[#FF4B4B] w-4 h-4 cursor-pointer"
            />
            <label htmlFor="include_headers" className="text-xs cursor-pointer select-none">
              Include column names as the first row in exported file
            </label>
          </div>

          {/* 4. Live CSV Monospace Preview */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3 h-3 text-[#FF4B4B]" />
                Live CSV Code Preview
              </span>
              <span>
                {targetLogs.length} total rows ({new Blob([csvContent]).size} bytes)
              </span>
            </div>
            <div className="bg-black/50 p-2.5 rounded-lg border border-slate-800 font-mono text-[10px] text-emerald-400 overflow-x-auto max-h-24 whitespace-pre">
              {previewLines || '(No rows selected)'}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t pt-3 border-inherit">
          <button
            type="button"
            onClick={handleCopyClipboard}
            className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors ${
              darkTheme
                ? 'border-[#30363D] hover:bg-[#21262D] text-slate-300'
                : 'border-slate-300 hover:bg-slate-100 text-slate-700'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Raw CSV</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                darkTheme ? 'hover:bg-[#21262D] text-slate-400' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#FF4B4B] hover:bg-[#ff3333] flex items-center gap-2 shadow-md transition-transform active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>Download CSV File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
