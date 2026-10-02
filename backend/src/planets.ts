import Astronomy, { Body, Observer, EquatorFromVector, GeoVector } from "astronomy-engine";
import type { PlanetSnapshot } from "./types.js";

const bodies: Array<[string, Body]> = [
  ["Mercury", Body.Mercury],
  ["Venus", Body.Venus],
  ["Mars", Body.Mars],
  ["Jupiter", Body.Jupiter],
  ["Saturn", Body.Saturn],
  ["Uranus", Body.Uranus],
  ["Neptune", Body.Neptune]
];

export function planetSnapshot(date: Date, observer: Observer): PlanetSnapshot[] {
  const result: PlanetSnapshot[] = [];

  for (const [name, body] of bodies) {
    const time = Astronomy.MakeTime(date);
    const vector = GeoVector(body, time, true);
    const equ = EquatorFromVector(vector);
    const hours = equ.ra;
    const ra = hours * 15;
    const dec = equ.dec;
    const distanceAu = vector.Length();
    // A visual angular diameter approximation from nominal mean diameters.
    const kmDiameter: Record<string, number> = {
      Mercury: 4879, Venus: 12104, Mars: 6779, Jupiter: 139820,
      Saturn: 116460, Uranus: 50724, Neptune: 49244
    };
    const angularDiameterArcsec = 206265 * (kmDiameter[name] / 149597870.7) / distanceAu;
    result.push({
      name,
      ra,
      dec,
      distanceAu,
      angularDiameterArcsec,
      phase: 1
    });
  }

  return result;
}

export function observerFrom(lat: number, lon: number, heightMeters = 0): Observer {
  return new Observer(lat, lon, heightMeters);
}
