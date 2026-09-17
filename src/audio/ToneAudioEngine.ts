import * as Tone from 'tone'
import type { NormalizedScore } from '../domain/score'
import type { PlaybackClock } from '../playback/clock'
import type { AudioEngine } from './AudioEngine'
import { NoteScheduler } from './scheduler'

const AUDIO = { horizon: 0.2, intervalMs: 25, volumeDb: -18, maxPolyphony: 64, release: 0.25 }

export const audioNow = () => Tone.immediate()

export class ToneAudioEngine implements AudioEngine {
  private voices: { synth: Tone.Synth; availableAt: number }[] = []
  private output?: Tone.Limiter
  private timer?: ReturnType<typeof setInterval>
  private scheduler = new NoteScheduler([])

  constructor(private readonly clock: PlaybackClock) {}

  async load(score: NormalizedScore): Promise<void> {
    this.pause()
    this.scheduler = new NoteScheduler(score.notes)
    this.scheduler.reset(0)
  }

  async play(): Promise<void> { await Tone.start() }

  pause(): void {
    if (this.timer !== undefined) clearInterval(this.timer)
    this.timer = undefined
    // Dispose cancels both currently sounding and already scheduled future voices.
    for (const voice of this.voices) voice.synth.dispose()
    this.voices = []
    this.output?.dispose()
    this.output = undefined
  }

  stop(): void { this.pause(); this.scheduler.reset(0) }

  seek(time: number): void {
    this.pause()
    this.scheduler.reset(time)
    if (this.clock.getState().status !== 'playing') return
    this.output = new Tone.Limiter(-1).toDestination()
    this.pump()
    this.timer = setInterval(() => this.pump(), AUDIO.intervalMs)
  }

  private pump(): void {
    const state = this.clock.getState()
    if (state.status !== 'playing') { this.pause(); return }
    for (const event of this.scheduler.takeUntil(state.time + AUDIO.horizon, state.time)) {
      const at = Math.max(Tone.immediate(), this.clock.sourceTimeFor(event.startTime))
      let voice = this.voices.find(candidate => candidate.availableAt <= at)
      if (!voice && this.voices.length < AUDIO.maxPolyphony && this.output) {
        voice = {
          synth: new Tone.Synth({ oscillator: { type: 'sine' },
            envelope: { attack: 0.008, decay: 0.22, sustain: 0.28, release: AUDIO.release },
            volume: AUDIO.volumeDb }).connect(this.output),
          availableAt: 0,
        }
        this.voices.push(voice)
      }
      if (voice) {
        // Independent voices preserve overlapping unisons with different note-off times.
        voice.synth.triggerAttackRelease(Tone.Frequency(event.note.midi, 'midi').toFrequency(), event.duration, at, event.note.velocity)
        voice.availableAt = at + event.duration + AUDIO.release
      }
    }
  }

  dispose(): void { this.pause() }
}
