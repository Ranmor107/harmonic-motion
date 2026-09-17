import { describe, expect, it } from 'vitest'
import { createDemoScore } from '../src/demo/score'
import { compileScore } from '../src/engine/compile'
import { ConstellationGeometryStrategy } from '../src/engine/music-geometry/strategies/constellation'
import { createStudioStore } from '../src/state/store'
import { DefaultCamera, StaticCamera } from '../src/visual/camera/staticCamera'
import { DefaultPresentation } from '../src/visual/presentation/defaultPresentation'
import {
  evaluateNodePresentation,
  selectReadableNodeIds,
  evaluateStreamPerformer,
  evaluateStreamSatellites,
} from '../src/visual/presentation/evaluatePresentation'

const score = createDemoScore()
const compiled = compileScore(score, ConstellationGeometryStrategy, 107)

describe('visual presentation', () => {
  it('keeps overview complete while focus and path classify by the configured time window', () => {
    const node = compiled.world.nodes.find(candidate => candidate.time === 5.2)!
    expect(evaluateNodePresentation(node, 0, 'overview', DefaultPresentation.visibility)).toMatchObject({ visible: true, opacity: 1 })
    expect(evaluateNodePresentation(node, 1.5, 'focus', DefaultPresentation.visibility).emphasis).toBe('active')
    expect(evaluateNodePresentation(node, 0, 'focus', DefaultPresentation.visibility).emphasis).toBe('context')
    expect(evaluateNodePresentation(node, 0, 'path', DefaultPresentation.visibility).visible).toBe(false)
  })

  it('reconstructs identical stream state for direct seek and repeated evaluation', () => {
    const direct = evaluateStreamSatellites(score, 5.2, DefaultPresentation.stream)
    for (let time = 0; time < 5.2; time += 1 / 60) evaluateStreamSatellites(score, time, DefaultPresentation.stream)
    expect(evaluateStreamSatellites(score, 5.2, DefaultPresentation.stream)).toEqual(direct)
    expect(evaluateStreamPerformer(5.2, score.duration)).toEqual(evaluateStreamPerformer(5.2, score.duration))
  })

  it('shows every note in a chord as a simultaneous satellite cluster', () => {
    const satellites = evaluateStreamSatellites(score, 5.2, DefaultPresentation.stream)
    const chord = score.chords.find(candidate => candidate.startTime === 5.2)!
    const cluster = satellites.filter(satellite => chord.notes.some(note => note.id === satellite.noteId))
    expect(cluster).toHaveLength(3)
    expect(new Set(cluster.map(satellite => satellite.position.x)).size).toBe(1)
    expect(new Set(cluster.map(satellite => satellite.position.y)).size).toBe(3)
    expect(cluster.every(satellite => satellite.phase === 'hit' && satellite.isChord)).toBe(true)
  })

  it('bounds visible satellites and removes notes outside the local temporal window', () => {
    const dense = structuredClone(score)
    dense.notes = Array.from({ length: 720 }, (_, index) => ({
      ...score.notes[index % score.notes.length]!, id: `dense-${index}`, startTime: index * 0.05,
    }))
    dense.duration = 40
    dense.chords = []
    dense.tracks = [{ ...dense.tracks[0]!, notes: dense.notes }]
    const satellites = evaluateStreamSatellites(dense, 20, { ...DefaultPresentation.stream, maxVisibleNotes: 80 })
    expect(satellites.length).toBeLessThanOrEqual(80)
    expect(satellites.every(satellite => {
      const note = dense.notes.find(candidate => candidate.id === satellite.noteId)!
      return note.startTime >= 20 - DefaultPresentation.stream.leadInTime && note.startTime <= 20 + note.duration + DefaultPresentation.stream.fadeOutTime
    })).toBe(true)
  })

  it('caps dense focus and current-path views by temporal relevance', () => {
    const nodes = Array.from({ length: 720 }, (_, index) => ({
      ...compiled.world.nodes[index % compiled.world.nodes.length]!, id: `node-${index}`, time: index * 0.05,
    }))
    const focus = selectReadableNodeIds(nodes, 18, 'focus', DefaultPresentation.visibility)!
    const path = selectReadableNodeIds(nodes, 18, 'path', DefaultPresentation.visibility)!
    expect(focus.size).toBe(DefaultPresentation.visibility.focusMaxNodes)
    expect(path.size).toBe(DefaultPresentation.visibility.pathMaxNodes)
    expect([...path].every(id => focus.has(id))).toBe(true)
  })

  it('switches view state without replacing score, world, plan, or preset', () => {
    const store = createStudioStore()
    const before = store.getState()
    store.getState().setViewMode('stream')
    store.getState().setVisibilityMode('path')
    const after = store.getState()
    expect(after.compiled).toBe(before.compiled)
    expect(after.compiled.score).toBe(before.compiled.score)
    expect(after.compiled.world).toBe(before.compiled.world)
    expect(after.compiled.plan).toBe(before.compiled.plan)
    expect(after.preset).toBe(before.preset)
  })

  it('returns a stable fit camera with bounded navigation settings', () => {
    const context = { bounds: compiled.world.bounds, aspect: 16 / 9, config: DefaultCamera }
    const first = StaticCamera.getState(0, context)
    expect(StaticCamera.getState(8, context)).toEqual(first)
    expect(first.far).toBeGreaterThan(first.near)
    expect(DefaultCamera.minDistance).toBeGreaterThan(0)
    expect(DefaultCamera.maxDistance).toBeGreaterThan(DefaultCamera.minDistance)
  })
})
