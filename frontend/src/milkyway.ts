import * as THREE from "three";

const DEFAULT_NASA_PREVIEW =
  "https://svs.gsfc.nasa.gov/vis/a000000/a004800/a004851/milkyway_2020_4k_print.jpg";

export function addMilkyWay(scene: THREE.Scene) {
  const url = import.meta.env.VITE_MILKYWAY_URL ?? DEFAULT_NASA_PREVIEW;

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");

  const texture = loader.load(
    url,
    t => {
      t.colorSpace = THREE.SRGBColorSpace;
    },
    undefined,
    err => console.warn("Milky Way texture could not be loaded; procedural sky remains active.", err)
  );

  const geometry = new THREE.SphereGeometry(95, 96, 48);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide,
    transparent: false,
    depthWrite: false
  });

  const sphere = new THREE.Mesh(geometry, material);
  sphere.renderOrder = -10;
  scene.add(sphere);
  return sphere;
}
