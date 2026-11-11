import { GOALS } from './coach.ts';
import type { Profile, RunLog } from './coach.ts';

const DAY = 86400000;
const pace = (r: RunLog) => r.sec / (r.meters / 1000); // sec per km

// Only runs with a real distance count for pace stats (a GPS-less session has meters ~ 0).
const measured = (runs: RunLog[]) => runs.filter((r) => r.meters >= 500);

// Km per week for the last n weeks, oldest first (weeks start on Monday).
export function weeklyKm(runs: RunLog[], now: number, n = 8): number[] {
  const d = new Date(now);
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)).getTime();
  const out = new Array(n).fill(0);
  for (const r of runs) {
    const i = n - 1 - Math.floor((monday - new Date(r.date).getTime() + 7 * DAY - 1) / (7 * DAY));
    if (i >= 0 && i < n) out[i] += r.meters / 1000;
  }
  return out;
}

// Pace of each run, oldest first, plus the least-squares slope in sec/km per run (negative = getting faster).
export function paceTrend(runs: RunLog[]): { paces: number[]; slope: number } {
  const paces = measured(runs).slice().reverse().map(pace); // runs are stored newest first
  const n = paces.length;
  if (n < 2) return { paces, slope: 0 };
  const mx = (n - 1) / 2;
  const my = paces.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  paces.forEach((p, i) => {
    num += (i - mx) * (p - my);
    den += (i - mx) ** 2;
  });
  return { paces, slope: num / den };
}

// Riegel formula from the best recent run of at least 1.5 km; null when there is no such run.
export function predictSec(runs: RunLog[], km: number): number | null {
  const best = measured(runs).filter((r) => r.meters >= 1500).sort((a, b) => pace(a) - pace(b))[0];
  return best ? best.sec * (km / (best.meters / 1000)) ** 1.06 : null;
}

// Date the goal week will be reached at the pace of the last 4 weeks; null with no recent run.
export function goalEta(p: Profile, runs: RunLog[], now: number): { left: number; date: Date | null } {
  const left = Math.max(0, (GOALS[p.goal].week - p.startWeek + 1) * p.days - runs.length);
  const recent = runs.filter((r) => now - new Date(r.date).getTime() < 28 * DAY).length;
  // shortcut: needs 3 recent runs, fewer give a wildly optimistic or pessimistic date
  return { left, date: left === 0 || recent < 3 ? null : new Date(now + (left / (recent / 4)) * 7 * DAY) };
}
