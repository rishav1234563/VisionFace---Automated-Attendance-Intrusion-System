export type UserRole = 'Employee' | 'Faculty' | 'Student' | 'Contractor' | 'Admin';

export type AttendanceStatus = 'Present' | 'Late' | 'Early Departure' | 'Half Day';

export interface User {
  id: string;
  employee_id: string;
  full_name: string;
  role: UserRole;
  department: string;
  email: string;
  created_at: string;
  face_image: string; // Base64 data URL
  embedding: number[]; // 128-dimensional feature vector
}

export interface AttendanceLog {
  id: string;
  user_id: string;
  user_name: string;
  employee_id: string;
  department: string;
  timestamp: string; // ISO string
  confidence: number; // percentage (0 - 100)
  distance: number; // Euclidean distance (0.00 - 1.00+)
  status: AttendanceStatus;
  snapshot?: string;
  device_id?: string;
}

export interface IntrusionLog {
  id: string;
  timestamp: string;
  image_snapshot: string;
  best_distance: number;
  nearest_user_match?: string;
  alert_sent: boolean;
  alert_channel: 'SMTP' | 'Webhook' | 'Local';
  status: 'Pending' | 'Acknowledged' | 'Flagged' | 'Resolved';
  notes?: string;
  ip_source?: string;
}

export interface SystemConfig {
  distance_threshold: number; // default 0.55 (d <= 0.55 means match)
  cooldown_minutes: number; // default 5 minutes
  restricted_mode: boolean; // if true, all unknown faces trigger intrusion alerts
  restricted_hours_start: string; // "20:00"
  restricted_hours_end: string; // "06:00"
  auto_snapshot_intrusion: boolean;
  sound_effects_enabled: boolean;
  cv_filter: 'normal' | 'grayscale' | 'canny' | 'landmarks' | 'thermal';
  camera_source: 'webcam' | 'demo_feed' | 'front_entrance';
  dark_theme: boolean;
}

export interface DetectedFaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
  landmarks?: {
    leftEye: [number, number];
    rightEye: [number, number];
    nose: [number, number];
    mouth: [number, number];
    jawLeft: [number, number];
    jawRight: [number, number];
  };
  embedding?: number[];
  matchUser?: User;
  distance?: number;
  confidence?: number;
  isUnknown?: boolean;
}
