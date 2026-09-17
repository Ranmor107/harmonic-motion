import type { MusicConnection, MusicNode, Vec3, WorldBounds } from '../../../domain/world'
import { groupOnsets } from '../../music-analysis/chords'
import type { GeometryStrategy } from '../GeometryStrategy'
import { clamp, seededRandom } from '../../../utils/math'

const SPACE = { pitchHeight: 9, minStep: 1.5, intervalStep: 0.16, layerDepth: 1.4, recenter: 0.12 }

function boundsOf(positions: Vec3[]): WorldBounds {
  const bounds: WorldBounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } }
  for (const point of positions) {
    for (const axis of ['x', 'y', 'z'] as const) {
      bounds.min[axis] = Math.min(bounds.min[axis], point[axis])
      bounds.max[axis] = Math.max(bounds.max[axis], point[axis])
    }
  }
  return bounds
}

export const ConstellationGeometryStrategy: GeometryStrategy = {
  id: 'constellation',
  generate(score, { seed, analysis }) {
    const random = seededRandom(seed)
    const layers = analysis.trackGroups.map(group => ({ id: `layer:${group.trackId}`, trackIds: [group.trackId] }))
    const trackIndex = new Map(analysis.trackGroups.map((group, index) => [group.trackId, index]))
    const nodes: MusicNode[] = []
    const connections: MusicConnection[] = []
    const previousByTrack = new Map<string, string>()
    const pitchSpan = Math.max(1, analysis.pitchRange.max - analysis.pitchRange.min)
    let previousPitch = analysis.pitchRange.min
    let angle = random() * Math.PI * 2
    let x = 0
    let z = 0
    for (const notes of groupOnsets(score.notes)) {
      const first = notes[0]!
      const pitch = notes.reduce((sum, note) => sum + note.midi, 0) / notes.length
      const interval = pitch - previousPitch
      const previous = nodes.at(-1)
      const gap = previous ? first.startTime - previous.time : 1
      const step = (SPACE.minStep + Math.abs(interval) * SPACE.intervalStep) * clamp(Math.sqrt(gap), 0.6, 1.5)
      angle += interval * 0.085 + (random() - 0.5) * 1.8
      x = x * (1 - SPACE.recenter) + Math.cos(angle) * step
      z = z * (1 - SPACE.recenter) + Math.sin(angle) * step
      const tracks = [...new Set(notes.map(note => note.trackId))]
      const layer = tracks.reduce((sum, id) => sum + (trackIndex.get(id) ?? 0), 0) / tracks.length
      const node: MusicNode = {
        id: `node:${first.id}`, noteIds: notes.map(note => note.id), time: first.startTime,
        duration: Math.max(...notes.map(note => note.startTime + note.duration)) - first.startTime,
        kind: notes.length > 1 ? 'chord' : 'note', strength: Math.max(...notes.map(note => note.velocity)),
        layerIds: tracks.map(id => `layer:${id}`),
        position: {
          x, y: ((pitch - analysis.pitchRange.min) / pitchSpan - 0.5) * SPACE.pitchHeight,
          z: z + (layer - (layers.length - 1) / 2) * SPACE.layerDepth,
        },
      }
      if (previous) connections.push({ id: `sequence:${previous.id}:${node.id}`, fromNodeId: previous.id, toNodeId: node.id, kind: 'sequence' })
      for (const track of tracks) {
        const previousId = previousByTrack.get(track)
        if (previousId && previousId !== previous?.id) connections.push({ id: `voice:${track}:${node.id}`, fromNodeId: previousId, toNodeId: node.id, kind: 'voice' })
        previousByTrack.set(track, node.id)
      }
      nodes.push(node)
      previousPitch = pitch
    }
    return { nodes, connections, layers, bounds: boundsOf(nodes.map(node => node.position)), metadata: { seed: seed >>> 0, strategyId: this.id } }
  },
}
