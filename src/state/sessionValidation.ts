import type { NormalizedScore, NoteEvent } from '../domain/score'
import { detectChords } from '../engine/music-analysis/chords'
import type { SavedSession } from './persistence'

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const integer = (value: unknown, max: number): value is number =>
  finite(value) && Number.isInteger(value) && value >= 0 && value <= max
const id = (value: unknown): value is string => typeof value === 'string' && value.length > 0
const instrument = (value: unknown) => value === undefined || integer(value, 127)
const NOTE_FIELDS = ['id', 'startTime', 'duration', 'midi', 'pitchClass', 'octave', 'velocity', 'trackId', 'channel', 'instrument'] as const

function note(value: unknown): value is NoteEvent {
  return object(value) && id(value.id) && id(value.trackId)
    && finite(value.startTime) && value.startTime >= 0 && finite(value.duration) && value.duration > 0
    && Number.isFinite(value.startTime + value.duration) && integer(value.midi, 127)
    && value.pitchClass === value.midi % 12 && value.octave === Math.floor(value.midi / 12) - 1
    && finite(value.velocity) && value.velocity >= 0 && value.velocity <= 1
    && integer(value.channel, 15) && instrument(value.instrument)
}

function sameNote(expected: NoteEvent, value: unknown) {
  return note(value) && NOTE_FIELDS.every(field => expected[field] === value[field])
}

// Disk values are unknown. Keep valid score identities and reject inconsistent
// note/track/chord copies before any compiler or renderer can consume them.
function score(value: unknown): value is NormalizedScore {
  if (!object(value) || !finite(value.duration) || value.duration < 0
    || !Array.isArray(value.notes) || !value.notes.length || !Array.isArray(value.tracks) || !Array.isArray(value.chords)
    || !object(value.metadata) || typeof value.metadata.title !== 'string'
    || value.metadata.source !== 'midi' && value.metadata.source !== 'demo'
    || value.bpm !== undefined && (!finite(value.bpm) || value.bpm <= 0)) return false

  const tempos = value.metadata.tempoMap
  if (tempos !== undefined) {
    if (!Array.isArray(tempos)) return false
    let previous = -1
    for (const tempo of tempos) {
      if (!object(tempo) || !finite(tempo.time) || tempo.time < previous || tempo.time < 0
        || !finite(tempo.bpm) || tempo.bpm <= 0) return false
      previous = tempo.time
    }
  }

  const notes: unknown[] = value.notes
  if (!notes.every(note)) return false
  const byId = new Map<string, NoteEvent>()
  let previous = -1, duration = 0
  for (const item of notes) {
    if (!item || item.startTime < previous || byId.has(item.id)) return false
    byId.set(item.id, item)
    previous = item.startTime
    duration = Math.max(duration, item.startTime + item.duration)
  }
  if (value.duration !== duration) return false

  const tracks = new Set<string>(), members = new Set<string>()
  for (const track of value.tracks) {
    if (!object(track) || !id(track.id) || tracks.has(track.id) || !Array.isArray(track.notes)
      || !integer(track.channel, 15) || !instrument(track.instrument)
      || track.name !== undefined && typeof track.name !== 'string') return false
    tracks.add(track.id)
    let previous = -1
    for (const item of track.notes) {
      if (!note(item) || item.trackId !== track.id || item.channel !== track.channel || item.instrument !== track.instrument
        || item.startTime < previous || members.has(item.id)) return false
      const expected = byId.get(item.id)
      if (!expected || !sameNote(expected, item)) return false
      members.add(item.id)
      previous = item.startTime
    }
  }
  if (members.size !== notes.length) return false

  const chords = detectChords(notes)
  const storedChords: unknown[] = value.chords
  return storedChords.length === chords.length && chords.every((expected, index) => {
    const chord = storedChords[index]
    return object(chord) && chord.id === expected.id && chord.startTime === expected.startTime
      && chord.duration === expected.duration && Array.isArray(chord.notes) && chord.notes.length === expected.notes.length
      && chord.notes.every((member: unknown, i: number) => sameNote(expected.notes[i]!, member))
  })
}

export function isSavedSession(value: unknown): value is SavedSession {
  return object(value) && id(value.id) && typeof value.filename === 'string' && integer(value.seed, 0xffffffff)
    && (value.version === undefined || value.version === 1) && score(value.score)
}
