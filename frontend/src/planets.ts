import * as THREE from "three";
import { fetchPlanets } from "./catalog";
import type { ObserverState } from "./astronomy";
import { equatorialToVector } from "./astronomy";

const COLORS: Record<string, number> = {
  Mercury: 0xa89f91,
  Venus: 0xecdca8,
  Mars: 0xe06b4b,
  Jupiter: 0xe5bf8c,
  Saturn: 0xdfd4a0,
  Uranus: 0x93e1e8,
  Neptune: 0x5a8aee
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
        const geometry = new THREE.SphereGeometry(0.28, 24, 16);
        const material = new THREE.MeshStandardMaterial({
          color: COLORS[p.name] ?? 0xffffff,
          emissive: COLORS[p.name] ?? 0xffffff,
          emissiveIntensity: 0.45,
          roughness: 0.4,
          metalness: 0.1
        });
        mesh = new THREE.Mesh(geometry, material);

        if (p.name === "Saturn") {
          const ringGeo = new THREE.RingGeometry(0.35, 0.7, 32);
          const ringMat = new THREE.MeshBasicMaterial({
            color: 0xcfc28a,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.75
          });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.rotation.x = Math.PI / 2.3;
          mesh.add(ring);
        }

        this.group.add(mesh);
        this.meshes.set(p.name, mesh);
      }

      mesh.position.copy(equatorialToVector(p.ra, p.dec, 75));
      const scale = THREE.MathUtils.clamp(1.2 + Math.max(0, p.angularDiameterArcsec) / 10, 1.2, 6.0);
      mesh.scale.setScalar(scale);
      mesh.userData.planet = p.name;
    }

    if (snapshot.sun) {
      let sunMesh = this.meshes.get("Sun");
      if (!sunMesh) {
        const geo = new THREE.SphereGeometry(0.55, 24, 16);
        const mat = new THREE.MeshBasicMaterial({ color: 0xfff0b3 });
        sunMesh = new THREE.Mesh(geo, mat);
        sunMesh.userData.planet = "Sun";
        this.group.add(sunMesh);
        this.meshes.set("Sun", sunMesh);
      }
      sunMesh.position.copy(equatorialToVector(snapshot.sun.ra, snapshot.sun.dec, 75));
    }

    if (snapshot.moon) {
      let moonMesh = this.meshes.get("Moon");
      if (!moonMesh) {
        const geo = new THREE.SphereGeometry(0.38, 24, 16);
        const mat = new THREE.MeshBasicMaterial({ color: 0xdee6f7 });
        moonMesh = new THREE.Mesh(geo, mat);
        moonMesh.userData.planet = "Moon";
        this.group.add(moonMesh);
        this.meshes.set("Moon", moonMesh);
      }
      moonMesh.position.copy(equatorialToVector(snapshot.moon.ra, snapshot.moon.dec, 75));
    }
  }

  setVisible(v: boolean) {
    this.group.visible = v;
  }
}
