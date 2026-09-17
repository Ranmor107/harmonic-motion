import { clamp } from '../utils/math'

export type PlaybackStatus = 'stopped' | 'playing' | 'paused' | 'ended'
export interface PlaybackState { status: PlaybackStatus; time: number; duration: number }

/** Sole mapping between the injected monotonic audio clock and song seconds. */
export class PlaybackClock {
  private status: PlaybackStatus = 'stopped'
  private position = 0
  private anchor = 0

  constructor(private duration: number, private readonly now: () => number) {}

  getCurrentTime(): number {
    if (this.status !== 'playing') return this.position
    const time = this.position + Math.max(0, this.now() - this.anchor)
    if (time >= this.duration) {
      this.position = this.duration
      this.status = 'ended'
      return this.duration
    }
    return time
  }

  getState(): PlaybackState {
    const time = this.getCurrentTime()
    return { status: this.status, time, duration: this.duration }
  }

  play(leadTime = 0): void {
    if (this.getState().status === 'playing' || this.duration === 0) return
    if (this.position >= this.duration) this.position = 0
    this.anchor = this.now() + leadTime
    this.status = 'playing'
  }

  pause(): void {
    this.position = this.getCurrentTime()
    if (this.status === 'playing') this.status = 'paused'
  }

  stop(): void { this.position = 0; this.status = 'stopped' }
  restart(): void { this.stop(); this.play() }

  seek(time: number): void {
    if (!Number.isFinite(time)) throw new Error('Seek time must be finite.')
    const wasPlaying = this.getState().status === 'playing'
    this.position = clamp(time, 0, this.duration)
    this.anchor = this.now()
    this.status = this.position >= this.duration ? 'ended' : wasPlaying ? 'playing' : 'paused'
  }

  setDuration(duration: number): void { this.stop(); this.duration = duration }

  /** Absolute timestamp in the same source used by now(); valid while playing. */
  sourceTimeFor(songTime: number): number { return this.anchor + songTime - this.position }
}
