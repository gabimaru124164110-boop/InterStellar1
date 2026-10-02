import type { Config, Context } from "@netlify/functions";
import Astronomy, { Body, Observer, EquatorFromVector, GeoVector } from "astronomy-engine";

const bodies: Array<[string, Body]> = [
  ["Mercury", Body.Mercury],
  ["Venus", Body.Venus],
  ["Mars", Body.Mars],
  ["Jupiter", Body.Jupiter],
  ["Saturn", Body.Saturn],
  ["Uranus", Body.Uranus],
  ["Neptune", Body.Neptune]
];

const kmDiameter: Record<string, number> = {
  Mercury: 4879,
  Venus: 12104,
  Mars: 6779,
  Jupiter: 139820,
  Saturn: 116460,
  Uranus: 50724,
  Neptune: 49244
};

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const timestamp = url.searchParams.get("time") ?? new Date().toISOString();
  const lat = Number(url.searchParams.get("lat") ?? 0);
  const lon = Number(url.searchParams.get("lon") ?? 0);
  const height = Number(url.searchParams.get("height") ?? 0);
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime()) || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return Response.json({ error: "Invalid time or observer coordinates." }, { status: 400 });
  }

  const observer = new Observer(lat, lon, height);
  const time = Astronomy.MakeTime(date);

  const planets = bodies.map(([name, body]) => {
    const vector = GeoVector(body, time, true);
    const equ = EquatorFromVector(vector);
    const ra = equ.ra * 15;
    const dec = equ.dec;
    const distanceAu = vector.Length();
    const angularDiameterArcsec = 206265 * (kmDiameter[name] / 149597870.7) / distanceAu;
    return {
      name,
      ra,
      dec,
      distanceAu,
      angularDiameterArcsec,
      phase: 1
    };
  });

  const sunEq = Astronomy.Equator(Astronomy.Body.Sun, date, observer, true, true);
  const moonEq = Astronomy.Equator(Astronomy.Body.Moon, date, observer, true, true);

  return Response.json({
    time: date.toISOString(),
    observer: { lat, lon, height },
    sun: { ra: sunEq.ra * 15, dec: sunEq.dec },
    moon: { ra: moonEq.ra * 15, dec: moonEq.dec },
    planets
  });
};

export const config: Config = {
  path: "/api/planets"
};
