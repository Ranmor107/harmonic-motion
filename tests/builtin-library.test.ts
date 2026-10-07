import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BUILTIN_SCORES, isBuiltinSessionId, loadBuiltinScores } from '../src/demo/library'
import { createDemoScore } from '../src/demo/score'
import { parseMidi } from '../src/midi/parser'
import { createStudioStore } from '../src/state/store'
import { isSavedSession } from '../src/state/sessionValidation'

const builtin = { id: BUILTIN_SCORES[0].id, filename: BUILTIN_SCORES[0].filename, score: createDemoScore() }

afterEach(() => vi.unstubAllGlobals())

describe('built-in classical scores', () => {
  it('loads the five actual bundled MIDI files without changing their musical data', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const entry = BUILTIN_SCORES.find(candidate => candidate.url === url)!
      return new Response(Uint8Array.from(readFileSync(new URL(`../src/demo/assets/${entry.filename}`, import.meta.url))))
    }))
    const scores = await loadBuiltinScores()
    expect(scores).toHaveLength(5)
    expect(new Set(scores.map(entry => entry.id)).size).toBe(5)
    for (const [index, entry] of scores.entries()) {
      const definition = BUILTIN_SCORES[index]!
      const parsed = parseMidi(readFileSync(new URL(`../src/demo/assets/${entry.filename}`, import.meta.url)), entry.filename)
      expect(entry.score).toEqual({ ...parsed, metadata: { ...parsed.metadata, title: definition.title } })
      expect(entry.score.duration).toBeGreaterThan(60)
      expect(entry.score.notes.length).toBeGreaterThan(100)
      expect(isSavedSession({ ...entry, seed: 107 })).toBe(true)
      expect(isBuiltinSessionId(entry.id)).toBe(true)
    }
    expect(isBuiltinSessionId('builtin-user-import')).toBe(false)
  })

  it('reports a missing asset instead of parsing its error page as MIDI', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Not found', { status: 404 })))
    await expect(loadBuiltinScores()).rejects.toThrow('Could not load')
  })

  it('adds defaults to an empty library without treating them as restored records', () => {
    const store = createStudioStore()
    expect(store.getState().restoreSessions([], 'score-0', [builtin])).toEqual({ restored: 0, rejected: 0 })
    expect(store.getState().sessions.map(session => session.id)).toEqual(['score-0', builtin.id])
    expect(store.getState().activeSessionId).toBe('score-0')
  })

  it('preserves saved built-in seeds and scores, avoids duplicates and retains unique imported IDs', () => {
    const store = createStudioStore()
    const savedScore = { ...builtin.score, metadata: { ...builtin.score.metadata, title: 'Saved title' } }
    const saved = [{ ...builtin, score: savedScore, seed: 303 },
      { id: 'score-7', filename: 'user.mid', score: createDemoScore(), seed: 107 }]
    expect(store.getState().restoreSessions(saved, builtin.id, [builtin])).toEqual({ restored: 2, rejected: 0 })
    expect(store.getState().sessions).toHaveLength(3)
    expect(store.getState()).toMatchObject({ activeSessionId: builtin.id, seed: 303 })
    expect(store.getState().compiled.score).toBe(savedScore)
    store.getState().addScores([{ filename: 'new.mid', score: createDemoScore() }])
    expect(store.getState().activeSessionId).toBe('score-8')
  })

  it('rejects a damaged saved built-in record without activating the replacement or mutating the record', () => {
    const store = createStudioStore()
    const record = { ...builtin, seed: 303, score: { notes: [] } }
    const before = structuredClone(record)
    expect(store.getState().restoreSessions([record], builtin.id, [builtin])).toEqual({ restored: 0, rejected: 1 })
    expect(store.getState().activeSessionId).toBe('score-0')
    expect(store.getState().sessions[1]!.compiled.score).toBe(builtin.score)
    expect(record).toEqual(before)
  })

  it('keeps registered built-ins while allowing removal of an imported score', () => {
    const store = createStudioStore()
    store.getState().restoreSessions([], 'score-0', [builtin])
    store.getState().selectSession(builtin.id)
    const before = store.getState()
    store.getState().removeSession(builtin.id)
    expect(store.getState()).toBe(before)
    store.getState().addScores([{ filename: 'user.mid', score: createDemoScore() }])
    const importedId = store.getState().activeSessionId
    store.getState().removeSession(importedId)
    expect(store.getState().sessions.map(session => session.id)).toEqual(['score-0', builtin.id])
    expect(store.getState().activeSessionId).toBe(builtin.id)
  })
})
