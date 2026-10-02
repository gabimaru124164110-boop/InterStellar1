export const config = {
  port: Number(process.env.PORT ?? 8787),
  raTiles: Number(process.env.TILE_RA_COUNT ?? 18),
  decTiles: Number(process.env.TILE_DEC_COUNT ?? 9),
  defaultMagLimit: Number(process.env.DEFAULT_MAG_LIMIT ?? 7.5)
};

export function normalizeRa(ra: number): number {
  const x = ra % 360;
  return x < 0 ? x + 360 : x;
}

export function tileForRaDec(ra: number, dec: number, raTiles = config.raTiles, decTiles = config.decTiles) {
  const x = Math.min(raTiles - 1, Math.max(0, Math.floor(normalizeRa(ra) / 360 * raTiles)));
  const y = Math.min(decTiles - 1, Math.max(0, Math.floor((dec + 90) / 180 * decTiles)));
  return { x, y };
}

export function tileBounds(x: number, y: number, raTiles = config.raTiles, decTiles = config.decTiles) {
  return {
    raMin: x * 360 / raTiles,
    raMax: (x + 1) * 360 / raTiles,
    decMin: -90 + y * 180 / decTiles,
    decMax: -90 + (y + 1) * 180 / decTiles
  };
}
