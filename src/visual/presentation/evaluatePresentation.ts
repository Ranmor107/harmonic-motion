import type { NormalizedScore, NoteEvent } from '../../domain/score'
import type { PresentationConfig, VisibilityMode } from '../../domain/visual'
import type { MusicNode, Vec3 } from '../../domain/world'
import { clamp } from '../../utils/math'

export interface NodePresentation {
  visible: boolean
  opacity: number
  emphasis: 'active' | 'context' | 'far'
}

export interface SatellitePresentation {
  noteId: string
  position: Vec3
  opacity: number
  scale: number
  phase: 'upcoming' | 'approaching' | 'hit' | 'completed'
  isChord: boolean
}

export interface StreamScoreContext {
  notes: NoteEvent[]
  pitchMidpoint: number
  pitchHalfRange: number
  maxDuration: number
  trackIndex: Map<string, number>
  chordNotes: Set<string>
}

export function evaluateNodePresentation(
  node: MusicNode,
  songTime: number,
  mode: VisibilityMode,
  config: PresentationConfig['visibility'],
): NodePresentation {
  if (mode === 'overview') return { visible: true, opacity: 1, emphasis: 'context' }
  const delta = node.time - songTime
  if (delta >= -config.activePast && delta <= config.activeFuture) {
    return { visible: true, opacity: 1, emphasis: 'active' }
  }
  if (mode === 'focus' && delta >= -config.contextPast && delta <= config.contextFuture) {
    return { visible: true, opacity: config.contextOpacity, emphasis: 'context' }
  }
  return { visible: mode === 'focus' && config.farOpacity > 0, opacity: config.farOpacity, emphasis: 'far' }
}

export function selectReadableNodeIds(
  nodes: MusicNode[],
  songTime: number,
  mode: VisibilityMode,
  config: PresentationConfig['visibility'],
): Set<string> | undefined {
  if (mode === 'overview') return undefined
  const past = mode === 'path' ? config.activePast : config.contextPast
  const future = mode === 'path' ? config.activeFuture : config.contextFuture
  const limit = mode === 'path' ? config.pathMaxNodes : config.focusMaxNodes
  return new Set(nodes
    .filter(node => node.time - songTime >= -past && node.time - songTime <= future)
    .sort((a, b) => Math.abs(a.time - songTime) - Math.abs(b.time - songTime) || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map(node => node.id))
}

export function evaluateStreamPerformer(songTime: number, duration: number): Vec3 {
  const progress = duration > 0 ? clamp(songTime / duration, 0, 1) : 0
  return { x: -2.8 + progress * 5.6, y: 0, z: 0 }
}

export function evaluateStreamSatellites(
  score: NormalizedScore,
  songTime: number,
  config: PresentationConfig['stream'],
  prepared = prepareStreamScore(score),
): SatellitePresentation[] {
  const performer = evaluateStreamPerformer(songTime, score.duration)
  const first = lowerBoundTime(prepared.notes, songTime - prepared.maxDuration - config.fadeOutTime)
  const last = lowerBoundTime(prepared.notes, songTime + config.leadInTime + Number.EPSILON)
  return prepared.notes.slice(first, last)
    .filter(note => songTime >= note.startTime - config.leadInTime && songTime <= note.startTime + note.duration + config.fadeOutTime)
    .sort((a, b) => Math.abs(a.startTime - songTime) - Math.abs(b.startTime - songTime) || a.id.localeCompare(b.id))
    .slice(0, config.maxVisibleNotes)
    .map(note => evaluateSatellite(note, score.tracks.length, prepared.trackIndex.get(note.trackId) ?? 0, prepared.chordNotes.has(note.id), performer, songTime, prepared.pitchMidpoint, prepared.pitchHalfRange, config))
}

export function prepareStreamScore(score: NormalizedScore): StreamScoreContext {
  let minMidi = 60
  let maxMidi = 72
  let maxDuration = 0
  if (score.notes.length) {
    minMidi = Infinity
    maxMidi = -Infinity
    for (const note of score.notes) {
      minMidi = Math.min(minMidi, note.midi)
      maxMidi = Math.max(maxMidi, note.midi)
      maxDuration = Math.max(maxDuration, note.duration)
    }
  }
  return {
    notes: [...score.notes].sort((a, b) => a.startTime - b.startTime || a.id.localeCompare(b.id)),
    pitchMidpoint: (minMidi + maxMidi) / 2,
    pitchHalfRange: Math.max(6, (maxMidi - minMidi) / 2),
    maxDuration,
    trackIndex: new Map(score.tracks.map((track, index) => [track.id, index])),
    chordNotes: new Set(score.chords.flatMap(chord => chord.notes.map(note => note.id))),
  }
}

function lowerBoundTime(notes: NoteEvent[], value: number) {
  let low = 0
  let high = notes.length
  while (low < high) {
    const middle = (low + high) >>> 1
    if (notes[middle]!.startTime < value) low = middle + 1
    else high = middle
  }
  return low
}

function evaluateSatellite(
  note: NoteEvent,
  trackCount: number,
  trackIndex: number,
  isChord: boolean,
  performer: Vec3,
  songTime: number,
  pitchMidpoint: number,
  pitchHalfRange: number,
  config: PresentationConfig['stream'],
): SatellitePresentation {
  const age = songTime - note.startTime
  const trackOffset = (trackIndex - (trackCount - 1) / 2) * config.trackSpacing
  const position = {
    x: performer.x + (note.startTime - songTime) * config.timeScale,
    y: clamp((note.midi - pitchMidpoint) / pitchHalfRange, -1, 1) * config.pitchSpread + trackOffset,
    z: trackOffset * 0.8,
  }
  if (age < -config.hitDuration) {
    const progress = clamp((age + config.leadInTime) / Math.max(0.001, config.leadInTime - config.hitDuration), 0, 1)
    return { noteId: note.id, position, opacity: 0.16 + progress * 0.64, scale: 0.65 + progress * 0.25, phase: progress < 0.45 ? 'upcoming' : 'approaching', isChord }
  }
  if (age <= config.hitDuration) {
    const pulse = 1 - Math.abs(age) / config.hitDuration
    return { noteId: note.id, position, opacity: 1, scale: 1 + pulse * 0.58, phase: 'hit', isChord }
  }
  const fade = 1 - clamp((age - config.hitDuration) / config.fadeOutTime, 0, 1)
  return { noteId: note.id, position, opacity: fade * 0.62, scale: 0.82 * fade, phase: 'completed', isChord }
}
