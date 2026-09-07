"use client";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { SineWaveMesh } from "@/components/sine-wave-mesh";
import { HockeyTable } from "@/components/hockey-table";

export default function Home() {
  const [pixelWave, setPixelWave] = useState(true);
  const [theme, setTheme] = useState<"minimal" | "cyber">("minimal");

  useEffect(() => {
    const timer = setTimeout(() => {
      setPixelWave(false);
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  const isCyber = theme === "cyber";

  return (
    <main className="min-h-screen bg-[#08090d] text-white overflow-hidden relative">
      {/* Background with Gaming Station Matrix & Pixel Waves */}
      {pixelWave && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="ar-scan" />
          <div className="ar-scan-wave" />
          <div className="ar-scan-grid" />
          <div className="ar-scan-noise" />
          <div className="ar-scan-line" />
        </div>
      )}

      {/* Gaming Station Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Dual Scheme Ambient Glows */}
        {isCyber ? (
          <>
            <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] bg-purple-600/20 blur-[140px] rounded-full transition-all duration-700" />
            <div className="absolute bottom-[-20%] right-[10%] w-[450px] h-[450px] bg-blue-500/15 blur-[140px] rounded-full transition-all duration-700" />
            <div className="absolute top-[40%] right-[30%] w-[350px] h-[350px] bg-cyan-500/10 blur-[130px] rounded-full pointer-events-none" />
          </>
        ) : (
          <>
            <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] bg-zinc-800/15 blur-[160px] rounded-full transition-all duration-700" />
            <div className="absolute bottom-[-20%] right-[10%] w-[450px] h-[450px] bg-zinc-800/10 blur-[160px] rounded-full transition-all duration-700" />
          </>
        )}

        {/* Gaming Crosshairs / Tactical Grid Telemetry */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `
              radial-gradient(circle at 50% 50%, #ffffff 1px, transparent 1px),
              linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px, 120px 120px, 120px 120px",
          }}
        />

        {/* Dynamic Sine-Wave Grid Mesh */}
        <SineWaveMesh />
      </div>

      {/* Navbar */}
      <nav className="relative z-30 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 group cursor-pointer">
          {isCyber ? (
            /* Previous Cyber Neon Logo */
            <div className="relative flex items-center justify-center">
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-500 to-cyan-400 opacity-80 blur-[7px] group-hover:opacity-100 group-hover:blur-[9px] transition duration-500" />
              <div className="relative w-9 h-9 rounded-xl bg-[#0e1017]/90 border border-white/20 backdrop-blur-xl flex items-center justify-center shadow-inner overflow-hidden transition-transform duration-300 group-hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
                <span className="font-black text-xs tracking-wider bg-gradient-to-br from-white via-purple-100 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]">
                  AR
                </span>
              </div>
            </div>
          ) : (
            /* Clean Minimal AR Badge */
            <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center font-black text-xs tracking-wider transition-transform duration-300 group-hover:scale-105 shadow-sm">
              AR
            </div>
          )}

          {/* ARCADE text with load & hover spin animation */}
          <span className="font-bold tracking-tight text-lg animate-arcade-spin cursor-pointer select-none">
            ARCADE
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <button className="hidden sm:inline-block text-white/60 hover:text-white transition">
            How it works
          </button>

          <button className="hidden sm:inline-block text-white/60 hover:text-white transition">
            About
          </button>

          {/* Dual Scheme Mode Switcher Button (Near Sign in) */}
          <button
            onClick={() => setTheme(theme === "minimal" ? "cyber" : "minimal")}
            title="Toggle Dual Scheme Mode"
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all duration-300 cursor-pointer ${
              isCyber
                ? "border-purple-500/50 bg-purple-950/40 text-purple-200 shadow-[0_0_18px_rgba(168,85,247,0.35)] hover:bg-purple-900/50"
                : "border-white/15 bg-white/[0.05] hover:bg-white/10 text-white/80 hover:text-white"
            }`}
          >
            <Sparkles
              className={`size-3.5 ${
                isCyber ? "text-cyan-400 animate-pulse" : "text-purple-400"
              }`}
            />
            <span>{isCyber ? "Cyber Neon" : "Minimal"}</span>
          </button>

          <button className="px-4 py-2 rounded-full border border-white/10 hover:bg-white/5 transition text-white/80 hover:text-white">
            Sign in
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-20 min-h-[calc(100vh-90px)] flex items-center justify-center px-6">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-16 items-center">

          {/* Left: Text Area with Radial Fade so bright lines do not overlap */}
          <div className="relative z-30">
            {/* Ambient radial fade behind text so passing bright lines fade smoothly at text area */}
            <div
              className="absolute -inset-10 -z-10 rounded-3xl pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(8,9,13,0.95) 25%, rgba(8,9,13,0.8) 60%, transparent 100%)",
                backdropFilter: "blur(4px)",
              }}
            />

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-xs text-white/60 mb-8">
              <span
                className={`w-2 h-2 rounded-full ${
                  isCyber ? "bg-cyan-400 animate-pulse" : "bg-emerald-400"
                }`}
              />
              REAL-TIME AR MULTIPLAYER
            </div>

            <div className="text-6xl md:text-7xl font-black tracking-[-0.05em] leading-[0.95]">
              <div>
                PLAY <span className="text-white/40">IN YOUR</span>
              </div>
              <div>WORLD.</div>
            </div>

            <div className="mt-7 flex flex-wrap gap-4">
              <a href="/room-test">
                <button
                  className={`px-6 py-4 rounded-2xl font-bold transition duration-200 cursor-pointer active:scale-[0.98] ${
                    isCyber
                      ? "bg-white text-black hover:bg-purple-100 shadow-[0_0_30px_rgba(168,85,247,0.45)] hover:shadow-[0_0_35px_rgba(168,85,247,0.7)] hover:scale-[1.02]"
                      : "bg-white text-black hover:bg-zinc-200 hover:scale-[1.02] shadow-md"
                  }`}
                >
                  PLAY GAME →
                </button>
              </a>
            </div>
          </div>

          {/* Right visual: Enhanced Air Hockey Table */}
          <div className="relative hidden lg:block z-20">
            <div className="relative w-full max-w-[500px] mx-auto">
              <HockeyTable
                theme={theme}
                className="w-full h-[320px] rotate-[-2deg]"
              />

              {/* Floating player card */}
              <div
                className={`absolute -top-3 -right-2 px-3.5 py-2.5 rounded-xl border backdrop-blur-xl shadow-lg z-30 transition-all ${
                  isCyber
                    ? "border-purple-500/30 bg-[#111218]/90 shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                    : "border-white/15 bg-[#111218]/90"
                }`}
              >
                <div className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
                  Player 02
                </div>

                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isCyber ? "bg-cyan-400 animate-pulse" : "bg-emerald-400"
                    }`}
                  />
                  <span className="font-semibold text-xs text-white">
                    Connected
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-20 border-t border-white/5 px-8 py-6">
        <div className="max-w-7xl mx-auto flex justify-between text-xs text-white/30">
          <span>ARCADE © 2026</span>
          <span>Built for multiplayer AR</span>
        </div>
      </footer>
    </main>
  );
}
