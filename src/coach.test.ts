import assert from 'node:assert/strict';
import {
  GOALS, WEEK_COUNT, currentWeek, distance, fmtPace, fmtTime, segCue, segmentAt, session,
} from './coach.ts';
import { goalEta, paceTrend, predictSec, weeklyKm } from './stats.ts';
import { loopWaypoints, toGpx } from './route.ts';

const s1 = session(1);
assert.equal(s1.length, 2 + 8 + 7); // warmup + 8 runs + 7 walks between + cooldown
assert.equal(segmentAt(s1, 0)?.i, 0);
assert.equal(segmentAt(s1, 300)?.i, 1); // first run starts right after warmup
const total = s1.reduce((a, s) => a + s.sec, 0);
assert.equal(segmentAt(s1, total - 1)?.left, 1);
assert.equal(segmentAt(s1, total), null);

for (let w = 1; w <= WEEK_COUNT; w++) assert.ok(session(w).length >= 3);
assert.equal(session(14)[1].sec, 60 * 60); // 10K goal week = one 60 min run

assert.equal(fmtTime(3725), '1:02:05');
assert.equal(fmtPace(360, 1000), '6:00');
assert.equal(fmtPace(10, 10), '--:--');
assert.equal(segCue({ kind: 'run', sec: 90 }), 'Cours pendant 1 minute 30 secondes');
// 0.01 degree of latitude is about 1112 m
assert.ok(Math.abs(distance({ latitude: 0, longitude: 0 }, { latitude: 0.01, longitude: 0 }) - 1112) < 5);

// plan week advances every `days` sessions and stops at the goal week
const p = { startWeek: 4, goal: '5k' as const, days: 3 };
assert.equal(currentWeek(p, 0), 4);
assert.equal(currentWeek(p, 3), 5);
assert.equal(currentWeek(p, 300), GOALS['5k'].week);

// progress: runs are stored newest first
const now = new Date(2026, 10, 5, 12).getTime(); // Thursday
const run = (daysAgo: number, km: number, min: number) => ({
  date: new Date(now - daysAgo * 86400000).toISOString(), week: 1, sec: min * 60, meters: km * 1000,
});
const runs = [run(0, 3, 21), run(3, 3, 24), run(10, 2, 16)]; // 7:00, 8:00, 8:00 /km
const wk = weeklyKm(runs, now);
assert.equal(wk.length, 8);
assert.equal(wk[7], 6); // Thursday run + Monday run, same week
assert.equal(wk[6], 2); // run 10 days ago = previous week
assert.ok(paceTrend(runs).slope < 0); // getting faster
assert.equal(predictSec([run(0, 1, 5)], 5), null); // no run of at least 1.5 km
assert.ok(Math.abs(predictSec([run(0, 5, 30)], 10)! - 30 * 60 * 2 ** 1.06) < 1);
const eta = goalEta({ startWeek: 1, goal: '5k', days: 3 }, runs, now);
assert.equal(eta.left, 8 * 3 - 3);
assert.ok(eta.date && eta.date.getTime() > now);
assert.equal(goalEta({ startWeek: 1, goal: '5k', days: 3 }, [], now).date, null);

// loop: starts and ends at start, other points on a circle of radius r around the center
const start = { latitude: 48.85, longitude: 2.35 };
const wp = loopWaypoints(start, 5, 1);
assert.equal(wp.length, 4);
assert.deepEqual(wp[3], start);
const r = 5000 / (2 * Math.PI * 1.3);
assert.ok(wp.slice(1, 3).every((q) => distance(start, q) > 0.5 * r && distance(start, q) < 2 * r));
assert.equal(toGpx(wp).match(/<trkpt /g)?.length, 4);
console.log('coach ok');
