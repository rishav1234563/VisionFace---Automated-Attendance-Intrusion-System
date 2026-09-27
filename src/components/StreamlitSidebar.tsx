import React from 'react';
import {
  Video,
  UserPlus,
  BarChart3,
  ShieldAlert,
  Database,
  Sliders,
  Volume2,
  VolumeX,
  Camera,
  Layers,
  Clock,
  KeyRound
} from 'lucide-react';
import { SystemConfig } from '../types';

export type NavigationPage = 'kiosk' | 'registration' | 'dashboard' | 'intrusions' | 'database';

interface StreamlitSidebarProps {
  currentPage: NavigationPage;
  onSelectPage: (page: NavigationPage) => void;
  config: SystemConfig;
  onUpdateConfig: (partial: Partial<SystemConfig>) => void;
  darkTheme: boolean;
  isOpen: boolean;
  userCount: number;
  todayLogCount: number;
  intrusionCount: number;
}

export const StreamlitSidebar: React.FC<StreamlitSidebarProps> = ({
  currentPage,
  onSelectPage,
  config,
  onUpdateConfig,
  darkTheme,
  isOpen,
  userCount,
  todayLogCount,
  intrusionCount,
}) => {
  if (!isOpen) return null;

  const navItems: { id: NavigationPage; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'kiosk',
      label: 'Live Attendance Kiosk',
      icon: <Video className="w-4 h-4 text-[#FF4B4B]" />,
      desc: 'Real-time OpenCV Face Scanner',
    },
    {
      id: 'registration',
      label: 'Face Registration',
      icon: <UserPlus className="w-4 h-4 text-emerald-400" />,
      desc: 'Enroll 128-d Vector Profiles',
    },
    {
      id: 'dashboard',
      label: 'Attendance Analytics',
      icon: <BarChart3 className="w-4 h-4 text-blue-400" />,
      desc: 'Logs, Trends & PDF Export',
    },
    {
      id: 'intrusions',
      label: 'Intrusion Monitor',
      icon: <ShieldAlert className="w-4 h-4 text-red-400" />,
      desc: 'Restricted Hours & Alerts',
    },
    {
      id: 'database',
      label: 'Database & Settings',
      icon: <Database className="w-4 h-4 text-purple-400" />,
      desc: 'Manage Tables & Backup',
    },
  ];

  return (
    <aside
      className={`w-72 sm:w-80 shrink-0 h-[calc(100vh-3.5rem)] overflow-y-auto border-r p-4 flex flex-col gap-6 transition-colors select-none ${
        darkTheme
          ? 'bg-[#161B22] border-[#262730] text-slate-200'
          : 'bg-slate-50 border-slate-200 text-slate-800'
      }`}
    >
      {/* Streamlit Brand Title */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF4B4B]"></div>
          <span className="font-mono text-xs uppercase tracking-wider text-slate-400">Streamlit Sidebar</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <span>VisionFace</span>
          <span className="text-xs px-1.5 py-0.5 rounded font-mono font-medium bg-[#FF4B4B] text-white">
            PRO
          </span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          OpenCV + Database Face Engine
        </p>
      </div>

      {/* st.radio / Navigation Menu */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
          Select View (st.navigation)
        </label>
        <div className="flex flex-col gap-1">
          {navItems.map(item => {
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectPage(item.id)}
                className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-center gap-3 ${
                  active
                    ? darkTheme
                      ? 'bg-[#262730] text-white border-l-4 border-l-[#FF4B4B] shadow-xs'
                      : 'bg-white text-slate-900 border-l-4 border-l-[#FF4B4B] shadow-xs'
                    : darkTheme
                    ? 'hover:bg-[#21262D] text-slate-300'
                    : 'hover:bg-slate-200/60 text-slate-600'
                }`}
              >
                <div className="shrink-0">{item.icon}</div>
                <div className="flex flex-col overflow-hidden">
                  <span className="font-semibold truncate">{item.label}</span>
                  <span className="text-[10px] text-slate-400 truncate">{item.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <hr className={darkTheme ? 'border-[#262730]' : 'border-slate-200'} />

      {/* Streamlit Parameter Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
          <Sliders className="w-3.5 h-3.5 text-[#FF4B4B]" />
          <span>Vision Parameters (st.slider)</span>
        </div>

        {/* Camera Source Selector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-slate-400" />
              Camera Source
            </span>
          </label>
          <select
            value={config.camera_source}
            onChange={e => onUpdateConfig({ camera_source: e.target.value as SystemConfig['camera_source'] })}
            className={`w-full text-xs rounded-md p-2 border outline-hidden transition-colors ${
              darkTheme
                ? 'bg-[#0E1117] border-[#30363D] text-slate-200 focus:border-[#FF4B4B]'
                : 'bg-white border-slate-300 text-slate-800 focus:border-[#FF4B4B]'
            }`}
          >
            <option value="webcam">Live User Webcam</option>
            <option value="demo_feed">Virtual Entrance Stream (Demo Loop)</option>
            <option value="front_entrance">Front Turnstile 1080p</option>
          </select>
        </div>

        {/* OpenCV Filter Mode */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              OpenCV Filter Pipeline
            </span>
          </label>
          <select
            value={config.cv_filter}
            onChange={e => onUpdateConfig({ cv_filter: e.target.value as SystemConfig['cv_filter'] })}
            className={`w-full text-xs rounded-md p-2 border outline-hidden transition-colors ${
              darkTheme
                ? 'bg-[#0E1117] border-[#30363D] text-slate-200 focus:border-[#FF4B4B]'
                : 'bg-white border-slate-300 text-slate-800 focus:border-[#FF4B4B]'
            }`}
          >
            <option value="normal">Normal RGB + OpenCV HUD</option>
            <option value="grayscale">Grayscale + Equalized</option>
            <option value="canny">Sobel Edge / Canny Filter</option>
            <option value="landmarks">Facial Landmarks & Axis</option>
            <option value="thermal">Thermal False-Color Heatmap</option>
          </select>
        </div>

        {/* Matching Distance Threshold Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              Tolerance Distance (d)
            </span>
            <span className="font-mono text-[#FF4B4B] font-bold">
              {config.distance_threshold.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0.30"
            max="0.80"
            step="0.01"
            value={config.distance_threshold}
            onChange={e => onUpdateConfig({ distance_threshold: parseFloat(e.target.value) })}
            className="accent-[#FF4B4B] h-1.5 bg-slate-300 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>Strict (0.30)</span>
            <span>Standard (0.55)</span>
            <span>Relaxed (0.80)</span>
          </div>
        </div>

        {/* Cooldown Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Attendance Cooldown
            </span>
            <span className="font-mono text-[#FF4B4B] font-bold">
              {config.cooldown_minutes} min
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="30"
            step="1"
            value={config.cooldown_minutes}
            onChange={e => onUpdateConfig({ cooldown_minutes: parseInt(e.target.value, 10) })}
            className="accent-[#FF4B4B] h-1.5 bg-slate-300 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>1 min</span>
            <span>5 min</span>
            <span>30 min</span>
          </div>
        </div>

        {/* Security Restricted Mode Toggle */}
        <div className={`p-3 rounded-lg border flex flex-col gap-2 ${
          config.restricted_mode
            ? 'bg-red-950/20 border-red-800/60'
            : darkTheme
            ? 'bg-[#0E1117] border-[#262730]'
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className={`w-4 h-4 ${config.restricted_mode ? 'text-red-400' : 'text-slate-400'}`} />
              <span className="text-xs font-semibold">Restricted Hours</span>
            </div>
            <input
              type="checkbox"
              id="restricted_mode"
              checked={config.restricted_mode}
              onChange={e => onUpdateConfig({ restricted_mode: e.target.checked })}
              className="accent-red-500 w-4 h-4 cursor-pointer"
            />
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Flag unknown faces as perimeter intruders and snapshot to DB.
          </p>
        </div>

        {/* Sound Toggle */}
        <button
          onClick={() => onUpdateConfig({ sound_effects_enabled: !config.sound_effects_enabled })}
          className={`flex items-center justify-between p-2 rounded text-xs border transition-colors ${
            darkTheme ? 'bg-[#0E1117] border-[#262730] hover:bg-[#262730]' : 'bg-white border-slate-200 hover:bg-slate-100'
          }`}
        >
          <span className="flex items-center gap-2">
            {config.sound_effects_enabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
            <span>Audio Chimes & Sirens</span>
          </span>
          <span className="font-mono text-[10px] text-slate-400">
            {config.sound_effects_enabled ? 'ON' : 'MUTED'}
          </span>
        </button>
      </div>

      {/* st.metric mini summary */}
      <div className={`mt-auto p-3 rounded-lg border text-xs flex flex-col gap-2 ${
        darkTheme ? 'bg-[#0E1117] border-[#262730]' : 'bg-white border-slate-200'
      }`}>
        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
          Database Quick Metrics
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="font-bold text-base font-mono text-emerald-400">{userCount}</div>
            <div className="text-[10px] text-slate-400">Profiles</div>
          </div>
          <div>
            <div className="font-bold text-base font-mono text-blue-400">{todayLogCount}</div>
            <div className="text-[10px] text-slate-400">Today</div>
          </div>
          <div>
            <div className="font-bold text-base font-mono text-red-400">{intrusionCount}</div>
            <div className="text-[10px] text-slate-400">Intruders</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
