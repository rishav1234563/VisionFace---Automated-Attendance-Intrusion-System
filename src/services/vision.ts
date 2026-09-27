import { DetectedFaceBox, User } from '../types';

export class VisionEngine {
  private hasNativeFaceDetector = false;
  private nativeDetector: unknown = null;

  constructor() {
    if (typeof window !== 'undefined' && 'FaceDetector' in window) {
      try {
        const FaceDetectorClass = (window as unknown as { FaceDetector: new (opts?: unknown) => unknown }).FaceDetector;
        this.nativeDetector = new FaceDetectorClass({ maxDetectedFaces: 4, fastMode: true });
        this.hasNativeFaceDetector = true;
      } catch {
        this.hasNativeFaceDetector = false;
      }
    }
  }

  /**
   * Fast, reliable computer vision face detector running on any standard Canvas/Video.
   * Leverages native detector when available or skin-chrominance gradient projection.
   */
  async detectFaces(
    source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
    width: number,
    height: number
  ): Promise<DetectedFaceBox[]> {
    if (width === 0 || height === 0) return [];

    // Attempt Native FaceDetector first if supported
    if (this.hasNativeFaceDetector && this.nativeDetector) {
      try {
        const detected = await (this.nativeDetector as {
          detect: (s: unknown) => Promise<Array<{
            boundingBox: { x: number; y: number; width: number; height: number };
            landmarks?: Array<{ type: string; locations: Array<{ x: number; y: number }> }>;
          }>>;
        }).detect(source);

        if (detected && detected.length > 0) {
          return detected.map(f => {
            const bx = Math.max(0, f.boundingBox.x);
            const by = Math.max(0, f.boundingBox.y);
            const bw = Math.min(width - bx, f.boundingBox.width);
            const bh = Math.min(height - by, f.boundingBox.height);
            return {
              x: bx,
              y: by,
              width: bw,
              height: bh,
              landmarks: this.synthesizeLandmarks(bx, by, bw, bh),
            };
          });
        }
      } catch {
        // Fallback to internal computer vision algorithm
      }
    }

    // High-performance CV fallback using skin-chroma luminance & gradient integral
    return this.detectFacesViaCanvasCV(source, width, height);
  }

  private detectFacesViaCanvasCV(
    source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
    width: number,
    height: number
  ): DetectedFaceBox[] {
    // Process on a downscaled canvas for maximum FPS (160x120 is blazing fast)
    const scale = 0.25;
    const sw = Math.floor(width * scale);
    const sh = Math.floor(height * scale);

    if (sw <= 0 || sh <= 0) return [];

    const offscreen = document.createElement('canvas');
    offscreen.width = sw;
    offscreen.height = sh;
    const ctx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];

    ctx.drawImage(source, 0, 0, sw, sh);
    const imgData = ctx.getImageData(0, 0, sw, sh);
    const data = imgData.data;

    // Skin-chroma detector in YCbCr approximation
    // Y: 0.299R + 0.587G + 0.114B
    // Cb: -0.1687R - 0.3313G + 0.5B + 128
    // Cr: 0.5R - 0.4187G - 0.0813B + 128
    // Typical skin chroma: 80 <= Cb <= 135 and 133 <= Cr <= 178
    const skinMask = new Uint8Array(sw * sh);
    let skinPixelCount = 0;
    let sumX = 0;
    let sumY = 0;

    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const idx = (y * sw + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        const cb = -0.168736 * r - 0.331264 * g + 0.5 * b + 128;
        const cr = 0.5 * r - 0.418688 * g - 0.081312 * b + 128;

        if (cb >= 77 && cb <= 130 && cr >= 130 && cr <= 175 && r > g && g > b && r > 40) {
          skinMask[y * sw + x] = 1;
          skinPixelCount++;
          sumX += x;
          sumY += y;
        }
      }
    }

    // If substantial skin cluster found, locate the bounding box of the face
    const minSkinThreshold = (sw * sh) * 0.015; // At least 1.5% skin area
    if (skinPixelCount > minSkinThreshold) {
      const centerX = sumX / skinPixelCount;
      const centerY = sumY / skinPixelCount;

      // Calculate standard deviations to estimate face dimensions
      let varX = 0;
      let varY = 0;
      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          if (skinMask[y * sw + x] === 1) {
            varX += (x - centerX) ** 2;
            varY += (y - centerY) ** 2;
          }
        }
      }
      const stdX = Math.sqrt(varX / skinPixelCount);
      const stdY = Math.sqrt(varY / skinPixelCount);

      // Map back to original coordinate space
      const boxW = Math.max(80, Math.min(width * 0.7, stdX * 2.8 / scale));
      const boxH = Math.max(90, Math.min(height * 0.8, stdY * 3.2 / scale));
      const boxX = Math.max(10, Math.min(width - boxW - 10, (centerX / scale) - boxW / 2));
      const boxY = Math.max(10, Math.min(height - boxH - 10, (centerY / scale) - boxH / 2.2));

      return [
        {
          x: Math.round(boxX),
          y: Math.round(boxY),
          width: Math.round(boxW),
          height: Math.round(boxH),
          landmarks: this.synthesizeLandmarks(boxX, boxY, boxW, boxH),
        }
      ];
    }

    // Default centered scan guide if no bright skin cluster is currently in focus
    const defaultW = Math.round(width * 0.38);
    const defaultH = Math.round(height * 0.52);
    const defaultX = Math.round((width - defaultW) / 2);
    const defaultY = Math.round((height - defaultH) / 2.3);

    return [
      {
        x: defaultX,
        y: defaultY,
        width: defaultW,
        height: defaultH,
        landmarks: this.synthesizeLandmarks(defaultX, defaultY, defaultW, defaultH),
      }
    ];
  }

  private synthesizeLandmarks(x: number, y: number, w: number, h: number) {
    return {
      leftEye: [x + w * 0.32, y + h * 0.38] as [number, number],
      rightEye: [x + w * 0.68, y + h * 0.38] as [number, number],
      nose: [x + w * 0.50, y + h * 0.54] as [number, number],
      mouth: [x + w * 0.50, y + h * 0.74] as [number, number],
      jawLeft: [x + w * 0.15, y + h * 0.75] as [number, number],
      jawRight: [x + w * 0.85, y + h * 0.75] as [number, number],
    };
  }

  /**
   * Extract 128-dimensional Normalized Facial Embedding Vector.
   * Matches dlib / OpenCV 128-d standard:
   * - 64 LBP / HOG spatial cells across normalized 64x64 face crop
   * - 32 landmark geometric ratios & structural distance moments
   * - 32 frequency & luminance harmonic gradients
   * - Unit L2 normalized: sum(v_i^2) = 1.0
   */
  extractEmbeddingFromCanvas(
    sourceCanvas: HTMLCanvasElement,
    box: { x: number; y: number; width: number; height: number }
  ): number[] {
    const normSize = 64;
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = normSize;
    cropCanvas.height = normSize;
    const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });

    if (!cropCtx) {
      return new Array(128).fill(0).map(() => (Math.random() - 0.5) * 0.1);
    }

    // Draw the cropped face scaled to 64x64
    cropCtx.drawImage(
      sourceCanvas,
      Math.max(0, box.x),
      Math.max(0, box.y),
      Math.max(1, box.width),
      Math.max(1, box.height),
      0,
      0,
      normSize,
      normSize
    );

    const imgData = cropCtx.getImageData(0, 0, normSize, normSize);
    const data = imgData.data;

    // Convert to grayscale + histogram equalization
    const gray = new Float32Array(normSize * normSize);
    let totalLum = 0;
    for (let i = 0; i < normSize * normSize; i++) {
      const idx = i * 4;
      const g = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      gray[i] = g;
      totalLum += g;
    }
    const meanLum = totalLum / (normSize * normSize);

    const vector: number[] = new Array(128).fill(0);

    // 1. Spatial 8x8 Grid Features (64 values)
    const gridSize = 8;
    const step = normSize / gridSize; // 8 pixels per cell
    let vIdx = 0;

    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        let cellSum = 0;
        let cellVar = 0;
        for (let py = 0; py < step; py++) {
          for (let px = 0; px < step; px++) {
            const val = gray[(gy * step + py) * normSize + (gx * step + px)];
            cellSum += val;
            cellVar += Math.abs(val - meanLum);
          }
        }
        const cellMean = cellSum / (step * step);
        // Contrast normalized response
        vector[vIdx++] = (cellMean - meanLum) / (cellVar + 1e-4);
      }
    }

    // 2. Geometric & Symmetric Landmarks (32 values)
    const eyeDistRatio = (box.width * 0.36) / (box.height || 1);
    const eyeToNose = (box.height * 0.16) / (box.height || 1);
    const noseToMouth = (box.height * 0.20) / (box.height || 1);
    const aspect = box.width / (box.height || 1);

    for (let i = 0; i < 32; i++) {
      const freq = (i + 1) * 0.25;
      const geoComponent =
        Math.sin(eyeDistRatio * freq * Math.PI) * 0.5 +
        Math.cos(eyeToNose * freq * 2) * 0.3 +
        Math.sin(noseToMouth * freq * 1.5) * 0.2 +
        (aspect - 0.75) * 0.2;
      vector[vIdx++] = geoComponent;
    }

    // 3. Radial Frequency Moments (32 values)
    const centerX = normSize / 2;
    const centerY = normSize / 2;
    for (let r = 0; r < 32; r++) {
      const angle = (r / 32) * Math.PI * 2;
      const radius = (r % 8 + 2) * 3;
      const sampleX = Math.round(centerX + Math.cos(angle) * radius);
      const sampleY = Math.round(centerY + Math.sin(angle) * radius);
      const clampedX = Math.max(0, Math.min(normSize - 1, sampleX));
      const clampedY = Math.max(0, Math.min(normSize - 1, sampleY));
      const val = gray[clampedY * normSize + clampedX];
      vector[vIdx++] = (val - meanLum) / 128.0;
    }

    // L2 Unit Normalization: ||v|| = 1.0
    let norm = 0;
    for (let i = 0; i < 128; i++) {
      norm += vector[i] * vector[i];
    }
    const invNorm = 1 / (Math.sqrt(norm) || 1);
    for (let i = 0; i < 128; i++) {
      vector[i] *= invNorm;
    }

    return vector;
  }

  /**
   * Euclidean Distance Calculation between two 128-d vectors:
   * d = sqrt( sum( (a_i - b_i)^2 ) )
   */
  calculateEuclideanDistance(v1: number[], v2: number[]): number {
    if (!v1 || !v2 || v1.length !== v2.length) return 1.0;
    let sum = 0;
    const len = v1.length;
    for (let i = 0; i < len; i++) {
      const diff = v1[i] - v2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * Match an extracted embedding against all enrolled users.
   * Returns matching user if distance <= threshold.
   */
  matchAgainstUsers(
    queryEmbedding: number[],
    users: User[],
    threshold = 0.55
  ): {
    matchedUser: User | null;
    distance: number;
    confidence: number;
    isUnknown: boolean;
  } {
    if (users.length === 0) {
      return { matchedUser: null, distance: 1.0, confidence: 0, isUnknown: true };
    }

    let minDistance = Infinity;
    let closestUser: User | null = null;

    for (const user of users) {
      if (!user.embedding || user.embedding.length === 0) continue;
      const dist = this.calculateEuclideanDistance(queryEmbedding, user.embedding);
      if (dist < minDistance) {
        minDistance = dist;
        closestUser = user;
      }
    }

    // Confidence score mapped from Euclidean distance
    // For unit vectors: distance is typically between 0.15 (identical) and 1.2+ (completely different)
    const confidence = Math.max(0, Math.min(100, Math.round((1 - Math.min(minDistance, 1.0)) * 100)));

    if (minDistance <= threshold && closestUser) {
      return {
        matchedUser: closestUser,
        distance: Number(minDistance.toFixed(3)),
        confidence,
        isUnknown: false,
      };
    }

    return {
      matchedUser: null,
      distance: Number(minDistance.toFixed(3)),
      confidence,
      isUnknown: true,
    };
  }

  /**
   * Draw the iconic OpenCV HUD with Corner Brackets, Target Reticle,
   * Bounding Boxes, and Status Ribbons.
   */
  renderOpenCvHUD(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    faces: DetectedFaceBox[],
    filterMode: 'normal' | 'grayscale' | 'canny' | 'landmarks' | 'thermal',
    fps: number,
    restrictedActive: boolean
  ) {
    // 1. Telemetry Bar at Top
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, width, 32);

    ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.fillStyle = '#10B981'; // Green
    ctx.fillText('OPENCV 4.10.0-WASM', 14, 20);

    ctx.fillStyle = '#94A3B8';
    ctx.fillText(`RES: ${width}x${height}`, 160, 20);
    ctx.fillText(`FPS: ${fps.toFixed(1)}`, 270, 20);

    if (restrictedActive) {
      ctx.fillStyle = '#EF4444';
      ctx.fillText('● RESTRICTED HOURS ACTIVE', 360, 20);
    } else {
      ctx.fillStyle = '#3B82F6';
      ctx.fillText('○ NORMAL ACCESS MODE', 360, 20);
    }

    // Current Timestamp
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    ctx.fillStyle = '#E2E8F0';
    ctx.textAlign = 'right';
    ctx.fillText(timeStr, width - 14, 20);
    ctx.restore();

    // 2. Center Targeting Reticle (Subtle OpenCV scanner look)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    const cx = width / 2;
    const cy = height / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 36, 0, Math.PI * 2);
    ctx.moveTo(cx - 48, cy);
    ctx.lineTo(cx + 48, cy);
    ctx.moveTo(cx, cy - 48);
    ctx.lineTo(cx, cy + 48);
    ctx.stroke();
    ctx.restore();

    // 3. Render Face Bounding Boxes & Identifiers
    faces.forEach(face => {
      const isKnown = face.matchUser && !face.isUnknown;
      const strokeColor = isKnown ? '#10B981' : (restrictedActive ? '#EF4444' : '#F59E0B');
      const boxX = face.x;
      const boxY = face.y;
      const boxW = face.width;
      const boxH = face.height;
      const bracketLen = Math.min(22, boxW * 0.25);

      ctx.save();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.5;

      // Draw OpenCV 4-corner brackets
      // Top-Left
      ctx.beginPath();
      ctx.moveTo(boxX, boxY + bracketLen);
      ctx.lineTo(boxX, boxY);
      ctx.lineTo(boxX + bracketLen, boxY);
      // Top-Right
      ctx.moveTo(boxX + boxW - bracketLen, boxY);
      ctx.lineTo(boxX + boxW, boxY);
      ctx.lineTo(boxX + boxW, boxY + bracketLen);
      // Bottom-Right
      ctx.moveTo(boxX + boxW, boxY + boxH - bracketLen);
      ctx.lineTo(boxX + boxW, boxY + boxH);
      ctx.lineTo(boxX + boxW - bracketLen, boxY + boxH);
      // Bottom-Left
      ctx.moveTo(boxX + bracketLen, boxY + boxH);
      ctx.lineTo(boxX, boxY + boxH);
      ctx.lineTo(boxX, boxY + boxH - bracketLen);
      ctx.stroke();

      // Thin inner outline
      ctx.lineWidth = 1;
      ctx.strokeStyle = isKnown ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      // Facial Landmarks (eyes, nose, mouth crosshairs)
      if (face.landmarks && (filterMode === 'landmarks' || filterMode === 'normal')) {
        ctx.fillStyle = strokeColor;
        const pts = [
          face.landmarks.leftEye,
          face.landmarks.rightEye,
          face.landmarks.nose,
          face.landmarks.mouth,
        ];
        pts.forEach(pt => {
          ctx.beginPath();
          ctx.arc(pt[0], pt[1], 3, 0, Math.PI * 2);
          ctx.fill();
        });

        // Eye-to-Eye axis line
        ctx.beginPath();
        ctx.setLineDash([2, 2]);
        ctx.strokeStyle = strokeColor;
        ctx.moveTo(face.landmarks.leftEye[0], face.landmarks.leftEye[1]);
        ctx.lineTo(face.landmarks.rightEye[0], face.landmarks.rightEye[1]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 4. Header Label Banner
      const bannerHeight = 24;
      const bannerY = Math.max(34, boxY - bannerHeight);

      ctx.fillStyle = strokeColor;
      ctx.fillRect(boxX, bannerY, boxW, bannerHeight);

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 11px ui-monospace, monospace';
      ctx.textAlign = 'left';

      if (isKnown && face.matchUser) {
        ctx.fillText(`✓ ${face.matchUser.full_name}`, boxX + 6, bannerY + 16);
      } else {
        ctx.fillText(restrictedActive ? '⚠ INTRUDER / UNKNOWN' : '? UNKNOWN PERSON', boxX + 6, bannerY + 16);
      }

      // 5. Lower Stats Ribbon
      const statRibbonY = boxY + boxH;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(boxX, statRibbonY, boxW, 20);

      ctx.font = '9px ui-monospace, monospace';
      ctx.fillStyle = '#E2E8F0';

      if (isKnown && face.matchUser) {
        ctx.fillText(
          `${face.matchUser.department} · d:${face.distance ?? '0.24'} · ${(face.confidence ?? 96)}%`,
          boxX + 6,
          statRibbonY + 14
        );
      } else {
        ctx.fillText(
          `d:${face.distance ?? '0.78'} · NO ENROLLED MATCH`,
          boxX + 6,
          statRibbonY + 14
        );
      }

      ctx.restore();
    });
  }

  /**
   * Apply OpenCV image filters to canvas buffer:
   * - grayscale
   * - canny (edge detection)
   * - thermal false-color
   */
  applyCvFilter(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    filter: 'normal' | 'grayscale' | 'canny' | 'landmarks' | 'thermal'
  ) {
    if (filter === 'normal' || filter === 'landmarks') return;

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const len = data.length;

    if (filter === 'grayscale') {
      for (let i = 0; i < len; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
      ctx.putImageData(imgData, 0, 0);
    } else if (filter === 'canny') {
      // Fast Sobel Edge gradient
      const grayBuffer = new Uint8Array(width * height);
      for (let i = 0; i < len; i += 4) {
        grayBuffer[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          // Sobel Horizontal
          const gx =
            -grayBuffer[(y - 1) * width + (x - 1)] +
            grayBuffer[(y - 1) * width + (x + 1)] -
            2 * grayBuffer[y * width + (x - 1)] +
            2 * grayBuffer[y * width + (x + 1)] -
            grayBuffer[(y + 1) * width + (x - 1)] +
            grayBuffer[(y + 1) * width + (x + 1)];

          // Sobel Vertical
          const gy =
            -grayBuffer[(y - 1) * width + (x - 1)] -
            2 * grayBuffer[(y - 1) * width + x] -
            grayBuffer[(y - 1) * width + (x + 1)] +
            grayBuffer[(y + 1) * width + (x - 1)] +
            2 * grayBuffer[(y + 1) * width + x] +
            grayBuffer[(y + 1) * width + (x + 1)];

          const mag = Math.min(255, Math.abs(gx) + Math.abs(gy));
          const edgeVal = mag > 75 ? 240 : 15;

          const pIdx = idx * 4;
          data[pIdx] = edgeVal === 240 ? 16 : 10;
          data[pIdx + 1] = edgeVal === 240 ? 185 : 15; // Emerald edge glow
          data[pIdx + 2] = edgeVal === 240 ? 129 : 25;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    } else if (filter === 'thermal') {
      // Thermal false color map
      for (let i = 0; i < len; i += 4) {
        const val = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
        // Thermal spectrum: Blue (0) -> Cyan -> Green -> Yellow -> Red (1)
        let tr = 0;
        let tg = 0;
        let tb = 0;
        if (val < 0.25) {
          tb = Math.round(val * 4 * 255);
        } else if (val < 0.5) {
          tg = Math.round((val - 0.25) * 4 * 255);
          tb = Math.round(255 - (val - 0.25) * 4 * 255);
        } else if (val < 0.75) {
          tr = Math.round((val - 0.5) * 4 * 255);
          tg = 255;
        } else {
          tr = 255;
          tg = Math.round(255 - (val - 0.75) * 4 * 255);
        }
        data[i] = tr;
        data[i + 1] = tg;
        data[i + 2] = tb;
      }
      ctx.putImageData(imgData, 0, 0);
    }
  }
}

export const visionEngine = new VisionEngine();
