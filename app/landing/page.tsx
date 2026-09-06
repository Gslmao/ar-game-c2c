
"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [roomCode, setRoomCode] = useState("");
  const [pixelWave, setPixelWave] = useState(true);

useEffect(() => {
  const timer = setTimeout(() => {
    setPixelWave(false);
  }, 2200);

  return () => clearTimeout(timer);
}, []);
  return (
    <main className="min-h-screen bg-[#08090d] text-white overflow-hidden">
      {/* Background */}
      {pixelWave && (
        <div className={pixelWave ? "ar-content scanning" : "ar-content"}>
          <div className="ar-scan"/>
          <div className={pixelWave ? "ar-content scanning" : "ar-content"}/>
          <div className="ar-scan-wave" />
          <div className="ar-scan-grid" />
          <div className="ar-scan-noise" />
          <div className="ar-scan-line" />
        </div>
      )}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] bg-purple-600/20 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[10%] w-[450px] h-[450px] bg-blue-500/10 blur-[140px] rounded-full" />

        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center font-black">
            AR
          </div>

          <span className="font-bold tracking-tight text-lg">
            ARCADE
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm text-white/60">
          <button className="hover:text-white transition">
            How it works
          </button>

          <button className="hover:text-white transition">
            About
          </button>

          <button className="px-4 py-2 rounded-full border border-white/10 hover:bg-white/5 transition">
            Sign in
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 min-h-[calc(100vh-90px)] flex items-center justify-center px-6">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-16 items-center">

          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-xs text-white/60 mb-8">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              REAL-TIME AR MULTIPLAYER
            </div>

            <div className="text-6xl flex flex-col items-center md:text-7xl font-black tracking-[-0.05em] leading-[0.95]">
              <div>
                PLAY
              <span className="text-white/40"> IN YOUR  </span>
              </div>
              WORLD.
            </div>

            <p className="mt-7 text-lg text-white/50 max-w-md leading-relaxed">
              
            </p>

            <div className="flex flex-wrap gap-4 mt-9">
              <a href = "room-test" >
              <button
                onClick={() => {
                  // TODO: create room
                }}
                className="px-6 py-4 rounded-2xl bg-white text-black font-bold hover:scale-[1.02] active:scale-[0.98] transition"
              >
                PLAY GAME →
              </button>
              </a>

            
            </div>
          </div>

          {/* Right visual */}
          <div className="relative hidden lg:block">
            <div className="relative aspect-square max-w-[480px] mx-auto">

              {/* Glow */}
              <div className="absolute inset-10 bg-purple-500/10 blur-[80px] rounded-full" />

              {/* AR board */}
              <div className="absolute inset-12 rounded-[40px] border border-white/10 bg-white/[0.025] backdrop-blur-xl rotate-[-4deg]">

                <div className="absolute inset-8 rounded-[30px] border border-white/10 overflow-hidden">

                  {/* Hockey table */}
                  {/* Moving hockey balls */}
                  <div className="absolute inset-0 overflow-hidden rounded-3xl">
                    <div className="hockey-ball ball-one" />
                    <div className="hockey-ball ball-two" />
                  </div>
                  <div className="absolute inset-[12%] rounded-[20px] border-2 border-white/20 bg-gradient-to-br from-white/[0.06] to-transparent">

                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10" />

                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-white/10" />

                    <div className="absolute left-[18%] top-1/2 -translate-y-1/2 w-10 h-24 rounded-full border border-white/10" />

                    <div className="absolute right-[18%] top-1/2 -translate-y-1/2 w-10 h-24 rounded-full border border-white/10" />

                    {/* Puck */}
                    <div className="absolute left-[62%] top-[42%] w-5 h-5 rounded-full bg-white shadow-[0_0_25px_rgba(255,255,255,0.8)]" />

                    {/* Player paddles */}
                    <div className="absolute left-[25%] top-[45%] w-12 h-12 rounded-full border-4 border-white/70" />

                    <div className="absolute right-[25%] top-[55%] w-12 h-12 rounded-full border-4 border-white/40" />
                  </div>
                </div>
              </div>

              {/* Floating player card */}
              <div className="absolute top-6 right-0 px-4 py-3 rounded-2xl border border-white/10 bg-[#111218]/80 backdrop-blur-xl">
                <div className="text-[10px] uppercase tracking-widest text-white/40">
                  Player 02
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="font-semibold text-sm">
                    Connected
                  </span>
                </div>
              </div>

              {/* AR badge */}
              
            </div>
          </div>
        </div>
      </section>

      {/* Join section */}
      <section
        id="join"
        className="relative z-10 border-t border-white/5 px-6 py-24"
      >
        <div className="max-w-xl mx-auto text-center">
          

          

          

          
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-8 py-6">
        <div className="max-w-7xl mx-auto flex justify-between text-xs text-white/30">
          <span>ARCADE © 2026</span>
          <span>Built for multiplayer AR</span>
        </div>
      </footer>
    </main>
  );
}
