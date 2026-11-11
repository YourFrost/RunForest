import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GOALS, GoalId, Profile } from './coach';

type Q = { title: string; options: [string, Partial<Profile>][] };

// Level answers map to the plan week that matches them.
const QUESTIONS: Q[] = [
  {
    title: 'Combien de temps peux-tu courir sans t’arrêter ?',
    options: [
      ['Moins d’1 minute, ou je débute', { startWeek: 1 }],
      ['Environ 5 minutes', { startWeek: 4 }],
      ['Environ 10 minutes', { startWeek: 6 }],
      ['20 minutes ou plus', { startWeek: 7 }],
    ],
  },
  {
    title: 'Quel est ton objectif ?',
    options: (Object.keys(GOALS) as GoalId[]).map((g) => [GOALS[g].label, { goal: g }]),
  },
  {
    title: 'Combien de séances par semaine peux-tu faire ?',
    options: [
      ['2', { days: 2 }],
      ['3', { days: 3 }],
      ['4', { days: 4 }],
    ],
  },
];

export default function Onboarding({ onDone }: { onDone: (p: Profile) => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<Profile>>({});
  const q = QUESTIONS[step];

  const pick = (a: Partial<Profile>) => {
    const next = { ...answers, ...a };
    if (step + 1 < QUESTIONS.length) {
      setAnswers(next);
      setStep(step + 1);
    } else onDone(next as Profile);
  };

  return (
    <View style={st.box}>
      <Text style={st.step}>Question {step + 1} / {QUESTIONS.length}</Text>
      <Text style={st.title}>{q.title}</Text>
      {q.options.map(([label, a]) => (
        <Pressable key={label} style={st.opt} onPress={() => pick(a)}>
          <Text style={st.optText}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  box: { flex: 1, padding: 24, justifyContent: 'center' },
  step: { color: '#777', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 24 },
  opt: { backgroundColor: '#eef5ee', padding: 18, borderRadius: 12, marginBottom: 12 },
  optText: { fontSize: 18 },
});
