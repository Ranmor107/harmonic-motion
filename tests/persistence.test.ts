import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDemoScore } from '../src/demo/score'
import { createStudioStore } from '../src/state/store'

let records: Map<string, unknown>
let put: ReturnType<typeof vi.fn<(value: unknown, key: string) => void>>
type Handler = (() => void) | undefined
interface MockTransaction {
  oncomplete?: Handler
  onerror?: Handler
  onabort?: Handler
  error: Error | null
  objectStore: () => { get: (key: string) => { result: unknown }; put: (value: unknown, key: string) => void }
  abort: ReturnType<typeof vi.fn>
}
interface MockDatabase {
  onversionchange?: Handler
  transaction: ReturnType<typeof vi.fn>
  createObjectStore: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
}
interface MockOpenRequest {
  result: MockDatabase
  error: Error | null
  transaction: { abort: ReturnType<typeof vi.fn> }
  onsuccess?: Handler
  onerror?: Handler
  onblocked?: Handler
  onupgradeneeded?: Handler
}
let open: ReturnType<typeof vi.fn>
let requests: MockOpenRequest[]
let transactions: MockTransaction[]
let openEvent: 'success' | 'error' | 'blocked'
let transactionEvent: 'complete' | 'error' | 'abort' | 'pending'

async function outcomeOf(promise: Promise<unknown>) {
  let outcome: { status: 'pending' | 'fulfilled' | 'rejected'; reason?: unknown } = { status: 'pending' }
  void promise.then(() => { outcome = { status: 'fulfilled' } }, reason => { outcome = { status: 'rejected', reason } })
  for (let turn = 0; turn < 8; turn++) await Promise.resolve()
  return outcome
}

beforeEach(() => {
  vi.resetModules()
  records = new Map()
  put = vi.fn<(value: unknown, key: string) => void>()
  requests = []
  transactions = []
  openEvent = 'success'
  transactionEvent = 'complete'
  open = vi.fn(() => {
    const db: MockDatabase = {
      close: vi.fn(),
      createObjectStore: vi.fn(),
      transaction: vi.fn(() => {
        const event = transactionEvent
        const writes: [string, unknown][] = []
        let aborted = false
        const transaction: MockTransaction = {
          error: event === 'error' ? new Error('transaction failed') : null,
          objectStore: () => ({ get: (key: string) => ({ result: records.get(key) }), put: (value, key) => {
            put(value, key)
            writes.push([key, structuredClone(value)])
          } }),
          abort: vi.fn(() => {
            aborted = true
            queueMicrotask(() => transaction.onabort?.())
          }),
        }
        transactions.push(transaction)
        queueMicrotask(() => {
          if (aborted) return
          if (event === 'complete') {
            for (const [key, value] of writes) records.set(key, value)
            transaction.oncomplete?.()
          } else if (event === 'abort') transaction.onabort?.()
          else if (event === 'error') transaction.onerror?.()
        })
        return transaction
      }),
    }
    const request: MockOpenRequest = {
      result: db,
      error: openEvent === 'error' ? new Error('open failed') : null,
      transaction: { abort: vi.fn() },
    }
    requests.push(request)
    const event = openEvent
    queueMicrotask(() => {
      if (event === 'success') request.onsuccess?.()
      else if (event === 'error') request.onerror?.()
      else request.onblocked?.()
    })
    return request
  })
  vi.stubGlobal('indexedDB', { open })
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

describe('IndexedDB failure recovery', () => {
  it.each(['abort', 'error'] as const)('settles read and write transactions on %s without replacing saved records', async event => {
    const original = [{ id: 'preserved' }]
    records.set('sessions', original)
    transactionEvent = event
    const { loadSavedState, saveSessions } = await import('../src/state/persistence')
    const outcomes = await Promise.all([outcomeOf(loadSavedState()), outcomeOf(saveSessions([]))])
    for (const outcome of outcomes) {
      expect(outcome.status).toBe('rejected')
      expect(outcome.reason).toBeInstanceOf(Error)
      expect((outcome.reason as Error).message).toContain('重试')
    }
    expect(records.get('sessions')).toEqual(original)
    transactionEvent = 'complete'
    expect((await loadSavedState()).sessions).toEqual(original)
    expect(open).toHaveBeenCalledTimes(1)
  })

  it.each(['error', 'blocked'] as const)('settles an open %s and permits an explicit later retry', async event => {
    openEvent = event
    const { loadSavedState } = await import('../src/state/persistence')
    const outcome = await outcomeOf(loadSavedState())
    expect(outcome.status).toBe('rejected')
    expect(outcome.reason).toBeInstanceOf(Error)
    expect((outcome.reason as Error).message).toContain(event === 'blocked' ? '其他页面' : '重试')
    expect(open).toHaveBeenCalledTimes(1)
    openEvent = 'success'
    expect((await loadSavedState()).sessions).toEqual([])
    expect(open).toHaveBeenCalledTimes(2)
    expect(put).not.toHaveBeenCalled()
  })

  it('handles synchronous open failures without retaining the rejected cache', async () => {
    open.mockImplementationOnce(() => { throw new Error('storage unavailable') })
    const { loadSavedState } = await import('../src/state/persistence')
    const outcome = await outcomeOf(loadSavedState())
    expect(outcome.status).toBe('rejected')
    expect((outcome.reason as Error).message).toContain('重试')
    expect((await loadSavedState()).sessions).toEqual([])
    expect(open).toHaveBeenCalledTimes(2)
  })

  it('closes a late successful connection after blocked without clearing a newer connection', async () => {
    openEvent = 'blocked'
    const { loadSavedState } = await import('../src/state/persistence')
    expect((await outcomeOf(loadSavedState())).status).toBe('rejected')
    const blocked = requests[0]!
    openEvent = 'success'
    await loadSavedState()
    blocked.onsuccess?.()
    blocked.onerror?.()
    expect(blocked.result.close).toHaveBeenCalledTimes(1)
    await loadSavedState()
    expect(open).toHaveBeenCalledTimes(2)
    expect(requests[1]!.result.close).not.toHaveBeenCalled()
  })

  it('aborts a late upgrade after blocked instead of creating a store', async () => {
    openEvent = 'blocked'
    const { loadSavedState } = await import('../src/state/persistence')
    expect((await outcomeOf(loadSavedState())).status).toBe('rejected')
    requests[0]!.onupgradeneeded?.()
    expect(requests[0]!.transaction.abort).toHaveBeenCalledTimes(1)
    expect(requests[0]!.result.createObjectStore).not.toHaveBeenCalled()
  })

  it('closes an outdated connection and rebuilds its cache without old events invalidating the new connection', async () => {
    const { loadSavedState } = await import('../src/state/persistence')
    await loadSavedState()
    const outdated = requests[0]!.result
    outdated.onversionchange?.()
    expect(outdated.close).toHaveBeenCalledTimes(1)
    await loadSavedState()
    outdated.onversionchange?.()
    await loadSavedState()
    expect(open).toHaveBeenCalledTimes(2)
    expect(requests[1]!.result.close).not.toHaveBeenCalled()
  })

  it('ends every in-flight operation on versionchange and preserves uncommitted writes', async () => {
    records.set('sessions', [{ id: 'preserved' }])
    transactionEvent = 'pending'
    const { loadSavedState, saveSessions } = await import('../src/state/persistence')
    const reading = loadSavedState()
    const writing = saveSessions([])
    expect((await outcomeOf(reading)).status).toBe('pending')
    expect(transactions).toHaveLength(2)
    requests[0]!.result.onversionchange?.()
    for (const outcome of await Promise.all([outcomeOf(reading), outcomeOf(writing)])) {
      expect(outcome.status).toBe('rejected')
      expect((outcome.reason as Error).message).toContain('重试')
    }
    for (const transaction of transactions) expect(transaction.abort).toHaveBeenCalledTimes(1)
    expect(records.get('sessions')).toEqual([{ id: 'preserved' }])
    expect(requests[0]!.result.close).toHaveBeenCalledTimes(1)
    transactionEvent = 'complete'
    expect((await loadSavedState()).sessions).toEqual([{ id: 'preserved' }])
    expect(open).toHaveBeenCalledTimes(2)
  })

  it('rejects synchronous transaction failures and can create a new connection on the next call', async () => {
    const { loadSavedState } = await import('../src/state/persistence')
    await loadSavedState()
    requests[0]!.result.transaction.mockImplementationOnce(() => { throw new Error('connection closed') })
    const outcome = await outcomeOf(loadSavedState())
    expect(outcome.status).toBe('rejected')
    expect((outcome.reason as Error).message).toContain('重试')
    expect((await loadSavedState()).sessions).toEqual([])
    expect(open).toHaveBeenCalledTimes(2)
  })
})
