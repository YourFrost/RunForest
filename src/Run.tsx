import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Speech from 'expo-speech';
import { fmtTime, segCue, segmentAt, session } from './coach';

const say = (text: string) => Speech.speak(text, { language: 'fr-FR' });

// Timer + voice coach. No GPS: the browser freezes the page with the screen off, so we hold a wake lock.
export default function Run({ week, onDone }: { week: number; onDone: (sec: number) => void }) {
  const [segs] = useState(() => session(week));
  const [start] = useState(Date.now);
  const [sec, setSec] = useState(0);

  useEffect(() => {
    let seg = -1;
    let lock: WakeLockSentinel | undefined;
    const hold = () =>
      navigator.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {}); // lock is dropped when the tab is hidden
    const again = () => document.visibilityState === 'visible' && hold();
    hold();
    document.addEventListener('visibilitychange', again);

    const id = setInterval(() => {
      const t = Math.floor((Date.now() - start) / 1000);
      const s = segmentAt(segs, t);
      if (!s) {
        say('Séance terminée, bravo !');
        return onDone(t);
      }
      if (s.i !== seg) {
        seg = s.i;
        say(segCue(segs[s.i]));
      }
      setSec(t);
    }, 1000);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', again);
      lock?.release();
      Speech.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per session; parent never re-renders mid-run
  }, []);

  const cur = segmentAt(segs, sec);
  const running = cur && segs[cur.i].kind === 'run';
  return (
    <View style={[st.center, { backgroundColor: running ? '#2e7d32' : '#1565c0' }]}>
      <Text style={st.big}>{cur ? (running ? 'COURS' : 'MARCHE') : '…'}</Text>
      <Text style={st.huge}>{fmtTime(cur?.left ?? 0)}</Text>
      <Text style={st.light}>Temps écoulé {fmtTime(sec)}</Text>
      <Text style={st.light}>Garde l’écran allumé pour entendre le coach.</Text>
      <Pressable style={st.stop} onPress={() => onDone(sec)}>
        <Text style={st.stopText}>Arrêter</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  big: { color: '#fff', fontSize: 40, fontWeight: '800' },
  huge: { color: '#fff', fontSize: 88, fontWeight: '800' },
  light: { color: '#fff', fontSize: 18, marginTop: 12, textAlign: 'center' },
  stop: { marginTop: 32, backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 12 },
  stopText: { fontSize: 18, fontWeight: '700' },
});
