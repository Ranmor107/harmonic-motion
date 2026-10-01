import type { NormalizedScore, NoteEvent } from '../../domain/score'
import type { InkMode, PresentationConfig } from '../../domain/visual'
import { clamp, lerp, upperBound } from '../../utils/math'
import { selectSalientNotes } from './musicalPresentation'

export const INK_LIMITS = { notes: 160, marks: 6000, history: 14, window: 14 } as const
interface InkNote {
  note: NoteEvent; y: number; lead: boolean; bass: boolean; seed: number
  anchor: number; repeats: number; stroke: boolean; next?: InkNote; branch?: InkNote
}
export interface InkPresentation {
  notes: InkNote[]
  blocks: { first: number; last: number; start: number; end: number }[]
  chords: { start: number; notes: InkNote[] }[]
}
export interface InkMark {
  x: number; y: number; radius: number; born: number; duration: number
  seed: number; strength: number; aspect: number; angle: number; type: number; dry: number; memory: number
  source: string
}
const endOf = (n: NoteEvent) => n.startTime + n.duration
const smooth = (t: number) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t) }
function seedOf(id: string) {
  let hash = 2166136261
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return (hash >>> 0) / 4294967296
}

// Display-only voice hierarchy. The existing lead heuristic (or selected track)
// provides the spine; other tracks retain stable pitch regions and real rests.
export function createInkPresentation(score: NormalizedScore, config: PresentationConfig, focusTrackId?: string): InkPresentation {
  const leadNotes = selectSalientNotes(score, config.salience, focusTrackId)
  const leadIds = new Set(leadNotes.map(n => n.id))
  const leadMid = leadNotes.reduce((sum, n) => sum + n.midi, 0) / Math.max(1, leadNotes.length)
  const notes: InkNote[] = []
  score.tracks.forEach((track, rank) => {
    const mid = track.notes.reduce((sum, n) => sum + n.midi, 0) / Math.max(1, track.notes.length)
    const lastPitch = new Map<number, InkNote>()
    const ordered = [...track.notes].sort((a, b) => a.startTime - b.startTime || a.id.localeCompare(b.id))
    for (const note of ordered) {
      const lead = leadIds.has(note.id)
      const previous = lastPitch.get(note.midi)
      const repeated = previous && note.startTime - previous.note.startTime <= .9 && lead === previous.lead
      const mark: InkNote = {
        note, lead, bass: mid < leadMid - 12, seed: seedOf(note.id), stroke: lead,
        y: lead ? clamp(.39 - (note.midi - leadMid) * .012, .16, .52)
          : clamp(.64 + ((rank % 5) - 2) * .024 - (note.midi - mid) * .008 + (mid < leadMid - 12 ? .04 : 0), .53, .82),
        anchor: repeated ? previous.anchor : note.startTime,
        repeats: repeated ? Math.min(3, previous.repeats + 1) : 0,
      }
      notes.push(mark)
      lastPitch.set(note.midi, mark)
    }
  })
  notes.sort((a, b) => a.note.startTime - b.note.startTime || a.note.id.localeCompare(b.note.id))
  const byId = new Map(notes.map(n => [n.note.id, n]))
  const lead = leadNotes.map(n => byId.get(n.id)!).filter(Boolean)
  const join = (line: InkNote[]) => line.forEach((n, i) => {
    const next = line[i + 1]
    const articulationGap = next ? Math.min(.18, (next.note.startTime - n.note.startTime) * .3) : 0
    if (next && next.note.startTime > n.note.startTime && next.note.startTime <= endOf(n.note) + articulationGap
      && Math.abs(next.note.midi - n.note.midi) < 7 && next.note.trackId === n.note.trackId) n.next = next
  })
  join(lead)
  for (const track of score.tracks) {
    // One writing strand per accompaniment track; other chord members remain deposits.
    const line: InkNote[] = []
    for (const n of notes.filter(n => n.note.trackId === track.id && !n.lead)) {
      const previous = line.at(-1)
      if (previous && n.note.startTime - previous.note.startTime < .04) {
        if (n.note.velocity > previous.note.velocity) line[line.length - 1] = n
      } else line.push(n)
    }
    join(line)
    line.forEach((n, i) => {
      n.stroke = true
      const previous = line[i - 1]
      if (!previous || n.note.startTime - endOf(previous.note) > .25) {
        const main = lead[upperBound(lead, n.note.startTime, p => p.note.startTime) - 1]
        if (main && main.note.startTime < n.note.startTime && endOf(main.note) >= n.note.startTime) n.branch = main
      }
    })
  }
  const blocks = []
  for (let first = 0; first < notes.length; first += 32) {
    const last = Math.min(notes.length, first + 32)
    blocks.push({ first, last, start: notes[first]!.note.startTime,
      end: Math.max(...notes.slice(first, last).map(n => endOf(n.note))) })
  }
  return { notes, blocks, chords: score.chords.map(chord => ({ start: chord.startTime,
    notes: chord.notes.map(n => byId.get(n.id)!).filter(Boolean) })).sort((a, b) => a.start - b.start) }
}

// Every position, deposition and fade is a function of song time. No accumulated
// canvas history, future guide line, synthetic audio or second musical clock.
export function buildInkFrame(model: InkPresentation, mode: InkMode, time: number, width: number, height: number, effects = true): InkMark[] {
  const marks: InkMark[] = []
  const unit = Math.min(width / 1050, height / 620)
  const origin = Math.max(0, time - 9)
  const xAt = (t: number) => width * (.09 + .84 * (t - origin) / INK_LIMITS.window)
  const candidates: InkNote[] = []
  const lastBlock = upperBound(model.blocks, time, b => b.start)
  for (let b = 0; b < lastBlock; b++) {
    const block = model.blocks[b]!
    if (block.end + INK_LIMITS.history < time) continue
    for (let i = block.first; i < block.last; i++) {
      const n = model.notes[i]!
      if (n.note.startTime > time) break
      if (endOf(n.note) + INK_LIMITS.history >= time && endOf(n.note) >= origin - 2) candidates.push(n)
    }
  }
  candidates.sort((a, b) => Number(b.lead) - Number(a.lead) || b.note.velocity - a.note.velocity || a.note.id.localeCompare(b.note.id))
  const visible = candidates.slice(0, INK_LIMITS.notes)
  const add = (n: InkNote, x: number, y: number, radius: number, born: number, type: number, strength: number, dry = 0, aspect = 1) => {
    if (marks.length >= INK_LIMITS.marks || born > time || born > endOf(n.note) || x + radius < 0 || x - radius > width) return
    marks.push({ x, y, radius, born, duration: Math.max(.025, endOf(n.note) - born), seed: n.seed,
      strength, aspect, angle: type === 0 ? (n.seed - .5) * .7 : 0, type, dry,
      memory: n.lead ? .9 : .3, source: n.note.id })
  }
  for (const n of visible) {
    const event = n.note
    const strength = event.velocity * (n.lead ? 1 : .76)
    if (mode === 'drops' || !n.stroke) {
      const anchor = event.duration > 9 ? Math.max(n.anchor, Math.min(origin + 1, endOf(event) - 8)) : n.anchor
      add(n, xAt(anchor), n.y * height, (n.lead ? 55 : n.bass ? 43 : 36) * unit * (.6 + event.velocity * .7),
        event.startTime, 0, strength + n.repeats * .1)
      continue
    }
    const span = n.next ? Math.min(event.duration, n.next.note.startTime - event.startTime) : event.duration
    const targetY = n.next ? n.next.y * height : n.y * height - (n.lead ? 13 : 6) * unit
    const count = Math.max(8, Math.ceil(span * 24))
    const from = Math.max(0, Math.floor((origin - 2 - event.startTime) / span * count))
    const to = Math.min(count, Math.floor((time - event.startTime) / span * count))
    for (let i = from; i <= to; i++) {
      const u = i / count, born = event.startTime + span * u
      const lift = n.next ? 1 : 1 - .94 * smooth((u - .64) / .36)
      const pressure = (.76 + .24 * Math.sin(Math.PI * u)) * lift
      add(n, xAt(n.next ? lerp(event.startTime, n.next.note.startTime, u) : born), lerp(n.y * height, targetY, smooth(u)),
        Math.max(1.3 * unit, (n.lead ? 42 : n.bass ? 26 : 21) * unit * (.35 + event.velocity * .75) * pressure),
        born, 1, strength, clamp((.65 - event.duration) * 1.2 + (n.lead ? .08 : n.bass ? .18 : .38), 0, .85), 1.1)
    }
    if (effects && n.branch) {
      const span = Math.min(.25, event.duration)
      for (let i = 0; i <= 12; i++) {
        const u = i / 12
        add(n, lerp(xAt(Math.max(n.branch.note.startTime, event.startTime - .5)), xAt(event.startTime), smooth(u)),
          lerp(n.branch.y, n.y, smooth(u)) * height, 17 * unit * (.4 + Math.sin(Math.PI * u) * .6),
          event.startTime + span * u, 1, strength * .65, .55)
      }
    }
  }
  if (effects) {
    const visibleIds = new Set(visible.map(n => n.note.id))
    const last = upperBound(model.chords, time, c => c.start)
    let count = 0
    for (let i = last - 1; i >= 0 && count < 24; i--) {
      const chord = model.chords[i]!
      if (chord.start < origin - 2) break
      const group = chord.notes.filter(n => visibleIds.has(n.note.id) && n.note.startTime <= time)
      if (group.length < 2) continue
      const first = group.reduce((a, b) => a.note.startTime < b.note.startTime ? a : b)
      const born = Math.max(...group.map(n => n.note.startTime))
      if (born >= Math.min(...group.map(n => endOf(n.note)))) continue
      const low = Math.min(...group.map(n => n.y)), high = Math.max(...group.map(n => n.y))
      add(first, xAt(born), (low + high) / 2 * height, Math.min(88 * unit, 38 * unit + (high - low) * height * .35),
        born, 2, Math.max(...group.map(n => n.note.velocity)) * .28, 0, .8)
      count++
    }
  }
  return marks
}
