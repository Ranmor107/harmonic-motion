import { create } from 'zustand'
import type { NormalizedScore } from '../domain/score'
import type { ViewMode, VisibilityMode, VisualPreset } from '../domain/visual'
import { compileScore, type CompiledScore } from '../engine/compile'
import { ConstellationGeometryStrategy } from '../engine/music-geometry/strategies/constellation'
import type { GeometryStrategy } from '../engine/music-geometry/GeometryStrategy'
import { createDemoScore } from '../demo/score'
import { DefaultPreset } from '../visual/presets/defaultPreset'

interface StudioState {
  compiled: CompiledScore
  seed: number
  strategy: GeometryStrategy
  preset: VisualPreset
  viewMode: ViewMode
  visibilityMode: VisibilityMode
  setScore(score: NormalizedScore): void
  regenerate(): void
  setPreset(preset: VisualPreset): void
  setViewMode(viewMode: ViewMode): void
  setVisibilityMode(visibilityMode: VisibilityMode): void
}

export function createStudioStore() {
  const seed = 107
  const strategy = ConstellationGeometryStrategy
  return create<StudioState>((set, get) => ({
    compiled: compileScore(createDemoScore(), strategy, seed), seed, strategy, preset: DefaultPreset,
    viewMode: 'constellation', visibilityMode: 'focus',
    setScore: score => set({ compiled: compileScore(score, get().strategy, get().seed) }),
    regenerate: () => {
      const state = get()
      const nextSeed = (state.seed + 1) >>> 0
      set({ seed: nextSeed, compiled: compileScore(state.compiled.score, state.strategy, nextSeed) })
    },
    // Visual changes retain the exact same compiled objects, not just equal copies.
    setPreset: preset => set({ preset }),
    setViewMode: viewMode => set({ viewMode }),
    setVisibilityMode: visibilityMode => set({ visibilityMode }),
  }))
}

export const useStudio = createStudioStore()
