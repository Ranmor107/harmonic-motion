import { describe, expect, it } from 'vitest'
import { createDemoScore } from '../src/demo/score'
import { compileScore } from '../src/engine/compile'
import { ConstellationGeometryStrategy as strategy } from '../src/engine/music-geometry/strategies/constellation'
import { evaluateSegment, evaluateTrajectory } from '../src/engine/choreography/trajectory'
import { evaluateNode, evaluatePerformer, eventsInWindow } from '../src/engine/choreography/evaluator'
import { planPerformance } from '../src/engine/choreography/planner'
import { normalizeScore } from '../src/midi/normalize'
import { seededRandom } from '../src/utils/math'
import { createStudioStore } from '../src/state/store'

const score = createDemoScore()
const compiled = compileScore(score, strategy, 107)

describe('Music Geometry Engine', () => {
  it('compiles the same score + strategy + seed identically', () => {
    expect(compileScore(score, strategy, 107)).toEqual(compiled)
    expect(JSON.parse(JSON.stringify(compiled))).toEqual(compiled)
    expect(compileScore(score, strategy, 108).world.nodes.map(node => node.position)).not.toEqual(compiled.world.nodes.map(node => node.position))
  })

  it('does not mutate its input score', () => {
    const before = JSON.stringify(score)
    compileScore(score, strategy, 9)
    expect(JSON.stringify(score)).toBe(before)
  })

  it('maps every note once, preserves a chord, and has valid connections and bounds', () => {
    const { world } = compiled
    expect(world.nodes).toHaveLength(8)
    expect(world.nodes.flatMap(node => node.noteIds).sort()).toEqual(score.notes.map(note => note.id).sort())
    expect(world.nodes.find(node => node.kind === 'chord')!.noteIds).toHaveLength(3)
    const ids = new Set(world.nodes.map(node => node.id))
    for (const edge of world.connections) {
      expect(ids.has(edge.fromNodeId)).toBe(true)
      expect(ids.has(edge.toNodeId)).toBe(true)
    }
    for (const node of world.nodes) for (const axis of ['x', 'y', 'z'] as const) {
      expect(node.position[axis]).toBeGreaterThanOrEqual(world.bounds.min[axis])
      expect(node.position[axis]).toBeLessThanOrEqual(world.bounds.max[axis])
    }
    expect(world.nodes[3]!.position.y).toBeGreaterThan(world.nodes[0]!.position.y)
  })

  it('changes arrival times without turning time into the X axis', () => {
    const shifted = structuredClone(score)
    for (const track of shifted.tracks) for (const note of track.notes) note.startTime += 30
    // StructuredClone retains shared note references between score.notes and track.notes.
    shifted.duration += 30
    const other = compileScore(shifted, strategy, 107)
    other.world.nodes.forEach((node, index) => {
      for (const axis of ['x', 'y', 'z'] as const) expect(node.position[axis]).toBeCloseTo(compiled.world.nodes[index]!.position[axis], 10)
    })
    expect(other.plan.events[0]!.time).toBeCloseTo(compiled.plan.events[0]!.time + 30)
  })

  it('preserves multi-track chord membership', () => {
    const multi = normalizeScore({ metadata: { title: 'Two voices', source: 'demo' }, tracks: [60, 67].map((midi, index) => ({
      name: `Voice ${index}`, channel: index, instrument: 0,
      notes: [{ time: 0, duration: 1, midi, velocity: 0.6 }],
    })) })
    const world = compileScore(multi, strategy, 0).world
    expect(world.nodes).toHaveLength(1)
    expect(world.nodes[0]!.layerIds).toHaveLength(2)
    expect(world.layers).toHaveLength(2)
  })

  it('handles empty and single-node worlds without invalid segments', () => {
    const empty = normalizeScore({ metadata: { title: 'Empty', source: 'demo' }, tracks: [] })
    expect(compileScore(empty, strategy, 0).plan.performers).toEqual([])
    const one = normalizeScore({ metadata: { title: 'One', source: 'demo' }, tracks: [{ name: '', channel: 0, instrument: 0, notes: [{ time: 2, duration: 1, midi: 60, velocity: 1 }] }] })
    const result = compileScore(one, strategy, 0)
    expect(result.plan.performers[0]!.trajectorySegments).toHaveLength(0)
    expect(evaluatePerformer(result.plan.performers[0]!, 2.5)).toEqual(result.world.nodes[0]!.position)
  })

  it('keeps the PRNG reproducible and in [0, 1)', () => {
    const a = seededRandom(42)
    const b = seededRandom(42)
    for (let index = 0; index < 100; index++) {
      const value = a()
      expect(value).toBe(b())
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe('Choreography and random access', () => {
  it('arrives at every node at the exact musical timestamp', () => {
    const performer = compiled.plan.performers[0]!
    for (const segment of performer.trajectorySegments) {
      expect(evaluateSegment(segment, segment.startTime)).toEqual(segment.curve.p0)
      expect(evaluateSegment(segment, segment.endTime)).toEqual(segment.curve.p3)
      expect(evaluateTrajectory(segment.curve, -1)).toEqual(segment.curve.p0)
      expect(evaluateTrajectory(segment.curve, 2)).toEqual(segment.curve.p3)
    }
    for (const node of compiled.world.nodes) expect(evaluatePerformer(performer, node.time)).toEqual(node.position)
  })

  it('has identical direct-seek and sequentially evaluated positions', () => {
    const performer = compiled.plan.performers[0]!
    const direct = evaluatePerformer(performer, 7.35)
    for (let frame = 0; frame < 441; frame++) evaluatePerformer(performer, frame / 60)
    expect(evaluatePerformer(performer, 7.35)).toEqual(direct)
    expect(evaluatePerformer(performer, 100)).toEqual(compiled.world.nodes.at(-1)!.position)
    expect(evaluatePerformer(performer, 0)).toEqual(compiled.world.nodes[0]!.position)
  })

  it('reconstructs node state and transient events when seeking backward', () => {
    const chord = compiled.world.nodes[4]!
    expect(evaluateNode(chord, 5)).toBe('upcoming')
    expect(evaluateNode(chord, 5.2)).toBe('active')
    expect(evaluateNode(chord, 7)).toBe('past')
    expect(eventsInWindow(compiled.plan, 5.4, 0.65).map(event => event.type)).toEqual(['chord-hit'])
    expect(eventsInWindow(compiled.plan, 5.1, 0.65)).toEqual([])
  })

  it('preserves duration and note/chord events in a serializable plan', () => {
    expect(compiled.plan.duration).toBe(score.duration)
    expect(compiled.plan.events).toHaveLength(8)
    expect(compiled.plan.events[4]).toMatchObject({ type: 'chord-hit', time: 5.2 })
    expect(planPerformance(compiled.world, score)).toEqual(compiled.plan)
  })

  it('fails clearly if a strategy asks one performer to arrive at two places simultaneously', () => {
    const world = structuredClone(compiled.world)
    world.nodes[1]!.time = world.nodes[0]!.time
    expect(() => planPerformance(world, score)).toThrow('one node per onset')
  })
})

describe('Independent extension points', () => {
  it('changing theme, effects, environment, camera preserves exact compiled references', () => {
    const store = createStudioStore()
    const before = store.getState()
    const json = JSON.stringify(before.compiled)
    store.getState().setPreset({
      ...before.preset, id: 'test-ink', theme: { ...before.preset.theme, id: 'ink', palette: { ...before.preset.theme.palette, note: '#000000' } },
      effects: { ...before.preset.effects, hit: { ...before.preset.effects.hit, enabled: false } },
      environment: { type: 'solid', color: '#ffffff' }, camera: { ...before.preset.camera, fov: 55 },
    })
    expect(store.getState().compiled).toBe(before.compiled)
    expect(JSON.stringify(store.getState().compiled)).toBe(json)
  })

  it('accepts another geometry strategy without changing visuals or playback', () => {
    const alternate = { id: 'test-offset', generate: (...args: Parameters<typeof strategy.generate>) => {
      const world = strategy.generate(...args)
      return { ...world, metadata: { ...world.metadata, strategyId: 'test-offset' } }
    } }
    expect(compileScore(score, alternate, 107).world.metadata.strategyId).toBe('test-offset')
  })

  it('regenerates geometry while retaining score and all event times', () => {
    const store = createStudioStore()
    const before = store.getState()
    store.getState().regenerate()
    const after = store.getState()
    expect(after.seed).toBe(before.seed + 1)
    expect(after.compiled.score).toBe(before.compiled.score)
    expect(after.compiled.plan.events).toEqual(before.compiled.plan.events)
    expect(after.compiled.world).not.toEqual(before.compiled.world)
  })
})
