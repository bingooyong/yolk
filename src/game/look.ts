import * as THREE from "three";

let toon: THREE.CanvasTexture | null = null;
let glow: THREE.CanvasTexture | null = null;
let stripe: THREE.CanvasTexture | null = null;
let grid: THREE.CanvasTexture | null = null;
let crate: THREE.CanvasTexture | null = null;
let sky: THREE.CanvasTexture | null = null;

function canvasTex(
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void,
  nearest = false,
) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  if (nearest) {
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
  }
  t.needsUpdate = true;
  return t;
}

export function toonRamp() {
  if (toon) return toon;
  toon = canvasTex(
    5,
    1,
    (g, w, h) => {
      const stops = ["#2a2428", "#6a5a58", "#a89088", "#d8c4b8", "#fff6ee"];
      stops.forEach((c, i) => {
        g.fillStyle = c;
        g.fillRect(i, 0, 1, h);
      });
    },
    true,
  );
  toon.wrapS = THREE.ClampToEdgeWrapping;
  toon.wrapT = THREE.ClampToEdgeWrapping;
  return toon;
}

export function glowTex() {
  if (glow) return glow;
  glow = canvasTex(64, 64, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    grd.addColorStop(0, "rgba(255,220,160,0.95)");
    grd.addColorStop(0.35, "rgba(255,140,80,0.45)");
    grd.addColorStop(1, "rgba(255,80,40,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  });
  glow.wrapS = THREE.ClampToEdgeWrapping;
  glow.wrapT = THREE.ClampToEdgeWrapping;
  return glow;
}

export function stripeTex() {
  if (stripe) return stripe;
  stripe = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = "#E8D8FF";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#9B7ADF";
    g.lineWidth = 10;
    g.beginPath();
    for (let i = -h; i < w + h; i += 16) {
      g.moveTo(i, 0);
      g.lineTo(i + h, h);
    }
    g.stroke();
  });
  stripe.repeat.set(1, 1);
  stripe.generateMipmaps = true;
  stripe.minFilter = THREE.LinearMipmapLinearFilter;
  stripe.magFilter = THREE.LinearFilter;
  stripe.needsUpdate = true;
  return stripe;
}

export function gridTex() {
  if (grid) return grid;
  grid = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = "#1B4FD0";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#2A63F0";
    g.fillRect(2, 2, w - 4, h - 4);
    g.strokeStyle = "rgba(160,210,255,0.55)";
    g.lineWidth = 2;
    g.strokeRect(1, 1, w - 2, h - 2);
    g.fillStyle = "rgba(255,255,255,0.12)";
    g.fillRect(4, 4, w * 0.35, 6);
  });
  grid.repeat.set(8, 8);
  return grid;
}

export function crateTex() {
  if (crate) return crate;
  crate = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = "#F0C02A";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#E0A818";
    for (let i = 0; i < 4; i++) g.fillRect(0, 8 + i * 30, w, 18);
    g.strokeStyle = "#C48A10";
    g.lineWidth = 10;
    g.strokeRect(6, 6, w - 12, h - 12);
    g.beginPath();
    g.arc(w / 2, h / 2, 28, 0, Math.PI * 2);
    g.fillStyle = "#3AA0D8";
    g.fill();
    g.fillStyle = "#FFF8E8";
    g.font = "bold 22px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("蛋", w / 2, h / 2 + 1);
  });
  return crate;
}

export function skyTex() {
  if (sky) return sky;
  sky = canvasTex(8, 64, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "#8FD4F8");
    grd.addColorStop(0.45, "#B8E8FF");
    grd.addColorStop(1, "#F4FBFF");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  });
  sky.wrapS = THREE.ClampToEdgeWrapping;
  sky.wrapT = THREE.ClampToEdgeWrapping;
  return sky;
}
