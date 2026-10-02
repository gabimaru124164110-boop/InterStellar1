import cors from "cors";
import express from "express";
import cors from "cors";
import * as Astronomy from "astronomy-engine";
import { config } from "./config.js";
import { getTile, initCatalog, searchStars } from "./catalog.js";
import { observerFrom, planetSnapshot } from "./planets.js";

const app = express();
app.use(cors());
app.disable("x-powered-by");
app.use(cors());
app.use(express.json());

await initCatalog();

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "interstellar-backend",
    version: "0.2.0",
    tileScheme: "rectangular-ra-dec-v1"
  });
});

app.get("/api/sky/tiles", async (req, res) => {
  const x = Number(req.query.x);
  const y = Number(req.query.y);
  const lod = Number(req.query.lod ?? 0);
  const mag = Number(req.query.mag ?? config.defaultMagLimit);

  if (![x, y, lod, mag].every(Number.isFinite)) {
    return res.status(400).json({ error: "Invalid tile parameters." });
  }

  if (x < 0 || x >= config.raTiles || y < 0 || y >= config.decTiles || lod < 0 || lod > 3) {
    return res.status(400).json({ error: "Tile outside configured limits." });
  }

  const stars = await getTile(Math.floor(x), Math.floor(y), Math.floor(lod), mag);

  res.setHeader("Cache-Control", "public, max-age=86400, immutable");
  res.json({
    tile: { x: Math.floor(x), y: Math.floor(y), lod: Math.floor(lod) },
    magLimit: mag,
    stars
  });
});

app.get("/api/search", async (req, res) => {
  const q = String(req.query.q ?? "");
  res.json({ results: await searchStars(q) });
});

app.get("/api/planets", (req, res) => {
  const timestamp = String(req.query.time ?? new Date().toISOString());
  const lat = Number(req.query.lat ?? 0);
  const lon = Number(req.query.lon ?? 0);
  const height = Number(req.query.height ?? 0);
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime()) || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: "Invalid time or observer coordinates." });
  }

  const observer = observerFrom(lat, lon, height);

  // Sun and Moon are useful even when the full planet set isn't being displayed.
  const sunEq = Astronomy.Equator(Astronomy.Body.Sun, date, observer, true, true);
  const moonEq = Astronomy.Equator(Astronomy.Body.Moon, date, observer, true, true);

  res.json({
    time: date.toISOString(),
    observer: { lat, lon, height },
    sun: { ra: sunEq.ra * 15, dec: sunEq.dec },
    moon: { ra: moonEq.ra * 15, dec: moonEq.dec },
    planets: planetSnapshot(date, observer)
  });
});

app.listen(config.port, "0.0.0.0", () => {
  console.log(`InterStellar backend: http://localhost:${config.port}`);
});
