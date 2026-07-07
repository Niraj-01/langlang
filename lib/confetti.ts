"use client";

// Tiny canvas confetti — no deps. burst() fires a one-shot burst.

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  size: number;
  color: string;
  life: number;
}

let canvas: HTMLCanvasElement | null = null;
let particles: Particle[] = [];
let raf = 0;

function ensureCanvas(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  if (canvas && document.body.contains(canvas)) return canvas;
  canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999";
  document.body.appendChild(canvas);
  return canvas;
}

function tick() {
  const c = canvas;
  if (!c) return;
  const dpr = window.devicePixelRatio || 1;
  if (c.width !== innerWidth * dpr) {
    c.width = innerWidth * dpr;
    c.height = innerHeight * dpr;
  }
  const g = c.getContext("2d")!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, innerWidth, innerHeight);

  particles = particles.filter((p) => p.life > 0 && p.y < innerHeight + 30);
  for (const p of particles) {
    p.vy += 0.35; // gravity
    p.vx *= 0.99;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vrot;
    p.life -= 1;
    g.save();
    g.translate(p.x, p.y);
    g.rotate(p.rot);
    g.globalAlpha = Math.min(1, p.life / 30);
    g.fillStyle = p.color;
    g.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    g.restore();
  }

  if (particles.length > 0) {
    raf = requestAnimationFrame(tick);
  } else {
    g.clearRect(0, 0, innerWidth, innerHeight);
    raf = 0;
  }
}

export function burst(
  x = innerWidth / 2,
  y = innerHeight / 2,
  colors: string[] = ["#ffd400", "#ff3b1f", "#4ade80", "#4da6ff", "#ffffff"],
  count = 60
) {
  if (!ensureCanvas()) return;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 9;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 0.4,
      size: 6 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 60 + Math.random() * 40,
    });
  }
  if (!raf) raf = requestAnimationFrame(tick);
}
