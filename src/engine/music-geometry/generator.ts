import type { NormalizedScore } from '../../domain/score'
import type { GeometryStrategy } from './GeometryStrategy'
import { analyzeScore } from '../music-analysis/analyzer'

export function generateWorld(score: NormalizedScore, strategy: GeometryStrategy, seed: number) {
  const analysis = analyzeScore(score)
  return { analysis, world: strategy.generate(score, { analysis, seed }) }
}
