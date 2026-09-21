import { describe, expect, it } from 'vitest'
import { normalizeScore } from '../src/midi/normalize'
import { createDemoScore } from '../src/demo/score'
import { createStudioStore } from '../src/state/store'
import { createMusicalPresentation } from '../src/visual/presentation/musicalPresentation'
import { createEnsemblePresentation, ensembleMotion, ensemblePoint, ENSEMBLE_BUDGET, visibleEnsembleNotes } from '../src/visual/presentation/ensemblePresentation'
import { DefaultPresentation as config } from '../src/visual/presentation/defaultPresentation'

const dense = normalizeScore({ metadata: { title: 'Fast polyphony', source: 'demo' }, tracks: Array.from({ length: 4 }, (_, voice) => ({
  name: `Voice ${voice}`, channel: voice, instrument: 0,
  notes: Array.from({ length: 600 }, (_, i) => ({ time: i * 0.008, midi: 40 + voice * 8 + i % 12, duration: i % 40 === 0 ? 2 : 0.12, velocity: voice ? 0.35 : 0.9 })),
})) })
const prepare = (score = dense) => createEnsemblePresentation(score, createMusicalPresentation(score, config))

describe('Ensemble presentation', () => {
  it('uses stable per-track regions and pitch positions; all musical data remains intact', () => {
    const before = structuredClone(dense)
    const model = prepare()
    expect(model.regions).toHaveLength(4)
    expect(new Set(model.regions.map(region => region.angle)).size).toBe(4)
    expect(model.placements.size).toBe(dense.notes.length)
    const a = dense.tracks[0]!.notes[0]!, b = dense.tracks[0]!.notes[12]!
    expect(model.placements.get(a.id)).toEqual(model.placements.get(b.id))
    expect(model.placements.get(dense.tracks[0]!.notes[1]!.id)!.angle).toBeGreaterThan(model.placements.get(a.id)!.angle)
    expect(dense).toEqual(before)
  })

  it('thins fast passages deterministically while retaining salience and pitch extremes', () => {
    const model = prepare()
    expect(model.representatives.size).toBeLessThan(dense.notes.length / 2)
    const bucket = dense.tracks[0]!.notes.filter(n => n.startTime < 0.18)
    expect(model.representatives.has(bucket[0]!.id)).toBe(true)
    expect(bucket.some(n => n.midi === 51 && model.representatives.has(n.id))).toBe(true)
    expect(prepare().representatives).toEqual(model.representatives)
  })

  it('reserves space for quiet voices, enforces the budget and reproduces backward seeks', () => {
    const model = prepare()
    const visible = visibleEnsembleNotes(model, 2)
    expect(visible.length).toBeLessThanOrEqual(ENSEMBLE_BUDGET)
    expect(visible.length).toBeGreaterThan(4)
    for (const a of visible) for (const b of visible) if (a.id !== b.id && a.trackId === b.trackId) {
      const p = ensemblePoint(model, a, 2), q = ensemblePoint(model, b, 2)
      expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThanOrEqual(0.23)
    }
    for (const track of dense.tracks) expect(visible.some(n => n.trackId === track.id)).toBe(true)
    expect(visible.every(n => n.startTime <= 5.5 && n.startTime + n.duration + 1.2 >= 2)).toBe(true)
    for (const time of [8, 1, 4, 0]) visibleEnsembleNotes(model, time)
    expect(visibleEnsembleNotes(model, 2)).toEqual(visible)
    expect(visibleEnsembleNotes(model, dense.duration + 2)).toEqual([])
  })

  it('approaches and holds notes throughout their true duration', () => {
    const model = prepare()
    const note = dense.tracks[0]!.notes[40]!
    const before = ensemblePoint(model, note, note.startTime - 1)
    const hit = ensemblePoint(model, note, note.startTime)
    expect(Math.hypot(before.x, before.y)).toBeGreaterThan(Math.hypot(hit.x, hit.y))
    expect(ensemblePoint(model, note, note.startTime + 1)).toEqual(hit)
    expect(ensemblePoint(model, note, note.startTime + note.duration + 0.5)).not.toEqual(hit)
  })

  it('keeps ordinary demo chords complete and associates their members', () => {
    const score = createDemoScore(), model = prepare(score)
    const chord = score.chords[0]!
    const visible = visibleEnsembleNotes(model, chord.startTime)
    for (const note of chord.notes) {
      expect(visible).toContain(note)
      expect(model.chordByNote.get(note.id)).toBe(chord.id)
    }
  })

  it('bounds continuous absolute-time motion and disables it for reduced motion', () => {
    const model = prepare()
    for (const time of [0, 0.9999, 1, 2, 100]) {
      const motion = ensembleMotion(model, time)
      expect(Math.abs(motion.rotation)).toBeLessThanOrEqual(0.055)
      expect(Math.abs(motion.x)).toBeLessThanOrEqual(0.12)
      expect(motion.scale).toBeGreaterThanOrEqual(1)
      expect(motion.scale).toBeLessThanOrEqual(1.025)
      expect(Math.abs(ensembleMotion(model, time + 0.0001).scale - motion.scale)).toBeLessThan(0.001)
    }
    expect(ensembleMotion(model, 3, true)).toEqual({ x: 0, y: 0, rotation: 0, scale: 1 })
    expect(ensembleMotion(prepare(), 3)).toEqual(ensembleMotion(model, 3))
  })

  it('switches all views without replacing score, world, plan or preset', () => {
    const store = createStudioStore(), original = store.getState()
    for (const mode of ['ensemble', 'stream', 'constellation', 'ensemble'] as const) {
      store.getState().setViewMode(mode)
      expect(store.getState().compiled).toBe(original.compiled)
      expect(store.getState().preset).toBe(original.preset)
    }
  })

  it('handles an empty score without invalid motion or drawing candidates', () => {
    const score = { ...createDemoScore(), tracks: [], notes: [], chords: [], duration: 0 }
    const model = prepare(score)
    expect(model.regions).toEqual([])
    expect(visibleEnsembleNotes(model, 0)).toEqual([])
    expect(ensembleMotion(model, 0).scale).toBe(1)
  })
})
