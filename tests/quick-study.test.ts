import { describe, expect, it } from 'vitest'
import { createQuickStudyScore } from '../src/demo/score'
import { createStudioStore } from '../src/state/store'

describe('first-listen Quick Study', () => {
  it('gives the listener a melody before bass and harmony enter, then changes chords', () => {
    const score = createQuickStudyScore()
    expect(score.duration).toBeGreaterThanOrEqual(20)
    expect(score.duration).toBeLessThanOrEqual(40)
    expect(score.tracks.map(track => track.name)).toEqual(['Melody', 'Bass', 'Harmony'])
    expect(score.tracks[0]!.notes[0]!.startTime).toBeLessThan(score.tracks[1]!.notes[0]!.startTime)
    expect(score.tracks[1]!.notes[0]!.startTime).toBeLessThan(score.tracks[2]!.notes[0]!.startTime)
    expect(new Set(score.chords.map(chord => chord.notes.map(note => note.pitchClass).sort().join(','))).size).toBeGreaterThan(2)
    expect(createQuickStudyScore()).toEqual(score)
  })

  it('loads as the default cached session through the existing score pipeline', () => {
    const state = createStudioStore().getState()
    expect(state.activeSessionId).toBe('score-0')
    expect(state.compiled.score).toBe(state.sessions[0]!.compiled.score)
    expect(state.compiled.score.metadata.title).toBe('Where the light gathers')
    expect(state.compiled.plan.duration).toBe(state.compiled.score.duration)
  })
})
