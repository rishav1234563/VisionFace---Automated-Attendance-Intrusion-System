import { AttendanceLog, IntrusionLog, SystemConfig, User } from '../types';

const STORAGE_KEYS = {
  USERS: 'visionface_users_v1',
  ATTENDANCE: 'visionface_attendance_v1',
  INTRUSIONS: 'visionface_intrusions_v1',
  CONFIG: 'visionface_config_v1',
};

// Generate realistic 128-d mock embedding vector for sample users
function generateDeterministicEmbedding(seed: number): number[] {
  const vec = new Array(128).fill(0);
  let norm = 0;
  for (let i = 0; i < 128; i++) {
    const val = Math.sin(seed * (i + 1) * 0.17) * 0.6 + Math.cos(seed * (i + 3) * 0.31) * 0.4;
    vec[i] = val;
    norm += val * val;
  }
  const invNorm = 1 / Math.sqrt(norm);
  return vec.map(v => v * invNorm);
}

// Generate clean avatar SVG data URL
function createSampleAvatar(name: string, bg: string, textCol: string): string {
  const initials = name
    .split(' ')
    .map(p => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <rect width="160" height="160" rx="24" fill="${bg}"/>
    <circle cx="80" cy="65" r="32" fill="${textCol}" opacity="0.18"/>
    <path d="M35 140 C35 105, 125 105, 125 140 Z" fill="${textCol}" opacity="0.18"/>
    <text x="80" y="94" font-family="system-ui, sans-serif" font-size="34" font-weight="700" fill="${textCol}" text-anchor="middle">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DEFAULT_CONFIG: SystemConfig = {
  distance_threshold: 0.55,
  cooldown_minutes: 5,
  restricted_mode: false,
  restricted_hours_start: '20:00',
  restricted_hours_end: '06:00',
  auto_snapshot_intrusion: true,
  sound_effects_enabled: true,
  cv_filter: 'normal',
  camera_source: 'webcam',
  dark_theme: true,
};

const INITIAL_USERS: User[] = [
  {
    id: 'usr-101',
    employee_id: 'EMP-041',
    full_name: 'Dr. Elena Rostova',
    role: 'Faculty',
    department: 'AI & Robotics Lab',
    email: 'elena.rostova@visionlabs.org',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    face_image: createSampleAvatar('Dr. Elena Rostova', '#047857', '#ECFDF5'),
    embedding: generateDeterministicEmbedding(101),
  },
  {
    id: 'usr-102',
    employee_id: 'EMP-042',
    full_name: 'Marcus Vance',
    role: 'Employee',
    department: 'DevOps & Infrastructure',
    email: 'm.vance@visionlabs.org',
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    face_image: createSampleAvatar('Marcus Vance', '#1D4ED8', '#EFF6FF'),
    embedding: generateDeterministicEmbedding(102),
  },
  {
    id: 'usr-103',
    employee_id: 'EMP-043',
    full_name: 'Aaliyah Chen',
    role: 'Employee',
    department: 'Product Architecture',
    email: 'aaliyah.c@visionlabs.org',
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    face_image: createSampleAvatar('Aaliyah Chen', '#7C3AED', '#F5F3FF'),
    embedding: generateDeterministicEmbedding(103),
  },
  {
    id: 'usr-104',
    employee_id: 'EMP-044',
    full_name: 'Liam Gallagher',
    role: 'Employee',
    department: 'Cybersecurity',
    email: 'l.gallagher@visionlabs.org',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    face_image: createSampleAvatar('Liam Gallagher', '#B45309', '#FFFBEB'),
    embedding: generateDeterministicEmbedding(104),
  },
  {
    id: 'usr-105',
    employee_id: 'EMP-045',
    full_name: 'Devon Ramirez',
    role: 'Student',
    department: 'Computer Science',
    email: 'devon.r@visionlabs.org',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    face_image: createSampleAvatar('Devon Ramirez', '#BE185D', '#FDF2F8'),
    embedding: generateDeterministicEmbedding(105),
  },
];

function generateMonthAttendanceSeed(): AttendanceLog[] {
  const seedUsers = [
    { id: 'usr-101', name: 'Dr. Elena Rostova', empId: 'EMP-041', dept: 'AI & Robotics Lab' },
    { id: 'usr-102', name: 'Marcus Vance', empId: 'EMP-042', dept: 'DevOps & Infrastructure' },
    { id: 'usr-103', name: 'Aaliyah Chen', empId: 'EMP-043', dept: 'Product Architecture' },
    { id: 'usr-104', name: 'Liam Gallagher', empId: 'EMP-044', dept: 'Cybersecurity' },
    { id: 'usr-105', name: 'Devon Ramirez', empId: 'EMP-045', dept: 'Computer Science' },
  ];

  const logs: AttendanceLog[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  // Populate realistic attendance records for past days of current month
  for (let day = 1; day <= currentDay; day++) {
    const dayDate = new Date(currentYear, currentMonth, day);
    const dayOfWeek = dayDate.getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Fewer check-ins on weekends, normal on weekdays
    const attendees = isWeekend
      ? seedUsers.slice(0, 1 + (day % 2))
      : seedUsers.slice(0, 3 + ((day * 7) % 3));

    attendees.forEach((usr, idx) => {
      const isLate = (day + idx) % 5 === 0;
      const hour = isLate ? 9 : 8;
      const minute = isLate ? 35 + (idx * 5) : 15 + (idx * 12);
      const logDate = new Date(currentYear, currentMonth, day, hour, minute, 10 + idx * 8);

      // Don't generate logs in the future for today's date if hour is ahead
      if (day === currentDay && logDate.getTime() > now.getTime()) {
        logDate.setHours(Math.max(8, now.getHours() - 1));
      }

      logs.push({
        id: `att-seed-${day}-${idx}`,
        user_id: usr.id,
        user_name: usr.name,
        employee_id: usr.empId,
        department: usr.dept,
        timestamp: logDate.toISOString(),
        confidence: Number((93.5 + ((day + idx * 3) % 6) * 1.1).toFixed(1)),
        distance: Number((0.18 + ((day + idx) % 5) * 0.03).toFixed(3)),
        status: isLate ? 'Late' : 'Present',
        device_id: 'TURNSTILE-GATE-01',
      });
    });
  }

  // Sort descending (most recent first)
  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

const INITIAL_ATTENDANCE: AttendanceLog[] = generateMonthAttendanceSeed();

const INITIAL_INTRUSIONS: IntrusionLog[] = [
  {
    id: 'int-001',
    timestamp: new Date(Date.now() - 14 * 3600000).toISOString(),
    image_snapshot: createSampleAvatar('Unregistered Subject', '#334155', '#F8FAFC'),
    best_distance: 0.79,
    nearest_user_match: 'Liam Gallagher (34% similarity)',
    alert_sent: true,
    alert_channel: 'SMTP',
    status: 'Acknowledged',
    notes: 'Visitor after-hours near East Gate turnstile. Security contacted.',
    ip_source: '192.168.1.140 (Cam-FrontGate)',
  },
];

class DatabaseService {
  getUsers(): User[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      if (!data) {
        this.saveUsers(INITIAL_USERS);
        return INITIAL_USERS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_USERS;
    }
  }

  saveUsers(users: User[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch (e) {
      console.error('Failed to save users', e);
    }
  }

  addUser(user: User): User[] {
    const users = this.getUsers();
    const updated = [user, ...users];
    this.saveUsers(updated);
    return updated;
  }

  deleteUser(userId: string): User[] {
    const users = this.getUsers().filter(u => u.id !== userId);
    this.saveUsers(users);
    return users;
  }

  getAttendanceLogs(): AttendanceLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      if (!data) {
        this.saveAttendanceLogs(INITIAL_ATTENDANCE);
        return INITIAL_ATTENDANCE;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_ATTENDANCE;
    }
  }

  saveAttendanceLogs(logs: AttendanceLog[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to save attendance logs', e);
    }
  }

  addAttendanceLog(log: AttendanceLog): { success: boolean; reason?: string; logs: AttendanceLog[] } {
    const logs = this.getAttendanceLogs();
    const config = this.getConfig();

    // Check cooldown window (default 5 minutes)
    const cooldownMs = config.cooldown_minutes * 60 * 1000;
    const now = new Date(log.timestamp).getTime();

    const recentUserLog = logs.find(l => l.user_id === log.user_id);
    if (recentUserLog) {
      const lastTime = new Date(recentUserLog.timestamp).getTime();
      const diff = now - lastTime;
      if (diff < cooldownMs) {
        const remainingMinutes = Math.ceil((cooldownMs - diff) / 60000);
        return {
          success: false,
          reason: `Attendance cooldown active for ${log.user_name}. Next eligible in ${remainingMinutes}m.`,
          logs,
        };
      }
    }

    const updated = [log, ...logs];
    this.saveAttendanceLogs(updated);
    return { success: true, logs: updated };
  }

  clearAttendanceLogs(): AttendanceLog[] {
    this.saveAttendanceLogs([]);
    return [];
  }

  getIntrusionLogs(): IntrusionLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INTRUSIONS);
      if (!data) {
        this.saveIntrusionLogs(INITIAL_INTRUSIONS);
        return INITIAL_INTRUSIONS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_INTRUSIONS;
    }
  }

  saveIntrusionLogs(intrusions: IntrusionLog[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.INTRUSIONS, JSON.stringify(intrusions));
    } catch (e) {
      console.error('Failed to save intrusions', e);
    }
  }

  addIntrusionLog(log: IntrusionLog): IntrusionLog[] {
    const list = this.getIntrusionLogs();
    // Throttle duplicate intrusion logs within 15 seconds
    if (list.length > 0) {
      const latest = new Date(list[0].timestamp).getTime();
      const curr = new Date(log.timestamp).getTime();
      if (curr - latest < 15000) {
        return list;
      }
    }
    const updated = [log, ...list];
    this.saveIntrusionLogs(updated);
    return updated;
  }

  updateIntrusionStatus(id: string, status: IntrusionLog['status'], notes?: string): IntrusionLog[] {
    const list = this.getIntrusionLogs().map(item => {
      if (item.id === id) {
        return {
          ...item,
          status,
          notes: notes !== undefined ? notes : item.notes,
        };
      }
      return item;
    });
    this.saveIntrusionLogs(list);
    return list;
  }

  clearIntrusions(): IntrusionLog[] {
    this.saveIntrusionLogs([]);
    return [];
  }

  getConfig(): SystemConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (!data) {
        this.saveConfig(DEFAULT_CONFIG);
        return DEFAULT_CONFIG;
      }
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  saveConfig(config: SystemConfig) {
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error('Failed to save config', e);
    }
  }

  resetAllToDefaults() {
    this.saveUsers(INITIAL_USERS);
    this.saveAttendanceLogs(INITIAL_ATTENDANCE);
    this.saveIntrusionLogs(INITIAL_INTRUSIONS);
    this.saveConfig(DEFAULT_CONFIG);
  }

  exportToCSV(logs: AttendanceLog[]): string {
    const headers = ['Record ID', 'Employee ID', 'Full Name', 'Department', 'Date', 'Time', 'Status', 'Confidence %', 'Distance'];
    const rows = logs.map(l => {
      const d = new Date(l.timestamp);
      return [
        l.id,
        l.employee_id,
        `"${l.user_name.replace(/"/g, '""')}"`,
        `"${l.department.replace(/"/g, '""')}"`,
        d.toLocaleDateString(),
        d.toLocaleTimeString(),
        l.status,
        `${l.confidence}%`,
        l.distance.toFixed(3),
      ].join(',');
    });
    return [headers.join(','), ...rows].join('\n');
  }
}

export const dbService = new DatabaseService();
