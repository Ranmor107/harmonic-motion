import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, Color, InstancedMesh, Object3D, Vector3 } from 'three'
import type { WorldModel } from '../domain/world'
import type { NormalizedScore } from '../domain/score'
import type { PresentationConfig, VisibilityMode, VisualTheme } from '../domain/visual'
import { evaluateNode } from '../engine/choreography/evaluator'
import { evaluateNodePresentation } from '../visual/presentation/evaluatePresentation'
import { createRelations, selectRelations } from '../visual/presentation/relations'
import { createDisplayIndex, RENDER_BUDGET, selectDisplayNodes } from '../visual/presentation/renderBudget'
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
  const lines = useRef<BufferGeometry>(null)
  const scratch = useMemo(() => ({ object: new Object3D(), color: new Color() }), [])
  const structure = useMemo(() => createRelations(world, score, model, presentation.relations), [world, score, model, presentation.relations])
  const index = useMemo(() => createDisplayIndex(world), [world])
  const center = useMemo(() => new Vector3((world.bounds.min.x + world.bounds.max.x) / 2, (world.bounds.min.y + world.bounds.max.y) / 2, (world.bounds.min.z + world.bounds.max.z) / 2), [world])
  const capacity = (presentation.relations.maxEdges * presentation.relations.samples + 8 * RENDER_BUDGET.ghostPoints) * 2
  const buffers = useMemo(() => ({ positions: new Float32Array(capacity * 3), colors: new Float32Array(capacity * 4) }), [capacity])
  useFrame(({ camera, size, controls }) => {
    if (!mesh.current) return
    const time = playback.current.time
    const target = (controls as unknown as { target?: Vector3 })?.target ?? center
    const detail = Math.min(1, size.height * theme.nodeStyle.radius / Math.max(1, camera.position.distanceTo(target)) / 5)
    const selected = selectDisplayNodes(index, time, visibilityMode, presentation.visibility, detail)
    const visibleIds = new Set(selected.map(node => node.id))
    selected.forEach((node, slot) => {
      const state = evaluateNode(node, time)
      const display = evaluateNodePresentation(node, time, visibilityMode, presentation.visibility)
      const density = index.density.get(node.id) ?? 0
      const local = Math.abs(node.time - time) < presentation.visibility.activeFuture
      const radius = theme.nodeStyle.radius * (node.kind === 'chord' ? theme.nodeStyle.chordScale : 1) *
        (state === 'active' ? theme.nodeStyle.activeScale : 1) * (1 - density * (local ? 0.3 : 0.55))
      scratch.object.position.set(node.position.x, node.position.y, node.position.z)
      scratch.object.scale.setScalar(radius)
      scratch.object.updateMatrix()
      mesh.current!.setMatrixAt(slot, scratch.object.matrix)
      const opacity = (state === 'active' ? 1 : state === 'past' ? theme.nodeStyle.pastOpacity : theme.nodeStyle.upcomingOpacity) * display.opacity * (visibilityMode === 'overview' && !local ? 0.3 : 1)
      scratch.color.set(node.kind === 'chord' || state === 'active' ? theme.palette.chord : theme.palette.note).multiplyScalar(opacity)
      mesh.current!.setColorAt(slot, scratch.color)
    })
    mesh.current.count = selected.length
    mesh.current.instanceMatrix.needsUpdate = true
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
    let vertex = 0
    const ordered = selectRelations(structure, visibleIds, time, visibilityMode, index.density, detail, presentation)
    for (const { edge, opacity } of ordered) {
      scratch.color.set(edge.kind === 'lead' || edge.kind === 'chord' ? theme.palette.chord : theme.palette.note)
      for (let i = 1; i < edge.points.length; i++) for (const point of [edge.points[i - 1]!, edge.points[i]!]) {
        positions.current!.setXYZ(vertex, point.x, point.y, point.z)
        colors.current!.setXYZW(vertex++, scratch.color.r, scratch.color.g, scratch.color.b, opacity)
      }
    }
    if (visibilityMode === 'overview' && world.nodes.length > RENDER_BUDGET.overviewFar) {
      scratch.color.set(theme.palette.note)
      for (const ghost of structure.ghosts) for (let i = 1; i < ghost.length; i++) for (const point of [ghost[i - 1]!, ghost[i]!]) {
        positions.current!.setXYZ(vertex, point.x, point.y, point.z)
        colors.current!.setXYZW(vertex++, scratch.color.r, scratch.color.g, scratch.color.b, 0.045)
      }
    }
    lines.current?.setDrawRange(0, vertex)
    if (positions.current) positions.current.needsUpdate = true
    if (colors.current) colors.current.needsUpdate = true
    let memberCount = 0
    const chordIds = new Set(ordered.filter(item => item.edge.kind === 'chord').map(item => item.edge.fromId))
    for (const id of chordIds) for (const member of structure.membersByNode.get(id) ?? []) {
      if (memberCount >= RENDER_BUDGET.chordMembers) break
      scratch.object.position.set(member.position.x, member.position.y, member.position.z)
      scratch.object.scale.setScalar(theme.nodeStyle.radius * 0.55)
      scratch.object.updateMatrix()
      members.current?.setMatrixAt(memberCount++, scratch.object.matrix)
    }
    if (members.current) { members.current.count = memberCount; members.current.instanceMatrix.needsUpdate = true }
  })
  return <group>
    <instancedMesh ref={mesh} args={[undefined, undefined, Math.max(RENDER_BUDGET.overviewNear, presentation.visibility.focusMaxNodes, presentation.visibility.pathMaxNodes)]} frustumCulled={false}>
      <sphereGeometry args={[1, 12, 8]} /><meshBasicMaterial />
    </instancedMesh>
    <instancedMesh ref={members} args={[undefined, undefined, RENDER_BUDGET.chordMembers]} frustumCulled={false}>
      <sphereGeometry args={[1, 10, 6]} /><meshBasicMaterial color={theme.palette.chord} />
    </instancedMesh>
    <lineSegments frustumCulled={false}>
      <bufferGeometry ref={lines}><bufferAttribute ref={positions} attach="attributes-position" args={[buffers.positions, 3]} /><bufferAttribute ref={colors} attach="attributes-color" args={[buffers.colors, 4]} /></bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.85} depthWrite={false} />
    </lineSegments>
  </group>
}
