import fs from "node:fs/promises";
import path from "node:path";
import https from "node:https";
import { tileForRaDec, config } from "../src/config.js";
import type { Star } from "../src/types.js";

const url = process.env.HYG_SOURCE_URL ??
  "https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv";

const dataDir = path.resolve("data");
const tileDir = path.join(dataDir, "tiles");

function download(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, response => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return download(response.headers.location).then(resolve, reject);
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Download failed: HTTP ${response.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      response.on("data", c => chunks.push(Buffer.from(c)));
      response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      response.on("error", reject);
    }).on("error", reject);
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') quoted = !quoted;
    else if (c === "," && !quoted) {
      out.push(current);
      current = "";
    } else current += c;
  }
  out.push(current);
  return out;
}

const csv = await download(url);
const lines = csv.split(/\r?\n/);
const header = splitCsvLine(lines.shift() ?? "");
const index = new Map(header.map((h, i) => [h.replace(/^"|"$/g, ""), i]));

const tiles = new Map<string, Star[]>();
const named = new Map<string, Star>();

for (const line of lines) {
  if (!line.trim()) continue;
  const row = splitCsvLine(line);
  const ra = Number(row[index.get("ra") ?? -1]);
  const dec = Number(row[index.get("dec") ?? -1]);
  const mag = Number(row[index.get("mag") ?? -1]);
  const id = row[index.get("id") ?? -1];
  const name = row[index.get("proper") ?? -1]?.replace(/^"|"$/g, "") || undefined;

  if (!Number.isFinite(ra) || !Number.isFinite(dec) || !Number.isFinite(mag) || mag > 8.0) continue;

  const star: Star = { id: String(id), ra, dec, mag, name };
  const { x, y } = tileForRaDec(ra, dec);
  const key = `${x}-${y}`;
  if (!tiles.has(key)) tiles.set(key, []);
  tiles.get(key)!.push(star);

  if (name) named.set(name.toLowerCase(), star);
}

await fs.rm(tileDir, { recursive: true, force: true });
await fs.mkdir(tileDir, { recursive: true });

for (const [key, stars] of tiles) {
  await fs.writeFile(path.join(tileDir, `lod0-${key}.json`), JSON.stringify(stars));
}

const outputNamed = [...named.values()].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
await fs.writeFile(path.join(dataDir, "named-stars.json"), JSON.stringify(outputNamed, null, 2));

console.log(`Imported ${tiles.size} tiles and ${outputNamed.length} named stars.`);
