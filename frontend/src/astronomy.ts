import * as Astronomy from "astronomy-engine";
import * as THREE from "three";

export type ObserverState = {
  lat: number;
  lon: number;
  height: number;
};

export const BODY_NAMES = [
  "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"
] as const;

const bodyMap: Record<string, Astronomy.Body> = {
  Mercury: Astronomy.Body.Mercury,
  Venus: Astronomy.Body.Venus,
  Mars: Astronomy.Body.Mars,
  Jupiter: Astronomy.Body.Jupiter,
  Saturn: Astronomy.Body.Saturn,
  Uranus: Astronomy.Body.Uranus,
  Neptune: Astronomy.Body.Neptune
};

export function observerFromState(o: ObserverState) {
  return new Astronomy.Observer(o.lat, o.lon, o.height);
}

export function planetRaDec(name: string, date: Date) {
  const body = bodyMap[name];
  const observer = observerFromState({ lat: 0, lon: 0, height: 0 });
  const eq = Astronomy.Equator(body, date, observer, true, true);
  return { ra: eq.ra * 15, dec: eq.dec };
}

export function equatorialToVector(raDeg: number, decDeg: number, radius = 80) {
  const ra = THREE.MathUtils.degToRad(raDeg);
  const dec = THREE.MathUtils.degToRad(decDeg);
  return new THREE.Vector3(
    radius * Math.cos(dec) * Math.cos(ra),
    radius * Math.sin(dec),
    radius * Math.cos(dec) * Math.sin(ra)
  );
}

export function localSiderealTime(date: Date, lonDeg: number): number {
  const jd = Astronomy.MakeTime(date).ut;
  const d = jd - 2451545.0;
  const gmst = (280.46061837 + 360.98564736629 * d) % 360;
  return (gmst + lonDeg + 360) % 360;
}

export function altitudeAzimuth(
  raDeg: number, decDeg: number, date: Date, observer: ObserverState
) {
  const obs = observerFromState(observer);
  const eq = Astronomy.EquatorFromVector(
    Astronomy.GeoVector(Astronomy.Body.Sun, Astronomy.MakeTime(date), true)
  );
  void obs; void eq;
  const lst = localSiderealTime(date, observer.lon);
  const ha = THREE.MathUtils.degToRad(((lst - raDeg + 540) % 360) - 180);
  const dec = THREE.MathUtils.degToRad(decDeg);
  const lat = THREE.MathUtils.degToRad(observer.lat);

  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
  const alt = Math.asin(sinAlt);
  const az = Math.atan2(
    -Math.sin(ha) * Math.cos(dec),
    Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(ha)
  );

  return {
    altitudeDeg: THREE.MathUtils.radToDeg(alt),
    azimuthDeg: (THREE.MathUtils.radToDeg(az) + 360) % 360
  };
}
