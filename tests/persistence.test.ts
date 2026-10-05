import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDemoScore } from '../src/demo/score'
import { createStudioStore } from '../src/state/store'

let records: Map<string, unknown>
let put: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.resetModules()
  records = new Map()
  put = vi.fn((value: unknown, key: string) => records.set(key, structuredClone(value)))
  const db = {
    transaction() {
      const transaction = {
        oncomplete: undefined as (() => void) | undefined,
        objectStore: () => ({ get: (key: string) => ({ result: records.get(key) }), put }),
      }
      queueMicrotask(() => transaction.oncomplete?.())
      return transaction
    },
  }
  vi.stubGlobal('indexedDB', {
    open() {
      const request = { result: db, onsuccess: undefined as (() => void) | undefined }
      queueMicrotask(() => request.onsuccess?.())
      return request
    },
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('saved-library boundary', () => {
  it('returns all raw records for validation without discarding or overwriting damaged ones', async () => {
    const damaged = { id: 'score-2', filename: 'damaged.mid', seed: 107, score: { notes: [], tracks: [] } }
    const original = [{ id: 'score-1', filename: 'valid.mid', seed: 107, score: createDemoScore() }, damaged, null]
    records.set('sessions', structuredClone(original))
    const { loadSavedState } = await import('../src/state/persistence')
    const loaded = await loadSavedState()
    expect(loaded.sessions).toEqual(original)
    expect(createStudioStore().getState().restoreSessions(loaded.sessions, damaged.id))
      .toEqual({ restored: 1, rejected: 2 })
    expect(records.get('sessions')).toEqual(original)
    expect(put).not.toHaveBeenCalled()
  })

  it.each([null, { version: 2, sessions: [] }])('preserves an unknown library format for recovery: %j', async original => {
    records.set('sessions', original)
    const { loadSavedState } = await import('../src/state/persistence')
    expect((await loadSavedState()).sessions).toEqual(original)
    expect(records.get('sessions')).toEqual(original)
    expect(put).not.toHaveBeenCalled()
  })

  it('uses an empty library only when the saved key is absent and still saves valid scores', async () => {
    const { loadSavedState, saveSessions } = await import('../src/state/persistence')
    expect((await loadSavedState()).sessions).toEqual([])
    const saved = [{ id: 'score-1', filename: 'study.mid', seed: 107, score: createDemoScore() }]
    await saveSessions(saved)
    const restored = (await loadSavedState()).sessions
    expect(restored).toEqual(saved)
    expect(createStudioStore().getState().restoreSessions(restored, saved[0]!.id)).toEqual({ restored: 1, rejected: 0 })
  })
})
