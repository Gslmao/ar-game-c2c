"use client";

import { useEffect, useRef } from "react";

export interface SineWaveMeshProps {
  className?: string;
  gridSize?: number;
  lineAlphaMin?: number;
  lineAlphaMax?: number;
  dotAlphaMin?: number;
  dotAlphaMax?: number;
}

export function SineWaveMesh({
  className = "fixed inset-0 w-full h-full pointer-events-none z-0",
  gridSize = 48,
  lineAlphaMin = 0.4,
  lineAlphaMax = 0.03,
  dotAlphaMin = 0.004,
  dotAlphaMax = 0.28,
}: SineWaveMeshProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;
    const BUCKETS = 8;

    // Preallocated bucket arrays for high 60fps performance without GC pauses
    const hSegs: number[][] = Array.from({ length: BUCKETS }, () => []);
    const vSegs: number[][] = Array.from({ length: BUCKETS }, () => []);
    const dots: number[][] = Array.from({ length: BUCKETS }, () => []);

    let cols = 0;
    let rows = 0;
    let nodes = new Float32Array(0);

    const handleResize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      cols = Math.ceil(width / gridSize) + 1;
      rows = Math.ceil(height / gridSize) + 1;
      nodes = new Float32Array(cols * rows);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // Precompute color styles for each brightness bucket
    const strokeStyles: string[] = [];
    const fillStyles: string[] = [];
    for (let b = 0; b < BUCKETS; b++) {
      const norm = (b + 0.5) / BUCKETS;
      const lineAlpha = lineAlphaMin + norm * (lineAlphaMax - lineAlphaMin);
      const dotAlpha = dotAlphaMin + norm * (dotAlphaMax - dotAlphaMin);
      strokeStyles.push(`rgba(195, 215, 245, ${lineAlpha.toFixed(4)})`);
      fillStyles.push(`rgba(220, 235, 255, ${dotAlpha.toFixed(4)})`);
    }

    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      // Reset buckets
      for (let b = 0; b < BUCKETS; b++) {
        hSegs[b].length = 0;
        vSegs[b].length = 0;
        dots[b].length = 0;
      }

      // Compute sine wave intensity at each grid intersection
      for (let j = 0; j < rows; j++) {
        const py = j * gridSize;
        const rowOffset = j * cols;
        for (let i = 0; i < cols; i++) {
          const px = i * gridSize;
          // Primary diagonal wave + subtle secondary harmonic
          const w1 = Math.sin(px * 0.003 + py * 0.0022 - time * 0.0014);
          const w2 = Math.sin(px * 0.0018 - py * 0.0028 + time * 0.001);
          // Normalized wave value in [0, 1]
          nodes[rowOffset + i] = (w1 * 0.65 + w2 * 0.35 + 1) * 0.5;
        }
      }

      // Partition segments and intersection markers into brightness buckets
      for (let j = 0; j < rows; j++) {
        const y = j * gridSize;
        const rowOffset = j * cols;
        const nextRowOffset = (j + 1) * cols;

        for (let i = 0; i < cols; i++) {
          const x = i * gridSize;
          const n = nodes[rowOffset + i];

          const dotBucket = Math.min(BUCKETS - 1, (n * BUCKETS) | 0);
          dots[dotBucket].push(x, y);

          if (i < cols - 1) {
            const avg = (n + nodes[rowOffset + i + 1]) * 0.5;
            const b = Math.min(BUCKETS - 1, (avg * BUCKETS) | 0);
            hSegs[b].push(x, y, x + gridSize, y);
          }

          if (j < rows - 1) {
            const avg = (n + nodes[nextRowOffset + i]) * 0.5;
            const b = Math.min(BUCKETS - 1, (avg * BUCKETS) | 0);
            vSegs[b].push(x, y, x, y + gridSize);
          }
        }
      }

      // Draw grid line segments
      ctx.lineWidth = 1;
      for (let b = 0; b < BUCKETS; b++) {
        const h = hSegs[b];
        const v = vSegs[b];
        if (h.length > 0 || v.length > 0) {
          ctx.beginPath();
          for (let k = 0; k < h.length; k += 4) {
            ctx.moveTo(h[k] + 0.5, h[k + 1] + 0.5);
            ctx.lineTo(h[k + 2] + 0.5, h[k + 3] + 0.5);
          }
          for (let k = 0; k < v.length; k += 4) {
            ctx.moveTo(v[k] + 0.5, v[k + 1] + 0.5);
            ctx.lineTo(v[k + 2] + 0.5, v[k + 3] + 0.5);
          }
          ctx.strokeStyle = strokeStyles[b];
          ctx.stroke();
        }

        // Draw intersection points
        const d = dots[b];
        if (d.length > 0) {
          ctx.fillStyle = fillStyles[b];
          for (let k = 0; k < d.length; k += 2) {
            ctx.fillRect(d[k] - 1, d[k + 1] - 1, 2, 2);
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [gridSize, lineAlphaMin, lineAlphaMax, dotAlphaMin, dotAlphaMax]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
    />
  );
}
