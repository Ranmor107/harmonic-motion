import type { AudioEngine } from '../audio/AudioEngine'
import type { NormalizedScore } from '../domain/score'
import { PlaybackClock } from './clock'

export class PlaybackController {
  private revision = 0
  constructor(readonly clock: PlaybackClock, private readonly audio: AudioEngine) {}

  async load(score: NormalizedScore): Promise<void> {
    this.revision++
    this.clock.setDuration(score.duration)
    await this.audio.load(score)
  }

  async play(): Promise<void> {
    const revision = ++this.revision
    await this.audio.play()
    if (revision !== this.revision) return
    this.clock.play(0.035)
    this.audio.seek(this.clock.getCurrentTime())
  }

  pause(): void { this.revision++; this.clock.pause(); this.audio.pause() }
  stop(): void { this.revision++; this.clock.stop(); this.audio.stop() }
  async restart(): Promise<void> { this.stop(); await this.play() }
  seek(time: number): void { this.revision++; this.clock.seek(time); this.audio.seek(this.clock.getCurrentTime()) }
  dispose(): void { this.revision++; this.clock.stop(); this.audio.dispose() }
}
