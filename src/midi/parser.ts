import { Midi } from '@tonejs/midi'
import { normalizeMidi } from './normalize'

export const MIDI_LIMITS = { bytes: 10 * 1024 * 1024, notes: 20000 } as const

export function parseMidi(data: ArrayBuffer | Uint8Array, filename?: string) {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  if (bytes.byteLength > MIDI_LIMITS.bytes) throw new Error('Choose a MIDI file smaller than 10 MB.')
  if (bytes.length < 14 || String.fromCharCode(...bytes.slice(0, 4)) !== 'MThd') {
    throw new Error('This is not a Standard MIDI file. Choose a .mid or .midi file.')
  }
  if ((bytes[8]! << 8 | bytes[9]!) === 2) throw new Error('MIDI Type 2 uses independent sequences. Export it as Type 0 or 1.')
  if ((bytes[12]! & 0x80) !== 0) throw new Error('SMPTE MIDI timing is not supported. Export with musical ticks (PPQ).')
  let midi: Midi
  try { midi = new Midi(bytes) } catch { throw new Error('This MIDI file could not be read. Try exporting it again.') }
  const count = midi.tracks.reduce((sum, track) => sum + track.notes.length, 0)
  if (!count) throw new Error('This MIDI has no playable notes.')
  if (count > MIDI_LIMITS.notes) throw new Error('This foundation supports up to 20,000 notes. Choose a shorter excerpt.')
  return normalizeMidi(midi, filename)
}
