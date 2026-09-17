import type { Vec3 } from './world'

export interface CubicBezierCurveDefinition {
  type: 'cubic-bezier'
  p0: Vec3
  p1: Vec3
  p2: Vec3
  p3: Vec3
}

export type TrajectoryCurveDefinition = CubicBezierCurveDefinition
export interface TrajectorySegment {
  id: string
  startTime: number
  endTime: number
  fromNodeId: string
  toNodeId: string
  curve: TrajectoryCurveDefinition
}

export interface PerformerPlan {
  id: string
  role: string
  initialPosition: Vec3
  trajectorySegments: TrajectorySegment[]
}

interface HitEvent {
  id: string
  time: number
  duration: number
  nodeId: string
  strength: number
}
export type PerformanceEvent =
  | (HitEvent & { type: 'note-hit'; noteId: string })
  | (HitEvent & { type: 'chord-hit'; noteIds: string[] })

export interface PerformancePlan {
  duration: number
  performers: PerformerPlan[]
  events: PerformanceEvent[]
}
