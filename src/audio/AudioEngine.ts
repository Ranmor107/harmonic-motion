import type { NormalizedScore } from '../domain/score'

export interface AudioEngine {
  load(score: NormalizedScore): Promise<void>
  play(): Promise<void>
  pause(): void
  stop(): void
  seek(time: number): void
  dispose(): void
}
