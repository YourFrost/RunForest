import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Pt } from './coach';
import { Route, fetchRoute, generateLoop, toGpx } from './route';

const LENGTHS = [3, 5, 10, 15];
const ll = (p: Pt): L.LatLngTuple => [p.latitude, p.longitude];

export default function MapScreen({ route, onUse }: { route: Route | null; onUse: (r: Route | null) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map>(null);
  const layer = useRef<L.LayerGroup>(null);
  const wpRef = useRef<Pt[]>([]); // source of truth for the map click handler, which is bound once
  const [wp, setWp] = useState<Pt[]>([]);
  const [drawn, setDrawn] = useState<Route | null>(route);
  const [km, setKm] = useState(5);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const run = async (job: () => Promise<Route>, fit = false) => {
    setBusy(true);
    setMsg('');
    try {
      const r = await job();
      setDrawn(r);
      if (fit) map.current?.fitBounds(L.latLngBounds(r.line.map(ll)));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Erreur réseau');
    }
    setBusy(false);
  };

  useEffect(() => {
    const m = L.map(el.current!).setView([48.8566, 2.3522], 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    // Two or more tapped points get snapped to walkable paths.
    m.on('click', (e) => {
      wpRef.current = [...wpRef.current, { latitude: e.latlng.lat, longitude: e.latlng.lng }];
      setWp(wpRef.current);
      if (wpRef.current.length > 1) run(() => fetchRoute(wpRef.current));
    });
    navigator.geolocation?.getCurrentPosition((p) => m.setView([p.coords.latitude, p.coords.longitude], 14), () => {}); // one-shot, optional
    map.current = m;
    setTimeout(() => m.invalidateSize(), 0);
    return () => {
      m.remove();
    };
  }, []);

  useEffect(() => {
    layer.current?.clearLayers();
    wp.forEach((p) => L.circleMarker(ll(p), { radius: 6 }).addTo(layer.current!));
    if (drawn) L.polyline(drawn.line.map(ll), { color: '#e53935', weight: 4 }).addTo(layer.current!);
  }, [wp, drawn]);

  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([toGpx(drawn!.line)], { type: 'application/gpx+xml' }));
    a.download = 'parcours.gpx';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <View style={{ flex: 1 }}>
      <div ref={el} style={{ flex: 1, minHeight: 300 }} />
      <View style={st.panel}>
        <Text style={st.msg}>
          {busy ? 'Calcul…' : drawn ? `${(drawn.meters / 1000).toFixed(1)} km` : 'Touche la carte pour tracer, ou génère une boucle autour du centre de la carte'}
          {msg ? ` · ${msg}` : ''}
        </Text>
        <View style={st.row}>
          {LENGTHS.map((l) => (
            <Pressable key={l} style={[st.chip, km === l && st.chipOn]} onPress={() => setKm(l)}>
              <Text style={km === l && { color: '#fff' }}>{l} km</Text>
            </Pressable>
          ))}
        </View>
        <View style={st.row}>
          <Pressable
            style={st.btn}
            onPress={() => {
              const c = map.current!.getCenter();
              wpRef.current = [];
              setWp([]);
              run(() => generateLoop({ latitude: c.lat, longitude: c.lng }, km), true);
            }}
          >
            <Text style={st.btnText}>Générer une boucle</Text>
          </Pressable>
          <Pressable style={st.btn} onPress={() => { wpRef.current = []; setWp([]); setDrawn(null); onUse(null); }}>
            <Text style={st.btnText}>Effacer</Text>
          </Pressable>
        </View>
        <View style={st.row}>
          <Pressable style={[st.btn, !drawn && { opacity: 0.4 }]} disabled={!drawn} onPress={() => onUse(drawn)}>
            <Text style={st.btnText}>Choisir pour ma séance</Text>
          </Pressable>
          <Pressable style={[st.btn, !drawn && { opacity: 0.4 }]} disabled={!drawn} onPress={download}>
            <Text style={st.btnText}>Export GPX</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  msg: { padding: 8, fontSize: 15, textAlign: 'center' },
  panel: { backgroundColor: '#fff', padding: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 6 },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#eee' },
  chipOn: { backgroundColor: '#2e7d32' },
  btn: { backgroundColor: '#2e7d32', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '700' },
});
