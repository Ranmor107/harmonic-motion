import type { NormalizedScore } from '../../domain/score'
import type { PresentationConfig, VisibilityMode } from '../../domain/visual'
import type { Vec3, WorldModel } from '../../domain/world'
import { curveBetween, type MusicalPresentation } from './musicalPresentation'
import { complexityPolicy, RENDER_BUDGET } from './renderBudget'

export interface VisualRelation {
  kind: 'lead' | 'sequence' | 'voice' | 'chord'
  fromId: string
  toId: string
  points: Vec3[]
  time: number
  endTime: number
}
export interface ChordMember { nodeId: string; noteId: string; position: Vec3 }

export function createRelations(world: WorldModel, score: NormalizedScore, model: MusicalPresentation, config: PresentationConfig['relations']) {
  const nodes = new Map(world.nodes.map(node => [node.id, node]))
  const byNote = new Map(world.nodes.flatMap(node => node.noteIds.map(id => [id, node] as const)))
  const relations: VisualRelation[] = []
  const members: ChordMember[] = []
  const leadPairs = new Set<string>()
  const route = (a: Vec3, b: Vec3, lane: number, height: number) => {
    const span = Math.hypot(b.x - a.x, b.y - a.y)
    return curveBetween(a, b, height * (1 + Math.min(span, 12) * 0.16), config.samples)
      .map((point, i) => ({ ...point, z: point.z + Math.sin(i / config.samples * Math.PI) * lane * (0.55 + span * 0.12) }))
  }
  model.lead.forEach((point, index) => {
    const previous = model.lead[index - 1]
    if (!previous) return
    const a = byNote.get(previous.note.id)!
    const b = byNote.get(point.note.id)!
    leadPairs.add(`${a.id}:${b.id}`)
    relations.push({ kind: 'lead', fromId: a.id, toId: b.id, time: a.time, endTime: b.time,
      points: route(a.position, b.position, 0, config.curveHeight * 0.35) })
  })
  for (const edge of world.connections) {
    if (leadPairs.has(`${edge.fromNodeId}:${edge.toNodeId}`)) continue
    const a = nodes.get(edge.fromNodeId)!
    const b = nodes.get(edge.toNodeId)!
    if (edge.kind === 'voice' && b.time - a.time > config.phraseGap) continue
    const layer = world.layers.findIndex(layer => a.layerIds.includes(layer.id) && b.layerIds.includes(layer.id))
    const lane = (layer + 1) * (layer % 2 ? -1 : 1)
    relations.push({ kind: edge.kind, fromId: a.id, toId: b.id, time: a.time, endTime: b.time,
      points: route(a.position, b.position, edge.kind === 'voice' ? lane : -0.4,
        edge.kind === 'voice' ? config.curveHeight * lane : -config.curveHeight * 0.25) })
  }
  for (const chord of score.chords) {
    const node = byNote.get(chord.notes[0]!.id)!
    let previous: Vec3 | undefined
    chord.notes.forEach((note, index) => {
      const angle = Math.PI * 0.15 + index / Math.max(1, chord.notes.length - 1) * Math.PI * 0.7
      const radius = config.chordRadius * (1 + note.velocity * 0.4)
      const position = { x: node.position.x + Math.cos(angle) * radius, y: node.position.y + Math.sin(angle) * radius, z: node.position.z + (index - (chord.notes.length - 1) / 2) * radius * 0.3 }
      members.push({ nodeId: node.id, noteId: note.id, position })
      // One connected fan contour per chord; avoid a star of intersecting spokes.
      if (previous) relations.push({ kind: 'chord', fromId: node.id, toId: node.id, time: node.time, endTime: node.time,
        points: curveBetween(previous, position, config.curveHeight * 0.12, config.samples) })
      else relations.push({ kind: 'chord', fromId: node.id, toId: node.id, time: node.time, endTime: node.time,
        points: curveBetween(node.position, position, config.curveHeight * 0.2, config.samples) })
      previous = position
    })
  }
  const adjacent = new Map<string, VisualRelation[]>()
  for (const edge of relations) for (const id of new Set([edge.fromId, edge.toId])) {
    const list = adjacent.get(id) ?? []; list.push(edge); adjacent.set(id, list)
  }
  const membersByNode = new Map<string, ChordMember[]>()
  for (const member of members) {
    const list = membersByNode.get(member.nodeId) ?? []; list.push(member); membersByNode.set(member.nodeId, list)
  }
  // Fixed-size full-piece silhouettes. These are display simplifications, never new world edges.
  const ghosts = world.layers.map(layer => {
    const chain = world.nodes.filter(node => node.layerIds.includes(layer.id))
    const count = Math.min(chain.length, RENDER_BUDGET.ghostPoints)
    return Array.from({ length: count }, (_, i) => chain[Math.round(i * (chain.length - 1) / Math.max(1, count - 1))]!.position)
  }).slice(0, 8)
  return { relations, members, adjacent, membersByNode, ghosts }
}

export const RELATION_PRIORITY = { lead: 0, voice: 1, chord: 2, sequence: 3 } as const

export function selectRelations(structure: ReturnType<typeof createRelations>, visibleIds: Set<string>, time: number,
  mode: VisibilityMode, density: Map<string, number>, detail: number, config: PresentationConfig) {
  const candidates = new Set<VisualRelation>()
  for (const id of visibleIds) for (const edge of structure.adjacent.get(id) ?? []) {
    if (visibleIds.has(edge.fromId) && visibleIds.has(edge.toId) && (mode !== 'path' || edge.kind === 'lead' || edge.kind === 'chord')) candidates.add(edge)
  }
  const proximity = (edge: VisualRelation) => Math.max(edge.time - time, time - edge.endTime, 0)
  const ordered = [...candidates].sort((a, b) => RELATION_PRIORITY[a.kind] - RELATION_PRIORITY[b.kind] || proximity(a) - proximity(b) || a.time - b.time || a.fromId.localeCompare(b.fromId))
  const secondary = complexityPolicy(density.size, detail).secondary
  const limits = { lead: Math.ceil(config.relations.maxEdges * 0.35), voice: Math.ceil(config.relations.maxEdges * 0.3 * secondary),
    chord: Math.ceil(config.relations.maxEdges * 0.3), sequence: Math.floor(config.relations.maxEdges * 0.05 * secondary) }
  const counts = { lead: 0, voice: 0, chord: 0, sequence: 0 }
  const result: { edge: VisualRelation; opacity: number }[] = []
  for (const edge of ordered) {
    if (counts[edge.kind] >= limits[edge.kind] || result.length >= config.relations.maxEdges) continue
    const distance = proximity(edge)
    const crowding = density.get(edge.fromId) ?? 0
    const local = distance <= config.visibility.activeFuture * (1 - crowding * 0.45)
    if (!local && edge.kind === 'chord') continue
    if (edge.kind === 'sequence' && crowding > 0.5) continue
    if (edge.kind === 'voice' && crowding > 0.5 && !local) continue
    const temporal = local ? 1 : distance < config.visibility.contextFuture ? 0.32 : 0.07
    const crowd = 1 - (density.get(edge.fromId) ?? 0) * (edge.kind === 'lead' ? 0.1 : 0.45)
    result.push({ edge, opacity: { lead: 0.92, voice: 0.48, chord: 0.8, sequence: 0.16 }[edge.kind] * temporal * crowd })
    counts[edge.kind]++
  }
  return result
}
