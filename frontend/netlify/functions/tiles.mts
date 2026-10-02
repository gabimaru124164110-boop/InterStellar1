import type { Config, Context } from "@netlify/functions";
import fs from "node:fs/promises";
import path from "node:path";

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const x = Number(url.searchParams.get("x"));
  const y = Number(url.searchParams.get("y"));
  const lod = Number(url.searchParams.get("lod") ?? 0);
  const mag = Number(url.searchParams.get("mag") ?? 8);

  if (![x, y, lod, mag].every(Number.isFinite)) {
    return Response.json({ error: "Invalid tile parameters." }, { status: 400 });
  }

  const tileX = Math.floor(x);
  const tileY = Math.floor(y);
  const tileLod = Math.floor(lod);

  let stars: Array<{ id: string; ra: number; dec: number; mag: number }> = [];
  try {
    const tilePath = path.resolve(`public/data/tiles/lod0-${tileX}-${tileY}.json`);
    const content = await fs.readFile(tilePath, "utf8");
    const raw = JSON.parse(content);
    stars = raw.filter((s: { mag: number }) => s.mag <= mag);
  } catch {
    stars = [];
  }

  return Response.json(
    {
      tile: { x: tileX, y: tileY, lod: tileLod },
      magLimit: mag,
      stars
    },
    {
      headers: {
        "Cache-Control": "public, max-age=86400, immutable"
      }
    }
  );
};

export const config: Config = {
  path: "/api/sky/tiles"
};
