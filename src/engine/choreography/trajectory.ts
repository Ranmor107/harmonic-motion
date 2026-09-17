import type { TrajectoryCurveDefinition, TrajectorySegment } from '../../domain/performance'
import type { Vec3 } from '../../domain/world'
import { clamp, mixVec } from '../../utils/math'

export function evaluateTrajectory(curve: TrajectoryCurveDefinition, normalizedTime: number): Vec3 {
  const t = clamp(normalizedTime, 0, 1)
  if (t === 0) return { ...curve.p0 }
  if (t === 1) return { ...curve.p3 }
  const a = mixVec(curve.p0, curve.p1, t)
  const b = mixVec(curve.p1, curve.p2, t)
  const c = mixVec(curve.p2, curve.p3, t)
  return mixVec(mixVec(a, b, t), mixVec(b, c, t), t)
}

export function evaluateSegment(segment: TrajectorySegment, songTime: number): Vec3 {
  return evaluateTrajectory(segment.curve, (songTime - segment.startTime) / (segment.endTime - segment.startTime))
}
