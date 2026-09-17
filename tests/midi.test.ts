import { describe, expect, it } from 'vitest'
import { Midi } from '@tonejs/midi'
import { parseMidi } from '../src/midi/parser'
import { normalizeScore } from '../src/midi/normalize'
import { analyzeScore } from '../src/engine/music-analysis/analyzer'

function tempoFixture() {
  const midi = new Midi()
  midi.header.name = 'Two voices, changing tempo'
  midi.header.tempos = [{ ticks: 0, bpm: 120 }, { ticks: 480, bpm: 60 }]
  midi.header.update()
  midi.addTrack().addNote({ midi: 60, ticks: 0, durationTicks: 960, velocity: 0.8 })
  midi.tracks[0]!.addNote({ midi: 72, ticks: 960, durationTicks: 240, velocity: 0.6 })
  midi.addTrack().addNote({ midi: 64, ticks: 480, durationTicks: 480, velocity: 0.7 })
  midi.tracks[1]!.addNote({ midi: 67, ticks: 960, durationTicks: 480, velocity: 0.5 })
  return midi.toArray()
}

describe('MIDI normalization', () => {
  it('uses one tempo map across tracks and across tempo-spanning notes', () => {
    const score = parseMidi(tempoFixture())
    expect(score.tracks).toHaveLength(2)
    expect(score.notes.map(note => note.startTime)).toEqual([0, 0.5, 1.5, 1.5])
    expect(score.notes[0]!.duration).toBeCloseTo(1.5)
    expect(score.duration).toBeCloseTo(2.5)
    expect(score.metadata.tempoMap).toEqual([{ time: 0, bpm: 120 }, { time: 0.5, bpm: 60 }])
    expect(score.chords).toHaveLength(1)
    expect(score.chords[0]!.notes.map(note => note.midi)).toEqual([67, 72])
    expect(score.chords[0]!.duration).toBe(1)
  })

  it('preserves leading silence, channel, instrument, octave, and stable ids', () => {
    const midi = new Midi()
    const track = midi.addTrack()
    track.channel = 3
    track.instrument.number = 40
    track.addNote({ midi: 60, time: 2, duration: 1, velocity: 0.75 })
    const score = parseMidi(midi.toArray(), 'Example.mid')
    expect(score.notes[0]).toMatchObject({ startTime: 2, pitchClass: 0, octave: 4, channel: 3, instrument: 40 })
    expect(score.duration).toBe(3)
    expect(parseMidi(midi.toArray())).toEqual(parseMidi(midi.toArray()))
  })

  it('does not merge a short arpeggio or rewrite its timing', () => {
    const midi = new Midi()
    const track = midi.addTrack()
    track.addNote({ midi: 60, ticks: 0, durationTicks: 240 })
    track.addNote({ midi: 64, ticks: 1, durationTicks: 240 })
    expect(parseMidi(midi.toArray()).chords).toHaveLength(0)
  })

  it('rejects malformed, empty, asynchronous, and SMPTE files clearly', () => {
    expect(() => parseMidi(new Uint8Array([1, 2]))).toThrow('Standard MIDI')
    expect(() => parseMidi(new Midi().toArray())).toThrow('no playable notes')
    const asyncMidi = tempoFixture()
    asyncMidi[9] = 2
    expect(() => parseMidi(asyncMidi)).toThrow('Type 2')
    const smpteMidi = tempoFixture()
    smpteMidi[12] = 0x80
    expect(() => parseMidi(smpteMidi)).toThrow('SMPTE')
  })

  it('rejects invalid musical data before geometry', () => {
    expect(() => normalizeScore({ metadata: { source: 'demo', title: 'Invalid' }, tracks: [{
      name: '', channel: 0, instrument: 0, notes: [{ midi: 60, time: NaN, duration: 1, velocity: 0.5 }],
    }] })).toThrow('invalid')
  })

  it('produces data-only pitch, density, interval and track analysis', () => {
    const score = parseMidi(tempoFixture())
    const analysis = analyzeScore(score)
    expect(analysis.pitchRange).toEqual({ min: 60, max: 72 })
    expect(analysis.noteDensity).toBe(4 / 2.5)
    expect(analysis.trackGroups).toHaveLength(2)
    expect(analysis.intervals.map(interval => interval.semitones)).toEqual([12, 3])
  })
})
