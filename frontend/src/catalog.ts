import { getSolarSystemSnapshot, planetRaDec, type SolarSystemSnapshot } from "./astronomy";

export type Star = {
  id: string;
  name?: string;
  ra: number;
  dec: number;
  mag: number;
  color?: number;
};

export type Tile = { x: number; y: number; lod: number };

const API = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/+$/, "") : null;
const RA_TILES = 18;
const DEC_TILES = 9;

export function tileKey(t: Tile) {
  return `${t.lod}/${t.x}/${t.y}`;
}

export function tileForRa(ra: number) {
  return Math.max(0, Math.min(RA_TILES - 1, Math.floor((((ra % 360) + 360) % 360) / 360 * RA_TILES)));
}

export function tileForDec(dec: number) {
  return Math.max(0, Math.min(DEC_TILES - 1, Math.floor((dec + 90) / 180 * DEC_TILES)));
}

export function nearestTiles(raDeg: number, decDeg: number, fovDeg: number, lod: number): Tile[] {
  const raSpan = Math.max(8, fovDeg * 1.25);
  const decSpan = Math.max(8, fovDeg * 0.9);
  const raStep = 360 / RA_TILES;
  const decStep = 180 / DEC_TILES;
  const raCount = Math.ceil(raSpan / raStep) + 2;
  const decCount = Math.ceil(decSpan / decStep) + 2;
  const cx = tileForRa(raDeg);
  const cy = tileForDec(decDeg);
  const out: Tile[] = [];

  for (let dx = -raCount; dx <= raCount; dx++) {
    const x = (cx + dx + RA_TILES) % RA_TILES;
    for (let dy = -decCount; dy <= decCount; dy++) {
      const y = cy + dy;
      if (y < 0 || y >= DEC_TILES) continue;
      out.push({ x, y, lod });
    }
  }
  return out;
}

export async function fetchTile(tile: Tile, magLimit: number): Promise<Star[]> {
  // If a custom API URL is provided, attempt to fetch from it first
  if (API) {
    try {
      const url = new URL(`${API}/api/sky/tiles`);
      url.searchParams.set("x", String(tile.x));
      url.searchParams.set("y", String(tile.y));
      url.searchParams.set("lod", String(tile.lod));
      url.searchParams.set("mag", String(magLimit));

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json() as { stars: Star[] };
        return data.stars;
      }
    } catch {
      // Fall through to static asset loading
    }
  }

  // Fallback to static tile files served directly by the CDN
  // Fall back to lod0 if higher LOD is not found
  try {
    const res = await fetch(`/data/tiles/lod0-${tile.x}-${tile.y}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawStars = await res.json() as Star[];
    return rawStars.filter(s => s.mag <= magLimit);
  } catch (err) {
    console.warn(`Tile load failed for ${tile.x},${tile.y}`, err);
    return [];
  }
}

let cachedNamedStars: Star[] | null = null;
const PLANET_SEARCH_LIST = [
  { id: "planet-mercury", name: "Mercury", color: 0x9e9286, mag: -0.2 },
  { id: "planet-venus", name: "Venus", color: 0xd6bd8c, mag: -4.4 },
  { id: "planet-mars", name: "Mars", color: 0xc35b3a, mag: -1.0 },
  { id: "planet-jupiter", name: "Jupiter", color: 0xd8b27e, mag: -2.5 },
  { id: "planet-saturn", name: "Saturn", color: 0xcfc28a, mag: 0.5 },
  { id: "planet-uranus", name: "Uranus", color: 0x87cdd1, mag: 5.7 },
  { id: "planet-neptune", name: "Neptune", color: 0x4774d6, mag: 7.8 }
];

async function loadNamedStars(): Promise<Star[]> {
  if (cachedNamedStars) return cachedNamedStars;
  try {
    const res = await fetch("/data/named-stars.json");
    if (res.ok) {
      cachedNamedStars = await res.json() as Star[];
      return cachedNamedStars;
    }
  } catch {
    // If static fetch fails, return empty
  }
  return [];
}

export async function searchObjects(q: string): Promise<Star[]> {
  const query = q.trim().toLowerCase();
  if (!query) return [];

  // Search planets first
  const planetHits: Star[] = [];
  const now = new Date();
  for (const p of PLANET_SEARCH_LIST) {
    if (p.name.toLowerCase().includes(query)) {
      const coords = planetRaDec(p.name, now);
      planetHits.push({
        id: p.id,
        name: `${p.name} (Planet)`,
        ra: coords.ra,
        dec: coords.dec,
        mag: p.mag,
        color: p.color
      });
    }
  }

  // If a custom API URL is provided, attempt remote search
  if (API) {
    try {
      const url = new URL(`${API}/api/search`);
      url.searchParams.set("q", query);
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json() as { results: Star[] };
        return [...planetHits, ...(data.results ?? [])];
      }
    } catch {
      // Fall through to local named stars index
    }
  }

  // Search local named stars catalog
  const named = await loadNamedStars();
  const starHits = named.filter(
    s => (s.name ?? "").toLowerCase().includes(query) || s.id.toLowerCase().includes(query)
  );

  return [...planetHits, ...starHits].slice(0, 20);
}

export async function fetchPlanets(
  date: Date,
  lat: number,
  lon: number,
  height: number
): Promise<SolarSystemSnapshot> {
  // If a custom API URL is provided, attempt remote request
  if (API) {
    try {
      const url = new URL(`${API}/api/planets`);
      url.searchParams.set("time", date.toISOString());
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lon", String(lon));
      url.searchParams.set("height", String(height));
      const response = await fetch(url);
      if (response.ok) {
        return await response.json() as SolarSystemSnapshot;
      }
    } catch {
      // Fall back to local calculation
    }
  }

  // Local calculation using astronomy-engine
  return getSolarSystemSnapshot(date, { lat, lon, height });
}
