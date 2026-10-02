export type Star = {
  id: string;
  name?: string;
  ra: number;          // degrees, J2000
  dec: number;         // degrees, J2000
  mag: number;         // visual magnitude
  color?: number;      // RGB packed integer, e.g. 0xffffff
};

export type SkyTile = {
  x: number;
  y: number;
  lod: number;
  stars: Star[];
};

export type PlanetSnapshot = {
  name: string;
  ra: number;
  dec: number;
  distanceAu: number;
  angularDiameterArcsec: number;
  phase: number;
};
