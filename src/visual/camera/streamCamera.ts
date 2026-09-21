import type { MusicalPresentation } from '../presentation/musicalPresentation'
import { evaluateLead } from '../presentation/musicalPresentation'

// Follow time horizontally while keeping the complete pitch contour in view.
export function streamCameraTarget(model: MusicalPresentation, time: number) {
  const now = evaluateLead(model, time)
  return { x: now.x, y: 0, z: 0 }
}

export const RIBBON_STAGE = {
  bounds: { min: { x: -5, y: -5, z: -2 }, max: { x: 11, y: 5, z: 2 } },
  direction: { x: 0, y: 0, z: 1 },
}
