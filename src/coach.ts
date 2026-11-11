export type Seg = { kind: 'walk' | 'run'; sec: number };
export type Pt = { latitude: number; longitude: number };
export type RunLog = { date: string; week: number; sec: number; meters: number };

export type GoalId = '5k' | '10k' | 'half' | 'fit';
export type Profile = { startWeek: number; goal: GoalId; days: number };

// Goal = distance and the plan week where the session reaches it.
export const GOALS: Record<GoalId, { label: string; km: number; week: number }> = {
  fit: { label: 'Me remettre en forme', km: 5, week: 8 },
  '5k': { label: 'Courir 5 km', km: 5, week: 8 },
  '10k': { label: 'Courir 10 km', km: 10, week: 14 },
  half: { label: 'Semi-marathon', km: 21.1, week: 24 },
};

// Couch-to-5K style: [run sec, walk sec, repetitions]; then one continuous run growing 5 min a week.
const START: [number, number, number][] = [
  [60, 90, 8],
  [90, 120, 6],
  [180, 90, 5],
  [300, 120, 4],
  [480, 120, 3],
  [600, 120, 3],
  [1200, 0, 1],
  [1800, 0, 1],
];
export const WEEK_COUNT = 24;

const params = (week: number): [number, number, number] =>
  START[week - 1] ?? [(30 + 5 * (week - START.length)) * 60, 0, 1];

// Sessions completed -> plan week, capped once the goal week is reached.
export const currentWeek = (p: Profile, done: number) =>
  Math.min(GOALS[p.goal].week, p.startWeek + Math.floor(done / p.days));

export function session(week: number): Seg[] {
  const [run, walk, reps] = params(Math.min(Math.max(week, 1), WEEK_COUNT));
  const segs: Seg[] = [{ kind: 'walk', sec: 300 }];
  for (let i = 0; i < reps; i++) {
    segs.push({ kind: 'run', sec: run });
    if (walk && i < reps - 1) segs.push({ kind: 'walk', sec: walk });
  }
  segs.push({ kind: 'walk', sec: 300 });
  return segs;
}

export function segmentAt(segs: Seg[], t: number): { i: number; left: number } | null {
  let end = 0;
  for (let i = 0; i < segs.length; i++) {
    end += segs[i].sec;
    if (t < end) return { i, left: end - t };
  }
  return null;
}

export function distance(a: Pt, b: Pt): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(r(b.latitude - a.latitude) / 2) ** 2 +
    Math.cos(r(a.latitude)) * Math.cos(r(b.latitude)) * Math.sin(r(b.longitude - a.longitude) / 2) ** 2;
  return 12742000 * Math.asin(Math.sqrt(h));
}

const pad = (n: number) => String(n).padStart(2, '0');

export function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  return `${h ? h + ':' : ''}${pad(Math.floor((sec % 3600) / 60))}:${pad(sec % 60)}`;
}

export function fmtPace(sec: number, meters: number): string {
  if (meters < 50) return '--:--';
  const p = Math.round(sec / (meters / 1000));
  return `${Math.floor(p / 60)}:${pad(p % 60)}`;
}

function spoken(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return [m && `${m} minute${m > 1 ? 's' : ''}`, s && `${s} secondes`].filter(Boolean).join(' ');
}

export const segCue = (s: Seg) => `${s.kind === 'run' ? 'Cours' : 'Marche'} pendant ${spoken(s.sec)}`;

export const kmCue = (km: number, sec: number, meters: number) =>
  `${km} kilomètre${km > 1 ? 's' : ''}. Allure moyenne ${fmtPace(sec, meters).replace(':', ' ')} par kilomètre.`;

const TIPS = [
  'Cours à une allure où tu peux encore parler : si tu es essoufflé, ralentis.',
  'Alterne les jours de course et de repos : c’est pendant le repos que tu progresses.',
  'Hydrate-toi dans la journée, pas seulement pendant la séance.',
  'Une douleur vive ou qui persiste n’est pas normale : arrête et repose-toi.',
  'Garde les épaules relâchées et regarde loin devant toi, pas tes pieds.',
  'Des chaussures de running adaptées préviennent la plupart des blessures.',
  'Ne rattrape jamais une séance manquée en doublant la suivante.',
];
export const tip = (done: number) => TIPS[done % TIPS.length];

export function describe(week: number): string {
  const [run, walk, reps] = params(week);
  const w = walk && reps > 1 ? ` / ${spoken(walk)} marche` : '';
  return `5 min marche, ${reps} × ${spoken(run)} course${w}, 5 min marche`;
}
