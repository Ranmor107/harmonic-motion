import type { NormalizedScore } from '../../domain/score'
import type { MusicAnalysis } from '../../domain/analysis'

export function analyzeScore(score: NormalizedScore): MusicAnalysis {
  const pitches = score.notes.map(note => note.midi)
  return {
    pitchRange: { min: pitches.length ? Math.min(...pitches) : 60, max: pitches.length ? Math.max(...pitches) : 60 },
    noteDensity: score.duration > 0 ? score.notes.length / score.duration : 0,
    chords: score.chords,
    intervals: score.tracks.flatMap(track => track.notes.slice(1).map((note, index) => ({
      fromNoteId: track.notes[index]!.id, toNoteId: note.id, semitones: note.midi - track.notes[index]!.midi,
    }))),
    trackGroups: score.tracks.filter(track => track.notes.length).map(track => ({ trackId: track.id, noteIds: track.notes.map(note => note.id) })),
  }
}
