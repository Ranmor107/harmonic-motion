import type { Midi } from '@tonejs/midi'
import type { NormalizedScore, NoteEvent, ScoreMetadata, TrackModel } from '../domain/score'
import { detectChords } from '../engine/music-analysis/chords'
import { clamp } from '../utils/math'

export interface ScoreInput {
  tracks: {
    name: string
    channel: number
    instrument: number
    notes: { time: number; duration: number; midi: number; velocity: number }[]
  }[]
  metadata: ScoreMetadata
}

export function normalizeScore(input: ScoreInput): NormalizedScore {
  const tracks: TrackModel[] = input.tracks.map((track, trackIndex) => {
    const id = `track:${trackIndex}`
    const notes: NoteEvent[] = track.notes.map((note, index) => {
      if (![note.time, note.duration, note.midi, note.velocity].every(Number.isFinite) ||
          note.time < 0 || note.duration <= 0 || !Number.isInteger(note.midi) || note.midi < 0 || note.midi > 127) {
        throw new Error('MIDI contains invalid note timing or pitch.')
      }
      return {
        id: `${id}:note:${index}`, startTime: note.time, duration: note.duration,
        midi: note.midi, pitchClass: note.midi % 12, octave: Math.floor(note.midi / 12) - 1,
        velocity: clamp(note.velocity, 0, 1), trackId: id,
        channel: track.channel, instrument: track.instrument,
      }
    }).sort((a, b) => a.startTime - b.startTime || a.midi - b.midi || a.id.localeCompare(b.id))
    return { id, name: track.name, channel: track.channel, instrument: track.instrument, notes }
  })
  const notes = tracks.flatMap(track => track.notes).sort((a, b) =>
    a.startTime - b.startTime || a.midi - b.midi || a.id.localeCompare(b.id))
  const duration = notes.reduce((end, note) => Math.max(end, note.startTime + note.duration), 0)
  return {
    duration, notes, tracks, chords: detectChords(notes),
    bpm: input.metadata.tempoMap?.[0]?.bpm, metadata: input.metadata,
  }
}

export function normalizeMidi(midi: Midi, filename = 'Untitled MIDI'): NormalizedScore {
  return normalizeScore({
    metadata: {
      title: midi.name.trim() || filename.replace(/\.midi?$/i, ''), source: 'midi',
      tempoMap: midi.header.tempos.map(tempo => ({ time: midi.header.ticksToSeconds(tempo.ticks), bpm: tempo.bpm })),
    },
    tracks: midi.tracks.map(track => ({
      name: track.name, channel: track.channel, instrument: track.instrument.number,
      // @tonejs/midi resolves ticks through the shared header tempo map for every track.
      notes: track.notes.map(note => ({ time: note.time, duration: note.duration, midi: note.midi, velocity: note.velocity })),
    })),
  })
}
