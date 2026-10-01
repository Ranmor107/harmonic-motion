import type { InkMode, StreamStyleId, ViewMode, VisualPreset } from '../../domain/visual'

export const inkEnvironment = { type: 'solid', color: '#f3f4ed' } as const

export function normalizeStreamStyle(value: unknown): StreamStyleId {
  return value === 'ink' ? 'ink' : 'original'
}

export function normalizeInkMode(value: unknown): InkMode {
  return value === 'veins' ? 'veins' : 'drops'
}

export function resolveStreamPreset(base: VisualPreset, view: ViewMode, style: StreamStyleId, inkMode: InkMode = 'drops'): VisualPreset {
  if (view !== 'stream' || style !== 'ink') return base
  // Keep base controls intact; the paper has its own display projection.
  return {
    ...base, id: 'ink-stream', name: 'Ink Folio', streamStyle: 'ink', inkMode, environment: inkEnvironment,
  }
}
