import { createRoot } from 'react-dom/client'
import { App } from '../../src/ui/App'
import { ToneAudioEngine } from '../../src/audio/ToneAudioEngine'
import '../../src/ui/styles.css'
import '../../src/ui/ink.css'

// Developer-only failure checks: use real browser transactions in a separate database.
const failure = new URLSearchParams(location.search).get('failure')
const panel = document.createElement('div')
panel.setAttribute('aria-label', 'Recovery checks')
panel.style.cssText = 'position:fixed;top:80px;left:30px;z-index:200;padding:8px;background:#102027;color:white;font:12px sans-serif'
panel.textContent = `Isolated recovery check: ${failure ?? 'healthy'}`
document.body.append(panel)

const open = indexedDB.open.bind(indexedDB)
let abortNext = failure === 'storage-abort'
indexedDB.open = (_name, version) => {
  const request = open('harmonic-motion-recovery-checks', version)
  request.addEventListener('success', () => {
    const db = request.result
    const transaction = db.transaction.bind(db)
    db.transaction = (...args: Parameters<IDBDatabase['transaction']>) => {
      const tx = transaction(...args)
      if (abortNext) {
        abortNext = false
        queueMicrotask(() => {
          tx.abort()
          panel.textContent = 'Isolated recovery check: real IndexedDB read aborted'
        })
      }
      return tx
    }
  })
  return request
}

if (failure === 'audio-load') {
  const load = ToneAudioEngine.prototype.load
  let rejectNext = true
  ToneAudioEngine.prototype.load = function (score) {
    if (rejectNext) {
      rejectNext = false
      return Promise.reject(new Error('Injected audio load failure (one attempt)'))
    }
    return load.call(this, score)
  }
}

if (failure === 'audio-pump') {
  const handler = ToneAudioEngine.prototype.setErrorHandler
  const seek = ToneAudioEngine.prototype.seek
  const callbacks = new WeakMap<ToneAudioEngine, (cause: unknown) => void>()
  let failNext = true
  ToneAudioEngine.prototype.setErrorHandler = function (onError) { callbacks.set(this, onError); handler.call(this, onError) }
  ToneAudioEngine.prototype.seek = function (time) {
    seek.call(this, time)
    if (failNext) {
      failNext = false
      setTimeout(() => callbacks.get(this)?.(new Error('Injected background audio failure (one attempt)')), 250)
    }
  }
}

createRoot(document.getElementById('root')!).render(<App persistenceEnabled={failure === 'storage-abort'} />)
