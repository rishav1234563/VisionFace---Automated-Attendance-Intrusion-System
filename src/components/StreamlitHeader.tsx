import React from 'react';
import { Play, Moon, Sun, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

interface StreamlitHeaderProps {
  currentTab: string;
  darkTheme: boolean;
  onToggleTheme: () => void;
  restrictedActive: boolean;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export const StreamlitHeader: React.FC<StreamlitHeaderProps> = ({
  currentTab,
  darkTheme,
  onToggleTheme,
  restrictedActive,
  onToggleSidebar,
  sidebarOpen,
}) => {
  return (
    <header className={`h-14 border-b flex items-center justify-between px-4 sticky top-0 z-30 transition-colors ${
      darkTheme ? 'bg-[#0E1117] border-[#262730] text-slate-100' : 'bg-white border-slate-200 text-slate-800'
    }`}>
      {/* Left: Sidebar toggle + App identity */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
          className={`p-1.5 rounded text-xs flex items-center gap-1 font-mono transition-colors ${
            darkTheme
              ? 'hover:bg-[#262730] text-slate-300'
              : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          <span className="text-base">☰</span>
          <span className="hidden sm:inline font-sans text-xs font-medium">
            {sidebarOpen ? 'Close Menu' : 'Open Menu'}
          </span>
        </button>

        {/* Streamlit Red Crown & App Name */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 flex items-center justify-center rounded bg-[#FF4B4B] text-white shadow-xs font-bold text-xs select-none">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-sm tracking-tight hidden md:inline">
            VisionFace
          </span>
          <span className="text-xs text-slate-500 font-mono hidden lg:inline">
            / {currentTab}
          </span>
        </div>
      </div>

      {/* Center: System Status Indicator */}
      <div className="flex items-center gap-2">
        {restrictedActive ? (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-red-950/40 text-red-400 border border-red-800/60 animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>SECURITY RESTRICTED</span>
          </div>
        ) : (
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono ${
            darkTheme ? 'text-emerald-400 bg-emerald-950/30 border border-emerald-900/50' : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>SYSTEM ACTIVE</span>
          </div>
        )}

        <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded">
          <Play className="w-3 h-3 text-[#FF4B4B] fill-[#FF4B4B]" />
          <span>st.running</span>
        </div>
      </div>

      {/* Right: Actions & Theme Toggle */}
      <div className="flex items-center gap-2">
        {/* Streamlit Deploy Pill */}
        <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-[#FF4B4B]/10 text-[#FF4B4B] border border-[#FF4B4B]/20">
          <span>Streamlit 1.39</span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          title={darkTheme ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className={`p-1.5 rounded transition-colors ${
            darkTheme ? 'text-slate-300 hover:bg-[#262730]' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {darkTheme ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>

        {/* Rerun App Button */}
        <button
          onClick={() => window.location.reload()}
          title="Rerun Streamlit App (R)"
          className={`p-1.5 rounded transition-colors ${
            darkTheme ? 'text-slate-300 hover:bg-[#262730]' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
