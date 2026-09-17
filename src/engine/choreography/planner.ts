import type { NormalizedScore } from '../../domain/score'
import type { WorldModel } from '../../domain/world'
import type { PerformanceEvent, PerformancePlan, TrajectorySegment } from '../../domain/performance'
import { mixVec } from '../../utils/math'

export function planPerformance(world: WorldModel, score: NormalizedScore): PerformancePlan {
  const nodes = world.nodes.filter(node => node.kind === 'note' || node.kind === 'chord').sort((a, b) => a.time - b.time || a.id.localeCompare(b.id))
  const segments: TrajectorySegment[] = []
  for (let index = 1; index < nodes.length; index++) {
    const from = nodes[index - 1]!
    const to = nodes[index]!
    if (to.time <= from.time) throw new Error('Single-performer choreography requires one node per onset. Group simultaneous notes in the geometry strategy.')
    const distance = Math.hypot(to.position.x - from.position.x, to.position.y - from.position.y, to.position.z - from.position.z)
    const arc = Math.min(1.5, distance * 0.25)
    const p1 = mixVec(from.position, to.position, 1 / 3)
    const p2 = mixVec(from.position, to.position, 2 / 3)
    p1.z += arc
    p2.z += arc
    segments.push({
      id: `segment:${from.id}:${to.id}`, startTime: from.time, endTime: to.time,
      fromNodeId: from.id, toNodeId: to.id,
      curve: { type: 'cubic-bezier', p0: { ...from.position }, p1, p2, p3: { ...to.position } },
    })
  }
  const events: PerformanceEvent[] = nodes.map(node => {
    const base = { id: `hit:${node.id}`, time: node.time, duration: node.duration, nodeId: node.id, strength: node.strength }
    return node.kind === 'chord'
      ? { ...base, type: 'chord-hit', noteIds: [...node.noteIds] }
      : { ...base, type: 'note-hit', noteId: node.noteIds[0]! }
  })
  return {
    duration: score.duration, events,
    performers: nodes.length ? [{ id: 'performer:0', role: 'ensemble', initialPosition: { ...nodes[0]!.position }, trajectorySegments: segments }] : [],
  }
}
