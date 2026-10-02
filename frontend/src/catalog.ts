export type Star = {
  id: string;
  name?: string;
  ra: number;
  dec: number;
  mag: number;
  color?: number;
};

export type Tile = { x: number; y: number; lod: number };

const API = import.meta.env.VITE_API_URL ?? "https://interstellar-backend-2jjv.onrender.com";
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
  const url = new URL(`${API}/api/sky/tiles`);
  url.searchParams.set("x", String(tile.x));
  url.searchParams.set("y", String(tile.y));
  url.searchParams.set("lod", String(tile.lod));
  url.searchParams.set("mag", String(magLimit));

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Tile HTTP ${response.status}`);
  const data = await response.json() as { stars: Star[] };
  return data.stars;
}

export async function searchObjects(q: string): Promise<Star[]> {
  const url = new URL(`${API}/api/search`);
  url.searchParams.set("q", q);
  const response = await fetch(url);
  if (!response.ok) throw new Error("Search failed");
  return (await response.json() as { results: Star[] }).results;
}

export async function fetchPlanets(date: Date, lat: number, lon: number, height: number) {
  const url = new URL(`${API}/api/planets`);
  url.searchParams.set("time", date.toISOString());
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("height", String(height));
  const response = await fetch(url);
  if (!response.ok) throw new Error("Planet request failed");
  return await response.json() as any;
}
// Deploy trigger
// Deploy trigger
