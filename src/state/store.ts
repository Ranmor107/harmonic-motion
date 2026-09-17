import { create } from 'zustand'
import type { NormalizedScore } from '../domain/score'
import type { VisualPreset } from '../domain/visual'
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
  setScore(score: NormalizedScore): void
  regenerate(): void
  setPreset(preset: VisualPreset): void
}

export function createStudioStore() {
  const seed = 107
  const strategy = ConstellationGeometryStrategy
  return create<StudioState>((set, get) => ({
    compiled: compileScore(createDemoScore(), strategy, seed), seed, strategy, preset: DefaultPreset,
    setScore: score => set({ compiled: compileScore(score, get().strategy, get().seed) }),
    regenerate: () => {
      const state = get()
      const nextSeed = (state.seed + 1) >>> 0
      set({ seed: nextSeed, compiled: compileScore(state.compiled.score, state.strategy, nextSeed) })
    },
    // Visual changes retain the exact same compiled objects, not just equal copies.
    setPreset: preset => set({ preset }),
  }))
}

export const useStudio = createStudioStore()
