import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import Svg, { Polyline, Rect } from 'react-native-svg';
import { GOALS, Profile, RunLog, fmtTime, currentWeek } from './coach';
import { goalEta, paceTrend, predictSec, weeklyKm } from './stats';

const W = 320;
const H = 120;

export default function Progress({ profile, runs }: { profile: Profile; runs: RunLog[] }) {
  const [now] = useState(Date.now);
  const goal = GOALS[profile.goal];
  const km = weeklyKm(runs, now);
  const max = Math.max(...km, 1);
  const { paces, slope } = paceTrend(runs);
  const lo = Math.min(...paces);
  const span = Math.max(...paces) - lo || 1;
  const line = paces
    .map((p, i) => `${(i / Math.max(paces.length - 1, 1)) * W},${((p - lo) / span) * (H - 10) + 5}`) // faster = higher
    .join(' ');
  const predicted = predictSec(runs, goal.km);
  const eta = goalEta(profile, runs, now);
  const week = currentWeek(profile, runs.length);

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={st.title}>Progrès</Text>
      <Text style={st.desc}>
        Objectif : {goal.label} · semaine {week} / {goal.week} · {runs.length} séance{runs.length > 1 ? 's' : ''}
      </Text>

      <Text style={st.sub}>Kilomètres par semaine (8 dernières)</Text>
      <Svg width={W} height={H}>
        {km.map((v, i) => (
          <Rect key={i} x={i * 40 + 4} y={H - (v / max) * (H - 4)} width={32} height={(v / max) * (H - 4)} fill="#2e7d32" />
        ))}
      </Svg>

      <Text style={st.sub}>Allure par séance (plus haut = plus rapide)</Text>
      {paces.length < 2 ? (
        <Text style={st.desc}>Il faut au moins 2 séances avec distance pour tracer la courbe.</Text>
      ) : (
        <>
          <Svg width={W} height={H}>
            <Polyline points={line} fill="none" stroke="#1565c0" strokeWidth={3} />
          </Svg>
          <Text style={st.desc}>
            Tendance : {Math.abs(Math.round(slope))} s/km {slope < 0 ? 'plus rapide' : 'plus lent'} par séance
          </Text>
        </>
      )}

      <Text style={st.sub}>Estimations</Text>
      <Text style={st.desc}>
        {eta.left === 0
          ? 'Objectif atteint côté programme, bravo !'
          : eta.date
            ? `Au rythme actuel, programme terminé vers le ${eta.date.toLocaleDateString('fr-FR')} (${eta.left} séances restantes).`
            : `${eta.left} séances restantes. Il faut 3 séances sur les 4 dernières semaines pour estimer la date.`}
      </Text>
      <Text style={st.desc}>
        {predicted
          ? `Temps prévu sur ${goal.km} km : ${fmtTime(Math.round(predicted))} (formule de Riegel, à partir de ta meilleure sortie de plus de 1,5 km).`
          : 'Temps prévu : il faut une sortie de plus de 1,5 km avec sa distance.'}
      </Text>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  title: { fontSize: 32, fontWeight: '800', marginBottom: 8 },
  sub: { fontSize: 18, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  desc: { fontSize: 16, color: '#444', marginVertical: 4 },
});
