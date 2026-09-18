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
