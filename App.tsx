import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { GOALS, Profile, RunLog, currentWeek, describe, fmtPace, fmtTime, tip } from './src/coach';
import LogForm from './src/LogForm';
import MapScreen from './src/MapScreen';
import Onboarding from './src/Onboarding';
import Progress from './src/Progress';
import { Route } from './src/route';
import Run from './src/Run';

const TABS = ['Séance', 'Progrès', 'Carte'] as const;
const save = (key: string, v: unknown) => AsyncStorage.setItem(key, JSON.stringify(v)).catch(() => {});

export default function App() {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [runs, setRuns] = useState<RunLog[]>([]);
  const [route, setRoute] = useState<Route | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Séance');
  const [running, setRunning] = useState(false);
  const [logging, setLogging] = useState<{ sec?: number } | null>(null);

  useEffect(() => {
    AsyncStorage.multiGet(['profile', 'runs'])
      .then(([p, r]) => {
        setProfile(p[1] ? JSON.parse(p[1]) : null);
        setRuns(r[1] ? JSON.parse(r[1]) : []);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  if (!ready) return null;
  const week = profile ? currentWeek(profile, runs.length) : 1;

  const saved = (r: RunLog) => {
    const next = [r, ...runs];
    setRuns(next);
    save('runs', next);
    setLogging(null);
  };

  if (running) {
    return <Run week={week} onDone={(sec) => { setRunning(false); if (sec >= 60) setLogging({ sec }); }} />;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={st.screen}>
        <StatusBar style="dark" />
        {!profile ? (
          <Onboarding onDone={(p) => { setProfile(p); save('profile', p); }} />
        ) : logging ? (
          <LogForm week={week} sec={logging.sec} onSave={saved} onCancel={() => setLogging(null)} />
        ) : (
          <>
            <View style={{ flex: 1 }}>
              {tab === 'Séance' && (
                <ScrollView contentContainerStyle={{ padding: 20 }}>
                  <Text style={st.title}>RunForest</Text>
                  <Text style={st.week}>
                    Semaine {week} · {GOALS[profile.goal].label}
                  </Text>
                  <Text style={st.desc}>{describe(week)}</Text>
                  {route && <Text style={st.desc}>Parcours choisi : {(route.meters / 1000).toFixed(1)} km</Text>}
                  <Pressable style={st.go} onPress={() => setRunning(true)}>
                    <Text style={st.goText}>Démarrer la séance</Text>
                  </Pressable>
                  <Pressable onPress={() => setLogging({})}>
                    <Text style={st.link}>Ajouter une sortie faite ailleurs</Text>
                  </Pressable>
                  <Text style={st.tip}>Conseil : {tip(runs.length)}</Text>
                  <Text style={st.sub}>Historique</Text>
                  {runs.length === 0 && <Text style={st.desc}>Aucune séance pour l’instant.</Text>}
                  {runs.map((r) => (
                    <Text key={r.date} style={st.desc}>
                      {new Date(r.date).toLocaleDateString('fr-FR')} · S{r.week} · {fmtTime(r.sec)}
                      {r.meters > 0 && ` · ${(r.meters / 1000).toFixed(2)} km · ${fmtPace(r.sec, r.meters)} /km`}
                    </Text>
                  ))}
                </ScrollView>
              )}
              {tab === 'Progrès' && <Progress profile={profile} runs={runs} />}
              {tab === 'Carte' && <MapScreen route={route} onUse={setRoute} />}
            </View>
            <View style={st.tabs}>
              {TABS.map((t) => (
                <Pressable key={t} style={st.tab} onPress={() => setTab(t)}>
                  <Text style={[st.tabText, tab === t && st.tabOn]}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: '800', marginBottom: 16 },
  week: { fontSize: 22, fontWeight: '600' },
  desc: { fontSize: 16, color: '#444', marginVertical: 8 },
  go: { backgroundColor: '#2e7d32', padding: 18, borderRadius: 12, alignItems: 'center', marginVertical: 16 },
  goText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  link: { color: '#1565c0', fontSize: 16, marginBottom: 8 },
  tip: { backgroundColor: '#eef5ee', padding: 14, borderRadius: 10, fontSize: 16, marginTop: 8 },
  sub: { fontSize: 20, fontWeight: '700', marginTop: 20 },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#ddd' },
  tab: { flex: 1, padding: 14, alignItems: 'center' },
  tabText: { fontSize: 16, color: '#777' },
  tabOn: { color: '#2e7d32', fontWeight: '800' },
});
