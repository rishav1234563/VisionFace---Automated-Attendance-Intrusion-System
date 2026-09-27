import React, { useEffect, useRef, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  Volume2
} from 'lucide-react';
import { AttendanceLog, DetectedFaceBox, SystemConfig, User } from '../types';
import { visionEngine } from '../services/vision';
import { dbService } from '../services/db';
import { soundService } from '../services/audio';

interface ScannerKioskProps {
  users: User[];
  config: SystemConfig;
  onUpdateConfig: (partial: Partial<SystemConfig>) => void;
  darkTheme: boolean;
  onLogAdded: (log: AttendanceLog) => void;
}

export const ScannerKiosk: React.FC<ScannerKioskProps> = ({
  users,
  config,
  onUpdateConfig,
  darkTheme,
  onLogAdded,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);

  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(30);
  const [latestAlert, setLatestAlert] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
    subtext?: string;
  } | null>(null);

  // Consecutive match tracker to ensure stable recognition before auto-logging
  const consecutiveMatchRef = useRef<{ userId: string; count: number }>({ userId: '', count: 0 });
  const lastProcessedTime = useRef<number>(Date.now());
  const frameCounter = useRef<number>(0);
  const lastFpsTime = useRef<number>(performance.now());

  // Recent logs for the kiosk display
  const [recentLogs, setRecentLogs] = useState<AttendanceLog[]>([]);

  // Refresh recent logs
  const reloadRecent = useCallback(() => {
    const logs = dbService.getAttendanceLogs();
    setRecentLogs(logs.slice(0, 5));
  }, []);

  useEffect(() => {
    reloadRecent();
  }, [reloadRecent]);

  // Start Webcam or Virtual Simulation
  const startCamera = useCallback(async () => {
    setCameraError(null);

    if (config.camera_source === 'demo_feed') {
      setStreamActive(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setStreamActive(true);
        };
      }
    } catch (err: unknown) {
      console.warn('Camera access error or rejected:', err);
      setCameraError('Webcam access was denied or is unavailable. Switched to Interactive Demo Feed.');
      onUpdateConfig({ camera_source: 'demo_feed' });
      setStreamActive(true);
    }
  }, [config.camera_source, onUpdateConfig]);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  }, []);

  // Effect to re-initialize camera when source changes
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [startCamera, stopCamera]);

  // Main OpenCV Processing Loop
  useEffect(() => {
    let isCancelled = false;

    // Simulation variables for demo mode
    let simAngle = 0;
    const demoSubjects = [
      { name: 'Dr. Elena Rostova', userIdx: 0, isUnknown: false },
      { name: 'Marcus Vance', userIdx: 1, isUnknown: false },
      { name: 'Unregistered Visitor', userIdx: -1, isUnknown: true },
      { name: 'Aaliyah Chen', userIdx: 2, isUnknown: false },
    ];

    const processFrame = async () => {
      if (isCancelled) return;

      const canvas = canvasRef.current;
      const video = videoRef.current;

      if (!canvas) {
        animFrameId.current = requestAnimationFrame(processFrame);
        return;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        animFrameId.current = requestAnimationFrame(processFrame);
        return;
      }

      const width = canvas.width || 640;
      const height = canvas.height || 480;

      // Calculate real FPS
      frameCounter.current++;
      const now = performance.now();
      if (now - lastFpsTime.current >= 1000) {
        setFps((frameCounter.current * 1000) / (now - lastFpsTime.current));
        frameCounter.current = 0;
        lastFpsTime.current = now;
      }

      let detectedFaces: DetectedFaceBox[] = [];

      // 1. Render Video Source onto Canvas
      if (config.camera_source !== 'demo_feed' && video && video.readyState >= 2) {
        // Draw real webcam frame
        ctx.save();
        ctx.drawImage(video, 0, 0, width, height);
        ctx.restore();

        // Run Computer Vision Face Detector
        try {
          detectedFaces = await visionEngine.detectFaces(canvas, width, height);
        } catch {
          detectedFaces = [];
        }
      } else {
        // Demo synthetic camera loop: renders a modern office entrance scene with rotating subjects
        simAngle += 0.015;
        const subjectIdx = Math.floor((Math.sin(simAngle) * 0.5 + 0.5) * demoSubjects.length) % demoSubjects.length;
        const currentSubject = demoSubjects[subjectIdx];

        // Draw animated background
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#1E293B');
        grad.addColorStop(1, '#0F172A');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Grid lines (entrance hall perspective)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }

        // Draw synthetic moving subject silhouette & face
        const faceX = width * 0.32 + Math.sin(simAngle * 2) * 40;
        const faceY = height * 0.22 + Math.cos(simAngle * 1.5) * 15;
        const faceW = 210;
        const faceH = 260;

        // Head oval
        ctx.fillStyle = '#CBD5E1';
        ctx.beginPath();
        ctx.ellipse(faceX + faceW / 2, faceY + faceH * 0.45, faceW * 0.38, faceH * 0.44, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.arc(faceX + faceW * 0.36, faceY + faceH * 0.40, 7, 0, Math.PI * 2);
        ctx.arc(faceX + faceW * 0.64, faceY + faceH * 0.40, 7, 0, Math.PI * 2);
        ctx.fill();

        // Nose line
        ctx.beginPath();
        ctx.moveTo(faceX + faceW * 0.5, faceY + faceH * 0.43);
        ctx.lineTo(faceX + faceW * 0.47, faceY + faceH * 0.55);
        ctx.lineTo(faceX + faceW * 0.53, faceY + faceH * 0.55);
        ctx.stroke();

        // Mouth smile
        ctx.beginPath();
        ctx.arc(faceX + faceW * 0.5, faceY + faceH * 0.62, 16, 0.2, Math.PI - 0.2);
        ctx.stroke();

        detectedFaces = [
          {
            x: Math.round(faceX),
            y: Math.round(faceY),
            width: Math.round(faceW),
            height: Math.round(faceH),
            landmarks: {
              leftEye: [faceX + faceW * 0.36, faceY + faceH * 0.40],
              rightEye: [faceX + faceW * 0.64, faceY + faceH * 0.40],
              nose: [faceX + faceW * 0.50, faceY + faceH * 0.54],
              mouth: [faceX + faceW * 0.50, faceY + faceH * 0.68],
              jawLeft: [faceX + faceW * 0.15, faceY + faceH * 0.75],
              jawRight: [faceX + faceW * 0.85, faceY + faceH * 0.75],
            },
            isUnknown: currentSubject.isUnknown,
          }
        ];
      }

      // 2. Perform 128-d Embedding Extraction & Vector Matching
      if (detectedFaces.length > 0) {
        for (const face of detectedFaces) {
          const emb = visionEngine.extractEmbeddingFromCanvas(canvas, face);
          face.embedding = emb;

          const matchResult = visionEngine.matchAgainstUsers(
            emb,
            users,
            config.distance_threshold
          );

          // If in demo mode and subject is explicitly set, lock match to user
          if (config.camera_source === 'demo_feed') {
            const subjectIdx = Math.floor((Math.sin(simAngle) * 0.5 + 0.5) * demoSubjects.length) % demoSubjects.length;
            const currentSub = demoSubjects[subjectIdx];
            if (!currentSub.isUnknown && users[currentSub.userIdx]) {
              face.matchUser = users[currentSub.userIdx];
              face.distance = 0.22;
              face.confidence = 97.2;
              face.isUnknown = false;
            } else {
              face.matchUser = undefined;
              face.distance = 0.79;
              face.confidence = 21.0;
              face.isUnknown = true;
            }
          } else {
            face.matchUser = matchResult.matchedUser || undefined;
            face.distance = matchResult.distance;
            face.confidence = matchResult.confidence;
            face.isUnknown = matchResult.isUnknown;
          }
        }
      }

      // 3. Apply OpenCV Filter Pipelines (Grayscale, Canny, Thermal)
      visionEngine.applyCvFilter(ctx, width, height, config.cv_filter);

      // 4. Render OpenCV HUD Overlay
      visionEngine.renderOpenCvHUD(
        ctx,
        width,
        height,
        detectedFaces,
        config.cv_filter,
        fps,
        config.restricted_mode
      );

      // 5. Evaluate Attendance / Intrusion Trigger Logic (every 1.5s)
      const currentTime = Date.now();
      if (currentTime - lastProcessedTime.current > 1500 && detectedFaces.length > 0) {
        lastProcessedTime.current = currentTime;
        const primaryFace = detectedFaces[0];

        // Scenario A: Recognized Face -> Auto Attendance Check-in
        if (primaryFace.matchUser && !primaryFace.isUnknown) {
          const targetUser = primaryFace.matchUser;

          // Require stable recognition for at least 2 frames
          if (consecutiveMatchRef.current.userId === targetUser.id) {
            consecutiveMatchRef.current.count++;
          } else {
            consecutiveMatchRef.current = { userId: targetUser.id, count: 1 };
          }

          if (consecutiveMatchRef.current.count >= 2) {
            consecutiveMatchRef.current.count = 0; // Reset counter

            // Create Attendance Record
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            // Determine on-time status: after 9:30 AM is considered Late
            const isLate = hours > 9 || (hours === 9 && minutes > 30);

            const newLog: AttendanceLog = {
              id: `att-${Date.now()}`,
              user_id: targetUser.id,
              user_name: targetUser.full_name,
              employee_id: targetUser.employee_id,
              department: targetUser.department,
              timestamp: now.toISOString(),
              confidence: primaryFace.confidence || 96.5,
              distance: primaryFace.distance || 0.24,
              status: isLate ? 'Late' : 'Present',
              device_id: 'TURNSTILE-GATE-01',
            };

            const result = dbService.addAttendanceLog(newLog);

            if (result.success) {
              if (config.sound_effects_enabled) {
                soundService.playSuccessChime();
              }
              // Confetti celebration
              confetti({
                particleCount: 45,
                spread: 60,
                origin: { y: 0.8 },
                colors: ['#10B981', '#34D399', '#6EE7B7'],
              });

              setLatestAlert({
                type: 'success',
                message: `Attendance Verified: ${targetUser.full_name}`,
                subtext: `${targetUser.department} · Logged at ${now.toLocaleTimeString()} (${newLog.status})`,
              });
              onLogAdded(newLog);
              reloadRecent();
            } else {
              // Cooldown active
              setLatestAlert({
                type: 'warning',
                message: result.reason || 'Attendance cooldown active.',
                subtext: 'Already verified within the last few minutes.',
              });
            }
          }
        }

        // Scenario B: Unknown Face in Restricted Hours -> Intrusion Alert & Snapshot
        else if (primaryFace.isUnknown && config.restricted_mode) {
          // Snapshot high-res canvas frame
          const snapshotDataUrl = canvas.toDataURL('image/jpeg', 0.85);

          dbService.addIntrusionLog({
            id: `int-${Date.now()}`,
            timestamp: new Date().toISOString(),
            image_snapshot: snapshotDataUrl,
            best_distance: primaryFace.distance || 0.78,
            nearest_user_match: 'Unknown Individual',
            alert_sent: true,
            alert_channel: 'SMTP',
            status: 'Pending',
            notes: 'Intrusion flagged during restricted hours monitor.',
            ip_source: 'Kiosk-Cam-01',
          });

          if (config.sound_effects_enabled) {
            soundService.playIntruderAlert();
          }

          setLatestAlert({
            type: 'error',
            message: 'SECURITY ALERT: UNKNOWN INTRUSION DETECTED',
            subtext: `Snapshot recorded to security database at ${new Date().toLocaleTimeString()}.`,
          });
        }
      }

      animFrameId.current = requestAnimationFrame(processFrame);
    };

    animFrameId.current = requestAnimationFrame(processFrame);

    return () => {
      isCancelled = true;
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [config, users, fps, onLogAdded, reloadRecent]);

  // Manual Trigger to snapshot and test current face
  const handleManualCheckIn = () => {
    soundService.playClick();
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (users.length === 0) {
      setLatestAlert({
        type: 'warning',
        message: 'No enrolled users in database.',
        subtext: 'Please navigate to Face Registration to enroll users first.',
      });
      return;
    }

    const emb = visionEngine.extractEmbeddingFromCanvas(canvas, {
      x: canvas.width * 0.25,
      y: canvas.height * 0.2,
      width: canvas.width * 0.5,
      height: canvas.height * 0.6,
    });

    const match = visionEngine.matchAgainstUsers(emb, users, config.distance_threshold);

    if (match.matchedUser) {
      const now = new Date();
      const newLog: AttendanceLog = {
        id: `att-manual-${Date.now()}`,
        user_id: match.matchedUser.id,
        user_name: match.matchedUser.full_name,
        employee_id: match.matchedUser.employee_id,
        department: match.matchedUser.department,
        timestamp: now.toISOString(),
        confidence: match.confidence,
        distance: match.distance,
        status: 'Present',
        device_id: 'MANUAL-SCANNER',
      };
      const res = dbService.addAttendanceLog(newLog);
      if (res.success) {
        if (config.sound_effects_enabled) soundService.playSuccessChime();
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
        setLatestAlert({
          type: 'success',
          message: `Manual Log: ${match.matchedUser.full_name}`,
          subtext: `Confidence: ${match.confidence}% · Distance: ${match.distance}`,
        });
        onLogAdded(newLog);
        reloadRecent();
      } else {
        setLatestAlert({
          type: 'warning',
          message: res.reason || 'Cooldown active.',
        });
      }
    } else {
      setLatestAlert({
        type: 'error',
        message: 'No Match Found (d > threshold)',
        subtext: `Closest distance: ${match.distance} (Threshold: ${config.distance_threshold})`,
      });
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Streamlit Title & Markdown Subheader */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">📹</span>
          <h1 className="text-2xl font-bold tracking-tight">
            Live Attendance Kiosk
          </h1>
        </div>
        <p className="text-xs text-slate-500 font-mono">
          st.camera_input + OpenCV 4.10 Vision Pipeline with Euclidean Distance Verification
        </p>
      </div>

      {/* Camera Alert / Error Banner */}
      {cameraError && (
        <div className="p-3 rounded-lg border text-xs flex items-center justify-between bg-amber-500/10 border-amber-500/30 text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{cameraError}</span>
          </div>
          <button
            onClick={() => onUpdateConfig({ camera_source: 'demo_feed' })}
            className="px-2 py-1 bg-amber-500 text-slate-900 rounded font-medium hover:bg-amber-400"
          >
            Use Demo Feed
          </button>
        </div>
      )}

      {/* Streamlit Notification Callout (st.success / st.error / st.warning) */}
      {latestAlert && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-start justify-between transition-all shadow-xs ${
            latestAlert.type === 'success'
              ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300'
              : latestAlert.type === 'error'
              ? 'bg-red-950/40 border-red-800 text-red-300 animate-pulse'
              : 'bg-amber-950/30 border-amber-800 text-amber-300'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {latestAlert.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />}
            {latestAlert.type === 'error' && <ShieldAlert className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />}
            {latestAlert.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />}
            <div>
              <div className="font-semibold text-sm">{latestAlert.message}</div>
              {latestAlert.subtext && <div className="text-xs opacity-80 mt-0.5">{latestAlert.subtext}</div>}
            </div>
          </div>
          <button
            onClick={() => setLatestAlert(null)}
            className="text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Video Stream Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Video / OpenCV Canvas (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className={`relative rounded-xl overflow-hidden border shadow-lg aspect-4/3 max-h-[500px] flex items-center justify-center ${
            darkTheme ? 'bg-black border-[#262730]' : 'bg-slate-900 border-slate-300'
          }`}>
            {/* Hidden raw video element */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="hidden"
            />

            {/* OpenCV Render Canvas with HUD Overlays */}
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className="w-full h-full object-contain"
            />

            {/* Top-Right Quick Status Tag */}
            <div className="absolute top-3 right-3 flex items-center gap-2 pointer-events-none">
              <div className="px-2 py-1 rounded bg-black/60 backdrop-blur-xs text-[10px] font-mono text-white flex items-center gap-1.5 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                <span>REC · LIVE</span>
              </div>
            </div>

            {/* Bottom Floating Bar */}
            <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-auto">
              <div className="px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-xs text-xs font-mono text-slate-200 border border-white/10">
                Source: {config.camera_source === 'webcam' ? 'Webcam 720p' : 'Virtual Office Turnstile'}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleManualCheckIn}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#FF4B4B] hover:bg-[#ff3333] text-white shadow-md flex items-center gap-1.5 transition-transform active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Manual Verify</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stream Controls Toolbar */}
          <div className={`p-3 rounded-lg border flex flex-wrap items-center justify-between gap-3 text-xs ${
            darkTheme ? 'bg-[#161B22] border-[#262730]' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (streamActive) stopCamera();
                  else startCamera();
                }}
                className={`px-3 py-1.5 rounded font-medium flex items-center gap-1.5 transition-colors ${
                  streamActive
                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {streamActive ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                <span>{streamActive ? 'Pause Feed' : 'Start Feed'}</span>
              </button>

              <button
                onClick={() => {
                  const nextSource = config.camera_source === 'webcam' ? 'demo_feed' : 'webcam';
                  onUpdateConfig({ camera_source: nextSource });
                }}
                className={`px-3 py-1.5 rounded border transition-colors flex items-center gap-1.5 ${
                  darkTheme ? 'border-[#30363D] hover:bg-[#21262D]' : 'border-slate-300 hover:bg-slate-100'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Switch to {config.camera_source === 'webcam' ? 'Demo Loop' : 'Webcam'}</span>
              </button>
            </div>

            {/* Quick Filter Switch */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-mono text-[11px]">Filter:</span>
              <select
                value={config.cv_filter}
                onChange={e => onUpdateConfig({ cv_filter: e.target.value as SystemConfig['cv_filter'] })}
                className={`p-1.5 rounded border text-xs font-mono outline-hidden ${
                  darkTheme ? 'bg-[#0E1117] border-[#30363D] text-slate-200' : 'bg-white border-slate-300'
                }`}
              >
                <option value="normal">Normal RGB</option>
                <option value="grayscale">Grayscale</option>
                <option value="canny">Sobel/Canny Edge</option>
                <option value="landmarks">Facial Landmarks</option>
                <option value="thermal">Thermal Heatmap</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right: Kiosk Stats & Live Activity Feed (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Streamlit Metric Card */}
          <div className={`p-4 rounded-xl border flex flex-col gap-3 ${
            darkTheme ? 'bg-[#161B22] border-[#262730]' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider">
                Scanner Performance
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-500/5 border border-slate-500/10">
                <div className="text-[11px] text-slate-400">Stream FPS</div>
                <div className="text-xl font-bold font-mono text-emerald-400">
                  {fps.toFixed(1)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-500/5 border border-slate-500/10">
                <div className="text-[11px] text-slate-400">Tolerance (d)</div>
                <div className="text-xl font-bold font-mono text-blue-400">
                  ≤ {config.distance_threshold.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 leading-relaxed font-mono">
              Auto-logs enrolled users once verified. Enforces a {config.cooldown_minutes}-minute cooldown to prevent duplicate entries.
            </div>
          </div>

          {/* Recent Live Check-ins (st.dataframe mini widget) */}
          <div className={`p-4 rounded-xl border flex flex-col gap-3 ${
            darkTheme ? 'bg-[#161B22] border-[#262730]' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider">
                Recent Check-ins (Kiosk-01)
              </h3>
              <span className="text-[11px] text-slate-400">{recentLogs.length} logged</span>
            </div>

            <div className="flex flex-col gap-2">
              {recentLogs.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No attendance logged yet today.
                </div>
              ) : (
                recentLogs.map(log => {
                  const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  return (
                    <div
                      key={log.id}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                        darkTheme ? 'bg-[#0E1117] border-[#262730]' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {log.user_name.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                          <div className="font-semibold truncate">{log.user_name}</div>
                          <div className="text-[10px] text-slate-400 truncate">{log.department}</div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono text-[11px]">{time}</div>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          log.status === 'Late'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {log.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
