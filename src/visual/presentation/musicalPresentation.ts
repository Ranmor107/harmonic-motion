import type { NormalizedScore, NoteEvent } from '../../domain/score'
import type { PresentationConfig } from '../../domain/visual'
import type { Vec3 } from '../../domain/world'
import { clamp, upperBound } from '../../utils/math'

export interface LeadPoint { note: NoteEvent; position: Vec3 }
export interface MusicalPhrase { id: string; trackId: string; notes: NoteEvent[] }
export interface MusicalPresentation {
  lead: LeadPoint[]
  phrases: MusicalPhrase[]
  notes: NoteEvent[]
  positions: Map<string, Vec3>
  leadIds: Set<string>
  chordIds: Set<string>
  maxDuration: number
  noteBlocks: { first: number; last: number; start: number; end: number }[]
  phraseByNote: Map<string, MusicalPhrase>
  supportPaths: Map<string, Vec3[]>
}

// A deterministic display heuristic, not melody extraction. Equal scores use stable IDs.
export function selectSalientNotes(score: NormalizedScore, weights: PresentationConfig['salience'], trackId?: string): NoteEvent[] {
  const track = score.tracks.find(item => item.id === trackId)
  const ordered = [...(track?.notes.length ? track.notes : score.notes)].sort((a, b) => a.startTime - b.startTime || a.id.localeCompare(b.id))
  const windows: NoteEvent[][] = []
  for (const note of ordered) {
    const window = windows.at(-1)
    if (window && note.startTime - window[0]!.startTime < weights.windowSeconds) window.push(note)
    else windows.push([note])
  }
  let previous: NoteEvent | undefined
  return windows.map(group => {
    const rank = (note: NoteEvent) => weights.velocity * note.velocity +
      weights.duration * Math.min(note.duration / 2, 1) + weights.register * note.midi / 127 +
      weights.trackContinuity * Number(previous?.trackId === note.trackId) +
      weights.pitchContinuity * (previous ? 1 - Math.min(Math.abs(note.midi - previous.midi) / 24, 1) : 0)
    previous = [...group].sort((a, b) => rank(b) - rank(a) || a.id.localeCompare(b.id))[0]!
    return previous
  })
}

export function createMusicalPresentation(score: NormalizedScore, config: PresentationConfig, trackId?: string): MusicalPresentation {
  const notes = [...score.notes].sort((a, b) => a.startTime - b.startTime || a.id.localeCompare(b.id))
  const selected = selectSalientNotes(score, config.salience, trackId)
  const { stream } = config
  const minPitch = notes.reduce((min, n) => Math.min(min, n.midi), 127)
  const maxPitch = notes.reduce((max, n) => Math.max(max, n.midi), 0)
  const mid = (minPitch + maxPitch) / 2
  const half = Math.max(6, (maxPitch - minPitch) / 2)
  let x = 0
  let phase = 0
  const lead = selected.map((note, index): LeadPoint => {
    const prev = selected[index - 1]
    const dt = prev ? note.startTime - prev.startTime : 0
    const interval = prev ? Math.abs(note.midi - prev.midi) : 0
    const density = prev ? 1 / (1 + dt) : 0
    x += dt * stream.timeScale * (1 + density * stream.densitySpacing) + (prev?.duration ?? 0) * stream.durationSpacing
    phase += dt * stream.phaseSpeed + density * stream.densityCurvature
    const radius = stream.radius + interval * stream.intervalRadius
    const pitch = (note.midi - mid) / half * stream.pitchSpread
    return { note, position: { x, y: pitch + Math.sin(phase) * radius, z: Math.cos(phase) * radius } }
  })
  const leadIds = new Set(selected.map(note => note.id))
  const positions = new Map(lead.map(point => [point.note.id, point.position]))
  const phrases: MusicalPhrase[] = []
  // Consecutive notes from each track form bounded display phrases; rests split them.
  score.tracks.forEach((track, trackIndex) => {
    let phrase: MusicalPhrase | undefined
    for (const note of track.notes.filter(n => !leadIds.has(n.id))) {
      const previous = phrase?.notes.at(-1)
      if (!phrase || !previous || note.startTime - previous.startTime > config.relations.phraseGap || phrase.notes.length >= config.relations.phraseSize) {
        phrase = { id: `phrase:${note.id}`, trackId: track.id, notes: [] }
        phrases.push(phrase)
      }
      phrase.notes.push(note)
      const anchor = evaluateLead({ lead }, note.startTime)
      const offset = (trackIndex - (score.tracks.length - 1) / 2) * stream.trackSpacing
      const depthLane = (trackIndex % 2 ? -1 : 1) * (1.1 + Math.floor(trackIndex / 2) * stream.trackSpacing)
      const arch = Math.sin((phrase.notes.length - 1) / Math.max(1, config.relations.phraseSize - 1) * Math.PI)
      positions.set(note.id, { x: anchor.x, y: (note.midi - mid) / half * stream.pitchSpread + offset + arch * 0.35,
        z: anchor.z * 0.4 + depthLane + arch * 0.5 })
    }
  })
  const noteBlocks = []
  for (let first = 0; first < notes.length; first += 32) {
    const last = Math.min(notes.length, first + 32)
    let end = 0
    for (let i = first; i < last; i++) end = Math.max(end, notes[i]!.startTime + notes[i]!.duration)
    noteBlocks.push({ first, last, start: notes[first]!.startTime, end })
  }
  const phraseByNote = new Map<string, MusicalPhrase>()
  const supportPaths = new Map<string, Vec3[]>()
  for (const phrase of phrases) phrase.notes.forEach((note, i) => {
    phraseByNote.set(note.id, phrase)
    const a = i ? positions.get(phrase.notes[i - 1]!.id)! : evaluateLead({ lead }, note.startTime)
    supportPaths.set(note.id, curveBetween(a, positions.get(note.id)!, config.relations.curveHeight * 0.5, config.relations.samples))
  })
  return { lead, notes, phrases, positions, leadIds, noteBlocks, phraseByNote, supportPaths,
    chordIds: new Set(score.chords.flatMap(chord => chord.notes.map(n => n.id))), maxDuration: notes.reduce((max, n) => Math.max(max, n.duration), 0) }
}

export function evaluateLead(model: Pick<MusicalPresentation, 'lead'>, time: number): Vec3 {
  const { lead } = model
  if (!lead.length) return { x: 0, y: 0, z: 0 }
  const index = upperBound(lead, time, p => p.note.startTime)
  if (!index) return { ...lead[0]!.position }
  if (index === lead.length) return { ...lead.at(-1)!.position }
  const a = lead[index - 1]!
  const b = lead[index]!
  if (time === a.note.startTime) return { ...a.position }
  const u = clamp((time - a.note.startTime) / (b.note.startTime - a.note.startTime), 0, 1)
  const smooth = u * u * (3 - 2 * u)
  return { x: a.position.x + (b.position.x - a.position.x) * u, y: a.position.y + (b.position.y - a.position.y) * smooth, z: a.position.z + (b.position.z - a.position.z) * smooth }
}

export function noteLifecycle(note: NoteEvent, time: number, config: PresentationConfig['stream']) {
  const age = time - note.startTime
  if (age < -config.leadInTime || age > note.duration + config.fadeOutTime) return { phase: 'gone', opacity: 0, scale: 0 } as const
  if (age < -config.hitDuration) {
    const progress = clamp((age + config.leadInTime) / (config.leadInTime - config.hitDuration), 0, 1)
    return { phase: progress < 0.45 ? 'upcoming' : 'approaching', opacity: 0.12 + progress * 0.65, scale: 0.7 + progress * 0.3 } as const
  }
  if (age <= note.duration) return { phase: age <= config.hitDuration ? 'hit' : 'active', opacity: 1, scale: 1 + Math.max(0, 1 - Math.abs(age) / config.hitDuration) * 0.5 } as const
  const fade = 1 - (age - note.duration) / config.fadeOutTime
  return { phase: 'fade', opacity: fade * 0.6, scale: 0.85 * fade } as const
}

export function notesInWindow(model: MusicalPresentation, time: number, past: number, future: number) {
  const candidates: NoteEvent[] = []
  const lastBlock = upperBound(model.noteBlocks, time + future, block => block.start)
  for (let b = 0; b < lastBlock; b++) {
    const block = model.noteBlocks[b]!
    if (block.end + past < time) continue
    for (let i = block.first; i < block.last; i++) {
      const note = model.notes[i]!
      if (note.startTime > time + future) break
      if (note.startTime + note.duration + past >= time) candidates.push(note)
    }
  }
  return candidates
}

export function visibleStreamNotes(model: MusicalPresentation, time: number, config: PresentationConfig['stream']) {
  return notesInWindow(model, time, config.fadeOutTime, config.leadInTime)
    .sort((a, b) => Number(model.leadIds.has(b.id)) - Number(model.leadIds.has(a.id)) || Math.abs(a.startTime - time) - Math.abs(b.startTime - time) || a.id.localeCompare(b.id))
    .slice(0, config.maxVisibleNotes)
}

export function visiblePhrases(model: MusicalPresentation, notes: NoteEvent[]) {
  return [...new Set(notes.map(note => model.phraseByNote.get(note.id)).filter(phrase => phrase !== undefined))]
}

export function curveBetween(a: Vec3, b: Vec3, height: number, samples: number): Vec3[] {
  return Array.from({ length: samples + 1 }, (_, index) => {
    const u = index / samples
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u + Math.sin(u * Math.PI) * height, z: a.z + (b.z - a.z) * u }
  })
}
