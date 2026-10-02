import * as THREE from "three";

const DEFAULT_NASA_PREVIEW =
  "https://svs.gsfc.nasa.gov/vis/a000000/a004800/a004851/milkyway_2020_4k_print.jpg";

function createProceduralMilkyWayTexture(): THREE.CanvasTexture {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  // Deep space base gradient
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#010206");
  bg.addColorStop(0.3, "#030614");
  bg.addColorStop(0.5, "#080d22");
  bg.addColorStop(0.7, "#030614");
  bg.addColorStop(1, "#010206");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Milky Way band - sinusoidal across equirectangular projection
  const clouds = [
    { color: "rgba(100, 130, 210, 0.08)", radius: 180 },
    { color: "rgba(160, 120, 220, 0.07)", radius: 130 },
    { color: "rgba(230, 200, 160, 0.10)", radius: 80 }
  ];

  for (let i = 0; i < width; i += 12) {
    const angle = (i / width) * Math.PI * 2;
    // Tilted galactic plane
    const midY = (Math.sin(angle + 0.6) * 0.22 + 0.5) * height;

    for (const cloud of clouds) {
      const grad = ctx.createRadialGradient(i, midY, 5, i, midY, cloud.radius);
      grad.addColorStop(0, cloud.color);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(i, midY, cloud.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Galactic core bright spot (around Sagittarius: RA ~ 266 deg, Dec -29 deg)
  const coreX = (266 / 360) * width;
  const coreY = ((-29 + 90) / 180) * height;
  const coreGrad = ctx.createRadialGradient(coreX, coreY, 10, coreX, coreY, 260);
  coreGrad.addColorStop(0, "rgba(255, 230, 190, 0.32)");
  coreGrad.addColorStop(0.3, "rgba(220, 170, 140, 0.20)");
  coreGrad.addColorStop(0.6, "rgba(130, 110, 190, 0.10)");
  coreGrad.addColorStop(1, "transparent");
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(coreX, coreY, 260, 0, Math.PI * 2);
  ctx.fill();

  // Subtle stardust
  for (let s = 0; s < 1200; s++) {
    const sx = Math.random() * width;
    const sy = Math.random() * height;
    const alpha = Math.random() * 0.5 + 0.2;
    const r = Math.random() * 1.1;
    ctx.fillStyle = `rgba(230, 240, 255, ${alpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function addMilkyWay(scene: THREE.Scene) {
  const initialTexture = createProceduralMilkyWayTexture();

  const geometry = new THREE.SphereGeometry(95, 96, 48);
  const material = new THREE.MeshBasicMaterial({
    map: initialTexture,
    side: THREE.BackSide,
    transparent: false,
    depthWrite: false
  });

  const sphere = new THREE.Mesh(geometry, material);
  sphere.renderOrder = -10;
  scene.add(sphere);

  const url = import.meta.env.VITE_MILKYWAY_URL ?? DEFAULT_NASA_PREVIEW;
  if (url) {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      url,
      t => {
        t.colorSpace = THREE.SRGBColorSpace;
        material.map = t;
        material.needsUpdate = true;
      },
      undefined,
      () => {
        // Procedural sky remains active
      }
    );
  }

  return sphere;
}
