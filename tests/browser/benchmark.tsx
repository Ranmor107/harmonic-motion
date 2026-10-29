import { createRoot } from 'react-dom/client'
import { App } from '../../src/ui/App'
import { useStudio } from '../../src/state/store'
import { ToneAudioEngine } from '../../src/audio/ToneAudioEngine'
import { syntheticScore } from '../fixtures/syntheticScore'
import { normalizeScore } from '../../src/midi/normalize'
import { readRenderMetrics, renderIdentity } from '../../src/render/renderMetrics'
import '../../src/ui/styles.css'
import '../../src/ui/ink.css'

// Separate development entry uses the actual App and load effect, not a duplicate player.
let storageAccessAttempts = 0
document.documentElement.dataset.storageAccessAttempts = '0'
indexedDB.open = () => {
  document.documentElement.dataset.storageAccessAttempts = String(++storageAccessAttempts)
  throw new Error('The benchmark must not access IndexedDB.')
}
const load = ToneAudioEngine.prototype.load
let audioLoads = 0
ToneAudioEngine.prototype.load = function (score) {
  document.documentElement.dataset.audioLoads = String(++audioLoads)
  return load.call(this, score)
}
const panel = document.createElement('div')
panel.style.cssText = 'position:fixed;left:240px;top:80px;z-index:100;display:flex;gap:5px;background:#101820;padding:6px;font:11px sans-serif;color:white'
panel.setAttribute('aria-label', 'Development benchmark')
for (const count of [100, 700, 2000, 5000]) {
  const button = document.createElement('button')
  button.textContent = `Load ${count}`
  button.onclick = () => {
    const start = performance.now()
    useStudio.getState().setScore(syntheticScore(count))
    panel.dataset.importMs = String(performance.now() - start)
  }
  panel.append(button)
}
const sample = document.createElement('button')
sample.textContent = 'Capture metrics'
sample.onclick = () => {
  const result = document.getElementById('benchmark-result')!
  const state = useStudio.getState()
  const identity = renderIdentity(state.viewMode, state.streamStyleId, state.inkMode, state.visibilityMode)
  const canvas = [...document.querySelectorAll('canvas')].find(canvas =>
    canvas.dataset.renderer === identity.renderer && canvas.dataset.renderMode === identity.mode)
  const metrics = readRenderMetrics(canvas?.dataset.renderMetrics, identity)
  const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
  result.textContent = JSON.stringify({ title: state.compiled.score.metadata.title, viewMode: state.viewMode, ...identity,
    visibility: state.visibilityMode,
    sessions: state.sessions.length, audioLoads, importMs: Number(panel.dataset.importMs ?? 0),
    persistence: 'disabled', storageAccessAttempts, metricsStatus: metrics ? 'sampled' : 'pending',
    heapBytesIfAvailable: memory?.usedJSHeapSize, ...metrics })
}
panel.append(sample)
const fast = document.createElement('button')
fast.textContent = 'Load fast 2000'
fast.onclick = () => useStudio.getState().setScore(syntheticScore(2000, true))
panel.append(fast)
const repeated = document.createElement('button')
repeated.textContent = 'Load repeats 30s'
repeated.onclick = () => useStudio.getState().setScore(normalizeScore({
  metadata: { title: 'Original repeated notes · 30 seconds', source: 'demo' },
  tracks: [{ name: 'Repeated lead', channel: 0, instrument: 0,
    notes: Array.from({ length: 100 }, (_, i) => ({ time: i * .3, duration: .3, midi: 60, velocity: .8 })) }],
}))
panel.append(repeated)
const result = document.createElement('output')
result.id = 'benchmark-result'
result.style.cssText = 'position:fixed;bottom:84px;left:240px;right:20px;z-index:100;color:#b9d1d9;font:10px monospace;pointer-events:none'
document.body.append(panel, result)
for (const eventName of ['input', 'click']) document.addEventListener(eventName, event => {
  const target = event.target as HTMLElement
  if (target.closest('[aria-label="Development benchmark"]')) return
  const start = performance.now()
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.documentElement.dataset.interaction = JSON.stringify({ label: target.getAttribute('aria-label') ?? target.textContent?.trim(),
      event: eventName, twoFrameMs: performance.now() - start })
  }))
}, true)
createRoot(document.getElementById('root')!).render(<App persistenceEnabled={false} />)
