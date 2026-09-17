import type { NormalizedScore } from '../domain/score'
import type { GeometryStrategy } from './music-geometry/GeometryStrategy'
import { generateWorld } from './music-geometry/generator'
import { planPerformance } from './choreography/planner'

export function compileScore(score: NormalizedScore, strategy: GeometryStrategy, seed: number) {
  const { analysis, world } = generateWorld(score, strategy, seed)
  return { score, analysis, world, plan: planPerformance(world, score) }
}

export type CompiledScore = ReturnType<typeof compileScore>
