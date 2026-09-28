import { describe, expect, it, vi } from 'vitest'
import { PlaybackClock } from '../src/playback/clock'
import { PlaybackController } from '../src/playback/controller'
import { NoteScheduler } from '../src/audio/scheduler'
import { createDemoScore, createQuickStudyScore } from '../src/demo/score'

function setup(duration = 100) {
  let now = 10
  const clock = new PlaybackClock(duration, () => now)
  return { clock, advance: (seconds: number) => { now += seconds } }
}

describe('Authoritative playback clock', () => {
  it('plays, pauses, resumes, stops and restarts from one source', () => {
    const { clock, advance } = setup()
    expect(clock.getState().status).toBe('stopped')
    clock.play()
    advance(3)
    expect(clock.getCurrentTime()).toBe(3)
    clock.pause()
    advance(20)
    expect(clock.getCurrentTime()).toBe(3)
    clock.play()
    advance(2)
    expect(clock.getCurrentTime()).toBe(5)
    clock.stop()
    expect(clock.getState()).toEqual({ status: 'stopped', time: 0, duration: 100 })
    clock.restart()
    expect(clock.getState().status).toBe('playing')
  })

  it('seeks directly to 37 seconds and preserves playing/paused behavior', () => {
    const { clock, advance } = setup()
    clock.seek(37)
    advance(5)
    expect(clock.getCurrentTime()).toBe(37)
    clock.play()
    advance(0.5)
    expect(clock.getCurrentTime()).toBe(37.5)
    clock.seek(12)
    advance(1)
    expect(clock.getCurrentTime()).toBe(13)
  })

  it('clamps boundaries, rejects nonfinite times, and can replay after completion', () => {
    const { clock, advance } = setup(3)
    clock.seek(-10)
    expect(clock.getCurrentTime()).toBe(0)
    clock.play()
    advance(4)
    expect(clock.getState()).toEqual({ time: 3, duration: 3, status: 'ended' })
    clock.play()
    expect(clock.getCurrentTime()).toBe(0)
    clock.seek(999)
    expect(clock.getState().status).toBe('ended')
    expect(() => clock.seek(NaN)).toThrow('finite')
  })

  it('maps future song events to the audio source including startup lead time', () => {
    const { clock, advance } = setup()
    clock.seek(37)
    clock.play(0.035)
    expect(clock.sourceTimeFor(38)).toBeCloseTo(11.035)
    advance(0.02)
    expect(clock.getCurrentTime()).toBe(37)
    advance(0.03)
    expect(clock.getCurrentTime()).toBeCloseTo(37.015)
  })
})

describe('Audio event scheduling', () => {
  const score = createDemoScore()
  it('schedules each attack once, including all chord tones', () => {
    const scheduler = new NoteScheduler(score.notes)
    scheduler.reset(0)
    const scheduled = []
    for (let time = 0; time < 11; time += 0.05) scheduled.push(...scheduler.takeUntil(time + 0.2, time))
    expect(scheduled.map(event => event.note.id).sort()).toEqual(score.notes.map(note => note.id).sort())
    expect(scheduled.filter(event => event.startTime === 5.2)).toHaveLength(3)
  })

  it('reconstructs held notes with remaining duration after seek', () => {
    const scheduler = new NoteScheduler(score.notes)
    scheduler.reset(5.8)
    const held = scheduler.takeUntil(6, 5.8)
    expect(held).toHaveLength(3)
    for (const event of held) {
      expect(event.startTime).toBe(5.8)
      expect(event.duration).toBeCloseTo(0.7)
    }
    expect(scheduler.takeUntil(6, 5.8)).toEqual([])
    scheduler.reset(5.2)
    expect(scheduler.takeUntil(5.2, 5.2)).toHaveLength(3)
  })

  it('skips expired notes after a timer delay instead of firing a stale burst', () => {
    const scheduler = new NoteScheduler(score.notes)
    scheduler.reset(0)
    const events = scheduler.takeUntil(7.3, 7.1)
    expect(events).toHaveLength(1)
    expect(events[0]!.startTime).toBe(7.1)
    expect(events[0]!.duration).toBeCloseTo(0.4)
  })
})

describe('Playback coordination', () => {
  function audioMock() {
    return { load: vi.fn(async () => {}), play: vi.fn(async () => {}), pause: vi.fn(), stop: vi.fn(), seek: vi.fn(), dispose: vi.fn() }
  }
  it('keeps audio seeks and the song clock in lockstep', async () => {
    const { clock } = setup()
    const audio = audioMock()
    const controller = new PlaybackController(clock, audio)
    await controller.load(createDemoScore())
    await controller.play()
    expect(audio.seek).toHaveBeenLastCalledWith(0)
    controller.seek(5.8)
    expect(audio.seek).toHaveBeenLastCalledWith(5.8)
    expect(clock.getCurrentTime()).toBe(5.8)
    controller.pause()
    expect(audio.pause).toHaveBeenCalled()
    controller.dispose()
    expect(audio.dispose).toHaveBeenCalled()
  })

  it('replays a recent interval through the existing clock without reloading the score', async () => {
    const { clock, advance } = setup()
    const audio = audioMock()
    const controller = new PlaybackController(clock, audio)
    await controller.load(createQuickStudyScore())
    await controller.play()
    advance(18)
    const target = Math.max(0, clock.getCurrentTime() - 10)
    controller.seek(target)
    expect(clock.getState().status).toBe('playing')
    expect(clock.getCurrentTime()).toBeCloseTo(target)
    expect(audio.seek).toHaveBeenLastCalledWith(target)
    controller.pause()
    controller.seek(Math.max(0, clock.getCurrentTime() - 10))
    expect(clock.getState()).toMatchObject({ status: 'paused', time: 0 })
    await controller.play()
    expect(clock.getState().status).toBe('playing')
    expect(audio.load).toHaveBeenCalledTimes(1)
    controller.dispose()
  })

  it('does not start a late audio-unlock promise after pause', async () => {
    const { clock } = setup()
    let unlock!: () => void
    const audio = { ...audioMock(), play: () => new Promise<void>(resolve => { unlock = resolve }) }
    const controller = new PlaybackController(clock, audio)
    const pending = controller.play()
    controller.pause()
    unlock()
    await pending
    expect(clock.getState().status).not.toBe('playing')
    expect(audio.seek).not.toHaveBeenCalled()
  })
})
