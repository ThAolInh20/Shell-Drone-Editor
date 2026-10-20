/**
 * SplineMath.js
 * Utility for smooth interpolation of custom wave curves and control points.
 */

export const DEFAULT_WAVE_POINTS = [
  { x: 0.0, y: 0.35, angle: 0.28 },
  { x: 0.5, y: 0.88, angle: 0.0 },
  { x: 1.0, y: 0.35, angle: -0.28 }
];

/**
 * Normalizes, validates, and sorts wave control points along the X axis.
 * @param {Array<{x: number, y: number, angle?: number}>} points 
 * @returns {Array<{x: number, y: number, angle: number}>}
 */
export function sanitizeWavePoints(points) {
  if (!Array.isArray(points) || points.length === 0) {
    return DEFAULT_WAVE_POINTS.map(p => ({ ...p }));
  }

  const cleaned = points.map((p, idx) => ({
    x: Math.max(0.0, Math.min(1.0, Number.isFinite(p?.x) ? p.x : idx / Math.max(1, points.length - 1))),
    y: Math.max(0.05, Math.min(1.0, Number.isFinite(p?.y) ? p.y : 0.5)),
    angle: Number.isFinite(p?.angle) ? p.angle : 0.0
  }));

  // Ensure sorted by x
  cleaned.sort((a, b) => a.x - b.x);

  // If first point is not at x=0, prepend or clamp
  if (cleaned[0].x > 0.001) {
    cleaned.unshift({ x: 0.0, y: cleaned[0].y, angle: cleaned[0].angle });
  } else {
    cleaned[0].x = 0.0;
  }

  // If last point is not at x=1, append or clamp
  if (cleaned[cleaned.length - 1].x < 0.999) {
    cleaned.push({ x: 1.0, y: cleaned[cleaned.length - 1].y, angle: cleaned[cleaned.length - 1].angle });
  } else {
    cleaned[cleaned.length - 1].x = 1.0;
  }

  return cleaned;
}

/**
 * Smooth Hermite / Catmull-Rom cubic interpolation between two values.
 */
function cubicHermite(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 * (
      (2 * p1) +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    )
  );
}

/**
 * Evaluates the wave curve at normalized parameter t in [0, 1].
 * Returns { x, y, angle } at parameter t.
 * @param {Array<{x: number, y: number, angle?: number}>} controlPoints 
 * @param {number} t Progress along the sequence (0.0 to 1.0)
 * @returns {{x: number, y: number, angle: number}}
 */
export function evaluateWaveCurve(controlPoints, t) {
  const points = sanitizeWavePoints(controlPoints);
  const clampedT = Math.max(0.0, Math.min(1.0, t));

  // Find the segment [i, i+1] where points[i].x <= clampedT <= points[i+1].x
  let segIdx = 0;
  for (let i = 0; i < points.length - 1; i++) {
    if (clampedT >= points[i].x && clampedT <= points[i + 1].x) {
      segIdx = i;
      break;
    }
  }

  const p1 = points[segIdx];
  const p2 = points[segIdx + 1];
  const p0 = segIdx > 0 ? points[segIdx - 1] : {
    x: p1.x - (p2.x - p1.x),
    y: p1.y - (p2.y - p1.y),
    angle: p1.angle
  };
  const p3 = segIdx + 2 < points.length ? points[segIdx + 2] : {
    x: p2.x + (p2.x - p1.x),
    y: p2.y + (p2.y - p1.y),
    angle: p2.angle
  };

  const segRange = p2.x - p1.x;
  const localT = segRange > 1e-6 ? (clampedT - p1.x) / segRange : 0.0;
  const smoothT = Math.max(0.0, Math.min(1.0, localT));

  const yRaw = cubicHermite(p0.y, p1.y, p2.y, p3.y, smoothT);
  const angleRaw = cubicHermite(p0.angle, p1.angle, p2.angle, p3.angle, smoothT);

  return {
    x: clampedT,
    y: Math.max(0.05, Math.min(1.0, yRaw)),
    angle: angleRaw
  };
}
