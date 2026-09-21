import { describe, expect, it } from 'vitest'
import { writeFileSync, mkdirSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { syntheticScore } from './fixtures/syntheticScore'
import { compileScore } from '../src/engine/compile'
import { ConstellationGeometryStrategy } from '../src/engine/music-geometry/strategies/constellation'
import { createMusicalPresentation, evaluateLead, visibleStreamNotes } from '../src/visual/presentation/musicalPresentation'
import { createRelations, selectRelations } from '../src/visual/presentation/relations'
import { createDisplayIndex, selectDisplayNodes } from '../src/visual/presentation/renderBudget'
import { DefaultPresentation } from '../src/visual/presentation/defaultPresentation'
import { evaluateNodePresentation } from '../src/visual/presentation/evaluatePresentation'
import { evaluatePerformer } from '../src/engine/choreography/evaluator'
import { createEnsemblePresentation, visibleEnsembleNotes } from '../src/visual/presentation/ensemblePresentation'

const rows: object[] = []
const measured = <T,>(fn: () => T) => { const start = performance.now(); const value = fn(); return { value, ms: performance.now() - start } }
describe('large score baseline', () => {
  for (const count of [100, 700, 2000, 5000]) it(`compiles and seeks an original ${count}-note fixture`, () => {
    const score = syntheticScore(count)
    const compiled = measured(() => compileScore(score, ConstellationGeometryStrategy, 107))
    const { world, plan } = compiled.value
    const prepared = measured(() => createMusicalPresentation(score, DefaultPresentation))
    const model = prepared.value
    const ensemble = measured(() => createEnsemblePresentation(score, model))
    const structure = measured(() => createRelations(world, score, model, DefaultPresentation.relations))
    const displayIndex = measured(() => createDisplayIndex(world))
    const times = Array.from({ length: 120 }, (_, i) => score.duration * ((i * 37) % 120) / 120)
    const seeks = times.map(time => measured(() => {
      evaluatePerformer(plan.performers[0]!, time)
      evaluateLead(model, time)
      return visibleStreamNotes(model, time, DefaultPresentation.stream)
    }).ms).sort((a, b) => a - b)
    const ensembleSeeks = times.map(time => measured(() => visibleEnsembleNotes(ensemble.value, time)).ms).sort((a, b) => a - b)
    const frames = times.map(time => measured(() => {
      const ids = new Set(world.nodes.filter(n => n.time >= time - 5 && n.time <= time + 8)
        .sort((a, b) => Math.abs(a.time - time) - Math.abs(b.time - time)).slice(0, 96).map(n => n.id))
      for (const node of world.nodes) evaluateNodePresentation(node, time, 'focus', DefaultPresentation.visibility)
      return structure.value.relations.filter(edge => ids.has(edge.fromId) && ids.has(edge.toId)).length
    }).ms).sort((a, b) => a - b)
    const localFrames = times.map(time => measured(() => {
      const selected = selectDisplayNodes(displayIndex.value, time, 'focus', DefaultPresentation.visibility, 0.5)
      for (const node of selected) evaluateNodePresentation(node, time, 'focus', DefaultPresentation.visibility)
      return selectRelations(structure.value, new Set(selected.map(n => n.id)), time, 'focus', displayIndex.value.density, 0.5, DefaultPresentation)
    }).ms).sort((a, b) => a - b)
    expect(score.notes).toHaveLength(count)
    expect(plan.events.length).toBeGreaterThan(0)
    expect(seeks.every(Number.isFinite)).toBe(true)
    rows.push({ count, nodes: world.nodes.length, edges: structure.value.relations.length,
      compileMs: compiled.ms, presentationMs: prepared.ms, relationsMs: structure.ms,
      ensembleMs: ensemble.ms, ensembleSeekP95Ms: ensembleSeeks[114],
      worldJsonBytes: Buffer.byteLength(JSON.stringify(world)), planJsonBytes: Buffer.byteLength(JSON.stringify(plan)),
      seekP95Ms: seeks[114], legacyScanP95Ms: frames[114], localFocusP95Ms: localFrames[114],
      displayIndexMs: displayIndex.ms, streamBudget: DefaultPresentation.stream.maxVisibleNotes })
    if (count === 5000 && process.env.HM_BENCHMARK) {
      mkdirSync('artifacts/complex-music', { recursive: true })
      writeFileSync(`artifacts/complex-music/${process.env.HM_BENCHMARK}.json`, JSON.stringify({ runtime: process.version, platform: process.platform, rows }, null, 2))
      console.log(JSON.stringify(rows, null, 2))
    }
  })
})
