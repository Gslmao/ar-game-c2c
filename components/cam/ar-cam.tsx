"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import type { Socket } from "socket.io-client";
import type { Point2D, Transform2D } from "@/lib/calibration";
import {
  applyInverseTransformToPose,
  applyTransformToPose,
  computeTransform,
  maxPairwiseDistanceDiscrepancy,
} from "@/lib/calibration";

interface Vec3Data {
  x: number;
  y: number;
  z: number;
}

interface QuatData {
  x: number;
  y: number;
  z: number;
  w: number;
}

// Matches the server's object-placed / room.objects shape from
// socket-handlers.js — kept as plain data (not THREE types) since
// this crosses the network boundary.
export interface PlacedObjectPayload {
  objectId: string;
  position: Vec3Data;
  quaternion: QuatData;
  placedBy: "host" | "guest";
  placedAt: number;
}

interface ARSceneProps {
  // How many tapped points make up one calibration pass. 3 gives the
  // downstream computeTransform() a discrepancy check to run (2 points
  // is mathematically sufficient for rotation+translation, 3 isn't).
  calibrationRequiredPoints?: number;
  onCalibrationPointCaptured?: (point: Point2D, index: number) => void;
  onCalibrationComplete?: (points: Point2D[]) => void;
  // Socket + room are optional so this component still works
  // standalone (as it always has). Without them, tap-to-place just
  // warns and does nothing — it never falls back to placing a local
  // unsynced cube, since that would silently reintroduce the
  // optimistic-local-state bug the multiplayer design avoids.
  socket?: Socket | null;
  roomCode?: string;
  initialObjects?: PlacedObjectPayload[];
  isHost?: boolean;          // from server-assigned socket.data.role, passed down by parent
  hostPoints?: Point2D[] | null; // from useCalibrationSync's hostPoints, passed down by parent
}

export default function ARScene({
  calibrationRequiredPoints = 4,
  onCalibrationPointCaptured,
  onCalibrationComplete,
  socket = null,
  roomCode,
  initialObjects,
  isHost,
  hostPoints
}: ARSceneProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const reticleRef = useRef<THREE.Mesh | null>(null);
  const sessionRef = useRef<XRSession | null>(null);

  const hitTestSourceRef = useRef<XRHitTestSource | null>(null);
  const localSpaceRef = useRef<XRReferenceSpace | null>(null);
  const hitTestSourceRequestedRef = useRef(false);

  const [supported, setSupported] = useState<boolean | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  

  // ---- Calibration state ----
  // Refs carry the values onSelect actually reads (it's registered
  // once via addEventListener and would otherwise close over stale
  // state). The useState pair below exists purely to drive the UI.
  const calibrationActiveRef = useRef(false);
  const calibrationPointsRef = useRef<Point2D[]>([]);
  const calibrationMarkersRef = useRef<THREE.Mesh[]>([]);
  const calibrationRequiredRef = useRef(calibrationRequiredPoints);
  const onCalibrationPointCapturedRef = useRef(onCalibrationPointCaptured);
  const onCalibrationCompleteRef = useRef(onCalibrationComplete);

  const [calibrationActive, setCalibrationActive] = useState(false);
  const [calibrationCount, setCalibrationCount] = useState(0);

  const calibrationTransformRef = useRef<Transform2D | null>(null);
  const isHostRef = useRef(isHost);
  const pendingObjectsRef = useRef<Map<string, PlacedObjectPayload>>(new Map());

  useEffect(() => {
    isHostRef.current = isHost;
    console.warn(`[AR][${isHost ? "HOST" : "GUEST"}] role updated`, {
      roomCode,
      isHost,
    });
  }, [isHost, roomCode]);

  useEffect(() => {
    if (isHost) return; // host does nothing here
    if (calibrationTransformRef.current) return; // already computed, don't redo on every render

    const myPoints = calibrationPointsRef.current;
    const required = calibrationRequiredRef.current;

    const myPointsReady = !calibrationActiveRef.current && myPoints.length >= required;
    const hostPointsReady = hostPoints && hostPoints.length >= required;
    
    console.warn("[AR][GUEST] calibration readiness", {
      isHost,
      calibrationActive: calibrationActiveRef.current,
      guestPointCount: myPoints.length,
      hostPointCount: hostPoints?.length ?? 0,
      required,
      hostPoints,
    });

    if (!myPointsReady || !hostPointsReady) return;

    // computeTransform maps its second point set onto its first. The guest
    // is the source frame and the host is the target frame, so calculate a
    // guest-to-host transform here. Guest placements use it directly; host
    // placements received by the guest use its inverse.
    const transform = computeTransform(hostPoints, myPoints);
    const discrepancy = maxPairwiseDistanceDiscrepancy(myPoints, hostPoints);

    console.warn("[AR][GUEST] calibration inputs", {
      guestPoints: myPoints,
      hostPoints,
      requiredPoints: required,
      discrepancy,
      transform,
    });

    const DISCREPANCY_THRESHOLD = 1.0; // meters — tune once you see real numbers
    if (discrepancy > DISCREPANCY_THRESHOLD) {
      console.warn(
        `Calibration discrepancy too high (${discrepancy.toFixed(3)}m). Recalibrate.`
      );
      // Don't store a bad transform — force a retry rather than silently
      // placing objects in the wrong spot with false confidence.
      return;
    }

    calibrationTransformRef.current = transform;
    console.warn("[AR][GUEST] calibration transform accepted", {
      discrepancy,
      transform,
    });
  }, [hostPoints, calibrationCount, isHost]);

  // ---- Placement state ----
  // Same closure-staleness reasoning as calibration: onSelect is
  // registered once, so socket/roomCode must be read from refs.
  const socketRef = useRef<Socket | null>(socket);
  const roomCodeRef = useRef<string | undefined>(roomCode);
  // objectId -> mesh, so a later "object-removed" can find and dispose it.
  const placedObjectsRef = useRef<Map<string, THREE.Mesh>>(new Map());

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  useEffect(() => {
    roomCodeRef.current = roomCode;
  }, [roomCode]);

  useEffect(() => {
    calibrationRequiredRef.current = calibrationRequiredPoints;
  }, [calibrationRequiredPoints]);

  useEffect(() => {
    onCalibrationPointCapturedRef.current = onCalibrationPointCaptured;
  }, [onCalibrationPointCaptured]);

  useEffect(() => {
    onCalibrationCompleteRef.current = onCalibrationComplete;
  }, [onCalibrationComplete]);

  // Check WebXR AR support once on mount
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.xr) {
      setSupported(false);
      return;
    }
    navigator.xr
      .isSessionSupported("immersive-ar")
      .then(setSupported)
      .catch(() => setSupported(false));
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const placedObjects = placedObjectsRef.current;
    const pendingObjects = pendingObjectsRef.current;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);

    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    renderer.xr.enabled = true;

    containerRef.current.appendChild(renderer.domElement);

    const geometry = new THREE.RingGeometry(0.06, 0.08, 32).rotateX(-Math.PI / 2);

    const material = new THREE.MeshBasicMaterial({
      color: 0x2b7cff,
    });

    const reticle = new THREE.Mesh(geometry, material);

    reticle.matrixAutoUpdate = false;
    reticle.visible = false;

    scene.add(reticle);

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    reticleRef.current = reticle;

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      if (!renderer.xr.isPresenting) {
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);

      // End any in-flight XR session so it doesn't keep running
      // after the component unmounts.
      sessionRef.current?.end();

      renderer.setAnimationLoop(null);

      geometry.dispose();
      material.dispose();

      for (const marker of calibrationMarkersRef.current) {
        marker.geometry.dispose();
        (marker.material as THREE.Material).dispose();
      }
      calibrationMarkersRef.current = [];

      for (const mesh of placedObjects.values()) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
      placedObjects.clear();
      pendingObjects.clear();

      renderer.dispose();

      renderer.domElement.remove();
    };
  }, []);

  // Creates (or replaces) the mesh for a placed object. Color-coded by
  // who placed it purely so you can visually confirm during testing
  // which device's tap produced which cube.
  const addRemoteObject = (
    objectId: string,
    record: Omit<PlacedObjectPayload, "objectId">
  ) => {
    const scene = sceneRef.current;
    if (!scene) return;

    const transform = calibrationTransformRef.current;
    if (!isHostRef.current && !transform) {
      pendingObjectsRef.current.set(objectId, { objectId, ...record });
      console.warn("[AR][GUEST] deferring object until calibration transform exists", {
        objectId,
        placedBy: record.placedBy,
      });
      return;
    }

    const existing = placedObjectsRef.current.get(objectId);
    if (existing) {
      scene.remove(existing);
      existing.geometry.dispose();
      (existing.material as THREE.Material).dispose();
    }

    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const material = new THREE.MeshStandardMaterial({
      color: record.placedBy === "host" ? 0xff5533 : 0x3388ff,
    });
    const cube = new THREE.Mesh(geometry, material);

    const pose = new THREE.Matrix4();
    pose.compose(
      new THREE.Vector3(record.position.x, record.position.y, record.position.z),
      new THREE.Quaternion(
        record.quaternion.x,
        record.quaternion.y,
        record.quaternion.z,
        record.quaternion.w
      ),
      new THREE.Vector3(1, 1, 1)
    );

    const localPose = !isHostRef.current && transform
      ? applyInverseTransformToPose(pose.toArray(), transform)
      : pose.toArray();
    const localMatrix = new THREE.Matrix4().fromArray(localPose);
    localMatrix.decompose(cube.position, cube.quaternion, cube.scale);

    if (!isHostRef.current && transform) {
      console.warn("[AR][GUEST] inverse transform applied to received object", {
        objectId,
        placedBy: record.placedBy,
        hostPosition: record.position,
        guestPosition: {
          x: cube.position.x,
          y: cube.position.y,
          z: cube.position.z,
        },
        transform,
      });
    }

    scene.add(cube);
    placedObjectsRef.current.set(objectId, cube);
  };

  useEffect(() => {
    if (isHostRef.current || !calibrationTransformRef.current) return;

    for (const [objectId, payload] of pendingObjectsRef.current) {
      addRemoteObject(objectId, payload);
    }
    pendingObjectsRef.current.clear();
  }, [hostPoints, calibrationCount]);

  const removeRemoteObject = (objectId: string) => {
    const scene = sceneRef.current;
    const mesh = placedObjectsRef.current.get(objectId);
    if (!scene || !mesh) return;

    scene.remove(mesh);
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
    placedObjectsRef.current.delete(objectId);
  };

  // Hydrate objects that existed in the room before this component
  // mounted. Runs after the scene-setup effect above (declared later
  // in the file → runs after on mount), so sceneRef.current is set.
  useEffect(() => {
    if (!initialObjects || initialObjects.length === 0) return;
    for (const obj of initialObjects) {
      addRemoteObject(obj.objectId, obj);
    }
    // Intentionally only keyed on the array identity from the parent
    // (join-room ack) — this is a one-time hydration, not a sync loop.
  }, [initialObjects]);

  // Everything placed *after* mount arrives here. This is the only
  // place a placed-object mesh gets created for a live placement —
  // there is no optimistic local copy made at tap time.
  useEffect(() => {
    if (!socket) return;

    const onObjectPlaced = (payload: PlacedObjectPayload) => {
      console.warn(
        `[AR][${payload.placedBy.toUpperCase()}] object-placed received`,
        payload
      );
      addRemoteObject(payload.objectId, payload);
    };

    const onObjectRemoved = ({ objectId }: { objectId: string }) => {
      removeRemoteObject(objectId);
    };

    socket.on("object-placed", onObjectPlaced);
    socket.on("object-removed", onObjectRemoved);

    return () => {
      socket.off("object-placed", onObjectPlaced);
      socket.off("object-removed", onObjectRemoved);
    };
  }, [socket]);

  const clearCalibrationMarkers = () => {
    const scene = sceneRef.current;
    if (scene) {
      for (const marker of calibrationMarkersRef.current) {
        scene.remove(marker);
        marker.geometry.dispose();
        (marker.material as THREE.Material).dispose();
      }
    }
    calibrationMarkersRef.current = [];
  };

  const startCalibration = () => {
    clearCalibrationMarkers();
    calibrationPointsRef.current = [];
    calibrationActiveRef.current = true;
    setCalibrationActive(true);
    setCalibrationCount(0);
  };

  const cancelCalibration = () => {
    calibrationActiveRef.current = false;
    calibrationPointsRef.current = [];
    clearCalibrationMarkers();
    setCalibrationActive(false);
    setCalibrationCount(0);
  };

  const captureCalibrationPoint = (scene: THREE.Scene, reticle: THREE.Mesh) => {
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    reticle.matrix.decompose(position, quaternion, scale);

    // The calibration math is 2D (x, z) — floor-plane only. Height is
    // dropped deliberately; every calibration tap is assumed to land
    // on the same floor plane, so y carries no signal for the fit.
    const point: Point2D = { x: position.x, z: position.z };
    const index = calibrationPointsRef.current.length;

    console.warn(
      `[AR][${isHostRef.current ? "HOST" : "GUEST"}] calibration point captured`,
      {
        index,
        point,
        total: index + 1,
        required: calibrationRequiredRef.current,
      }
    );

    calibrationPointsRef.current = [...calibrationPointsRef.current, point];

    // Visual marker, distinct from the orange placement cubes, so the
    // person can see what they've tapped so far.
    const markerGeometry = new THREE.SphereGeometry(0.03, 16, 16);
    const markerMaterial = new THREE.MeshStandardMaterial({ color: 0x33cc66 });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.copy(position);
    scene.add(marker);
    calibrationMarkersRef.current.push(marker);

    setCalibrationCount(calibrationPointsRef.current.length);
    onCalibrationPointCapturedRef.current?.(point, index);

    if (calibrationPointsRef.current.length >= calibrationRequiredRef.current) {
      calibrationActiveRef.current = false;
      setCalibrationActive(false);
      onCalibrationCompleteRef.current?.(calibrationPointsRef.current);
    }
  };

  const placeObjectAtReticle = (reticle: THREE.Mesh) => {
    const socket = socketRef.current;
    const roomCode = roomCodeRef.current;

    if (!socket || !roomCode) {
      console.warn("Cannot place object: not connected to a room.");
      return;
    }

    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    reticle.matrix.decompose(position, quaternion, scale);

    let outPosition = { x: position.x, y: position.y, z: position.z };
    let outQuaternion = { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w };

    const role = isHostRef.current ? "HOST" : "GUEST";

    console.warn(`[AR][${role}] placement requested`, {
      roomCode,
      localPosition: outPosition,
      localQuaternion: outQuaternion,
      hasCalibrationTransform: Boolean(calibrationTransformRef.current),
    });

    if (!isHostRef.current) {
      const transform = calibrationTransformRef.current;
      if (!transform) {
        console.warn("[AR][GUEST] placement blocked: no calibration transform");
        return;
      }

      // reticle.matrix is already a THREE.Matrix4 in column-major order,
      // which matches what a flat Matrix4Array expects.
      const poseMatrix = reticle.matrix.toArray();

      const transformedMatrix = applyTransformToPose(poseMatrix, transform);

      const transformedThreeMatrix = new THREE.Matrix4().fromArray(transformedMatrix);
      const outPos = new THREE.Vector3();
      const outQuat = new THREE.Quaternion();
      const outScale = new THREE.Vector3();
      transformedThreeMatrix.decompose(outPos, outQuat, outScale);

      outPosition = { x: outPos.x, y: outPos.y, z: outPos.z };
      outQuaternion = { x: outQuat.x, y: outQuat.y, z: outQuat.z, w: outQuat.w };

      console.warn("[AR][GUEST] transform applied to placement", {
        transform,
        localPosition: position,
        localQuaternion: quaternion,
        transformedPosition: outPosition,
        transformedQuaternion: outQuaternion,
      });
    } else {
      console.warn("[AR][HOST] no coordinate transform applied", {
        position: outPosition,
        quaternion: outQuaternion,
      });
    }

    const objectId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    console.warn(`[AR][${role}] emitting place-object`, {
      objectId,
      code: roomCode,
      position: outPosition,
      quaternion: outQuaternion,
      transformed: !isHostRef.current,
    });

    socket.emit(
      "place-object",
      { code: roomCode, objectId, position: outPosition, quaternion: outQuaternion },
      (response: { ok?: boolean; error?: string }) => {
        if (response?.error) {
          console.error(`[AR][${role}] place-object rejected`, {
            objectId,
            error: response.error,
          });
          return;
        }

        console.warn(`[AR][${role}] place-object acknowledged`, {
          objectId,
          response,
        });
      }
    );
  };

  const onSelect = () => {
    const scene = sceneRef.current;
    const reticle = reticleRef.current;

    if (!scene || !reticle || !reticle.visible) {
      return;
    }

    if (calibrationActiveRef.current) {
      captureCalibrationPoint(scene, reticle);
      return;
    }

    placeObjectAtReticle(reticle);
  };

  const onSessionEnd = () => {
    const session = sessionRef.current;

    if (session) {
      session.removeEventListener("end", onSessionEnd);
      session.removeEventListener("select", onSelect);
    }

    rendererRef.current?.setAnimationLoop(null);

    hitTestSourceRequestedRef.current = false;
    hitTestSourceRef.current = null;
    localSpaceRef.current = null;
    sessionRef.current = null;

    if (reticleRef.current) {
      reticleRef.current.visible = false;
    }

    calibrationActiveRef.current = false;
    setCalibrationActive(false);

    setSessionActive(false);
  };

  const onXRFrame = (timestamp: number, frame?: XRFrame) => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const reticle = reticleRef.current;

    if (!renderer || !scene || !camera || !reticle || !frame) {
      return;
    }

    const session = frame.session;

    if (!hitTestSourceRequestedRef.current) {
      session
        .requestReferenceSpace("viewer")
        .then((viewerSpace) => {
          return session.requestHitTestSource?.({
            space: viewerSpace,
          });
        })
        .then((source) => {
          hitTestSourceRef.current = source ?? null;
        });

      session.requestReferenceSpace("local-floor").then((space) => {
        localSpaceRef.current = space;
      });

      hitTestSourceRequestedRef.current = true;
    }

    const hitTestSource = hitTestSourceRef.current;
    const localSpace = localSpaceRef.current;

    if (hitTestSource && localSpace) {
      const results = frame.getHitTestResults(hitTestSource);

      if (results.length > 0) {
        const hit = results[0];
        const pose = hit.getPose(localSpace);

        if (pose) {
          reticle.visible = true;
          reticle.matrix.fromArray(pose.transform.matrix);
        }
      } else {
        reticle.visible = false;
      }
    }

    renderer.render(scene, camera);
  };

  const startAR = async () => {
    const renderer = rendererRef.current;

    setError(null);

    if (!renderer || !containerRef.current) return;

    if (!navigator.xr) {
      setError("WebXR not available in this browser.");
      return;
    }

    try {
      const supported = await navigator.xr.isSessionSupported("immersive-ar");

      if (!supported) {
        setError("AR not supported on this device.");
        return;
      }

      const session = await navigator.xr.requestSession("immersive-ar", {
        requiredFeatures: ["hit-test", "local-floor"],
        optionalFeatures: ["dom-overlay"],
        domOverlay: {
          root: containerRef.current,
        },
      });

      sessionRef.current = session;

      session.addEventListener("end", onSessionEnd);
      session.addEventListener("select", onSelect);

      await renderer.xr.setSession(session);

      hitTestSourceRequestedRef.current = false;
      hitTestSourceRef.current = null;
      localSpaceRef.current = null;

      renderer.setAnimationLoop(onXRFrame as unknown as XRFrameRequestCallback);
      setSessionActive(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start AR session.");
    }
  };

  const stopAR = () => {
    sessionRef.current?.end();
  };

  return (
    <div ref={containerRef} className="fixed inset-0">
      {!sessionActive && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/75 text-white">
          {supported === false && (
            <p className="max-w-[280px] text-center text-sm">
              WebXR AR isn&apos;t supported on this browser/device. Try Chrome
              on an ARCore-capable Android phone, over HTTPS.
            </p>
          )}
          {supported === null && <p>Checking AR support…</p>}
          {supported === true && (
            <button
              onClick={startAR}
              className="rounded-lg bg-blue-600 px-7 py-3.5 text-base"
            >
              Start AR
            </button>
          )}
          {error && (
            <p className="max-w-[280px] text-center text-sm text-red-400">
              {error}
            </p>
          )}
        </div>
      )}

      {sessionActive && (
        <>
          <button
            onClick={stopAR}
            className="fixed right-3 top-3 z-10 rounded-lg bg-black/55 px-3.5 py-2 text-sm text-white"
          >
            Exit AR
          </button>

          {calibrationActive ? (
            <div className="fixed left-1/2 top-3 z-10 -translate-x-1/2 rounded-lg bg-black/70 px-4 py-2 text-center text-sm text-white">
              <p>
                Tap point {Math.min(calibrationCount + 1, calibrationRequiredPoints)} of{" "}
                {calibrationRequiredPoints}
              </p>
              <button
                onClick={cancelCalibration}
                className="mt-1 text-xs text-red-300 underline"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={startCalibration}
              className="fixed left-3 top-3 z-10 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm text-white"
            >
              {calibrationCount > 0 ? `Recalibrate (${calibrationCount} pts)` : "Calibrate"}
            </button>
          )}
        </>
      )}
    </div>
  );
}