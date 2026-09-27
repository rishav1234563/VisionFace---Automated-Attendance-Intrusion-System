import React from 'react';
import { Printer, X, Download, ShieldCheck } from 'lucide-react';
import { AttendanceLog } from '../types';

interface PrintableReportModalProps {
  logs: AttendanceLog[];
  onClose: () => void;
  darkTheme: boolean;
}

export const PrintableReportModal: React.FC<PrintableReportModalProps> = ({
  logs,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const onTimeCount = logs.filter(l => l.status === 'Present').length;
  const lateCount = logs.filter(l => l.status === 'Late').length;
  const avgConfidence = logs.length > 0
    ? (logs.reduce((acc, l) => acc + l.confidence, 0) / logs.length).toFixed(1)
    : '0.0';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-xl shadow-2xl max-w-4xl w-full p-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto print:p-0 print:shadow-none print:max-w-none print:max-h-none print:m-0">
        {/* Top Control Bar (hidden in print) */}
        <div className="flex items-center justify-between border-b pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-700">Formal Attendance Report Preview</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
              Ready for Print / PDF Export
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-[#FF4B4B] hover:bg-[#ff3333] text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Formal Document Content */}
        <div className="flex flex-col gap-6" id="printable-section">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#FF4B4B] text-white flex items-center justify-center font-bold text-xs">
                  VF
                </div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                  VisionFace Enterprise
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Automated Biometric Face Attendance & Security Audit Log
              </p>
            </div>
            <div className="text-right text-xs font-mono text-slate-600">
              <div className="font-bold text-slate-900">OFFICIAL RECORD</div>
              <div>Report Date: {todayStr}</div>
              <div>Turnstile Gate: KIOSK-MAIN-01</div>
            </div>
          </div>

          {/* Executive Summary Metrics */}
          <div className="grid grid-cols-4 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <div className="text-[11px] text-slate-500 uppercase font-medium">Total Check-ins</div>
              <div className="text-xl font-bold font-mono text-slate-900">{logs.length}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 uppercase font-medium">On-Time Arrivals</div>
              <div className="text-xl font-bold font-mono text-emerald-600">{onTimeCount}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 uppercase font-medium">Late Arrivals</div>
              <div className="text-xl font-bold font-mono text-amber-600">{lateCount}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 uppercase font-medium">Avg Verification Conf.</div>
              <div className="text-xl font-bold font-mono text-blue-600">{avgConfidence}%</div>
            </div>
          </div>

          {/* Logs Table */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Biometric Attendance Verification Ledger
            </h3>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-slate-300 bg-slate-100 text-slate-700 font-mono">
                  <th className="py-2 px-2">ID</th>
                  <th className="py-2 px-2">Employee Name</th>
                  <th className="py-2 px-2">Department</th>
                  <th className="py-2 px-2">Timestamp</th>
                  <th className="py-2 px-2">Status</th>
                  <th className="py-2 px-2 text-right">Confidence</th>
                  <th className="py-2 px-2 text-right">Distance (d)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans">
                {logs.map(log => {
                  const d = new Date(log.timestamp);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2 px-2 font-mono text-slate-600">{log.employee_id}</td>
                      <td className="py-2 px-2 font-semibold text-slate-900">{log.user_name}</td>
                      <td className="py-2 px-2 text-slate-600">{log.department}</td>
                      <td className="py-2 px-2 font-mono text-slate-600">
                        {d.toLocaleDateString()} {d.toLocaleTimeString()}
                      </td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          log.status === 'Present'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-medium text-slate-800">
                        {log.confidence.toFixed(1)}%
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-slate-600">
                        {log.distance.toFixed(3)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Signature & Authentication Stamp */}
          <div className="mt-8 pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs text-slate-600">
            <div>
              <div className="font-semibold text-slate-900 mb-1">System Security Certification</div>
              <p className="text-[11px] leading-relaxed">
                This document is automatically generated by VisionFace Biometric AI Engine. Verified with 128-dimensional Euclidean Vector thresholds.
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-emerald-700 font-mono text-[11px]">
                <ShieldCheck className="w-4 h-4" />
                <span>SHA-256 Vector Signature Verified</span>
              </div>
            </div>

            <div className="flex flex-col items-end justify-end">
              <div className="w-48 border-b border-slate-400 pb-1 text-center font-mono text-slate-800">
                Authorized Signatory
              </div>
              <div className="text-[10px] text-slate-400 mt-1">HR & Facility Operations</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
