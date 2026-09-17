import { normalizeScore } from '../midi/normalize'

// Original procedural study: C4 E4 G4 C5 / C-major chord / G4 E4 C4.
export function createDemoScore() {
  const starts = [0.8, 1.8, 2.7, 3.7, 5.2, 6.9, 7.8, 8.8]
  const pitches = [[60], [64], [67], [72], [60, 64, 67], [67], [64], [60]]
  const durations = [0.65, 0.55, 0.8, 1.15, 1.3, 0.6, 0.55, 1.7]
  const velocities = [0.56, 0.64, 0.72, 0.86, 0.8, 0.68, 0.58, 0.5]
  return normalizeScore({
    metadata: { title: 'A small constellation', source: 'demo', tempoMap: [{ time: 0, bpm: 72 }] },
    tracks: [{
      name: 'Procedural study in C', channel: 0, instrument: 0,
      notes: pitches.flatMap((chord, index) => chord.map(midi => ({
        time: starts[index]!, duration: durations[index]!, midi, velocity: velocities[index]!,
      }))),
    }],
  })
}
