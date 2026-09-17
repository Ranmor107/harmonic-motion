import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlaybackClock } from '../src/playback/clock'
import { PlaybackController } from '../src/playback/controller'
import { normalizeScore } from '../src/midi/normalize'

const fake = vi.hoisted(() => ({ now: 10, voices: [] as { triggerAttackRelease: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> }[] }))
vi.mock('tone', () => ({
  immediate: () => fake.now,
  start: async () => {},
  Frequency: (midi: number) => ({ toFrequency: () => midi }),
  Synth: class {
    triggerAttackRelease = vi.fn()
    dispose = vi.fn()
    constructor() { fake.voices.push(this) }
    connect() { return this }
  },
  Limiter: class { toDestination() { return this } dispose() {} },
}))
import { ToneAudioEngine } from '../src/audio/ToneAudioEngine'

afterEach(() => { vi.useRealTimers(); fake.voices = []; fake.now = 10 })

describe('Tone audio adapter', () => {
  it('gives overlapping unisons independent voices and cancels scheduled audio on seek', async () => {
    vi.useFakeTimers()
    const score = normalizeScore({ metadata: { title: 'Unisons', source: 'demo' }, tracks: [{
      name: 'Voice', channel: 0, instrument: 0,
      notes: [{ time: 0, duration: 2, midi: 60, velocity: 0.7 }, { time: 0.1, duration: 0.2, midi: 60, velocity: 0.5 }],
    }] })
    const clock = new PlaybackClock(score.duration, () => fake.now)
    const audio = new ToneAudioEngine(clock)
    const controller = new PlaybackController(clock, audio)
    await controller.load(score)
    await controller.play()
    expect(fake.voices).toHaveLength(2)
    expect(fake.voices[0]!.triggerAttackRelease).toHaveBeenCalledWith(60, 2, 10.035, 0.7)
    expect(fake.voices[1]!.triggerAttackRelease).toHaveBeenCalledWith(60, expect.closeTo(0.2, 10), 10.135, 0.5)
    const previousVoices = [...fake.voices]
    controller.seek(1)
    for (const voice of previousVoices) expect(voice.dispose).toHaveBeenCalledOnce()
    expect(fake.voices.at(-1)!.triggerAttackRelease).toHaveBeenCalledWith(60, 1, 10, 0.7)
    controller.pause()
    expect(fake.voices.at(-1)!.dispose).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })
})
