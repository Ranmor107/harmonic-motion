import type { NoteEvent } from '../domain/score'
import { upperBound } from '../utils/math'

export interface ScheduledNote { note: NoteEvent; startTime: number; duration: number }

/** An event cursor, not a clock. A reset also reconstructs notes held at the seek point. */
export class NoteScheduler {
  private cursor = 0
  private held: ScheduledNote[] = []
  constructor(private readonly notes: readonly NoteEvent[]) {}

  reset(time: number): void {
    this.cursor = upperBound(this.notes, time, note => note.startTime)
    this.held = this.notes.slice(0, this.cursor)
      .filter(note => note.startTime + note.duration > time)
      .map(note => ({ note, startTime: time, duration: note.startTime + note.duration - time }))
  }

  takeUntil(time: number, currentTime: number): ScheduledNote[] {
    const result = this.held
    this.held = []
    while (this.cursor < this.notes.length && this.notes[this.cursor]!.startTime <= time) {
      const note = this.notes[this.cursor++]!
      const startTime = Math.max(currentTime, note.startTime)
      if (note.startTime + note.duration > startTime) result.push({ note, startTime, duration: note.startTime + note.duration - startTime })
    }
    return result
  }
}
