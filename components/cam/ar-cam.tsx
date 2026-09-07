"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// ---- Minimal WebXR type shims (only what this component uses) ----
// Only needed if your project doesn't already have @types/webxr or a
// global webxr.d.ts. If it does, these are structurally compatible.
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
// ---------------------------------------------------------------

export default function ARScene() {
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
      renderer.setSize(window.innerWidth, window.innerHeight);
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
      renderer.dispose();

      renderer.domElement.remove();
    };
  }, []);

  const onSelect = () => {
    const scene = sceneRef.current;
    const reticle = reticleRef.current;

    if (!scene || !reticle || !reticle.visible) {
      return;
    }

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

    rendererRef.current?.setAnimationLoop(null);

    hitTestSourceRequestedRef.current = false;
    hitTestSourceRef.current = null;
    localSpaceRef.current = null;
    sessionRef.current = null;

    if (reticleRef.current) {
      reticleRef.current.visible = false;
    }

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

      // @ts-expect-error three's WebXRManager typings expect the DOM lib's
      // XRSession; our local shim is structurally compatible at runtime.
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
        <button
          onClick={stopAR}
          className="fixed right-3 top-3 z-10 rounded-lg bg-black/55 px-3.5 py-2 text-sm text-white"
        >
          Exit AR
        </button>
      )}
    </div>
  );
}