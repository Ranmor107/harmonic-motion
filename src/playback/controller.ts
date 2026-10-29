import type { AudioEngine } from '../audio/AudioEngine'
import type { NormalizedScore } from '../domain/score'
import { PlaybackClock } from './clock'

export class PlaybackController {
  private revision = 0
  constructor(readonly clock: PlaybackClock, private readonly audio: AudioEngine, private readonly onError?: (cause: unknown) => void) {
    audio.setErrorHandler?.(cause => this.fail(cause))
  }

  private fail(cause: unknown): void {
    this.revision++
    this.clock.pause()
    this.audio.pause()
    this.onError?.(cause)
  }

  async load(score: NormalizedScore): Promise<void> {
    const revision = ++this.revision
    this.clock.setDuration(score.duration)
    try { await this.audio.load(score) } catch (cause) {
      if (revision !== this.revision) return
      this.fail(cause)
      throw cause
    }
  }

  async play(): Promise<void> {
    const revision = ++this.revision
    try {
      await this.audio.play()
      if (revision !== this.revision) return
      this.clock.play(0.035)
      this.audio.seek(this.clock.getCurrentTime())
    } catch (cause) {
      if (revision !== this.revision) return
      this.fail(cause)
      throw cause
    }
  }

  pause(): void { this.revision++; this.clock.pause(); this.audio.pause() }
  stop(): void { this.revision++; this.clock.stop(); this.audio.stop() }
  async restart(): Promise<void> { this.stop(); await this.play() }
  seek(time: number): void {
    this.revision++
    try { this.clock.seek(time); this.audio.seek(this.clock.getCurrentTime()) } catch (cause) {
      this.fail(cause)
      throw cause
    }
  }
  dispose(): void { this.revision++; this.clock.stop(); this.audio.dispose() }
}
