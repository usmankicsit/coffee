'use client';

import { useEffect, useRef } from 'react';

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  hue: number;
};

/** Mouse spray / glitter trail for the public website */
export function GlitterCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    let sparks: Spark[] = [];
    let raf = 0;
    let w = 0;
    let h = 0;
    let lastX = -999;
    let lastY = -999;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      // Keep layout-neutral; CSS/inline styles own the display size
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const spray = (x: number, y: number, amount = 6) => {
      for (let i = 0; i < amount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.4 + Math.random() * 2.2;
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.6,
          life: 0,
          max: 28 + Math.random() * 28,
          size: 1.2 + Math.random() * 2.4,
          hue: 28 + Math.random() * 18,
        });
      }
      if (sparks.length > 220) sparks = sparks.slice(-220);
    };

    const onMove = (e: PointerEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      const dx = x - lastX;
      const dy = y - lastY;
      const dist = Math.hypot(dx, dy);
      lastX = x;
      lastY = y;
      const amount = dist > 2 ? Math.min(12, 3 + Math.floor(dist / 8)) : 2;
      spray(x, y, amount);
    };

    const onClick = (e: PointerEvent) => spray(e.clientX, e.clientY, 28);

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      sparks = sparks.filter((s) => s.life < s.max);
      for (const s of sparks) {
        s.life += 1;
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.035;
        s.vx *= 0.98;
        const t = Math.max(0, 1 - s.life / s.max);
        const radius = Math.max(0.01, s.size * t);
        if (t <= 0) continue;
        ctx.beginPath();
        ctx.fillStyle = `hsla(${s.hue}, 78%, ${58 + t * 20}%, ${t * 0.9})`;
        ctx.shadowColor = `hsla(${s.hue}, 90%, 60%, ${t})`;
        ctx.shadowBlur = 8;
        ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onClick);
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onClick);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      className="glitter-cursor"
      ref={canvasRef}
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 90,
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  );
}
