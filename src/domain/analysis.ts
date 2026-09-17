import type { ChordEvent } from './score'

export interface MusicAnalysis {
  pitchRange: { min: number; max: number }
  noteDensity: number
  chords: ChordEvent[]
  intervals: { fromNoteId: string; toNoteId: string; semitones: number }[]
  trackGroups: { trackId: string; noteIds: string[] }[]
}
