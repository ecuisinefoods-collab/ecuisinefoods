export type DeliveryCoverageGeoJSON = {
  type: "Polygon";
  coordinates: number[][][];
};

export function isPointInsideDeliveryCoverage(
  longitude: number,
  latitude: number,
  coverage: DeliveryCoverageGeoJSON | null | undefined,
): boolean {
  const ring = coverage?.coordinates?.[0];
  if (!coverage || coverage.type !== "Polygon" || !Array.isArray(ring) || ring.length < 4) return false;
  let inside = false;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) return false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[j];
    const b = ring[i];
    if (!a || !b || !Number.isFinite(a[0]) || !Number.isFinite(a[1]) || !Number.isFinite(b[0]) || !Number.isFinite(b[1])) return false;
    const [x1, y1] = a;
    const [x2, y2] = b;
    const cross = (longitude - x1) * (y2 - y1) - (latitude - y1) * (x2 - x1);
    if (Math.abs(cross) < 1e-10
      && longitude >= Math.min(x1, x2) && longitude <= Math.max(x1, x2)
      && latitude >= Math.min(y1, y2) && latitude <= Math.max(y1, y2)) return true;
    const intersects = (y1 > latitude) !== (y2 > latitude)
      && longitude < ((x2 - x1) * (latitude - y1)) / (y2 - y1) + x1;
    if (intersects) inside = !inside;
  }
  return inside;
}
