import { describe, expect, it } from 'vitest'
import { PerspectiveCamera, Vector3 } from 'three'
import { syntheticScore } from './fixtures/syntheticScore'
import { compileScore } from '../src/engine/compile'
import { ConstellationGeometryStrategy } from '../src/engine/music-geometry/strategies/constellation'
import { DefaultPresentation as config } from '../src/visual/presentation/defaultPresentation'
import { createMusicalPresentation, evaluateLead, noteLifecycle, visiblePhrases, visibleStreamNotes } from '../src/visual/presentation/musicalPresentation'
import { createRelations, RELATION_PRIORITY, selectRelations } from '../src/visual/presentation/relations'
import { complexityPolicy, createDisplayIndex, nearestNodes, selectDisplayNodes } from '../src/visual/presentation/renderBudget'
import { RIBBON_STAGE, streamCameraTarget } from '../src/visual/camera/streamCamera'
import { DefaultCamera, StaticCamera } from '../src/visual/camera/staticCamera'

const score = syntheticScore(2000)
const compiled = compileScore(score, ConstellationGeometryStrategy, 107)
const model = createMusicalPresentation(score, config)
const structure = createRelations(compiled.world, score, model, config.relations)
const index = createDisplayIndex(compiled.world)

describe('complex music presentation', () => {
  it('keeps Ribbon front-facing with the previous Helix depth and horizontal follow', () => {
    expect(RIBBON_STAGE.direction).toEqual({ x: 0, y: 0, z: 1 })
    const point = evaluateLead(model, 40)
    expect(streamCameraTarget(model, 40)).toEqual({ x: point.x, y: 0, z: 0 })
    expect(Math.max(...model.lead.map(p => p.position.z)) - Math.min(...model.lead.map(p => p.position.z))).toBeGreaterThan(2)
    // At its first onset the previous Helix starts on the positive Z radius.
    expect(model.lead[0]!.position.z).toBe(1.15)
  })
  it('routes dense relations deterministically with exact musical endpoints', () => {
    expect(createRelations(compiled.world, score, model, config.relations)).toEqual(structure)
    const nodes = new Map(compiled.world.nodes.map(node => [node.id, node]))
    for (const edge of structure.relations.filter(edge => edge.kind !== 'chord')) {
      expect(edge.points[0]).toEqual(nodes.get(edge.fromId)!.position)
      const end = nodes.get(edge.toId)!.position
      expect(edge.points.at(-1)!.x).toBeCloseTo(end.x)
      expect(edge.points.at(-1)!.y).toBeCloseTo(end.y)
      expect(edge.points.at(-1)!.z).toBeCloseTo(end.z)
    }
    expect(structure.relations.some(edge => edge.kind === 'voice' && Math.abs(edge.points[6]!.z - (edge.points[0]!.z + edge.points.at(-1)!.z) / 2) > 0.5)).toBe(true)
  })

  it('reserves hierarchy budgets with lead first and temporal emphasis', () => {
    const nodes = selectDisplayNodes(index, 40, 'focus', config.visibility, 1)
    const selected = selectRelations(structure, new Set(nodes.map(n => n.id)), 40, 'focus', index.density, 1, config)
    expect(selected.length).toBeGreaterThan(0)
    expect(selected.length).toBeLessThanOrEqual(config.relations.maxEdges)
    expect(selected[0]!.edge.kind).toBe('lead')
    const ranks = selected.map(item => RELATION_PRIORITY[item.edge.kind])
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
    const leads = selected.filter(item => item.edge.kind === 'lead')
    expect(Math.max(...leads.map(item => item.opacity))).toBeGreaterThan(Math.min(...leads.map(item => item.opacity)))
    expect(selected.some(item => item.edge.kind === 'voice')).toBe(true)
    expect(selected.some(item => item.edge.kind === 'chord')).toBe(true)
  })

  it('limits LOD deterministically, keeps full-piece landmarks, and preserves world/plan', () => {
    const before = JSON.stringify(compiled)
    const far = selectDisplayNodes(index, 40, 'overview', config.visibility, 0)
    const near = selectDisplayNodes(index, 40, 'overview', config.visibility, 1)
    expect(far.length).toBeLessThanOrEqual(complexityPolicy(index.nodes.length, 0).overviewNodes)
    expect(near.length).toBeGreaterThan(far.length)
    expect(far).toContain(index.nodes[0])
    expect(far).toContain(index.nodes.at(-1))
    for (const time of [0, 50, 3, score.duration]) for (const mode of ['overview', 'focus', 'path'] as const) selectDisplayNodes(index, time, mode, config.visibility, 0.5)
    expect(selectDisplayNodes(index, 40, 'overview', config.visibility, 0)).toEqual(far)
    expect(JSON.stringify(compiled)).toBe(before)
  })

  it('reserves local display capacity for a chosen track without removing other tracks', () => {
    const trackIds = new Set(score.tracks[0]!.notes.map(note => note.id))
    const focusNodes = index.nodes.filter(node => node.noteIds.some(id => trackIds.has(id)))
    const selected = selectDisplayNodes(index, 40, 'focus', config.visibility, 1, focusNodes)
    const reserved = nearestNodes(focusNodes, 40, config.visibility.contextPast, config.visibility.contextFuture,
      Math.ceil(config.visibility.focusMaxNodes * 0.6))
    expect(selected.length).toBeLessThanOrEqual(config.visibility.focusMaxNodes)
    expect(reserved.every(node => selected.includes(node))).toBe(true)
    expect(selected.some(node => !focusNodes.includes(node))).toBe(true)
    expect(selectDisplayNodes(index, 40, 'focus', config.visibility, 1, focusNodes)).toEqual(selected)
  })

  it('matches nearest-window selection without scanning or sorting all nodes', () => {
    for (const time of [0, 0.72, 40, score.duration]) {
      const expected = index.nodes.filter(n => n.time >= time - 5 && n.time <= time + 8)
        .sort((a, b) => Math.abs(a.time - time) - Math.abs(b.time - time) || a.time - b.time).slice(0, 96)
      expect(nearestNodes(index.nodes, time, 5, 8, 96).map(n => n.id)).toEqual(expected.map(n => n.id))
    }
  })

  it('distinguishes a crowded region from isolated nodes without changing positions', () => {
    const nodes = index.nodes.slice(0, 30).map((node, i) => ({ ...node, position: i < 29 ? { x: i * 0.01, y: 0, z: 0 } : { x: 100, y: 100, z: 100 } }))
    const crowded = createDisplayIndex({ ...compiled.world, nodes })
    expect(crowded.density.get(nodes[0]!.id)).toBeGreaterThan(0)
    expect(crowded.density.get(nodes[29]!.id)).toBe(0)
    expect(crowded.nodes[0]!.position).toBe(nodes[0]!.position)
  })

  it('forms connected chord fans without introducing musical events', () => {
    const chord = compiled.world.nodes.find(n => n.kind === 'chord')!
    const fan = structure.relations.filter(r => r.kind === 'chord' && r.fromId === chord.id)
    expect(fan).toHaveLength(chord.noteIds.length)
    for (let i = 1; i < fan.length; i++) {
      expect(fan[i]!.points[0]!.x).toBeCloseTo(fan[i - 1]!.points.at(-1)!.x)
      expect(fan[i]!.points[0]!.y).toBeCloseTo(fan[i - 1]!.points.at(-1)!.y)
    }
  })

  it('reconstructs Ribbon and horizontal camera targets at arbitrary seeks without frame history', () => {
    const point = evaluateLead(model, 40)
    const camera = streamCameraTarget(model, 40)
    for (const time of [90, 1, 65, 0]) { evaluateLead(model, time); streamCameraTarget(model, time) }
    expect(evaluateLead(model, 40)).toEqual(point)
    expect(streamCameraTarget(model, 40)).toEqual(camera)
    const next = streamCameraTarget(model, 40.001)
    expect(Math.abs(next.x - camera.x)).toBeLessThan(0.02)
    expect([next.y, next.z]).toEqual([0, 0])
  })

  it('frames Ribbon front-on with its performer left of center', () => {
    const state = StaticCamera.getState(0, { bounds: RIBBON_STAGE.bounds, aspect: 16 / 9, config: { ...DefaultCamera, direction: RIBBON_STAGE.direction } })
    const camera = new PerspectiveCamera(state.fov, 16 / 9, state.near, state.far)
    camera.position.set(state.position.x, state.position.y, state.position.z)
    camera.lookAt(state.target.x, state.target.y, state.target.z); camera.updateMatrixWorld()
    const performer = new Vector3(0, 0, 0).project(camera)
    expect(performer.x).toBeLessThan(0)
    expect(performer.x).toBeGreaterThan(-0.5)
    expect(state.position.x).toBe(state.target.x)
    expect(state.position.y).toBe(state.target.y)
  })

  it('culls inactive phrase groups and preserves individual note lifecycles under seek', () => {
    const selected = visibleStreamNotes(model, 40, config.stream)
    const phrases = visiblePhrases(model, selected)
    expect(phrases.length).toBeLessThan(model.phrases.length / 4)
    expect(phrases.every(p => p.notes.some(n => selected.includes(n)))).toBe(true)
    const states = selected.map(n => noteLifecycle(n, 40, config.stream))
    visibleStreamNotes(model, 80, config.stream)
    expect(visibleStreamNotes(model, 40, config.stream)).toEqual(selected)
    expect(selected.map(n => noteLifecycle(n, 40, config.stream))).toEqual(states)
    expect(visiblePhrases(model, visibleStreamNotes(model, score.duration + 4, config.stream))).toEqual([])
  })

  it('retains a very long held note without reviving expired notes in its block', () => {
    const heldScore = syntheticScore(700)
    heldScore.notes[0]!.duration = 100
    const held = createMusicalPresentation(heldScore, config)
    const visible = visibleStreamNotes(held, 90, config.stream)
    expect(visible.map(n => n.id)).toEqual([heldScore.notes[0]!.id])
  })
})
