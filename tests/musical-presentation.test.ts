import { describe, expect, it } from 'vitest'
import { PerspectiveCamera, Vector3 } from 'three'
import { normalizeScore } from '../src/midi/normalize'
import { createDemoScore } from '../src/demo/score'
import { compileScore } from '../src/engine/compile'
import { ConstellationGeometryStrategy } from '../src/engine/music-geometry/strategies/constellation'
import { DefaultPresentation as config } from '../src/visual/presentation/defaultPresentation'
import { createMusicalPresentation, evaluateLead, noteLifecycle, selectSalientNotes, visibleStreamNotes } from '../src/visual/presentation/musicalPresentation'
import { createRelations } from '../src/visual/presentation/relations'
import { DefaultCamera, StaticCamera } from '../src/visual/camera/staticCamera'

const score = createDemoScore()
const model = createMusicalPresentation(score, config)
const makeScore = () => normalizeScore({ metadata: { title: 'Voices', source: 'demo' }, tracks: [
  { name: 'Lead', channel: 0, instrument: 0, notes: [0, 1, 2, 5].map((time, i) => ({ time, midi: 72 + i * 2, duration: 0.8, velocity: 0.9 })) },
  { name: 'Harmony', channel: 1, instrument: 0, notes: [0, 1, 2, 5].map((time, i) => ({ time, midi: 48 + i, duration: 2, velocity: 0.3 })) },
] })

describe('musical presentation', () => {
  it('ranks velocity, duration, register and continuity predictably and never changes input', () => {
    const polyphonic = makeScore()
    const before = structuredClone(polyphonic)
    expect(selectSalientNotes(polyphonic, config.salience).map(n => n.trackId)).toEqual(Array(4).fill(polyphonic.tracks[0]!.id))
    const durationOnly = { windowSeconds: 0.22, velocity: 0, duration: 1, register: 0, trackContinuity: 0, pitchContinuity: 0 }
    expect(selectSalientNotes(polyphonic, durationOnly).map(n => n.trackId)).toEqual(Array(4).fill(polyphonic.tracks[1]!.id))
    const ties = { windowSeconds: 0.22, velocity: 0, duration: 0, register: 0, trackContinuity: 0, pitchContinuity: 0 }
    const firstIds = selectSalientNotes(polyphonic, ties).map(n => n.id)
    polyphonic.notes.reverse()
    expect(selectSalientNotes(polyphonic, ties).map(n => n.id)).toEqual(firstIds)
    polyphonic.notes.reverse()
    expect(polyphonic).toEqual(before)
  })

  it('arrives exactly at every selected onset, holds endpoints and reconstructs backward seeks', () => {
    for (const point of model.lead) expect(evaluateLead(model, point.note.startTime)).toEqual(point.position)
    expect(evaluateLead(model, -2)).toEqual(model.lead[0]!.position)
    expect(evaluateLead(model, score.duration + 10)).toEqual(model.lead.at(-1)!.position)
    const direct = evaluateLead(model, 3.2)
    for (const time of [8, 1, 5, 9, 3.2]) evaluateLead(model, time)
    expect(evaluateLead(model, 3.2)).toEqual(direct)
    expect(direct.y).toBeGreaterThan(model.lead[2]!.position.y)
    expect(direct.y).toBeLessThan(model.lead[3]!.position.y)
  })

  it('uses actual contour, density, intervals and durations rather than a fixed horizontal path or cylinder', () => {
    expect(new Set(model.lead.map(p => p.position.y)).size).toBeGreaterThan(3)
    const altered = structuredClone(score)
    altered.notes[1]!.duration *= 2
    altered.notes[2]!.startTime += 0.2
    const changed = createMusicalPresentation(altered, config)
    expect(changed.lead[2]!.position.x).not.toBe(model.lead[2]!.position.x)
    const wider = createMusicalPresentation(score, { ...config, stream: { ...config.stream, radius: 2 } })
    expect(wider.lead.map(p => p.position)).not.toEqual(model.lead.map(p => p.position))
    expect(new Set(model.lead.map(p => Math.round(p.position.z * 100))).size).toBeGreaterThan(3)
    expect(wider.lead.map(p => p.note.id)).toEqual(model.lead.map(p => p.note.id))
  })

  it('groups supporting voices into bounded phrases split at rests, and represents every chord member', () => {
    const poly = makeScore()
    const phrases = createMusicalPresentation(poly, config).phrases
    expect(phrases.map(p => p.notes.length)).toEqual([3, 1])
    expect(phrases.every(p => p.notes.every(n => n.trackId === p.trackId))).toBe(true)
    const chord = score.chords[0]!
    const visible = visibleStreamNotes(model, chord.startTime, config.stream)
    expect(chord.notes.every(n => visible.some(v => v.id === n.id))).toBe(true)
    expect(new Set(chord.notes.map(n => model.positions.get(n.id)!.y)).size).toBe(3)
  })

  it('keeps a long note active until its own release, then fades and disappears on absolute time', () => {
    const note = { ...score.notes[0]!, startTime: 10, duration: 8 }
    expect(noteLifecycle(note, 0, config.stream).phase).toBe('gone')
    expect(noteLifecycle(note, 6, config.stream).phase).toBe('upcoming')
    expect(noteLifecycle(note, 9, config.stream).phase).toBe('approaching')
    expect(noteLifecycle(note, 10, config.stream).phase).toBe('hit')
    expect(noteLifecycle(note, 17.5, config.stream)).toMatchObject({ phase: 'active', opacity: 1 })
    expect(noteLifecycle(note, 18.5, config.stream).phase).toBe('fade')
    expect(noteLifecycle(note, 20, config.stream).opacity).toBe(0)
    expect(noteLifecycle(note, 17.5, config.stream).opacity).toBe(1)
  })

  it('caps dense local notes, with no events outside the lifecycle window', () => {
    const dense = normalizeScore({ metadata: { title: 'Dense', source: 'demo' }, tracks: [{ name: 'Dense voice', channel: 0, instrument: 0,
      notes: Array.from({ length: 720 }, (_, i) => ({ time: i * 0.02, midi: 48 + i % 36, duration: 0.3, velocity: 0.7 })),
    }] })
    const prepared = createMusicalPresentation(dense, config)
    const notes = visibleStreamNotes(prepared, 7, { ...config.stream, maxVisibleNotes: 80 })
    expect(notes).toHaveLength(80)
    expect(notes.every(n => 7 >= n.startTime - config.stream.leadInTime && 7 <= n.startTime + n.duration + config.stream.fadeOutTime)).toBe(true)
    expect(visibleStreamNotes(prepared, dense.duration + 3, config.stream)).toEqual([])
  })

  it('handles empty and single-note scores without invalid points', () => {
    const empty = { ...score, notes: [], tracks: [], chords: [], duration: 0 }
    expect(evaluateLead(createMusicalPresentation(empty, config), 0)).toEqual({ x: 0, y: 0, z: 0 })
    const single = { ...score, notes: [score.notes[0]!], chords: [] }
    const one = createMusicalPresentation(single, config)
    expect(evaluateLead(one, 5)).toEqual(one.lead[0]!.position)
  })

  it('keeps staggered accompaniment out of the lead and retains every unselected note in a phrase', () => {
    const dense = normalizeScore({ metadata: { title: 'Staggered voices', source: 'demo' }, tracks: Array.from({ length: 4 }, (_, track) => ({ name: `Voice ${track + 1}`, channel: track, instrument: 0,
      notes: Array.from({ length: 100 }, (_, i) => ({ time: i * 0.08 + track * 0.01, midi: 48 + (i * 5 + track * 7) % 36, duration: 0.18, velocity: 0.45 + track * 0.1 })),
    })) })
    const prepared = createMusicalPresentation(dense, config)
    expect(prepared.lead.length).toBeLessThan(40)
    expect(prepared.phrases.flatMap(p => p.notes).length + prepared.lead.length).toBe(400)
    expect(prepared.lead.every((point, i) => !i || point.note.startTime > prepared.lead[i - 1]!.note.startTime)).toBe(true)
  })

  it('derives primary curves and local chord spokes while retaining world and plan', () => {
    const compiled = compileScore(score, ConstellationGeometryStrategy, 107)
    const before = structuredClone(compiled)
    const result = createRelations(compiled.world, score, model, config.relations)
    expect(result.members).toHaveLength(3)
    expect(result.relations.filter(r => r.kind === 'chord')).toHaveLength(3)
    const lead = result.relations.filter(r => r.kind === 'lead')
    expect(lead).toHaveLength(model.lead.length - 1)
    expect(lead.every(r => r.points.length === config.relations.samples + 1)).toBe(true)
    expect(compiled).toEqual(before)
  })

  it('fits all projected corners with less empty space than the old sphere fit, including a narrow viewport', () => {
    const bounds = { min: { x: -12, y: -3, z: -1 }, max: { x: 12, y: 3, z: 1 } }
    for (const aspect of [16 / 9, 0.8]) {
      const state = StaticCamera.getState(0, { bounds, aspect, config: DefaultCamera })
      const camera = new PerspectiveCamera(state.fov, aspect, state.near, state.far)
      camera.position.set(state.position.x, state.position.y, state.position.z)
      camera.lookAt(state.target.x, state.target.y, state.target.z)
      camera.updateMatrixWorld()
      for (const x of [-12, 12]) for (const y of [-3, 3]) for (const z of [-1, 1]) {
        const p = new Vector3(x, y, z).project(camera)
        expect(Math.abs(p.x)).toBeLessThan(1)
        expect(Math.abs(p.y)).toBeLessThan(1)
      }
      if (aspect > 1) expect(camera.position.length()).toBeLessThan(30)
    }
  })
})
