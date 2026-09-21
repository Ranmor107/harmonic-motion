import type { NormalizedScore, NoteEvent } from '../../domain/score'
import type { Vec3 } from '../../domain/world'
import { clamp } from '../../utils/math'
import { notesInWindow, type MusicalPresentation } from './musicalPresentation'

export const ENSEMBLE_BUDGET = 96
export const ENSEMBLE_WINDOW = { past: 1.2, future: 3.5 }
export const ENSEMBLE_STAGE = {
  bounds: { min: { x: -5.7, y: -5.7, z: -1 }, max: { x: 5.7, y: 5.7, z: 1 } },
  direction: { x: 0, y: 0, z: 1 },
}
interface VoiceRegion { trackId: string; angle: number; span: number; radius: number }
interface NotePlacement { angle: number; radius: number; voice: number }
export interface EnsemblePresentation {
  source: MusicalPresentation
  regions: VoiceRegion[]
  placements: Map<string, NotePlacement>
  representatives: Set<string>
  chordByNote: Map<string, string>
  energy: number[]
  bounds: { min: Vec3; max: Vec3 }
}

// MIDI tracks are stable display regions, not inferred contrapuntal voices.
export function createEnsemblePresentation(score: NormalizedScore, source: MusicalPresentation): EnsemblePresentation {
  const tracks = score.tracks.filter(track => track.notes.length)
  const sectors = Math.max(1, Math.min(12, tracks.length))
  const regions = tracks.map((track, i) => ({ trackId: track.id,
    angle: Math.PI / 2 - i % sectors * Math.PI * 2 / sectors,
    span: Math.min(4.2, Math.PI * 2 / sectors * 0.76),
    radius: 2.9 + (i % 2) * 0.3 + Math.min(0.9, Math.floor(i / sectors) * 0.32),
  }))
  const placements = new Map<string, NotePlacement>()
  const representatives = new Set<string>()
  const energy = Array.from({ length: Math.ceil(score.duration) + 2 }, () => 0)
  tracks.forEach((track, voice) => {
    const region = regions[voice]!
    const low = track.notes.reduce((pitch, n) => Math.min(pitch, n.midi), 127)
    const high = track.notes.reduce((pitch, n) => Math.max(pitch, n.midi), 0)
    const buckets = new Map<number, NoteEvent[]>()
    for (const note of track.notes) {
      placements.set(note.id, { voice, radius: region.radius,
        angle: region.angle + (note.midi - (high + low) / 2) / Math.max(12, high - low) * region.span })
      const bucket = Math.floor(note.startTime / 0.18)
      const group = buckets.get(bucket) ?? []
      group.push(note)
      buckets.set(bucket, group)
      energy[Math.floor(note.startTime)]! += note.velocity
    }
    // Stable selection before playback avoids frame-to-frame ranking flicker.
    // Keep the salient/held note plus pitch extremes of dense ornament/chord groups.
    for (const group of buckets.values()) {
      if (group.length <= 3) group.forEach(n => representatives.add(n.id))
      else {
        const rank = (n: NoteEvent) => Number(source.leadIds.has(n.id)) * 4 + Math.min(n.duration, 2) + n.velocity
        const ordered = [...group].sort((a, b) => rank(b) - rank(a) || a.id.localeCompare(b.id))
        representatives.add(ordered[0]!.id)
        const pitchOrder = [...group].sort((a, b) => a.midi - b.midi || a.id.localeCompare(b.id))
        representatives.add(pitchOrder[0]!.id)
        representatives.add(pitchOrder.at(-1)!.id)
      }
    }
  })
  const peak = energy.reduce((max, value) => Math.max(max, value), 1)
  const extent = regions.reduce((max, region) => Math.max(max, region.radius), 2.9) + ENSEMBLE_WINDOW.future * 0.34 + 0.25
  return { source, regions, placements, representatives,
    bounds: { min: { x: -extent, y: -extent, z: -0.1 }, max: { x: extent, y: extent, z: 0.1 } },
    chordByNote: new Map(score.chords.flatMap(chord => chord.notes.map(note => [note.id, chord.id]))),
    energy: energy.map(value => value / peak) }
}

export function visibleEnsembleNotes(model: EnsemblePresentation, time: number) {
  const candidates = notesInWindow(model.source, time, ENSEMBLE_WINDOW.past, ENSEMBLE_WINDOW.future)
    .filter(note => model.representatives.has(note.id))
  const rank = (n: NoteEvent) => Number(time >= n.startTime && time <= n.startTime + n.duration) * 8 +
    Number(model.source.leadIds.has(n.id)) * 3 + Math.min(n.duration, 2) * 0.3 - Math.abs(n.startTime - time)
  const voices = new Map<string, NoteEvent[]>()
  for (const note of candidates) {
    const group = voices.get(note.trackId) ?? []
    group.push(note)
    voices.set(note.trackId, group)
  }
  const groups = [...voices.values()].map(notes => {
    const occupied: Vec3[] = []
    return notes.sort((a, b) => rank(b) - rank(a) || a.id.localeCompare(b.id)).filter(note => {
      const point = ensemblePoint(model, note, time)
      if (occupied.some(p => Math.hypot(p.x - point.x, p.y - point.y) < 0.23)) return false
      occupied.push(point)
      return true
    })
  })
  const selected: NoteEvent[] = []
  // Round-robin reserves representation for quiet parts under the global budget.
  for (let i = 0; selected.length < ENSEMBLE_BUDGET; i++) {
    let added = false
    for (const notes of groups) if (notes[i] && selected.length < ENSEMBLE_BUDGET) {
      selected.push(notes[i]!)
      added = true
    }
    if (!added) break
  }
  return selected.sort((a, b) => a.startTime - b.startTime || a.id.localeCompare(b.id))
}

export function ensemblePoint(model: EnsemblePresentation, note: NoteEvent, time: number): Vec3 {
  const placement = model.placements.get(note.id)!
  // Approach the voice arc, hold throughout the note, then drift into the past.
  const offset = time < note.startTime ? note.startTime - time : Math.min(0, note.startTime + note.duration - time)
  const radius = placement.radius + offset * 0.34
  return { x: Math.cos(placement.angle) * radius, y: Math.sin(placement.angle) * radius, z: 0 }
}

export function ensembleMotion(model: EnsemblePresentation, time: number, reducedMotion = false) {
  if (reducedMotion) return { x: 0, y: 0, rotation: 0, scale: 1 }
  const second = Math.max(0, Math.floor(time))
  const fraction = clamp(time - second, 0, 1)
  const smooth = fraction * fraction * (3 - 2 * fraction)
  const energy = (model.energy[second] ?? 0) * (1 - smooth) + (model.energy[second + 1] ?? 0) * smooth
  return { x: Math.sin(time * 0.11) * 0.12, y: Math.sin(time * 0.08) * 0.09,
    rotation: Math.sin(time * 0.07) * 0.055, scale: 1 + energy * 0.025 }
}
