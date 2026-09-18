import type { NormalizedScore } from '../../domain/score'
import type { PresentationConfig } from '../../domain/visual'
import type { Vec3, WorldModel } from '../../domain/world'
import { curveBetween, type MusicalPresentation } from './musicalPresentation'

export interface VisualRelation {
  kind: 'lead' | 'sequence' | 'voice' | 'chord'
  fromId: string
  toId: string
  points: Vec3[]
}
export interface ChordMember { nodeId: string; noteId: string; position: Vec3 }

export function createRelations(world: WorldModel, score: NormalizedScore, model: MusicalPresentation, config: PresentationConfig['relations']) {
  const nodes = new Map(world.nodes.map(node => [node.id, node]))
  const byNote = new Map(world.nodes.flatMap(node => node.noteIds.map(id => [id, node] as const)))
  const relations: VisualRelation[] = []
  const members: ChordMember[] = []
  const leadPairs = new Set<string>()
  model.lead.forEach((point, index) => {
    const previous = model.lead[index - 1]
    if (!previous || point.note.trackId !== previous.note.trackId) return
    const a = byNote.get(previous.note.id)!
    const b = byNote.get(point.note.id)!
    leadPairs.add(`${a.id}:${b.id}`)
    relations.push({ kind: 'lead', fromId: a.id, toId: b.id, points: curveBetween(a.position, b.position, config.curveHeight, config.samples) })
  })
  for (const edge of world.connections) {
    if (leadPairs.has(`${edge.fromNodeId}:${edge.toNodeId}`)) continue
    const a = nodes.get(edge.fromNodeId)!
    const b = nodes.get(edge.toNodeId)!
    if (edge.kind === 'voice' && b.time - a.time > config.phraseGap) continue
    relations.push({ kind: edge.kind, fromId: a.id, toId: b.id, points: curveBetween(a.position, b.position, edge.kind === 'voice' ? -config.curveHeight : config.curveHeight * 0.2, config.samples) })
  }
  for (const chord of score.chords) {
    const node = byNote.get(chord.notes[0]!.id)!
    chord.notes.forEach((note, index) => {
      const angle = Math.PI * 0.15 + index / Math.max(1, chord.notes.length - 1) * Math.PI * 0.7
      const radius = config.chordRadius * (1 + note.velocity * 0.4)
      const position = { x: node.position.x + Math.cos(angle) * radius, y: node.position.y + Math.sin(angle) * radius, z: node.position.z + (index - (chord.notes.length - 1) / 2) * radius * 0.3 }
      members.push({ nodeId: node.id, noteId: note.id, position })
      relations.push({ kind: 'chord', fromId: node.id, toId: node.id, points: curveBetween(node.position, position, config.curveHeight * 0.2, config.samples) })
    })
  }
  return { relations, members }
}
