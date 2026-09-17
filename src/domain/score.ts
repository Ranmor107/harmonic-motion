export type NoteId = string

export interface NoteEvent {
  id: NoteId
  startTime: number
  duration: number
  midi: number
  pitchClass: number
  octave: number
  velocity: number
  trackId: string
  channel: number
  instrument?: number
}

export interface ChordEvent {
  id: string
  startTime: number
  duration: number
  notes: NoteEvent[]
}

export interface TrackModel {
  id: string
  name?: string
  channel: number
  instrument?: number
  notes: NoteEvent[]
}

export interface ScoreMetadata {
  title: string
  source: 'midi' | 'demo'
  tempoMap?: { time: number; bpm: number }[]
}

export interface NormalizedScore {
  duration: number
  bpm?: number
  notes: NoteEvent[]
  chords: ChordEvent[]
  tracks: TrackModel[]
  metadata: ScoreMetadata
}
