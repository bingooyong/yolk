import { useEffect, useRef } from "react";

type Bit = { x: number; y: number; vx: number; vy: number; r: number; c: string; life: number };

const COLORS = ["#E8C85A", "#E8614A", "#2DB8A1", "#5BAFE0", "#FFF6EB", "#A99AD6", "#F3D984"];

export function Confetti({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pool: Bit[] = [];
    const spawn = (n: number) => {
      const w = canvas.clientWidth;
      for (let i = 0; i < n; i++) {
        pool.push({
          x: w * (0.2 + Math.random() * 0.6),
          y: -12 - Math.random() * 40,
          vx: (Math.random() - 0.5) * 4.2,
          vy: 1.4 + Math.random() * 2.8,
          r: 3 + Math.random() * 4,
          c: COLORS[i % COLORS.length],
          life: 1,
        });
      }
    };
    spawn(56);
    let frame = 0;
    let id = 0;
    const tick = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      ctx.clearRect(0, 0, w, h);
      if (frame === 18) spawn(24);
      for (const b of pool) {
        b.x += b.vx;
        b.y += b.vy;
        b.vy += 0.04;
        b.r *= 0.998;
        b.life -= 0.006;
        if (b.life <= 0) continue;
        ctx.globalAlpha = Math.max(0, b.life);
        ctx.fillStyle = b.c;
        ctx.fillRect(b.x, b.y, b.r, b.r * 1.4);
      }
      ctx.globalAlpha = 1;
      frame += 1;
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [active]);

  if (!active) return null;
  return <canvas ref={ref} className="pointer-events-none absolute inset-0 z-20 h-full w-full" />;
}
