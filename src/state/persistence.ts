import type { NormalizedScore } from '../domain/score'
import type { StreamStyleId, ViewMode, VisibilityMode } from '../domain/visual'
import { normalizeStreamStyle } from '../visual/presets/inkStream'

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
  visibilityMode: VisibilityMode
  effectsEnabled: boolean
  volume: number
  muted: boolean
  followViews: { constellation: boolean; stream: boolean; ensemble: boolean }
  melodyTracks?: Record<string, string>
}

const DATABASE = 'harmonic-motion'
const STORE = 'saved-state'
let databasePromise: Promise<IDBDatabase> | undefined

function database(): Promise<IDBDatabase> {
  if (!databasePromise) databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  }).catch(error => { databasePromise = undefined; throw error })
  return databasePromise
}

export async function loadSavedState(): Promise<{ sessions: SavedSession[]; preferences?: SavedPreferences }> {
  const db = await database()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readonly')
    const sessions = transaction.objectStore(STORE).get('sessions')
    const preferences = transaction.objectStore(STORE).get('preferences')
    transaction.oncomplete = () => {
      const records = sessions.result
      const settings = preferences.result
      resolve({
        sessions: Array.isArray(records) ? records.filter((record: SavedSession) =>
          typeof record?.id === 'string' && typeof record.filename === 'string' && Number.isInteger(record.seed)
          && Array.isArray(record.score?.notes) && Array.isArray(record.score?.tracks)) : [],
        preferences: settings?.version === 1 && Number.isFinite(settings.position)
          && Number.isFinite(settings.volume) && typeof settings.activeSessionId === 'string'
          && ['constellation', 'stream', 'ensemble'].includes(settings.viewMode)
          && ['overview', 'focus', 'path'].includes(settings.visibilityMode)
          && typeof settings.effectsEnabled === 'boolean' && typeof settings.muted === 'boolean'
          && typeof settings.followViews?.constellation === 'boolean'
          && typeof settings.followViews?.stream === 'boolean'
          && typeof settings.followViews?.ensemble === 'boolean' ? { ...settings, streamStyleId: normalizeStreamStyle(settings.streamStyleId) } : undefined,
      })
    }
    transaction.onerror = () => reject(transaction.error)
  })
}

async function save(key: string, value: unknown): Promise<void> {
  const db = await database()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite')
    transaction.objectStore(STORE).put(value, key)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export const saveSessions = (sessions: SavedSession[]) => save('sessions', sessions)
export const savePreferences = (preferences: SavedPreferences) => save('preferences', preferences)
