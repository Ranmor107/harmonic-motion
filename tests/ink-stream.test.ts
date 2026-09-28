import { afterEach, describe, expect, it, vi } from 'vitest'
import { createStudioStore } from '../src/state/store'
import { resolveStreamPreset } from '../src/visual/presets/inkStream'
import { inkNoteAppearance } from '../src/visual/effects/inkAppearance'
import { DefaultPreset } from '../src/visual/presets/defaultPreset'
import { createMusicalPresentation, visibleStreamNotes } from '../src/visual/presentation/musicalPresentation'
import { syntheticScore } from './fixtures/syntheticScore'

describe('Ink Stream appearance', () => {
  it('keeps cached music and camera/presentation identities across style, view and song switches', () => {
    const store = createStudioStore()
    const original = store.getState()
    original.setPreset({ ...original.preset, effects: {
      ...original.preset.effects, hit: { ...original.preset.effects.hit, enabled: false },
      trail: { ...original.preset.effects.trail, enabled: false }, particles: { ...original.preset.effects.particles, enabled: false },
    } })
    const base = store.getState().preset
    for (const view of ['stream', 'ensemble', 'constellation', 'stream'] as const) {
      store.getState().setViewMode(view)
      store.getState().setStreamStyleId('ink')
      const state = store.getState()
      const ink = resolveStreamPreset(state.preset, view, state.streamStyleId)
      expect(state.compiled).toBe(original.compiled)
      expect(state.compiled.world).toBe(original.compiled.world)
      expect(state.compiled.plan).toBe(original.compiled.plan)
      expect(ink.presentation).toBe(base.presentation)
      expect(ink.camera).toBe(base.camera)
      expect(ink.effects.hit.enabled).toBe(false)
      expect(ink.effects.trail.enabled).toBe(false)
      expect(ink.effects.particles.enabled).toBe(false)
      if (view !== 'stream') expect(ink).toBe(base)
    }
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    store.getState().setStreamStyleId('ink')
    expect(listener).not.toHaveBeenCalled()
    unsubscribe()
    store.getState().setScore(syntheticScore(128))
    expect(store.getState().streamStyleId).toBe('ink')
    store.getState().selectSession(original.activeSessionId)
    expect(store.getState().compiled).toBe(original.compiled)
    store.getState().setStreamStyleId('original')
    expect(resolveStreamPreset(base, 'stream', store.getState().streamStyleId)).toBe(base)
  })

  it('reconstructs the same bounded marks after arbitrary seeks and retains dense note/chord budgets', () => {
    const score = syntheticScore(12000, true)
    const ink = resolveStreamPreset(DefaultPreset, 'stream', 'ink')
    const model = createMusicalPresentation(score, ink.presentation)
    const sample = (time: number) => visibleStreamNotes(model, time, ink.presentation.stream)
      .map(note => ({ id: note.id, ...inkNoteAppearance(note, time, ink.presentation.stream, ink.effects) }))
    const at = sample(11.13)
    for (const time of [0, 24, 5, score.duration, 11.13]) sample(time)
    expect(sample(11.13)).toEqual(at)
    expect(at.length).toBeLessThanOrEqual(ink.presentation.stream.maxVisibleNotes)
    expect(at.filter(mark => mark.washOpacity > 0).length).toBeLessThanOrEqual(at.length)
    expect(at.every(mark => mark.washRadius <= ink.effects.hit.radius + ink.effects.hit.expansion)).toBe(true)
    expect(model.positions).toEqual(createMusicalPresentation(score, DefaultPreset.presentation).positions)
  })

  it('starts wash at onset, keeps a sustained core, and ends all marks without accumulated history', () => {
    const ink = resolveStreamPreset(DefaultPreset, 'stream', 'ink')
    const note = { ...syntheticScore(4).notes[0]!, startTime: 10, duration: 4 }
    const at = (time: number) => inkNoteAppearance(note, time, ink.presentation.stream, ink.effects)
    expect(at(10 - ink.presentation.stream.leadInTime - .001)).toMatchObject({ opacity: 0, scale: 0, washOpacity: 0 })
    expect(at(9.99).washOpacity).toBe(0)
    expect(at(10).washOpacity).toBeGreaterThan(0)
    expect(at(10.4).washRadius).toBeGreaterThan(at(10).washRadius)
    expect(at(10 + ink.effects.hit.lifetime).washOpacity).toBe(0)
    expect(at(13)).toMatchObject({ phase: 'active', opacity: 1, washOpacity: 0 })
    expect(at(14.1).phase).toBe('fade')
    expect(at(14 + ink.presentation.stream.fadeOutTime + .001)).toMatchObject({ opacity: 0, scale: 0, washRadius: 0 })
    const disabled = { ...ink.effects, hit: { ...ink.effects.hit, enabled: false } }
    expect(inkNoteAppearance(note, 10, ink.presentation.stream, disabled)).toMatchObject({ opacity: 1, washOpacity: 0, washRadius: 0 })
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
    expect(saved.preferences).toEqual({ ...preferences, streamStyleId: style === 'ink' ? 'ink' : 'original' })
  })
})

describe('local Ink asset preparation', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })
  it('shares a single completed load across warm switches and allows retry after failure', async () => {
    vi.resetModules()
    const images: { onload: () => void; onerror: () => void; src: string }[] = []
    vi.stubGlobal('Image', class {
      onload = () => {}
      onerror = () => {}
      src = ''
      constructor() { images.push(this) }
    })
    const { prepareInkAssets } = await import('../src/ui/inkAssets')
    const first = prepareInkAssets()
    expect(prepareInkAssets()).toBe(first)
    expect(images).toHaveLength(1)
    const failure = expect(first).rejects.toThrow('Select Ink to retry')
    images[0]!.onerror()
    await failure
    const retry = prepareInkAssets()
    expect(images).toHaveLength(2)
    images[1]!.onload()
    await retry
    for (let i = 0; i < 20; i++) expect(prepareInkAssets()).toBe(retry)
    expect(images).toHaveLength(2)
  })
})
