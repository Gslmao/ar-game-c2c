"use client";

import { useEffect, useRef, useState } from "react";

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotSpeed: number;
  shape: "rect" | "star";
  opacity: number;
  decay: number;
  gravity: number;
}

export function HockeyTable({
  className = "",
  theme = "minimal",
}: {
  className?: string;
  theme?: "minimal" | "cyber";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ball1Ref = useRef<HTMLDivElement>(null);
  const ball2Ref = useRef<HTMLDivElement>(null);
  const paddleLeftRef = useRef<HTMLDivElement>(null);
  const paddleRightRef = useRef<HTMLDivElement>(null);
  const [goalText, setGoalText] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const r = 10; // puck radius
    const pr = 22; // paddle radius
    const hitDist = pr + r;

    // Confetti particles list for purple & golden flakes
    const particles: ConfettiParticle[] = [];

    // State for the two moving balls
    const b1 = {
      x: 100,
      y: 90,
      vx: 2.5,
      vy: 1.8,
      lastScored: 0,
    };

    const b2 = {
      x: 280,
      y: 160,
      vx: -2.3,
      vy: -2.2,
      lastScored: 0,
    };

    // Paddle positions
    let leftPaddleY = 130;
    let rightPaddleY = 130;
    let leftPaddleX = 65;
    let rightPaddleX = 335;

    let width = container.clientWidth || 400;
    let height = container.clientHeight || 260;

    const resizeCanvas = () => {
      if (!container || !canvas) return;
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = width;
      canvas.height = height;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const triggerGoalCelebration = (goalX: number, goalY: number, side: "left" | "right") => {
      // 1. Trigger celebration announcement
      setGoalText("GOAL!");
      setTimeout(() => setGoalText(null), 1200);

      // 2. Sprinkle celebratory purple & golden flakes
      const purpleShades = ["#a855f7", "#c084fc", "#9333ea", "#d8b4fe", "#7e22ce"];
      const goldenShades = ["#fbbf24", "#f59e0b", "#fde047", "#facc15", "#fef08a"];

      const dir = side === "left" ? 1 : -1;
      const count = 55;

      for (let i = 0; i < count; i++) {
        const isGold = Math.random() > 0.45;
        const palette = isGold ? goldenShades : purpleShades;
        const color = palette[Math.floor(Math.random() * palette.length)];

        particles.push({
          x: goalX,
          y: goalY + (Math.random() - 0.5) * 36,
          vx: dir * (Math.random() * 5.5 + 2) + (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 7 - 1.5,
          color,
          size: Math.random() * 6 + 3.5,
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 16,
          shape: Math.random() > 0.4 ? "rect" : "star",
          opacity: 1,
          decay: Math.random() * 0.012 + 0.008,
          gravity: 0.11,
        });
      }
    };

    const loop = (timestamp: number) => {
      if (width < 50 || height < 50) {
        width = container.clientWidth || 400;
        height = container.clientHeight || 260;
        canvas.width = width;
        canvas.height = height;
      }

      const minX = r + 4;
      const maxX = width - r - 4;
      const minY = r + 4;
      const maxY = height - r - 4;

      // Goal slot boundaries (centered vertically, 90px opening)
      const goalHalfSpan = 45;
      const goalTop = height * 0.5 - goalHalfSpan;
      const goalBottom = height * 0.5 + goalHalfSpan;

      const balls = [b1, b2];

      // Update and check physics for each ball
      balls.forEach((b) => {
        b.x += b.vx;
        b.y += b.vy;

        // Check if ball entered GOAL HOLES
        const inGoalYRange = b.y >= goalTop && b.y <= goalBottom;

        if (inGoalYRange) {
          // Left Goal Hole
          if (b.x <= minX + 2 && timestamp - b.lastScored > 1000) {
            b.lastScored = timestamp;
            triggerGoalCelebration(14, height * 0.5, "left");
            // Respawn ball in the centre
            b.x = width * 0.5;
            b.y = height * 0.5 + (Math.random() - 0.5) * 20;
            b.vx = Math.random() * 1.5 + 2.2;
            b.vy = (Math.random() - 0.5) * 3.5;
            return;
          }
          // Right Goal Hole
          if (b.x >= maxX - 2 && timestamp - b.lastScored > 1000) {
            b.lastScored = timestamp;
            triggerGoalCelebration(width - 14, height * 0.5, "right");
            // Respawn ball in the centre
            b.x = width * 0.5;
            b.y = height * 0.5 + (Math.random() - 0.5) * 20;
            b.vx = -(Math.random() * 1.5 + 2.2);
            b.vy = (Math.random() - 0.5) * 3.5;
            return;
          }
        }

        // Standard wall bounce if not scoring
        if (b.x <= minX) {
          b.x = minX;
          b.vx = Math.abs(b.vx);
        } else if (b.x >= maxX) {
          b.x = maxX;
          b.vx = -Math.abs(b.vx);
        }

        if (b.y <= minY) {
          b.y = minY;
          b.vy = Math.abs(b.vy);
        } else if (b.y >= maxY) {
          b.y = maxY;
          b.vy = -Math.abs(b.vy);
        }

        // Clamp max & min speed
        const speed = Math.hypot(b.vx, b.vy);
        if (speed > 6.5) {
          b.vx = (b.vx / speed) * 6.5;
          b.vy = (b.vy / speed) * 6.5;
        } else if (speed < 2.0) {
          b.vx = (b.vx / (speed || 1)) * 2.5;
          b.vy = (b.vy / (speed || 1)) * 2.5;
        }
      });

      // Paddle AI & Position Updates (active patrolling & striking)
      // Left paddle actively defends and attacks balls on the left side
      const leftTargetBall = b1.x < b2.x ? b1 : b2;
      const targetLeftY = Math.max(
        minY + pr,
        Math.min(maxY - pr, leftTargetBall.x < width * 0.52 ? leftTargetBall.y : height * 0.5 + Math.sin(timestamp * 0.002) * 35)
      );
      const targetLeftX = Math.max(
        pr + 12,
        Math.min(width * 0.35, leftTargetBall.x < width * 0.38 ? leftTargetBall.x - 8 : width * 0.16)
      );
      leftPaddleY += (targetLeftY - leftPaddleY) * 0.07;
      leftPaddleX += (targetLeftX - leftPaddleX) * 0.06;

      // Right paddle actively defends and attacks balls on the right side
      const rightTargetBall = b1.x > b2.x ? b1 : b2;
      const targetRightY = Math.max(
        minY + pr,
        Math.min(maxY - pr, rightTargetBall.x > width * 0.48 ? rightTargetBall.y : height * 0.5 + Math.cos(timestamp * 0.0019) * 35)
      );
      const targetRightX = Math.min(
        width - pr - 12,
        Math.max(width * 0.65, rightTargetBall.x > width * 0.62 ? rightTargetBall.x + 8 : width * 0.84)
      );
      rightPaddleY += (targetRightY - rightPaddleY) * 0.07;
      rightPaddleX += (targetRightX - rightPaddleX) * 0.06;

      // BALL WITH JOCKEY (PADDLE) COLLISIONS
      const paddles = [
        { x: leftPaddleX, y: leftPaddleY, isLeft: true },
        { x: rightPaddleX, y: rightPaddleY, isLeft: false },
      ];

      balls.forEach((b) => {
        paddles.forEach((p) => {
          const dx = b.x - p.x;
          const dy = b.y - p.y;
          const dist = Math.hypot(dx, dy);

          if (dist < hitDist && dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;

            // Push ball out of paddle penetration
            b.x = p.x + nx * (hitDist + 1);
            b.y = p.y + ny * (hitDist + 1);

            // Reflect velocity
            const dot = b.vx * nx + b.vy * ny;
            if (dot < 0) {
              b.vx -= 2 * dot * nx;
              b.vy -= 2 * dot * ny;
            }

            // Impart striking punch impulse forward
            b.vx += (p.isLeft ? 1.4 : -1.4) + nx * 1.2;
            b.vy += ny * 1.2;
          }
        });
      });

      // Ball-to-ball elastic collision
      const dx = b2.x - b1.x;
      const dy = b2.y - b1.y;
      const dist = Math.hypot(dx, dy);
      const minDist = r * 2 + 2;

      if (dist < minDist && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;
        const kx = b1.vx - b2.vx;
        const ky = b1.vy - b2.vy;
        const p = 2 * (nx * kx + ny * ky) / 2;

        b1.vx -= p * nx;
        b1.vy -= p * ny;
        b2.vx += p * nx;
        b2.vy += p * ny;

        const overlap = (minDist - dist) / 2;
        b1.x -= nx * overlap;
        b1.y -= ny * overlap;
        b2.x += nx * overlap;
        b2.y += ny * overlap;
      }

      // Update DOM styles via transform3d for top 60fps performance
      if (ball1Ref.current) {
        ball1Ref.current.style.transform = `translate3d(${b1.x - r}px, ${b1.y - r}px, 0)`;
      }
      if (ball2Ref.current) {
        ball2Ref.current.style.transform = `translate3d(${b2.x - r}px, ${b2.y - r}px, 0)`;
      }
      if (paddleLeftRef.current) {
        paddleLeftRef.current.style.transform = `translate3d(${leftPaddleX - pr}px, ${leftPaddleY - pr}px, 0)`;
      }
      if (paddleRightRef.current) {
        paddleRightRef.current.style.transform = `translate3d(${rightPaddleX - pr}px, ${rightPaddleY - pr}px, 0)`;
      }

      // Render Celebratory Flakes Canvas (Purple & Gold sprinkling effect)
      ctx.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.98;
        p.rotation += p.rotSpeed;
        p.opacity -= p.decay;

        if (p.opacity <= 0 || p.y > height + 20) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity));
        ctx.fillStyle = p.color;

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
        } else {
          // Shimmering diamond/star particle
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size * 0.4, 0);
          ctx.lineTo(0, p.size);
          ctx.lineTo(-p.size * 0.4, 0);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  const isCyber = theme === "cyber";

  return (
    <div
      className={`relative select-none ${className}`}
      style={{ perspective: "1000px" }}
    >
      {/* Table Outer Chassis / Rails */}
      <div
        className={`relative w-full h-full rounded-[34px] border-2 shadow-2xl p-4 transition-all duration-500 ${
          isCyber
            ? "border-purple-500/40 bg-gradient-to-b from-[#1c152e] via-[#10111f] to-[#0a0c16] shadow-[0_0_35px_rgba(168,85,247,0.25)]"
            : "border-white/15 bg-gradient-to-b from-[#181a24] via-[#10121a] to-[#0c0d12]"
        }`}
      >
        {/* Subtle beveled rail edge highlight */}
        <div
          className={`absolute inset-x-6 top-0 h-px pointer-events-none ${
            isCyber
              ? "bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"
              : "bg-gradient-to-r from-transparent via-white/30 to-transparent"
          }`}
        />

        {/* Corner 45-degree bumper accents */}
        <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-white/20 rounded-tl-xl pointer-events-none" />
        <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-white/20 rounded-tr-xl pointer-events-none" />
        <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-white/20 rounded-bl-xl pointer-events-none" />
        <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-white/20 rounded-br-xl pointer-events-none" />

        {/* Left Goal Hole / Pocket */}
        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-4 h-24 rounded-r-md bg-black/90 border-y border-r border-white/20 shadow-inner flex items-center justify-center overflow-hidden">
          <div className="w-1 h-16 rounded-full bg-red-500/60 animate-pulse" />
        </div>

        {/* Right Goal Hole / Pocket */}
        <div className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-24 rounded-l-md bg-black/90 border-y border-l border-white/20 shadow-inner flex items-center justify-center overflow-hidden">
          <div className="w-1 h-16 rounded-full bg-red-500/60 animate-pulse" />
        </div>

        {/* Inner Playing Surface (The Air Hockey Rink) */}
        <div
          ref={containerRef}
          className={`relative w-full h-full rounded-[22px] border overflow-hidden shadow-inner transition-colors duration-500 ${
            isCyber
              ? "bg-[#090b14] border-purple-500/30"
              : "bg-[#0c0d14] border-white/10"
          }`}
        >
          {/* Micro-perforated air holes texture */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="air-holes-grid"
                width="14"
                height="14"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="7" cy="7" r="1" fill="#ffffff" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#air-holes-grid)" />
          </svg>

          {/* Rink Markings */}
          {/* Center Line */}
          <div
            className={`absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 ${
              isCyber ? "bg-cyan-400/50 shadow-[0_0_8px_rgba(34,211,238,0.5)]" : "bg-red-500/40"
            }`}
          />

          {/* Center Faceoff Circle */}
          <div
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border flex items-center justify-center ${
              isCyber
                ? "border-cyan-400/40 shadow-[0_0_12px_rgba(34,211,238,0.2)]"
                : "border-red-500/30"
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full ${
                isCyber ? "bg-cyan-400" : "bg-red-500/60"
              }`}
            />
          </div>

          {/* Left Goal Arc */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-20 h-32 rounded-r-full border-r border-y border-white/15" />
          <div className="absolute left-[26%] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/25" />

          {/* Right Goal Arc */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-20 h-32 rounded-l-full border-l border-y border-white/15" />
          <div className="absolute right-[26%] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/25" />

          {/* Paddle: Player 1 (Left side, Cyan striker) */}
          <div
            ref={paddleLeftRef}
            className="absolute top-0 left-0 w-11 h-11 pointer-events-none will-change-transform z-10"
          >
            <div className="w-full h-full rounded-full bg-gradient-to-br from-zinc-200 to-zinc-500 p-1 shadow-[0_6px_14px_rgba(0,0,0,0.6)] border border-white/40 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-zinc-800 border border-white/20 flex items-center justify-center shadow-inner">
                <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-sm" />
              </div>
            </div>
          </div>

          {/* Paddle: Player 2 (Right side, Orange/Red striker) */}
          <div
            ref={paddleRightRef}
            className="absolute top-0 left-0 w-11 h-11 pointer-events-none will-change-transform z-10"
          >
            <div className="w-full h-full rounded-full bg-gradient-to-br from-zinc-200 to-zinc-500 p-1 shadow-[0_6px_14px_rgba(0,0,0,0.6)] border border-white/40 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-zinc-800 border border-white/20 flex items-center justify-center shadow-inner">
                <div className="w-3 h-3 rounded-full bg-amber-400 shadow-sm" />
              </div>
            </div>
          </div>

          {/* Moving Puck 1 */}
          <div
            ref={ball1Ref}
            className="absolute top-0 left-0 w-5 h-5 pointer-events-none will-change-transform z-20"
          >
            <div
              className={`w-full h-full rounded-full flex items-center justify-center transition-all ${
                isCyber
                  ? "bg-white shadow-[0_0_12px_rgba(168,85,247,0.8)] border border-purple-300"
                  : "bg-white shadow-[0_3px_8px_rgba(0,0,0,0.7)] border border-zinc-300"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isCyber ? "bg-purple-600" : "bg-zinc-900"
                }`}
              />
            </div>
          </div>

          {/* Moving Puck 2 */}
          <div
            ref={ball2Ref}
            className="absolute top-0 left-0 w-5 h-5 pointer-events-none will-change-transform z-20"
          >
            <div
              className={`w-full h-full rounded-full flex items-center justify-center transition-all ${
                isCyber
                  ? "bg-white shadow-[0_0_12px_rgba(34,211,238,0.8)] border border-cyan-300"
                  : "bg-zinc-200 shadow-[0_3px_8px_rgba(0,0,0,0.7)] border border-white"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isCyber ? "bg-cyan-500" : "bg-red-600"
                }`}
              />
            </div>
          </div>

          {/* Celebration Flakes Overlay Canvas (Purple & Gold Confetti) */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-30"
          />

          {/* Goal Announcement Tag */}
          {goalText && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
              <div className="px-5 py-2 rounded-2xl bg-black/85 border border-yellow-400/60 backdrop-blur-md shadow-2xl text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-purple-300 text-xl font-black tracking-widest animate-bounce">
                🎉 {goalText} 🎉
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
