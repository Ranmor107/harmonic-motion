import type { MusicAnalysis } from '../../domain/analysis'
import type { NormalizedScore } from '../../domain/score'
import type { WorldModel } from '../../domain/world'

export interface GeometryContext { seed: number; analysis: MusicAnalysis }
export interface GeometryStrategy {
  id: string
  generate(score: NormalizedScore, context: GeometryContext): WorldModel
}
