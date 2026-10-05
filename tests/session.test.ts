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
    expect(restored).toEqual({ restored: 2, rejected: 0 })
    expect(store.getState()).toMatchObject({ activeSessionId: 'score-8', seed: 302 })
    expect(store.getState().compiled.score).toBe(second)
    expect(store.getState().sessions[1]!.compiled.world.nodes.length).toBeGreaterThan(0)
    expect(store.getState().sessions[2]!.compiled.plan.events.length).toBeGreaterThan(0)
    store.getState().addScores([{ score: createDemoScore(), filename: 'new.mid' }])
    expect(store.getState().activeSessionId).toBe('score-9')
    store.getState().removeSession('score-7')
    expect(store.getState().sessions.map(session => session.id)).toEqual(['score-0', 'score-8', 'score-9'])
  })

  it.each([
    ['missing metadata', (score: ReturnType<typeof createDemoScore>) => { Reflect.deleteProperty(score, 'metadata') }],
    ['non-finite duration', (score: ReturnType<typeof createDemoScore>) => { score.duration = NaN }],
    ['incorrect duration', (score: ReturnType<typeof createDemoScore>) => { score.duration += 1 }],
    ['unordered notes', (score: ReturnType<typeof createDemoScore>) => { score.notes.reverse() }],
    ['sparse note array', (score: ReturnType<typeof createDemoScore>) => { Reflect.deleteProperty(score.notes, 0) }],
    ['duplicate note IDs', (score: ReturnType<typeof createDemoScore>) => { score.notes[1]!.id = score.notes[0]!.id }],
    ['invalid velocity', (score: ReturnType<typeof createDemoScore>) => { score.notes[0]!.velocity = NaN }],
    ['invalid pitch', (score: ReturnType<typeof createDemoScore>) => { score.notes[0]!.midi = 128 }],
    ['inconsistent pitch class', (score: ReturnType<typeof createDemoScore>) => { score.notes[0]!.pitchClass = 11 }],
    ['missing track member', (score: ReturnType<typeof createDemoScore>) => { score.tracks[0]!.notes.pop() }],
    ['duplicate track IDs', (score: ReturnType<typeof createDemoScore>) => { score.tracks.push(structuredClone(score.tracks[0]!)) }],
    ['inconsistent track data', (score: ReturnType<typeof createDemoScore>) => {
      score.tracks[0]!.notes[0] = { ...score.tracks[0]!.notes[0]!, duration: 100 }
    }],
    ['invalid channel', (score: ReturnType<typeof createDemoScore>) => { score.tracks[0]!.channel = 17 }],
    ['missing chords', (score: ReturnType<typeof createDemoScore>) => { Reflect.deleteProperty(score, 'chords') }],
    ['incorrect chord members', (score: ReturnType<typeof createDemoScore>) => { score.chords[0]!.notes.pop() }],
    ['invalid tempo map', (score: ReturnType<typeof createDemoScore>) => { score.metadata.tempoMap = [{ time: 0, bpm: NaN }] }],
  ])('rejects saved scores with %s before they become active', (_label, corrupt) => {
    const store = createStudioStore()
    const original = store.getState().compiled
    const score = structuredClone(createDemoScore())
    corrupt(score)
    const record = { id: 'score-1', filename: 'damaged.mid', seed: 107, score }
    const before = structuredClone(record)
    expect(store.getState().restoreSessions([record], record.id)).toEqual({ restored: 0, rejected: 1 })
    expect(store.getState().compiled).toBe(original)
    expect(record).toEqual(before)
  })

  it('reports partial recovery without mutating failed records or activating them', () => {
    const store = createStudioStore()
    const good = { id: 'score-7', filename: 'good.mid', seed: 301, score: createDemoScore() }
    const failed = { id: 'score-8', filename: 'failed.mid', seed: 107, score: { notes: [], tracks: [], duration: 1 } }
    const records = [good, failed]
    const before = structuredClone(records)
    expect(store.getState().restoreSessions(records, failed.id)).toEqual({ restored: 1, rejected: 1 })
    expect(store.getState().sessions.map(session => session.id)).toEqual(['score-0', good.id])
    expect(store.getState().activeSessionId).toBe('score-0')
    expect(store.getState().sessions[1]!.compiled.score).toBe(good.score)
    expect(records).toEqual(before)
  })

  it.each([null, 1, { version: 2, sessions: [] }])('rejects unknown library containers: %j', records => {
    const store = createStudioStore()
    expect(store.getState().restoreSessions(records, 'score-1')).toEqual({ restored: 0, rejected: 1 })
    expect(store.getState().sessions).toHaveLength(1)
  })

  it('reports duplicate IDs and unknown record versions as rejected', () => {
    const store = createStudioStore()
    const record = { id: 'score-1', filename: 'good.mid', seed: 107, score: createDemoScore() }
    expect(store.getState().restoreSessions([record, record, { ...record, id: 'score-2', version: 2 }], record.id))
      .toEqual({ restored: 1, rejected: 2 })
    expect(store.getState().activeSessionId).toBe(record.id)
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
