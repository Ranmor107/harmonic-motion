import type { PerformancePlan, PerformerPlan } from '../../domain/performance'
import type { MusicNode } from '../../domain/world'
import { upperBound } from '../../utils/math'
import { evaluateSegment } from './trajectory'

export function evaluatePerformer(performer: PerformerPlan, songTime: number) {
  const segments = performer.trajectorySegments
  const index = upperBound(segments, songTime, segment => segment.startTime) - 1
  return index < 0 ? performer.initialPosition : evaluateSegment(segments[index]!, songTime)
}

export function evaluateNode(node: MusicNode, songTime: number): 'upcoming' | 'active' | 'past' {
  if (songTime < node.time) return 'upcoming'
  return songTime < node.time + node.duration ? 'active' : 'past'
}

export function eventsInWindow(plan: PerformancePlan, songTime: number, lifetime: number) {
  const start = upperBound(plan.events, songTime - lifetime, event => event.time)
  const end = upperBound(plan.events, songTime, event => event.time)
  return plan.events.slice(start, end)
}
