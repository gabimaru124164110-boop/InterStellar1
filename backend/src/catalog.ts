import fs from "node:fs/promises";
import path from "node:path";
import { config, tileForRaDec } from "./config.js";
import type { Star } from "./types.js";

const tileDir = path.resolve("data/tiles");
const namedPath = path.resolve("data/named-stars.json");

let namedStars: Star[] = [];

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export async function initCatalog() {
  namedStars = await readJson<Star[]>(namedPath, []);
}

export async function getTile(x: number, y: number, lod: number, magLimit: number): Promise<Star[]> {
  const direct = path.join(tileDir, `lod${lod}-${x}-${y}.json`);
  const fallback = path.join(tileDir, `lod0-${x}-${y}.json`);
  const source = await readJson<Star[]>(direct, await readJson<Star[]>(fallback, []));

  return source.filter(s => s.mag <= magLimit);
}

export async function searchStars(query: string, limit = 20): Promise<Star[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  // Search a compact named-star index rather than scanning render tiles.
  const hits = namedStars
    .filter(s => (s.name ?? "").toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
    .slice(0, limit);

  return hits;
}

export { tileForRaDec, config };
