import { afterEach, describe, expect, it, vi } from 'vitest'
import { createStudioStore } from '../src/state/store'
import { normalizeInkMode, resolveStreamPreset } from '../src/visual/presets/inkStream'
import { DefaultPreset } from '../src/visual/presets/defaultPreset'
import { createInkPresentation, buildInkFrame, INK_LIMITS } from '../src/visual/presentation/inkPresentation'
import { normalizeScore } from '../src/midi/normalize'
import { syntheticScore } from './fixtures/syntheticScore'
import { PlaybackClock } from '../src/playback/clock'
import { PlaybackController } from '../src/playback/controller'

const config = DefaultPreset.presentation
const sample = () => normalizeScore({ metadata: { title: 'Ink phrases', source: 'demo' }, tracks: [
  { name: 'Melody', channel: 0, instrument: 0, notes: [
    { time: 1, duration: .5, midi: 67, velocity: .4 },
    { time: 1.6, duration: .5, midi: 67, velocity: .4 },
    { time: 2.2, duration: .5, midi: 67, velocity: .4 },
    { time: 4, duration: 2, midi: 72, velocity: .9 },
    { time: 8, duration: .5, midi: 64, velocity: .5 },
  ] },
  { name: 'Bass', channel: 1, instrument: 0, notes: [
    { time: 1, duration: 1, midi: 48, velocity: .4 },
    { time: 4.5, duration: 1, midi: 55, velocity: .4 },
  ] },
] })

describe('Ink folio integration', () => {
  it('retains music, time and audio load through repeated mode, style and view changes', async () => {
    const store = createStudioStore()
    const original = store.getState()
    const audio = { load: vi.fn(), play: vi.fn(), pause: vi.fn(), stop: vi.fn(), seek: vi.fn(), dispose: vi.fn() }
    const clock = new PlaybackClock(0, () => 10)
    const controller = new PlaybackController(clock, audio)
    await controller.load(original.compiled.score)
    controller.seek(8)
    await controller.play()
    for (let i = 0; i < 20; i++) {
      store.getState().setViewMode(i % 3 ? 'stream' : 'ensemble')
      store.getState().setStreamStyleId(i % 2 ? 'ink' : 'original')
      store.getState().setInkMode(i % 2 ? 'veins' : 'drops')
      const state = store.getState()
      const resolved = resolveStreamPreset(state.preset, state.viewMode, state.streamStyleId, state.inkMode)
      expect(state.compiled).toBe(original.compiled)
      expect(state.compiled.world).toBe(original.compiled.world)
      expect(state.compiled.plan).toBe(original.compiled.plan)
      expect(resolved.camera).toBe(original.preset.camera)
      expect(resolved.presentation).toBe(original.preset.presentation)
      expect(clock.getState()).toMatchObject({ time: 8, status: 'playing' })
    }
    expect(audio.load).toHaveBeenCalledTimes(1)
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    store.getState().setInkMode(store.getState().inkMode)
    expect(listener).not.toHaveBeenCalled()
    unsubscribe()
    store.getState().setScore(syntheticScore(64))
    store.getState().selectSession(original.activeSessionId)
    expect(store.getState().inkMode).toBe('veins')
    expect(store.getState().compiled).toBe(original.compiled)
  })

  it('preserves effects off and normalizes only the new visual preference', () => {
    const preset = { ...DefaultPreset, effects: { ...DefaultPreset.effects, hit: { ...DefaultPreset.effects.hit, enabled: false } } }
    expect(resolveStreamPreset(preset, 'stream', 'ink', 'veins')).toMatchObject({ inkMode: 'veins', effects: { hit: { enabled: false } } })
    expect(resolveStreamPreset(preset, 'ensemble', 'ink')).toBe(preset)
    for (const value of [undefined, null, 'brush', 'unknown']) expect(normalizeInkMode(value)).toBe('drops')
    expect(normalizeInkMode('veins')).toBe('veins')
  })

  it('maps strong/long notes, local repeats and actual chords while keeping the score immutable', () => {
    const score = sample(), before = JSON.stringify(score)
    const model = createInkPresentation(score, config, score.tracks[0]!.id)
    const frame = buildInkFrame(model, 'drops', 4.1, 1050, 620)
    const lead = score.tracks[0]!.notes
    const marks = lead.slice(0, 4).map(n => frame.find(m => m.source === n.id && m.type === 0)!)
    expect(marks[0]!.x).toBe(marks[1]!.x)
    expect(marks[1]!.x).toBe(marks[2]!.x)
    expect(marks[2]!.strength).toBeGreaterThan(marks[0]!.strength)
    expect(marks[3]!.duration).toBeGreaterThan(marks[0]!.duration)
    expect(marks[3]!.radius).toBeGreaterThan(marks[0]!.radius)
    expect(frame.some(m => m.type === 2)).toBe(true)
    expect(buildInkFrame(model, 'drops', 4.1, 1050, 620, false).some(m => m.type === 2)).toBe(false)
    expect(JSON.stringify(score)).toBe(before)
  })

  it('keeps thirty seconds of repeated lead and accompaniment notes visible in local groups', () => {
    const score = normalizeScore({ metadata: { title: 'Repeated pitches', source: 'demo' }, tracks: [60, 48].map((midi, channel) => ({
      name: `Voice ${channel}`, channel, instrument: 0,
      notes: Array.from({ length: 60 }, (_, index) => ({ time: index * .5, duration: .25, midi, velocity: .8 })),
    })) })
    const model = createInkPresentation(score, config, score.tracks[0]!.id)
    for (let index = 0; index < 60; index++) {
      const frame = buildInkFrame(model, 'drops', index * .5, 1050, 620)
      for (const [rank, track] of score.tracks.entries()) {
        const mark = frame.find(m => m.source === track.notes[index]!.id && m.type === 0)
        expect(mark).toBeDefined()
        expect(mark!.x).toBeGreaterThanOrEqual(0)
        expect(mark!.x).toBeLessThanOrEqual(1050)
        expect(mark!.memory).toBe(rank === 0 ? .9 : .3)
      }
    }
    for (const track of score.tracks) {
      const notes = model.notes.filter(n => n.note.trackId === track.id)
      expect(notes[0]!.anchor).toBe(notes[1]!.anchor)
      const groups = new Map<number, number>()
      for (const n of notes) groups.set(n.anchor, (groups.get(n.anchor) ?? 0) + 1)
      expect(Math.max(...groups.values())).toBeLessThanOrEqual(4)
      expect(notes.every(n => n.note.startTime - n.anchor <= 2.7)).toBe(true)
    }
    for (const mode of ['drops', 'veins'] as const) {
      const atEnd = buildInkFrame(model, mode, 30, 1050, 620)
      for (const track of score.tracks) expect(atEnd.some(m => m.source === track.notes.at(-1)!.id)).toBe(true)
      for (const time of [21.2, .1, 29.6, 8, 30]) buildInkFrame(model, mode, time, 1050, 620)
      expect(buildInkFrame(model, mode, 30, 1050, 620)).toEqual(atEnd)
    }
  })

  it('starts a new repeated-note deposit after a real rest', () => {
    const score = normalizeScore({ metadata: { title: 'Separated repeats', source: 'demo' }, tracks: [{
      name: 'Melody', channel: 0, instrument: 0,
      notes: [0, .6, 2, 2.6].map(time => ({ time, duration: .25, midi: 60, velocity: .8 })),
    }] })
    const model = createInkPresentation(score, config)
    expect(model.notes.map(n => n.anchor)).toEqual([0, 0, 2, 2])
    for (const mode of ['drops', 'veins'] as const) {
      const rest = buildInkFrame(model, mode, 1.6, 1050, 620)
      expect(rest.length).toBeGreaterThan(0)
      expect(rest.every(m => m.born <= .85)).toBe(true)
      expect(rest.every(m => score.notes.slice(0, 2).some(n => n.id === m.source))).toBe(true)
    }
  })

  it('deposits only inside source note times, keeps real rests and reconstructs after arbitrary seeks', () => {
    const score = sample(), model = createInkPresentation(score, config, score.tracks[0]!.id)
    for (const mode of ['drops', 'veins'] as const) {
      expect(buildInkFrame(model, mode, .99, 1050, 620)).toEqual([])
      const at = buildInkFrame(model, mode, 5, 1050, 620)
      for (const time of [9, 1, 28, 3.5, 5]) {
        const marks = buildInkFrame(model, mode, time, 1050, 620)
        for (const mark of marks) {
          const source = score.notes.find(n => n.id === mark.source)!
          expect(mark.born).toBeGreaterThanOrEqual(source.startTime)
          expect(mark.born).toBeLessThanOrEqual(source.startTime + source.duration)
          expect(mark.born).toBeLessThanOrEqual(time)
          expect(Object.values(mark).filter(v => typeof v === 'number').every(Number.isFinite)).toBe(true)
        }
      }
      expect(buildInkFrame(model, mode, 5, 1050, 620)).toEqual(at)
      const rest = buildInkFrame(model, mode, 7.5, 1050, 620)
      expect(rest.every(m => m.born <= 6)).toBe(true)
      expect(buildInkFrame(model, mode, 28, 1050, 620)).toEqual([])
    }
    const branch = model.notes.find(n => n.note.trackId === score.tracks[1]!.id && n.note.startTime === 4.5)!
    expect(branch.branch?.note.trackId).toBe(score.tracks[0]!.id)
    expect(model.notes.filter(n => n.next).every(n => n.next!.note.trackId === n.note.trackId)).toBe(true)
  })

  it('bounds dense frames and supports empty scores, held notes and narrow paper', () => {
    const score = syntheticScore(12000, true), model = createInkPresentation(score, config)
    for (const mode of ['drops', 'veins'] as const) for (const [w, h] of [[1050, 620], [360, 420]]) {
      const frame = buildInkFrame(model, mode, 13.2, w!, h!)
      expect(frame.length).toBeGreaterThan(0)
      expect(frame.length).toBeLessThanOrEqual(INK_LIMITS.marks)
      expect(new Set(frame.map(m => m.source)).size).toBeLessThanOrEqual(INK_LIMITS.notes)
      expect(frame.every(m => m.y >= 0 && m.y <= h! && m.radius > 0)).toBe(true)
    }
    expect(buildInkFrame(createInkPresentation({ ...score, notes: [], tracks: [], chords: [] }, config), 'veins', 0, 360, 420)).toEqual([])
    const held = normalizeScore({ metadata: { title: 'Held note', source: 'demo' }, tracks: [
      { name: 'Held', channel: 0, instrument: 0, notes: [{ time: 0, duration: 120, midi: 60, velocity: .7 }] },
    ] })
    const frame = buildInkFrame(createInkPresentation(held, config), 'veins', 90, 1050, 620)
    expect(frame.length).toBeGreaterThan(0)
    expect(frame.every(m => m.born <= 90 && m.duration > 0)).toBe(true)
    expect(buildInkFrame(createInkPresentation(held, config), 'drops', 90, 1050, 620).length).toBe(1)
  })
})
describe('saved Stream style compatibility', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })
  it.each([undefined, 'unknown', 'ink', 'original'])('only normalizes style %s, preserving old library and preferences', async style => {
    vi.resetModules()
    const preferences = { version: 1, activeSessionId: 'score-7', position: 123.4, viewMode: 'stream', visibilityMode: 'focus',
      effectsEnabled: false, volume: .4, muted: true, followViews: { constellation: false, stream: true, ensemble: false },
      melodyTracks: { 'score-7': 'track-1' }, ...(style === undefined ? {} : { streamStyleId: style }) }
    const sessions = [{ id: 'score-7', filename: 'Canon.mid', seed: 107, score: syntheticScore(16) }]
    const db = { transaction: () => {
      const transaction = { objectStore: () => ({ get: (key: string) => ({ result: key === 'preferences' ? preferences : sessions }) }), oncomplete: () => {} }
      queueMicrotask(() => transaction.oncomplete())
      return transaction
    } }
    vi.stubGlobal('indexedDB', { open: () => {
      const request = { result: db, onsuccess: () => {} }
      queueMicrotask(() => request.onsuccess())
      return request
    } })
    const { loadSavedState: load } = await import('../src/state/persistence')
    const saved = await load()
    expect(saved.sessions).toEqual(sessions)
    expect(saved.preferences).toEqual({ ...preferences, streamStyleId: style === 'ink' ? 'ink' : 'original', inkMode: 'drops' })
  })
})
