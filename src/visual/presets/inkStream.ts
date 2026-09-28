import type { StreamStyleId, ViewMode, VisualPreset } from '../../domain/visual'
import landscape from '../assets/ink-landscape.svg'

export const inkEnvironment = { type: 'image', color: '#f1ebdd', source: landscape } as const

export function normalizeStreamStyle(value: unknown): StreamStyleId {
  return value === 'ink' ? 'ink' : 'original'
}

// Presentation and camera retain their identities: a change of stage never refits or recompiles music.
export function resolveStreamPreset(base: VisualPreset, view: ViewMode, style: StreamStyleId): VisualPreset {
  if (view !== 'stream' || style !== 'ink') return base
  return {
    ...base, id: 'ink-stream', name: 'Ink Stream', streamStyle: 'ink', environment: inkEnvironment,
    theme: {
      ...base.theme, id: 'ink', name: 'Ink on paper',
      palette: { note: '#5c7066', chord: '#26352f', performer: '#9c4538', connection: '#728176', muted: '#b7b0a1' },
      nodeStyle: { ...base.theme.nodeStyle, radius: 0.16 },
      performerStyle: { radius: 0.2, shape: 'sphere', haloScale: 1.8, haloOpacity: 0.08 },
    },
    effects: {
      ...base.effects, id: 'ink-response', name: 'Paper diffusion',
      hit: { ...base.effects.hit, lifetime: 0.85, radius: 0.28, expansion: 0.48, opacity: 0.16 },
      trail: { ...base.effects.trail, samples: 16, radius: 0.08, lifetime: 0.55, opacity: 0.42 },
    },
  }
}
