import type { Config, Context } from "@netlify/functions";
import fs from "node:fs/promises";
import path from "node:path";

let namedStars: Array<{ id: string; name?: string; ra: number; dec: number; mag: number; color?: number }> = [];

async function getStars() {
  if (namedStars.length) return namedStars;
  try {
    const filePath = path.resolve("public/data/named-stars.json");
    const content = await fs.readFile(filePath, "utf8");
    namedStars = JSON.parse(content);
  } catch {
    namedStars = [];
  }
  return namedStars;
}

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  if (!q) {
    return Response.json({ results: [] });
  }

  const stars = await getStars();
  const results = stars
    .filter(s => (s.name ?? "").toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
    .slice(0, 20);

  return Response.json({ results });
};

export const config: Config = {
  path: "/api/search"
};
