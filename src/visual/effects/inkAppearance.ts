import type { NoteEvent } from '../../domain/score'
import type { EffectProfile, PresentationConfig } from '../../domain/visual'
import { noteLifecycle } from '../presentation/musicalPresentation'

export function inkNoteAppearance(note: NoteEvent, time: number, config: PresentationConfig['stream'], effects: EffectProfile) {
  let hash = 2166136261
  for (const char of note.id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  const seed = (hash >>> 0) / 4294967296
  const life = noteLifecycle(note, time, config)
  const age = time - note.startTime
  const wet = effects.hit.enabled && age >= 0 && time < note.startTime + effects.hit.lifetime
  const progress = wet ? age / effects.hit.lifetime : 0
  return {
    ...life, seed, angle: (seed - 0.5) * 1.1,
    washRadius: wet ? effects.hit.radius + Math.sqrt(progress) * effects.hit.expansion : 0,
    washOpacity: wet ? effects.hit.opacity * (1 - progress) ** 2 : 0,
  }
}
