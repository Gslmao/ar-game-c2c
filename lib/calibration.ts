/**
 * Scope deliberately limited to rotation-about-Y + XZ translation,
 * because both devices already agree on "up" via gravity (IMU-derived,
 * shared for free by WebXR's local-floor space) — the only unknowns
 * between two devices' frames are a heading (yaw) difference and a
 * horizontal origin offset. Y (height) is passed through unchanged.
 */

// ---------- Types ----------

export interface Point2D {
  x: number;
  z: number;
}

export interface Transform2D {
  theta: number;
  translation: Point2D;
}

/** A 4x4 matrix as a flat 16-element array, column-major (Three.js convention). */
export type Matrix4Array = number[] | Float32Array;

// ---------- Constants ----------

export const identityTransform: Transform2D = {
  theta: 0,
  translation: { x: 0, z: 0 },
};

// ---------- Core 2D point/vector helpers ----------

export function averagePoint(points: Point2D[]): Point2D {
  if (points.length === 0) {
    throw new Error("averagePoint: requires at least one point");
  }
  const sum = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, z: acc.z + p.z }),
    { x: 0, z: 0 }
  );
  return { x: sum.x / points.length, z: sum.z / points.length };
}

export function subtractPoints(a: Point2D, b: Point2D): Point2D {
  return { x: a.x - b.x, z: a.z - b.z };
}

export function addPoints(a: Point2D, b: Point2D): Point2D {
  return { x: a.x + b.x, z: a.z + b.z };
}

/**
 * Rotate a 2D point about the origin by `theta` radians.
 *
 * IMPORTANT: this deliberately matches THREE.Matrix4.makeRotationY's
 * convention (see makeRotationYMatrix4 below), NOT the "standard
 * math textbook" counterclockwise convention — because points
 * calibrated with this function get folded into real pose matrices
 * that Three.js consumes directly elsewhere in the app. Using the
 * textbook convention here would silently rotate calibration in the
 * opposite direction from every other rotation in the scene.
 */
export function rotatePoint(p: Point2D, theta: number): Point2D {
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return {
    x: p.x * cos + p.z * sin,
    z: -p.x * sin + p.z * cos,
  };
}

// ---------- Calibration fit ----------

/**
 * Given N matched pairs of points — the same N physical spots, each
 * described in two different coordinate frames (A and B) — compute the
 * rotation + translation that maps frame B onto frame A.
 *
 * Requires at least 2 points (2 gives an exact fit; more than 2 gives
 * a least-squares fit that averages out per-tap noise). Points must be
 * given in matching order: pointsA[i] and pointsB[i] must be the same
 * physical point.
 */
export function computeTransform(pointsA: Point2D[], pointsB: Point2D[]): Transform2D {
  if (pointsA.length !== pointsB.length) {
    throw new Error(
      `computeTransform: mismatched point counts (A: ${pointsA.length}, B: ${pointsB.length})`
    );
  }
  if (pointsA.length < 2) {
    throw new Error("computeTransform: requires at least 2 matched point pairs");
  }

  const centroidA = averagePoint(pointsA);
  const centroidB = averagePoint(pointsB);

  const centeredA = pointsA.map((p) => subtractPoints(p, centroidA));
  const centeredB = pointsB.map((p) => subtractPoints(p, centroidB));

  // Closed-form least-squares rotation angle aligning centeredB onto
  // centeredA (2D special case of the Kabsch/orthogonal Procrustes
  // solution — no SVD needed since there's only one rotational DOF).
  let cosSum = 0;
  let sinSum = 0;
  for (let i = 0; i < centeredA.length; i++) {
    const a = centeredA[i];
    const b = centeredB[i];
    cosSum += a.x * b.x + a.z * b.z;
    sinSum += a.x * b.z - a.z * b.x;
  }
  const theta = Math.atan2(sinSum, cosSum);

  const rotatedCentroidB = rotatePoint(centroidB, theta);
  const translation = subtractPoints(centroidA, rotatedCentroidB);

  return { theta, translation };
}

/** Apply a computed Transform2D to a single 2D point (rotate, then translate). */
export function applyTransform(point: Point2D, transform: Transform2D): Point2D {
  const rotated = rotatePoint(point, transform.theta);
  return addPoints(rotated, transform.translation);
}

/**
 * Quality check: compares the pairwise distances between points within
 * set A against the corresponding pairwise distances within set B. If
 * a device's taps were sloppy, these distances won't match the
 * reference set's, even though the fit above will still happily
 * produce *some* transform — this is what catches that case before it
 * gets accepted.
 *
 * Returns the largest relative distance discrepancy found (0 = perfect
 * match). Compare this against a tolerance (e.g. 0.15 for 15%) to
 * decide whether to accept or reject the calibration.
 */
export function maxPairwiseDistanceDiscrepancy(pointsA: Point2D[], pointsB: Point2D[]): number {
  if (pointsA.length !== pointsB.length) {
    throw new Error("maxPairwiseDistanceDiscrepancy: mismatched point counts");
  }
  let maxDiscrepancy = 0;
  for (let i = 0; i < pointsA.length; i++) {
    for (let j = i + 1; j < pointsA.length; j++) {
      const distA = distance(pointsA[i], pointsA[j]);
      const distB = distance(pointsB[i], pointsB[j]);
      if (distA === 0) continue; // degenerate, skip rather than divide by zero
      const discrepancy = Math.abs(distA - distB) / distA;
      maxDiscrepancy = Math.max(maxDiscrepancy, discrepancy);
    }
  }
  return maxDiscrepancy;
}

function distance(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

// ---------- 4x4 matrix (pose) support ----------
//
// A "pose" throughout the rest of the project is a 16-element
// column-major matrix (Three.js's Matrix4.elements convention). These
// helpers let a full object-to-world pose — position AND orientation —
// be re-expressed in another frame, not just its position.

/** Multiply two column-major 4x4 matrices: returns A * B. */
export function multiplyMatrices4(a: Matrix4Array, b: Matrix4Array): number[] {
  const result = new Array(16).fill(0);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + row] * b[col * 4 + k];
      }
      result[col * 4 + row] = sum;
    }
  }
  return result;
}

/** Column-major 4x4 rotation matrix about the Y axis, `theta` radians. */
export function makeRotationYMatrix4(theta: number): number[] {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  // Matches THREE.Matrix4.makeRotationY's element layout exactly.
  return [
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    0, 0, 0, 1,
  ];
}

/** Column-major 4x4 translation matrix. */
export function makeTranslationMatrix4(x: number, y: number, z: number): number[] {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    x, y, z, 1,
  ];
}

/**
 * Apply a Transform2D to a full pose matrix — rotates the pose's
 * orientation by `theta` about Y and shifts its position by
 * `translation` in the XZ plane, leaving Y (height) untouched.
 *
 * This is what should actually be used when sending/receiving object
 * poses, not just `applyTransform` alone — a cube's position AND the
 * direction it's facing both need to end up consistent in the target
 * frame.
 */
export function applyTransformToPose(pose: Matrix4Array, transform: Transform2D): number[] {
  const rotation = makeRotationYMatrix4(transform.theta);
  const translationMatrix = makeTranslationMatrix4(
    transform.translation.x,
    0,
    transform.translation.z
  );
  const alignment = multiplyMatrices4(translationMatrix, rotation);
  return multiplyMatrices4(alignment, Array.from(pose));
}
