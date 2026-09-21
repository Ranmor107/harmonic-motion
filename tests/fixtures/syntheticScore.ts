import { normalizeScore } from '../../src/midi/normalize'

// Original procedural material: interleaved voices, chords, rests and held notes.
export function syntheticScore(count: number, fast = false) {
  const tracks = Array.from({ length: 4 }, (_, track) => ({
    name: `Voice ${track + 1}`, channel: track, instrument: 0,
    notes: Array.from({ length: Math.floor((count + 3 - track) / 4) }, (_, i) => ({
      time: fast ? i * 0.012 + track * 0.002 : i * 0.18 + Math.floor(i / 32) * 0.8 + (i % 4 === 0 ? 0 : track * 0.035),
      duration: i % 16 === 0 ? 2.8 : 0.12 + (i % 5) * 0.09,
      midi: 45 + track * 8 + [0, 2, 7, 4, 9, 5, 12, 7][i % 8]! + Math.floor(i / 24) % 3,
      velocity: track === 3 ? 0.85 : 0.38 + (i % 7) * 0.045,
    })),
  }))
  return normalizeScore({ metadata: { title: `${fast ? 'Fast' : 'Synthetic'} ${count}`, source: 'demo' }, tracks })
}
