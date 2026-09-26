import { describe, expect, it, vi } from 'vitest'
import { createStudioStore } from '../src/state/store'
import { createDemoScore } from '../src/demo/score'
import { PlaybackClock } from '../src/playback/clock'
import { PlaybackController } from '../src/playback/controller'

describe('score sessions', () => {
  it('imports several scores once, switches by exact cached references and retains visual preferences', () => {
    const store = createStudioStore()
    const original = store.getState()
    const a = createDemoScore()
    const b = { ...createDemoScore(), metadata: { ...a.metadata, title: 'Second' } }
    store.getState().addScores([{ score: a, filename: 'a.mid' }, { score: b, filename: 'b.mid' }])
    const state = store.getState()
    expect(state.sessions).toHaveLength(3)
    const first = state.sessions[1]!
    const second = state.sessions[2]!
    expect(first.compiled.score).toBe(a)
    expect(second.compiled.score).toBe(b)
    expect(state.activeSessionId).toBe(first.id)
    state.setViewMode('ensemble')
    state.setVisibilityMode('path')
    state.setPreset({ ...state.preset, id: 'test', presentation: { ...state.preset.presentation, stream: { ...state.preset.presentation.stream, radius: 1.8 } } })
    const preset = store.getState().preset
    state.selectSession(second.id)
    state.selectSession(first.id)
    expect(store.getState().compiled).toBe(first.compiled)
    expect(store.getState().compiled.world).toBe(first.compiled.world)
    expect(store.getState().compiled.plan).toBe(first.compiled.plan)
    expect(store.getState()).toMatchObject({ viewMode: 'ensemble', visibilityMode: 'path' })
    expect(store.getState().preset).toBe(preset)
    state.selectSession(original.activeSessionId)
    expect(store.getState().compiled).toBe(original.compiled)
  })

  it('regenerates only the active session and restores its seed on return', () => {
    const store = createStudioStore()
    const original = store.getState()
    original.setScore(createDemoScore())
    const currentId = store.getState().activeSessionId
    store.getState().regenerate()
    const regenerated = store.getState().compiled
    const nextSeed = store.getState().seed
    store.getState().selectSession(original.activeSessionId)
    expect(store.getState().compiled).toBe(original.compiled)
    expect(store.getState().seed).toBe(original.seed)
    store.getState().selectSession(currentId)
    expect(store.getState().compiled).toBe(regenerated)
    expect(store.getState().seed).toBe(nextSeed)
  })

  it('restores saved scores by recompiling them and continues unique session IDs', () => {
    const store = createStudioStore()
    const first = createDemoScore()
    const second = { ...createDemoScore(), metadata: { ...first.metadata, title: 'Saved second' } }
    const restored = store.getState().restoreSessions([
      { id: 'score-7', filename: 'first.mid', seed: 301, score: first },
      { id: 'score-8', filename: 'second.mid', seed: 302, score: second },
    ], 'score-8')
    expect(restored).toBe(2)
    expect(store.getState()).toMatchObject({ activeSessionId: 'score-8', seed: 302 })
    expect(store.getState().compiled.score).toBe(second)
    expect(store.getState().sessions[1]!.compiled.world.nodes.length).toBeGreaterThan(0)
    expect(store.getState().sessions[2]!.compiled.plan.events.length).toBeGreaterThan(0)
    store.getState().addScores([{ score: createDemoScore(), filename: 'new.mid' }])
    expect(store.getState().activeSessionId).toBe('score-9')
    store.getState().removeSession('score-7')
    expect(store.getState().sessions.map(session => session.id)).toEqual(['score-0', 'score-8', 'score-9'])
  })

  it('removes inactive and active sessions and falls back to the cached demo when the last score is removed', () => {
    const store = createStudioStore()
    const original = store.getState()
    original.setScore(createDemoScore())
    const current = store.getState()
    current.removeSession(original.activeSessionId)
    expect(store.getState().compiled).toBe(current.compiled)
    current.removeSession(current.activeSessionId)
    expect(store.getState().sessions).toHaveLength(1)
    expect(store.getState().compiled).toBe(original.compiled)
  })

  it('stops and resets time when loading another cached score, cancelling a late play request', async () => {
    const store = createStudioStore()
    const audio = { load: vi.fn(async () => {}), play: vi.fn(async () => {}), pause: vi.fn(), stop: vi.fn(), seek: vi.fn(), dispose: vi.fn() }
    const clock = new PlaybackClock(20, () => 10)
    const controller = new PlaybackController(clock, audio)
    await controller.load(store.getState().compiled.score)
    await controller.play()
    controller.seek(5)
    store.getState().setScore(createDemoScore())
    controller.stop()
    await controller.load(store.getState().compiled.score)
    expect(audio.stop).toHaveBeenCalledOnce()
    expect(clock.getState()).toMatchObject({ time: 0, status: 'stopped' })
    let unlock!: () => void
    audio.play.mockImplementationOnce(() => new Promise<void>(resolve => { unlock = resolve }))
    const pending = controller.play()
    await controller.load(store.getState().sessions[0]!.compiled.score)
    unlock()
    await pending
    expect(clock.getState()).toMatchObject({ time: 0, status: 'stopped' })
  })
})
