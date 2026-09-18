import type { PresentationConfig } from '../../domain/visual'

export const DefaultPresentation: PresentationConfig = {
  salience: { windowSeconds: 0.22, velocity: 0.32, duration: 0.15, register: 0.18, trackContinuity: 0.2, pitchContinuity: 0.15 },
  relations: { curveHeight: 0.45, samples: 12, maxEdges: 180, chordRadius: 0.48, phraseGap: 1.5, phraseSize: 8 },
  visibility: {
    activePast: 2,
    activeFuture: 4,
    contextPast: 5,
    contextFuture: 8,
    contextOpacity: 0.2,
    farOpacity: 0,
    focusMaxNodes: 96,
    pathMaxNodes: 36,
  },
  stream: {
    leadInTime: 4.5,
    hitDuration: 0.34,
    fadeOutTime: 1.8,
    timeScale: 2.1,
    pitchSpread: 2.8,
    trackSpacing: 0.65,
    maxVisibleNotes: 120,
    shape: 'ribbon',
    densitySpacing: 0.28,
    durationSpacing: 0.15,
    helixRadius: 1.15,
    intervalRadius: 0.065,
    phaseSpeed: 0.85,
    densityCurvature: 0.45,
  },
}
