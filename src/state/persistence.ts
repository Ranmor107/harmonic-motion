import type { NormalizedScore } from '../domain/score'
import type { InkMode, StreamStyleId, ViewMode, VisibilityMode } from '../domain/visual'
import { normalizeInkMode, normalizeStreamStyle } from '../visual/presets/inkStream'

export interface SavedSession {
  id: string
  filename: string
  seed: number
  score: NormalizedScore
}

export interface SavedPreferences {
  version: 1
  activeSessionId: string
  position: number
  viewMode: ViewMode
  streamStyleId?: StreamStyleId
  inkMode?: InkMode
  visibilityMode: VisibilityMode
  effectsEnabled: boolean
  volume: number
  muted: boolean
  followViews: { constellation: boolean; stream: boolean; ensemble: boolean }
  melodyTracks?: Record<string, string>
}

const DATABASE = 'harmonic-motion'
const STORE = 'saved-state'
interface DatabaseConnection {
  db: IDBDatabase
  pending: Set<(error: Error) => void>
  invalidate: (error: Error) => void
}
let databasePromise: Promise<DatabaseConnection> | undefined

function storageError(message: string, cause?: unknown): Error {
  return new Error(`${message}，请刷新重试；本次仍可在临时会话中使用。${cause instanceof Error ? `（${cause.message}）` : ''}`, { cause })
}

function database(): Promise<DatabaseConnection> {
  if (databasePromise) return databasePromise
  const opening: Promise<DatabaseConnection> = new Promise<DatabaseConnection>((resolve, reject) => {
    let settled = false
    const fail = (error: Error) => { if (!settled) { settled = true; reject(error) } }
    try {
      const request = indexedDB.open(DATABASE, 1)
      request.onupgradeneeded = () => {
        if (settled) request.transaction?.abort()
        else request.result.createObjectStore(STORE)
      }
      request.onsuccess = () => {
        const db = request.result
        if (settled) { db.close(); return }
        settled = true
        const connection: DatabaseConnection = {
          db,
          pending: new Set(),
          invalidate: error => {
            if (databasePromise === opening) databasePromise = undefined
            db.close()
            for (const cancel of connection.pending) cancel(error)
          },
        }
        db.onversionchange = () => connection.invalidate(storageError('本机保存连接已由其他页面更新'))
        resolve(connection)
      }
      request.onerror = () => fail(storageError('无法打开本机保存', request.error))
      request.onblocked = () => fail(storageError('本机保存被其他页面阻塞，请关闭此站点的其他页面'))
    } catch (error) {
      fail(storageError('无法打开本机保存', error))
    }
  }).catch(error => { if (databasePromise === opening) databasePromise = undefined; throw error })
  databasePromise = opening
  return opening
}

async function withTransaction<T>(mode: IDBTransactionMode, start: (store: IDBObjectStore) => () => T): Promise<T> {
  const connection = await database()
  return new Promise((resolve, reject) => {
    let transaction: IDBTransaction
    try {
      transaction = connection.db.transaction(STORE, mode)
    } catch (cause) {
      const error = storageError('本机保存连接不可用', cause)
      connection.invalidate(error)
      reject(error)
      return
    }
    let settled = false
    const fail = (error: Error) => {
      if (settled) return
      settled = true
      connection.pending.delete(cancel)
      reject(error)
    }
    const cancel = (error: Error) => {
      fail(error)
      try { transaction.abort() } catch { /* A finished transaction cannot be aborted. */ }
    }
    connection.pending.add(cancel)
    transaction.onerror = () => fail(storageError('本机保存事务失败', transaction.error))
    transaction.onabort = () => fail(storageError('本机保存事务已中止', transaction.error))
    try {
      const result = start(transaction.objectStore(STORE))
      transaction.oncomplete = () => {
        if (settled) return
        try {
          const value = result()
          settled = true
          connection.pending.delete(cancel)
          resolve(value)
        } catch (error) { fail(storageError('无法读取本机保存结果', error)) }
      }
    } catch (error) { cancel(storageError('无法处理本机保存记录', error)) }
  })
}

export async function loadSavedState(): Promise<{ sessions: unknown; preferences?: SavedPreferences }> {
  return withTransaction('readonly', store => {
    const sessions = store.get('sessions')
    const preferences = store.get('preferences')
    return () => {
      const records: unknown = sessions.result
      const settings = preferences.result
      return {
        sessions: records === undefined ? [] : records,
        preferences: settings?.version === 1 && Number.isFinite(settings.position)
          && Number.isFinite(settings.volume) && typeof settings.activeSessionId === 'string'
          && ['constellation', 'stream', 'ensemble'].includes(settings.viewMode)
          && ['overview', 'focus', 'path'].includes(settings.visibilityMode)
          && typeof settings.effectsEnabled === 'boolean' && typeof settings.muted === 'boolean'
          && typeof settings.followViews?.constellation === 'boolean'
          && typeof settings.followViews?.stream === 'boolean'
          && typeof settings.followViews?.ensemble === 'boolean' ? { ...settings, streamStyleId: normalizeStreamStyle(settings.streamStyleId), inkMode: normalizeInkMode(settings.inkMode) } : undefined,
      }
    }
  })
}

async function save(key: string, value: unknown): Promise<void> {
  return withTransaction('readwrite', store => {
    store.put(value, key)
    return () => undefined
  })
}

export const saveSessions = (sessions: SavedSession[]) => save('sessions', sessions)
export const savePreferences = (preferences: SavedPreferences) => save('preferences', preferences)
