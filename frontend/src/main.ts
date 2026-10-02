import * as THREE from "three";
import { createCamera, createControls, createRenderer, createScene } from "./scene";
import { addMilkyWay } from "./milkyway";
import { SkyRenderer } from "./sky";
import { searchObjects, type Star } from "./catalog";
import { PlanetLayer } from "./planets";
import type { ObserverState } from "./astronomy";

const app = document.querySelector("#app")!;
const renderer = createRenderer();
app.appendChild(renderer.domElement);

const scene = createScene();
const camera = createCamera();
const controls = createControls(camera, renderer.domElement);

addMilkyWay(scene);

const sky = new SkyRenderer(scene);
const planets = new PlanetLayer(scene);

const state = {
  date: new Date(),
  paused: false,
  timeRate: 1,
  grid: true,
  stars: true,
  planets: true,
  location: { lat: 0, lon: 0, height: 0 } as ObserverState,
  selected: null as Star | null
};

const hud = document.createElement("div");
hud.className = "hud";
hud.innerHTML = `
  <div class="topbar">
    <div class="brand"><span class="brand-mark">✦</span> InterStellar</div>
    <button class="icon-btn" id="settingsBtn">⚙</button>
  </div>

  <div class="search-wrap">
    <span>⌕</span>
    <input id="search" autocomplete="off" placeholder="Search stars, planets..." />
    <div id="results"></div>
  </div>

  <div class="readout" id="readout">
    <div class="eyebrow">SKY STREAM</div>
    <div class="big" id="skyTitle">Looking at the sky</div>
    <div id="skyMeta">Streaming only what the camera needs.</div>
  </div>

  <div class="bottom-panel">
    <div class="chips">
      <button class="chip active" id="starsBtn">★ Stars</button>
      <button class="chip active" id="planetsBtn">◉ Planets</button>
      <button class="chip active" id="gridBtn">⊞ Grid</button>
    </div>

    <div class="time-row">
      <button class="round" id="stepBack">−</button>
      <button class="time-display" id="pauseBtn">LIVE</button>
      <button class="round" id="stepForward">+</button>
      <select id="speed">
        <option value="1">1×</option>
        <option value="60">1 min/s</option>
        <option value="3600">1 h/s</option>
        <option value="86400">1 d/s</option>
        <option value="31557600">1 y/s</option>
      </select>
    </div>

    <div class="location-row">
      <button class="location-btn" id="locationBtn">⌖ Use my location</button>
      <span id="locationText">Observer: Earth · 0°, 0°</span>
    </div>
  </div>

  <div class="toast" id="toast"></div>
`;
document.body.appendChild(hud);

const searchInput = document.querySelector<HTMLInputElement>("#search")!;
const resultsEl = document.querySelector<HTMLDivElement>("#results")!;
const toast = document.querySelector<HTMLDivElement>("#toast")!;
const pauseBtn = document.querySelector<HTMLButtonElement>("#pauseBtn")!;
const speedSelect = document.querySelector<HTMLSelectElement>("#speed")!;
const skyMeta = document.querySelector<HTMLDivElement>("#skyMeta")!;
const locationText = document.querySelector<HTMLSpanElement>("#locationText")!;

function showToast(message: string) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function cameraRaDec() {
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
  let ra = THREE.MathUtils.radToDeg(Math.atan2(forward.z, forward.x));
  if (ra < 0) ra += 360;
  const dec = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(forward.y, -1, 1)));
  return { ra, dec };
}

function updateReadout() {
  const p = cameraRaDec();
  const fov = camera.fov;
  skyMeta.textContent = `RA ${p.ra.toFixed(1)}° · Dec ${p.dec.toFixed(1)}° · FOV ${fov.toFixed(1)}°`;
}

let lastPlanetFetch = 0;
async function refreshDynamicLayers() {
  if (state.planets && performance.now() - lastPlanetFetch > 2500) {
    lastPlanetFetch = performance.now();
    await planets.update(state.date, state.location);
  }
}

async function streamSky() {
  const { ra, dec } = cameraRaDec();
  await sky.update(ra, dec, camera.fov, state.stars);
  const counts = sky.counts();
  skyMeta.textContent = `${counts.loaded} tiles active · ${counts.cached} cached · RA ${ra.toFixed(1)}° · Dec ${dec.toFixed(1)}°`;
}

function resetSearch() {
  resultsEl.innerHTML = "";
  resultsEl.classList.remove("open");
}

searchInput.addEventListener("input", async () => {
  const q = searchInput.value.trim();
  if (q.length < 2) {
    resetSearch();
    return;
  }
  try {
    const results = await searchObjects(q);
    resultsEl.innerHTML = results.map(r => `
      <button class="result" data-id="${r.id}">
        <span class="result-name">${r.name ?? r.id}</span>
        <span class="result-meta">RA ${r.ra.toFixed(2)}° · Dec ${r.dec.toFixed(2)}° · mag ${r.mag.toFixed(2)}</span>
      </button>
    `).join("");
    resultsEl.classList.toggle("open", results.length > 0);

    resultsEl.querySelectorAll<HTMLButtonElement>(".result").forEach(btn => {
      btn.addEventListener("click", () => {
        const item = results.find(r => r.id === btn.dataset.id);
        if (!item) return;
        controls.target.copy(camera.position);
        camera.lookAt(new THREE.Vector3(0, 0, 0));
        const dir = equatorialToVector(item.ra, item.dec).normalize();
        camera.quaternion.setFromRotationMatrix(
          new THREE.Matrix4().lookAt(new THREE.Vector3(0, 0, 0), dir, new THREE.Vector3(0, 1, 0))
        );
        state.selected = item;
        document.querySelector<HTMLDivElement>("#skyTitle")!.textContent = item.name ?? item.id;
        resetSearch();
        searchInput.value = "";
        showToast(`Centered on ${item.name ?? item.id}`);
      });
    });
  } catch {
    showToast("Search is unavailable. Check the backend.");
  }
});

document.querySelector("#starsBtn")!.addEventListener("click", () => {
  state.stars = !state.stars;
  document.querySelector("#starsBtn")!.classList.toggle("active", state.stars);
  if (!state.stars) sky.clear();
  else void streamSky();
});

document.querySelector("#planetsBtn")!.addEventListener("click", () => {
  state.planets = !state.planets;
  planets.setVisible(state.planets);
  document.querySelector("#planetsBtn")!.classList.toggle("active", state.planets);
});

document.querySelector("#gridBtn")!.addEventListener("click", () => {
  state.grid = !state.grid;
  document.querySelector("#gridBtn")!.classList.toggle("active", state.grid);
  grid.visible = state.grid;
});

document.querySelector("#stepBack")!.addEventListener("click", () => {
  state.date = new Date(state.date.getTime() - 24 * 3600 * 1000);
  state.paused = true;
  pauseBtn.textContent = "▶";
  void refreshDynamicLayers();
});

document.querySelector("#stepForward")!.addEventListener("click", () => {
  state.date = new Date(state.date.getTime() + 24 * 3600 * 1000);
  state.paused = true;
  pauseBtn.textContent = "▶";
  void refreshDynamicLayers();
});

pauseBtn.addEventListener("click", () => {
  state.paused = !state.paused;
  pauseBtn.textContent = state.paused ? "▶" : "LIVE";
});

speedSelect.addEventListener("change", () => {
  state.timeRate = Number(speedSelect.value);
});

document.querySelector("#locationBtn")!.addEventListener("click", () => {
  if (!navigator.geolocation) {
    showToast("Location is not supported by this browser.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      state.location = {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        height: pos.coords.altitude ?? 0
      };
      locationText.textContent = `Observer: ${state.location.lat.toFixed(2)}°, ${state.location.lon.toFixed(2)}°`;
      showToast("Observer location updated.");
      void refreshDynamicLayers();
    },
    () => showToast("Location permission was not granted.")
  );
});

document.querySelector("#settingsBtn")!.addEventListener("click", () => {
  showToast("Settings panel is coming into the next UI pass.");
});

// Celestial grid: a subtle wire sphere.
const grid = new THREE.LineSegments(
  new THREE.WireframeGeometry(new THREE.SphereGeometry(79.5, 24, 12)),
  new THREE.LineBasicMaterial({ color: 0x31415c, transparent: true, opacity: 0.14 })
);
scene.add(grid);

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

let last = performance.now();
let streamCooldown = 0;
function frame(now: number) {
  requestAnimationFrame(frame);
  const dt = (now - last) / 1000;
  last = now;

  if (!state.paused) {
    state.date = new Date(state.date.getTime() + dt * state.timeRate * 1000);
  }

  controls.update();
  updateReadout();

  if (now > streamCooldown) {
    streamCooldown = now + 250;
    void streamSky();
  }

  void refreshDynamicLayers();
  renderer.render(scene, camera);
}

frame(performance.now());
