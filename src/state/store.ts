import { create } from 'zustand'
import type { NormalizedScore } from '../domain/score'
import type { InkMode, StreamStyleId, ViewMode, VisibilityMode, VisualPreset } from '../domain/visual'
import { compileScore, type CompiledScore } from '../engine/compile'
import { ConstellationGeometryStrategy } from '../engine/music-geometry/strategies/constellation'
import type { GeometryStrategy } from '../engine/music-geometry/GeometryStrategy'
import { createQuickStudyScore } from '../demo/score'
import { DefaultPreset } from '../visual/presets/defaultPreset'
import type { SavedSession } from './persistence'

export interface ScoreSession {
  id: string
  filename: string
  seed: number
  compiled: CompiledScore
}

interface StudioState {
  sessions: ScoreSession[]
  activeSessionId: string
  compiled: CompiledScore
  seed: number
  strategy: GeometryStrategy
  preset: VisualPreset
  viewMode: ViewMode
  streamStyleId: StreamStyleId
  inkMode: InkMode
  visibilityMode: VisibilityMode
  setScore(score: NormalizedScore): void
  addScores(scores: { score: NormalizedScore; filename: string }[]): void
  restoreSessions(sessions: SavedSession[], activeSessionId: string): number
  selectSession(id: string): void
  removeSession(id: string): void
  regenerate(): void
  setPreset(preset: VisualPreset): void
  setViewMode(viewMode: ViewMode): void
  setStreamStyleId(style: StreamStyleId): void
  setInkMode(mode: InkMode): void
  setVisibilityMode(visibilityMode: VisibilityMode): void
}

export function createStudioStore() {
  const seed = 107
  const strategy = ConstellationGeometryStrategy
  let nextId = 1
  const demo = { id: 'score-0', filename: 'Original Quick Study', seed, compiled: compileScore(createQuickStudyScore(), strategy, seed) }
  return create<StudioState>((set, get) => ({
    compiled: demo.compiled, seed, strategy, preset: DefaultPreset,
    sessions: [demo], activeSessionId: demo.id,
    viewMode: 'constellation', visibilityMode: 'overview', streamStyleId: 'original', inkMode: 'drops',
    setScore: score => get().addScores([{ score, filename: score.metadata.title }]),
    addScores: scores => {
      const state = get()
      const added = scores.map(({ score, filename }) => ({ id: `score-${nextId++}`, filename, seed: state.seed, compiled: compileScore(score, state.strategy, state.seed) }))
      if (!added.length) return
      set({ sessions: [...state.sessions, ...added], activeSessionId: added[0]!.id, compiled: added[0]!.compiled })
    },
    restoreSessions: (records, activeSessionId) => {
      const sessions: ScoreSession[] = [demo]
      for (const record of records) {
        if (record.id === demo.id || sessions.some(session => session.id === record.id)) continue
        try {
          sessions.push({ id: record.id, filename: record.filename, seed: record.seed,
            compiled: compileScore(record.score, strategy, record.seed) })
          const id = /^score-(\d+)$/.exec(record.id)
          if (id) nextId = Math.max(nextId, Number(id[1]) + 1)
        } catch { /* Keep other saved scores available if one record cannot compile. */ }
      }
      const active = sessions.find(session => session.id === activeSessionId) ?? demo
      set({ sessions, activeSessionId: active.id, compiled: active.compiled, seed: active.seed })
      return sessions.length - 1
    },
    selectSession: id => {
      const session = get().sessions.find(item => item.id === id)
      if (session) set({ activeSessionId: id, compiled: session.compiled, seed: session.seed })
    },
    removeSession: id => {
      const state = get()
      if (state.sessions.length === 1) { set({ sessions: [demo], activeSessionId: demo.id, compiled: demo.compiled, seed: demo.seed }); return }
      const sessions = state.sessions.filter(session => session.id !== id)
      const active = sessions.find(session => session.id === state.activeSessionId) ?? sessions[Math.min(state.sessions.findIndex(session => session.id === id), sessions.length - 1)]!
      set({ sessions, activeSessionId: active.id, compiled: active.compiled, seed: active.seed })
    },
    regenerate: () => {
      const state = get()
      const nextSeed = (state.seed + 1) >>> 0
      const compiled = compileScore(state.compiled.score, state.strategy, nextSeed)
      set({ seed: nextSeed, compiled, sessions: state.sessions.map(session => session.id === state.activeSessionId ? { ...session, seed: nextSeed, compiled } : session) })
    },
    // Visual changes retain the exact same compiled objects, not just equal copies.
    setPreset: preset => set({ preset }),
    setViewMode: viewMode => set({ viewMode }),
    setStreamStyleId: streamStyleId => { if (get().streamStyleId !== streamStyleId) set({ streamStyleId }) },
    setInkMode: inkMode => { if (get().inkMode !== inkMode) set({ inkMode }) },
    setVisibilityMode: visibilityMode => set({ visibilityMode }),
  }))
}

export const useStudio = createStudioStore()
