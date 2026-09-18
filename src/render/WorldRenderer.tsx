import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, Color, InstancedMesh, Object3D } from 'three'
import type { WorldModel } from '../domain/world'
import type { NormalizedScore } from '../domain/score'
import type { PresentationConfig, VisibilityMode, VisualTheme } from '../domain/visual'
import { evaluateNode } from '../engine/choreography/evaluator'
import { evaluateNodePresentation, selectReadableNodeIds } from '../visual/presentation/evaluatePresentation'
import { createRelations } from '../visual/presentation/relations'
import type { MusicalPresentation } from '../visual/presentation/musicalPresentation'
import type { PlaybackSnapshot } from './types'

export function WorldRenderer({ world, score, model, theme, playback, visibilityMode, presentation }: {
  world: WorldModel; score: NormalizedScore; model: MusicalPresentation; theme: VisualTheme; playback: PlaybackSnapshot
  visibilityMode: VisibilityMode; presentation: PresentationConfig
}) {
  const mesh = useRef<InstancedMesh>(null)
  const members = useRef<InstancedMesh>(null)
  const positions = useRef<BufferAttribute>(null)
  const colors = useRef<BufferAttribute>(null)
  const scratch = useMemo(() => ({ object: new Object3D(), color: new Color() }), [])
  const structure = useMemo(() => createRelations(world, score, model, presentation.relations), [world, score, model, presentation.relations])
  const nodes = useMemo(() => new Map(world.nodes.map(node => [node.id, node])), [world])
  const capacity = presentation.relations.maxEdges * presentation.relations.samples * 2
  const buffers = useMemo(() => ({ positions: new Float32Array(capacity * 3), colors: new Float32Array(capacity * 4) }), [capacity])
  useFrame(() => {
    if (!mesh.current) return
    const time = playback.current.time
    const readable = selectReadableNodeIds(world.nodes, time, visibilityMode, presentation.visibility)
    const visibleIds = new Set<string>()
    world.nodes.forEach((node, index) => {
      const state = evaluateNode(node, time)
      const display = evaluateNodePresentation(node, time, visibilityMode, presentation.visibility)
      const visible = display.visible && (!readable || readable.has(node.id))
      if (visible) visibleIds.add(node.id)
      const radius = theme.nodeStyle.radius * (node.kind === 'chord' ? theme.nodeStyle.chordScale : 1) *
        (state === 'active' ? theme.nodeStyle.activeScale : 1) * (visible ? 1 : 0)
      scratch.object.position.set(node.position.x, node.position.y, node.position.z)
      scratch.object.scale.setScalar(radius)
      scratch.object.updateMatrix()
      mesh.current!.setMatrixAt(index, scratch.object.matrix)
      const opacity = visible ? (state === 'active' ? 1 : state === 'past' ? theme.nodeStyle.pastOpacity : theme.nodeStyle.upcomingOpacity) * display.opacity : 0
      scratch.color.set(node.kind === 'chord' || state === 'active' ? theme.palette.chord : theme.palette.note).multiplyScalar(opacity)
      mesh.current!.setColorAt(index, scratch.color)
    })
    mesh.current.instanceMatrix.needsUpdate = true
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
    let vertex = 0
    const ordered = structure.relations.filter(edge => visibleIds.has(edge.fromId) && visibleIds.has(edge.toId) && (visibilityMode !== 'path' || edge.kind === 'lead' || edge.kind === 'chord'))
      .sort((a, b) => Math.abs(nodes.get(a.fromId)!.time - time) - Math.abs(nodes.get(b.fromId)!.time - time)).slice(0, presentation.relations.maxEdges)
    for (const edge of ordered) {
      const brightness = { lead: 0.7, sequence: 0.12, voice: 0.32, chord: 0.65 }[edge.kind]
      scratch.color.set(edge.kind === 'lead' || edge.kind === 'chord' ? theme.palette.chord : theme.palette.note)
      for (let i = 1; i < edge.points.length; i++) for (const point of [edge.points[i - 1]!, edge.points[i]!]) {
        positions.current!.setXYZ(vertex, point.x, point.y, point.z)
        colors.current!.setXYZW(vertex++, scratch.color.r, scratch.color.g, scratch.color.b, brightness)
      }
    }
    buffers.positions.fill(0, vertex * 3)
    buffers.colors.fill(0, vertex * 4)
    if (positions.current) positions.current.needsUpdate = true
    if (colors.current) colors.current.needsUpdate = true
    structure.members.forEach((member, index) => {
      scratch.object.position.set(member.position.x, member.position.y, member.position.z)
      scratch.object.scale.setScalar(visibleIds.has(member.nodeId) ? theme.nodeStyle.radius * 0.7 : 0)
      scratch.object.updateMatrix()
      members.current?.setMatrixAt(index, scratch.object.matrix)
    })
    if (members.current) members.current.instanceMatrix.needsUpdate = true
  })
  return <group>
    <instancedMesh key={world.nodes.length} ref={mesh} args={[undefined, undefined, world.nodes.length]} frustumCulled={false}>
      <sphereGeometry args={[1, 12, 8]} /><meshBasicMaterial />
    </instancedMesh>
    <instancedMesh key={`chords-${structure.members.length}`} ref={members} args={[undefined, undefined, structure.members.length]} frustumCulled={false}>
      <sphereGeometry args={[1, 10, 6]} /><meshBasicMaterial color={theme.palette.chord} />
    </instancedMesh>
    <lineSegments frustumCulled={false}>
      <bufferGeometry><bufferAttribute ref={positions} attach="attributes-position" args={[buffers.positions, 3]} /><bufferAttribute ref={colors} attach="attributes-color" args={[buffers.colors, 4]} /></bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.85} depthWrite={false} />
    </lineSegments>
  </group>
}
