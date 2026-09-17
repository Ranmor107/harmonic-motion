import type { ChordEvent, NoteEvent } from '../../domain/score'

// Numerical tolerance only, not a musical quantizer. Arpeggios keep their timing.
export const ONSET_EPSILON = 1e-7

export function groupOnsets(notes: readonly NoteEvent[]): NoteEvent[][] {
  const groups: NoteEvent[][] = []
  for (const note of notes) {
    const last = groups.at(-1)
    if (last && Math.abs(note.startTime - last[0]!.startTime) <= ONSET_EPSILON) last.push(note)
    else groups.push([note])
  }
  return groups
}

export function detectChords(notes: readonly NoteEvent[]): ChordEvent[] {
  return groupOnsets(notes).filter(group => group.length > 1).map(group => ({
    id: `chord:${group[0]!.id}`,
    startTime: group[0]!.startTime,
    duration: Math.max(...group.map(note => note.startTime + note.duration)) - group[0]!.startTime,
    notes: group,
  }))
}
