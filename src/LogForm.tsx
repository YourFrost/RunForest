import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { RunLog } from './coach';

const num = (s: string) => parseFloat(s.replace(',', '.'));

// Manual log: after a timed session (minutes prefilled) or for any run done elsewhere. Dated now.
export default function LogForm({ week, sec, onSave, onCancel }: {
  week: number; sec?: number; onSave: (r: RunLog) => void; onCancel: () => void;
}) {
  const [min, setMin] = useState(sec ? String(Math.round(sec / 60)) : '');
  const [km, setKm] = useState('');
  const minutes = num(min);
  const ok = minutes > 0;

  return (
    <View style={st.box}>
      <Text style={st.title}>Enregistrer la sortie</Text>
      <Text style={st.label}>Durée (minutes)</Text>
      <TextInput style={st.input} value={min} onChangeText={setMin} keyboardType="decimal-pad" />
      <Text style={st.label}>Distance (km, optionnel)</Text>
      <TextInput style={st.input} value={km} onChangeText={setKm} keyboardType="decimal-pad" />
      <Pressable
        style={[st.btn, !ok && { opacity: 0.4 }]}
        disabled={!ok}
        onPress={() =>
          onSave({ date: new Date().toISOString(), week, sec: Math.round(minutes * 60), meters: Math.round((num(km) || 0) * 1000) })
        }
      >
        <Text style={st.btnText}>Enregistrer</Text>
      </Pressable>
      <Pressable onPress={onCancel}>
        <Text style={st.cancel}>Annuler</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  box: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 16 },
  label: { fontSize: 16, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#bbb', borderRadius: 10, padding: 12, fontSize: 18, marginTop: 6 },
  btn: { backgroundColor: '#2e7d32', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  cancel: { color: '#1565c0', textAlign: 'center', marginTop: 16, fontSize: 16 },
});
