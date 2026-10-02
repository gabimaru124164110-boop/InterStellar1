import * as THREE from "three";
import { fetchPlanets } from "./catalog";
import type { ObserverState } from "./astronomy";
import { equatorialToVector } from "./astronomy";

const COLORS: Record<string, number> = {
  Mercury: 0x9e9286,
  Venus: 0xd6bd8c,
  Mars: 0xc35b3a,
  Jupiter: 0xd8b27e,
  Saturn: 0xcfc28a,
  Uranus: 0x87cdd1,
  Neptune: 0x4774d6
};

export class PlanetLayer {
  private group = new THREE.Group();
  private meshes = new Map<string, THREE.Mesh>();

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
  }

  async update(date: Date, observer: ObserverState) {
    const snapshot = await fetchPlanets(date, observer.lat, observer.lon, observer.height);

    for (const p of snapshot.planets) {
      let mesh = this.meshes.get(p.name);
      if (!mesh) {
        const geometry = new THREE.SphereGeometry(0.23, 24, 16);
        const material = new THREE.MeshStandardMaterial({
          color: COLORS[p.name] ?? 0xffffff,
          roughness: 0.7,
          metalness: 0
        });
        mesh = new THREE.Mesh(geometry, material);
        this.group.add(mesh);
        this.meshes.set(p.name, mesh);
      }

      mesh.position.copy(equatorialToVector(p.ra, p.dec, 75));
      const scale = THREE.MathUtils.clamp(1.0 + 0.9 * Math.max(0, -p.angularDiameterArcsec), 1, 8);
      mesh.scale.setScalar(scale);
      mesh.userData.planet = p.name;
    }
  }

  setVisible(v: boolean) {
    this.group.visible = v;
  }
}
