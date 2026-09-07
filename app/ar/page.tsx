"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// ARScene touches window/navigator, so it must never run on the server.
const ARScene = dynamic(() => import("@/components/cam/ar-cam"), {
  ssr: false,
});

export default function ARTestPage() {
  const [showAR, setShowAR] = useState(false);
  const [pageUrl, setPageUrl] = useState("");
  const [isSecureContext, setIsSecureContext] = useState<boolean | null>(null);

  useEffect(() => {
    setPageUrl(window.location.href);
    setIsSecureContext(window.isSecureContext);
  }, []);

  if (showAR) {
    return <ARScene />;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">AR Hit-Test Test Page</h1>
        <p className="mt-1 text-sm text-gray-500">
          Sanity-check the ARScene component before wiring it into the real app.
        </p>
      </div>

      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-700">
          Before you start
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
          <li>Use Chrome on an ARCore-capable Android phone.</li>
          <li>The page must be served over HTTPS (or localhost).</li>
          <li>Point the camera at a textured, well-lit floor or tabletop.</li>
          <li>A blue ring (reticle) should appear once a surface is found.</li>
          <li>Tap anywhere to drop a cube at the reticle&apos;s position.</li>
        </ul>
      </section>

      <section className="rounded-lg border border-gray-200 p-4 text-sm">
        <h2 className="mb-2 font-medium text-gray-700">Environment check</h2>
        <div className="space-y-1 text-gray-600">
          <p>
            Secure context:{" "}
            {isSecureContext === null
              ? "checking…"
              : isSecureContext
              ? "✅ yes"
              : "❌ no — WebXR will refuse to start"}
          </p>
          <p>
            navigator.xr:{" "}
            {typeof navigator !== "undefined" && "xr" in navigator
              ? "✅ present"
              : "❌ not present in this browser"}
          </p>
        </div>
      </section>

      {pageUrl && !isSecureContext && (
        <section className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          This page isn&apos;t on HTTPS. If you&apos;re testing on your phone
          over your local network, tunnel it first (e.g.{" "}
          <code className="rounded bg-amber-100 px-1">
            npx ngrok http 3000
          </code>
          ) and open the HTTPS URL on your phone instead of this one.
        </section>
      )}

      <button
        onClick={() => setShowAR(true)}
        className="rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white"
      >
        Launch AR test
      </button>

      <p className="text-xs text-gray-400">
        Launching mounts the ARScene component full-screen. Use its own
        &quot;Start AR&quot; button inside to begin the session, and
        &quot;Exit AR&quot; to end it — this page will still be underneath.
      </p>
    </main>
  );
}
