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
      if (![note.time, note.duration, note.time + note.duration, note.midi, note.velocity].every(Number.isFinite) ||
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
  const fallbackTitle = filename.replace(/\.midi?$/i, '')
  const decodedTitle = decodeMidiTitle(midi.name, fallbackTitle)
  return normalizeScore({
    metadata: {
      title: decodedTitle.text, source: 'midi',
      tempoMap: midi.header.tempos.map(tempo => ({ time: midi.header.ticksToSeconds(tempo.ticks), bpm: tempo.bpm })),
    },
    tracks: midi.tracks.map(track => ({
      name: decodedTitle.encoding ? decodeMidiText(track.name, decodedTitle.encoding) ?? track.name : track.name,
      channel: track.channel, instrument: track.instrument.number,
      // @tonejs/midi resolves ticks through the shared header tempo map for every track.
      notes: track.notes.map(note => ({ time: note.time, duration: note.duration, midi: note.midi, velocity: note.velocity })),
    })),
  })
}

const MIDI_TEXT_ENCODINGS = ['utf-8', 'gb18030', 'big5', 'shift_jis'] as const

function midiTextBytes(text: string) {
  const values = Array.from(text, character => character.codePointAt(0)!)
  return values.every(value => value <= 0xff) ? Uint8Array.from(values) : undefined
}

function decodeMidiText(text: string, encoding: string) {
  const bytes = midiTextBytes(text)
  if (!bytes) return undefined
  try {
    const decoded = new TextDecoder(encoding, { fatal: true }).decode(bytes).trim()
    return decoded && !Array.from(decoded).some(character => {
      const code = character.codePointAt(0)!
      return code === 0xfffd || code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d
    }) ? decoded : undefined
  } catch {
    return undefined
  }
}

function decodeMidiTitle(value: string, fallback: string): { text: string; encoding?: string } {
  const raw = value.trim()
  if (!raw) return { text: fallback }
  if (Array.from(raw).every(character => character.codePointAt(0)! <= 0x7f)) return { text: raw }
  const expected = fallback.normalize('NFC').trim()
  for (const encoding of MIDI_TEXT_ENCODINGS) {
    const candidate = decodeMidiText(raw, encoding)
    if (candidate?.normalize('NFC') === expected) return { text: candidate, encoding }
  }
  const utf8 = decodeMidiText(raw, 'utf-8')
  if (utf8) return { text: utf8, encoding: 'utf-8' }
  const legacyByteRatio = Array.from(raw).filter(character => {
    const code = character.codePointAt(0)!
    return code >= 0x80 && code <= 0xff
  }).length / Array.from(raw).length
  return legacyByteRatio > 0.35 && fallback ? { text: fallback } : { text: raw }
}
