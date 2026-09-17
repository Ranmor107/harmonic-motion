import type { PresentationConfig } from '../../domain/visual'

export const DefaultPresentation: PresentationConfig = {
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
    timeScale: 2.35,
    pitchSpread: 3.15,
    trackSpacing: 0.34,
    maxVisibleNotes: 120,
  },
}
