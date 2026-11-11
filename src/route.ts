import type { Pt } from './coach.ts';

export type Route = { meters: number; line: Pt[] };

const M_PER_DEG = 111320;
const offset = (p: Pt, east: number, north: number): Pt => ({
  latitude: p.latitude + north / M_PER_DEG,
  longitude: p.longitude + east / (M_PER_DEG * Math.cos((p.latitude * Math.PI) / 180)),
});

// Start -> two points -> start, on a circle passing through start. Roads wind, so the circle
// is sized for a path ~1.3x shorter than the target; generateLoop corrects with `scale`.
export function loopWaypoints(start: Pt, km: number, bearing: number, scale = 1): Pt[] {
  const r = ((km * 1000) / (2 * Math.PI * 1.3)) * scale;
  const center = offset(start, r * Math.sin(bearing), r * Math.cos(bearing));
  const at = (a: number) => offset(center, r * Math.sin(a), r * Math.cos(a));
  const back = bearing + Math.PI; // direction center -> start
  return [start, at(back + (2 * Math.PI) / 3), at(back + (4 * Math.PI) / 3), start];
}

// Community OSRM server with a foot profile: free, no key, best effort (no SLA).
export async function fetchRoute(pts: Pt[]): Promise<Route> {
  const coords = pts.map((p) => `${p.longitude},${p.latitude}`).join(';');
  const res = await fetch(
    `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${coords}?overview=full&geometries=geojson`,
  );
  const json = await res.json();
  const r = json?.routes?.[0];
  if (!res.ok || !r) throw new Error('Itinéraire introuvable');
  return {
    meters: r.distance,
    line: r.geometry.coordinates.map(([longitude, latitude]: number[]) => ({ latitude, longitude })),
  };
}

export const toGpx = (line: Pt[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="RunForest" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>RunForest</name><trkseg>` +
  line.map((p) => `<trkpt lat="${p.latitude}" lon="${p.longitude}"/>`).join('') +
  `</trkseg></trk></gpx>`;

export async function generateLoop(start: Pt, km: number): Promise<Route> {
  const bearing = Math.random() * 2 * Math.PI;
  const first = await fetchRoute(loopWaypoints(start, km, bearing));
  return fetchRoute(loopWaypoints(start, km, bearing, (km * 1000) / first.meters));
}
