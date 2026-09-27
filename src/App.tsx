/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { StreamlitHeader } from './components/StreamlitHeader';
import { StreamlitSidebar, NavigationPage } from './components/StreamlitSidebar';
import { ScannerKiosk } from './components/ScannerKiosk';
import { UserRegistration } from './components/UserRegistration';
import { AttendanceDashboard } from './components/AttendanceDashboard';
import { IntrusionMonitor } from './components/IntrusionMonitor';
import { DatabaseSettings } from './components/DatabaseSettings';
import { AttendanceLog, IntrusionLog, SystemConfig, User } from './types';
import { dbService } from './services/db';

export default function App() {
  const [currentPage, setCurrentPage] = useState<NavigationPage>('kiosk');
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [intrusions, setIntrusions] = useState<IntrusionLog[]>([]);
  const [config, setConfig] = useState<SystemConfig>(dbService.getConfig());
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // Load database on initial mount
  const refreshDatabaseState = useCallback(() => {
    setUsers(dbService.getUsers());
    setLogs(dbService.getAttendanceLogs());
    setIntrusions(dbService.getIntrusionLogs());
    setConfig(dbService.getConfig());
  }, []);

  useEffect(() => {
    refreshDatabaseState();
  }, [refreshDatabaseState]);

  // Handle configuration updates
  const handleUpdateConfig = (partial: Partial<SystemConfig>) => {
    const updated = { ...config, ...partial };
    setConfig(updated);
    dbService.saveConfig(updated);
  };

  // Evaluate if system is currently in restricted hours (e.g. 20:00 - 06:00 or forced mode)
  const isRestrictedActive = Boolean(config.restricted_mode);

  // Calculate today's logs count
  const todayLogsCount = logs.filter(l => {
    const logDate = new Date(l.timestamp).toDateString();
    const today = new Date().toDateString();
    return logDate === today;
  }).length;

  // Tab display title map
  const pageTitles: Record<NavigationPage, string> = {
    kiosk: 'Live Kiosk',
    registration: 'Enrollment',
    dashboard: 'Dashboard',
    intrusions: 'Security & Incidents',
    database: 'Settings',
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors ${
        config.dark_theme
          ? 'bg-[#0E1117] text-slate-100'
          : 'bg-white text-slate-900'
      }`}
    >
      {/* Top Streamlit Navigation Header */}
      <StreamlitHeader
        currentTab={pageTitles[currentPage]}
        darkTheme={config.dark_theme}
        onToggleTheme={() => handleUpdateConfig({ dark_theme: !config.dark_theme })}
        restrictedActive={isRestrictedActive}
        onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        sidebarOpen={sidebarOpen}
      />

      {/* Main Streamlit Shell Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Streamlit Sidebar (st.sidebar) */}
        <StreamlitSidebar
          currentPage={currentPage}
          onSelectPage={setCurrentPage}
          config={config}
          onUpdateConfig={handleUpdateConfig}
          darkTheme={config.dark_theme}
          isOpen={sidebarOpen}
          userCount={users.length}
          todayLogCount={todayLogsCount}
          intrusionCount={intrusions.length}
        />

        {/* Streamlit Main Workspace Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {currentPage === 'kiosk' && (
            <ScannerKiosk
              users={users}
              config={config}
              onUpdateConfig={handleUpdateConfig}
              darkTheme={config.dark_theme}
              onLogAdded={newLog => {
                setLogs(prev => [newLog, ...prev]);
              }}
            />
          )}

          {currentPage === 'registration' && (
            <UserRegistration
              users={users}
              onUsersUpdated={updated => setUsers(updated)}
              darkTheme={config.dark_theme}
            />
          )}

          {currentPage === 'dashboard' && (
            <AttendanceDashboard
              logs={logs}
              users={users}
              onLogsUpdated={updated => setLogs(updated)}
              darkTheme={config.dark_theme}
            />
          )}

          {currentPage === 'intrusions' && (
            <IntrusionMonitor
              intrusions={intrusions}
              config={config}
              onUpdateConfig={handleUpdateConfig}
              onIntrusionsUpdated={updated => setIntrusions(updated)}
              darkTheme={config.dark_theme}
            />
          )}

          {currentPage === 'database' && (
            <DatabaseSettings
              users={users}
              logs={logs}
              intrusions={intrusions}
              config={config}
              onRefreshAll={refreshDatabaseState}
              darkTheme={config.dark_theme}
            />
          )}
        </main>
      </div>
    </div>
  );
}
