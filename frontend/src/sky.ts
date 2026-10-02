import * as THREE from "three";
import { equatorialToVector } from "./astronomy";
import { fetchTile, nearestTiles, tileKey, type Star, type Tile } from "./catalog";

export class SkyRenderer {
  readonly stars = new THREE.Group();
  private loaded = new Map<string, THREE.Points>();
  private loading = new Set<string>();
  private cache = new Map<string, Star[]>();
  private lastTarget = "";
  private colorScratch = new THREE.Color();

  constructor(private readonly scene: THREE.Scene) {
    scene.add(this.stars);
  }

  async update(raDeg: number, decDeg: number, fovDeg: number, enabled: boolean) {
    if (!enabled) return;

    const lod = fovDeg < 35 ? 2 : fovDeg < 75 ? 1 : 0;
    const magLimit = lod === 2 ? 10 : lod === 1 ? 8 : 6.5;
    const needed = nearestTiles(raDeg, decDeg, fovDeg, lod);
    const signature = needed.map(tileKey).sort().join(",");

    if (signature === this.lastTarget) return;
    this.lastTarget = signature;

    const neededKeys = new Set(needed.map(tileKey));

    // Stale tile eviction. Keep a tiny grace cache for fast camera movement.
    for (const [key, points] of this.loaded) {
      if (!neededKeys.has(key)) {
        this.stars.remove(points);
        points.geometry.dispose();
        (points.material as THREE.Material).dispose();
        this.loaded.delete(key);
      }
    }

    await Promise.all(needed.map(t => this.loadTile(t, magLimit)));
  }

  private async loadTile(tile: Tile, magLimit: number) {
    const key = tileKey(tile);
    if (this.loaded.has(key) || this.loading.has(key)) return;
    this.loading.add(key);

    try {
      const stars = this.cache.get(key) ?? await fetchTile(tile, magLimit);
      this.cache.set(key, stars);

      // If the tile became stale while downloading, don't attach it.
      const points = this.createPoints(stars);
      this.loaded.set(key, points);
      this.stars.add(points);
    } catch (e) {
      console.warn("Tile load failed", key, e);
    } finally {
      this.loading.delete(key);
    }
  }

  private createPoints(stars: Star[]) {
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];

    for (const s of stars) {
      const p = equatorialToVector(s.ra, s.dec);
      positions.push(p.x, p.y, p.z);

      this.colorScratch.setHex(s.color ?? 0xffffff);
      colors.push(this.colorScratch.r, this.colorScratch.g, this.colorScratch.b);

      sizes.push(Math.max(1.0, 4.5 - s.mag * 0.35));
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      uniforms: {
        pixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float pixelRatio;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          float perspective = 70.0 / max(1.0, -mvPosition.z);
          gl_PointSize = clamp(size * pixelRatio * 34.0 * perspective, 1.0, 14.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 p = gl_PointCoord - vec2(0.5);
          float d = length(p);
          if (d > 0.5) discard;
          float glow = pow(1.0 - d * 2.0, 2.2);
          gl_FragColor = vec4(vColor * (0.65 + glow * 0.8), glow);
        }
      `
    });

    return new THREE.Points(geometry, material);
  }

  clear() {
    for (const points of this.loaded.values()) {
      this.stars.remove(points);
      points.geometry.dispose();
      (points.material as THREE.Material).dispose();
    }
    this.loaded.clear();
    this.lastTarget = "";
  }

  counts() {
    return { loaded: this.loaded.size, cached: this.cache.size };
  }
}
