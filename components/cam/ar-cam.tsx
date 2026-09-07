"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { Point2D } from "@/lib/calibration";

// The project uses only this small subset of WebXR, so these local types keep
// the component usable when the browser's WebXR declarations are unavailable.
declare global {
  interface Navigator {
    xr?: XRSystem;
  }
}

interface XRSystem {
  isSessionSupported(mode: string): Promise<boolean>;
  requestSession(mode: string, options?: XRSessionInit): Promise<XRSession>;
}

interface XRSessionInit {
  requiredFeatures?: string[];
  optionalFeatures?: string[];
  domOverlay?: { root: Element };
}

interface XRSession extends EventTarget {
  requestReferenceSpace(type: string): Promise<XRReferenceSpace>;
  requestHitTestSource?(options: { space: XRReferenceSpace }): Promise<XRHitTestSource>;
  end(): Promise<void>;
}

interface XRReferenceSpace extends EventTarget {}

interface XRHitTestSource {}

interface XRHitTestResult {
  getPose(baseSpace: XRReferenceSpace): XRPose | undefined;
}

interface XRPose {
  transform: { matrix: Float32Array };
}

interface XRFrame {
  session: XRSession;
  getHitTestResults(source: XRHitTestSource): XRHitTestResult[];
}
interface ARSceneProps {
  // Three points let the downstream transform calculation detect disagreement.
  calibrationRequiredPoints?: number;
  // Called immediately after each calibration tap.
  onCalibrationPointCaptured?: (point: Point2D, index: number) => void;
  // Called after the requested calibration point count is reached.
  onCalibrationComplete?: (points: Point2D[]) => void;
}

export default function ARScene({
  calibrationRequiredPoints = 3,
  onCalibrationPointCaptured,
  onCalibrationComplete,
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

  // Event listeners read refs so they always see current calibration values;
  // state exists separately to trigger the visible UI updates.
  const calibrationActiveRef = useRef(false);
  const calibrationPointsRef = useRef<Point2D[]>([]);
  const calibrationMarkersRef = useRef<THREE.Mesh[]>([]);
  const calibrationRequiredRef = useRef(calibrationRequiredPoints);
  const onCalibrationPointCapturedRef = useRef(onCalibrationPointCaptured);
  const onCalibrationCompleteRef = useRef(onCalibrationComplete);

  const [calibrationActive, setCalibrationActive] = useState(false);
  const [calibrationCount, setCalibrationCount] = useState(0);

  useEffect(() => {
    calibrationRequiredRef.current = calibrationRequiredPoints;
  }, [calibrationRequiredPoints]);

  useEffect(() => {
    onCalibrationPointCapturedRef.current = onCalibrationPointCaptured;
  }, [onCalibrationPointCaptured]);

  useEffect(() => {
    onCalibrationCompleteRef.current = onCalibrationComplete;
  }, [onCalibrationComplete]);

  // Capability detection is separate from session startup so the UI can show
  // an accurate device/browser state before asking for camera permissions.
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

    // The scene is transparent because the XR camera supplies the real-world
    // background. The perspective camera is still required by Three.js for
    // rendering virtual geometry into the camera view.
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    // Hemisphere light gives placed meshes readable top and bottom shading
    // without requiring a manually positioned key light in AR space.
    const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);

    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // This enables Three.js' WebXR render loop and lets setSession() bind the
    // browser XRSession to the renderer's camera and framebuffer.
    renderer.xr.enabled = true;

    containerRef.current.appendChild(renderer.domElement);

    // The reticle is a horizontal ring placed on the detected real-world
    // surface. XR hit-test poses are matrices, so matrixAutoUpdate is disabled
    // and the pose matrix is copied directly on every XR frame.
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
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);

      // End the session and stop the frame loop before disposing Three.js
      // resources; otherwise XR callbacks could access released objects.
      sessionRef.current?.end();

      renderer.setAnimationLoop(null);

      geometry.dispose();
      material.dispose();

      for (const marker of calibrationMarkersRef.current) {
        marker.geometry.dispose();
        (marker.material as THREE.Material).dispose();
      }
      calibrationMarkersRef.current = [];

      renderer.dispose();

      renderer.domElement.remove();
    };
  }, []);

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

    // Calibration is fitted on the floor plane, so Three.js world coordinates
    // are reduced to x/z and the camera-space height is intentionally ignored.
    const point: Point2D = { x: position.x, z: position.z };
    const index = calibrationPointsRef.current.length;

    calibrationPointsRef.current = [...calibrationPointsRef.current, point];

    // Markers remain in the same Three.js scene as the reticle, giving users a
    // persistent visual record of points already included in calibration.
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

    // Decompose the reticle's world matrix before enabling automatic updates;
    // this converts the XR hit pose into ordinary Three.js transform fields
    // that remain stable after the reticle moves to the next hit surface.
    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);

    const material = new THREE.MeshStandardMaterial({
      color: 0xff5533,
    });

    const cube = new THREE.Mesh(geometry, material);

    cube.matrix.copy(reticle.matrix);

    cube.matrix.decompose(cube.position, cube.quaternion, cube.scale);

    cube.matrixAutoUpdate = true;

    scene.add(cube);
  };

  const onSessionEnd = () => {
    const session = sessionRef.current;

    if (session) {
      session.removeEventListener("end", onSessionEnd);
      session.removeEventListener("select", onSelect);
    }

    // Clearing the animation loop is essential: Three.js otherwise keeps
    // requesting XR frames after the session has ended.
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

  const onXRFrame = (timestamp: number, frame: XRFrame) => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const reticle = reticleRef.current;

    if (!renderer || !scene || !camera || !reticle) {
      return;
    }

    const session = frame.session;

    // Request the viewer hit-test source and floor reference space once per
    // session. The viewer space follows the device camera; local-floor gives
    // returned poses a stable floor-relative coordinate system for placement.
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
          // WebXR returns a 4x4 pose matrix in column-major order. Three.js'
          // fromArray understands that layout and preserves the hit's world
          // position and orientation for the reticle and future placements.
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

      // Three.js and the local WebXR shim describe the same runtime session
      // with separate TypeScript declarations, so this boundary needs a cast.
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