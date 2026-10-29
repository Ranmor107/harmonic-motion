import type { InkMode, StreamStyleId, ViewMode, VisibilityMode } from '../domain/visual'

interface RenderIdentity { renderer: 'r3f' | 'ink-webgl2'; mode: string }
interface RenderMetrics extends RenderIdentity {
  frames: number; sampleCount: number; sampleStartMs: number | null; sampleEndMs: number | null
  sampleBasis: 'drawn-frame-intervals'; frameMedianMs: number | null; frameP95Ms: number | null
}

export function renderIdentity(view: ViewMode, style: StreamStyleId = 'original', inkMode: InkMode = 'drops', visibility: VisibilityMode = 'overview'): RenderIdentity {
  const ink = view === 'stream' && style === 'ink'
  return { renderer: ink ? 'ink-webgl2' : 'r3f', mode: ink ? `stream:ink:${inkMode}`
    : view === 'stream' ? 'stream:original' : view === 'constellation' ? `constellation:${visibility}` : view }
}

// Intervals between actual draws, not GPU timings or requestAnimationFrame callbacks.
export function createRenderMetrics(identity: RenderIdentity) {
  let timestamps: number[] = [], frames = 0
  return {
    record(now: number, continuous = true) {
      if (!continuous) { timestamps = []; frames = 0 }
      timestamps.push(now)
      if (timestamps.length > 121) timestamps.shift()
      return ++frames
    },
    snapshot(): RenderMetrics {
      const intervals = timestamps.slice(1).map((time, i) => time - timestamps[i]!).sort((a, b) => a - b)
      return { ...identity, frames, sampleCount: intervals.length, sampleStartMs: timestamps[0] ?? null,
        sampleEndMs: timestamps.at(-1) ?? null, sampleBasis: 'drawn-frame-intervals',
        frameMedianMs: intervals[Math.floor(intervals.length * .5)] ?? null,
        frameP95Ms: intervals[Math.floor(intervals.length * .95)] ?? null }
    },
  }
}

export function readRenderMetrics(serialized: string | undefined, expected: RenderIdentity): RenderMetrics | null {
  if (!serialized) return null
  const metrics = JSON.parse(serialized) as RenderMetrics
  return metrics.renderer === expected.renderer && metrics.mode === expected.mode ? metrics : null
}
