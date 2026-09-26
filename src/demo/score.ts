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

// Original 30-second study. The melody arrives first; bass and chord tones enter in later bars.
// Notes are authored here, with no third-party MIDI or audio asset to distribute.
export function createQuickStudyScore() {
  const beat = 0.75
  const melody = [
    [64, 67, 72, 71], [69, 72, 76, 72], [69, 67, 65, 69], [67, 71, 74, 71],
    [72, 76, 79, 76], [72, 69, 64, 69], [65, 69, 72, 69], [67, 71, 74, 71],
    [72, 76, 74, 71], [72, 67, 64, 60],
  ]
  const bass = [48, 45, 41, 43, 48, 45, 41, 43, 48, 48]
  const harmony = [[60, 67], [57, 64], [53, 60], [55, 62], [60, 67], [57, 64], [53, 60], [55, 62], [60, 67], [60, 67]]
  const at = (bar: number, step: number) => 0.3 + (bar * 4 + step) * beat
  return normalizeScore({
    metadata: { title: 'Where the light gathers', source: 'demo', tempoMap: [{ time: 0, bpm: 80 }] },
    tracks: [
      { name: 'Melody', channel: 0, instrument: 0, notes: melody.flatMap((bar, index) => bar.map((midi, step) => ({
        time: at(index, step), duration: index === 9 && step === 3 ? beat * 1.7 : beat * 0.85,
        midi, velocity: step === 0 ? 0.76 : 0.67,
      }))) },
      { name: 'Bass', channel: 1, instrument: 0, notes: bass.flatMap((midi, bar) => bar === 0 ? [] : [0, 2].map(step => ({
        time: at(bar, step), duration: beat * 1.65, midi: midi + (step === 2 ? 7 : 0), velocity: 0.3,
      }))) },
      { name: 'Harmony', channel: 2, instrument: 0, notes: harmony.flatMap((tones, bar) => bar < 3 ? [] : tones.map(midi => ({
        time: at(bar, 0), duration: beat * 3.65, midi, velocity: 0.25,
      }))) },
    ],
  })
}
