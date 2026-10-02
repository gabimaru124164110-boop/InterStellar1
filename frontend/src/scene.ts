import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export function createRenderer() {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02040b);

  const ambient = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(0, 1, 0);
  scene.add(dirLight);

  return scene;
}

export function createCamera() {
  return new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.01, 300);
}

export function createControls(camera: THREE.Camera, dom: HTMLElement) {
  const controls = new OrbitControls(camera, dom);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.rotateSpeed = -0.28;
  controls.zoomSpeed = 0.6;
  controls.minDistance = 0.01;
  controls.maxDistance = 0.01;
  controls.target.set(0, 0, 0);
  camera.position.set(0, 0, 0.01);
  return controls;
}
