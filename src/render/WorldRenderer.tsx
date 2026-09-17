import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, InstancedMesh, Object3D } from 'three'
import type { WorldModel } from '../domain/world'
import type { PresentationConfig, VisibilityMode, VisualTheme } from '../domain/visual'
import { evaluateNode } from '../engine/choreography/evaluator'
import { evaluateNodePresentation, selectReadableNodeIds } from '../visual/presentation/evaluatePresentation'
import type { PlaybackSnapshot } from './types'

export function WorldRenderer({ world, theme, playback, visibilityMode, presentation }: {
  world: WorldModel; theme: VisualTheme; playback: PlaybackSnapshot
  visibilityMode: VisibilityMode; presentation: PresentationConfig
}) {
  const mesh = useRef<InstancedMesh>(null)
  const scratch = useMemo(() => ({ object: new Object3D(), color: new Color() }), [])
  const lines = useMemo(() => {
    const nodes = new Map(world.nodes.map(node => [node.id, node]))
    const sequence: number[] = []
    const voices: number[] = []
    for (const connection of world.connections) {
      const from = nodes.get(connection.fromNodeId)!.position
      const to = nodes.get(connection.toNodeId)!.position
      const target = connection.kind === 'sequence' ? sequence : voices
      target.push(from.x, from.y, from.z, to.x, to.y, to.z)
    }
    return { sequence: new Float32Array(sequence), voices: new Float32Array(voices) }
  }, [world])

  useFrame(() => {
    if (!mesh.current) return
    const time = playback.current.time
    const readable = selectReadableNodeIds(world.nodes, time, visibilityMode, presentation.visibility)
    world.nodes.forEach((node, index) => {
      const state = evaluateNode(node, time)
      const display = evaluateNodePresentation(node, time, visibilityMode, presentation.visibility)
      const visible = display.visible && (!readable || readable.has(node.id))
      const radius = theme.nodeStyle.radius * (node.kind === 'chord' ? theme.nodeStyle.chordScale : 1) *
        (state === 'active' ? theme.nodeStyle.activeScale : 1) * (visible ? 1 : 0)
      scratch.object.position.set(node.position.x, node.position.y, node.position.z)
      scratch.object.scale.setScalar(radius)
      scratch.object.updateMatrix()
      mesh.current!.setMatrixAt(index, scratch.object.matrix)
      const opacity = visible ? (state === 'active' ? 1 : state === 'past' ? theme.nodeStyle.pastOpacity : theme.nodeStyle.upcomingOpacity) * display.opacity : 0
      scratch.color.set(node.kind === 'chord' ? theme.palette.chord : theme.palette.note).multiplyScalar(opacity)
      mesh.current!.setColorAt(index, scratch.color)
    })
    mesh.current.instanceMatrix.needsUpdate = true
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
  })

  return <group>
    <instancedMesh key={world.nodes.length} ref={mesh} args={[undefined, undefined, world.nodes.length]} frustumCulled={false}>
      <sphereGeometry args={[1, 12, 8]} />
      <meshBasicMaterial />
    </instancedMesh>
    <lineSegments>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[lines.sequence, 3]} /></bufferGeometry>
      <lineBasicMaterial color={theme.palette.connection} transparent opacity={visibilityMode === 'overview' ? theme.connectionStyle.opacity : visibilityMode === 'focus' ? theme.connectionStyle.opacity * 0.22 : 0} />
    </lineSegments>
    <lineSegments>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[lines.voices, 3]} /></bufferGeometry>
      <lineBasicMaterial color={theme.palette.connection} transparent opacity={visibilityMode === 'overview' ? theme.connectionStyle.voiceOpacity : visibilityMode === 'focus' ? theme.connectionStyle.voiceOpacity * 0.18 : 0} />
    </lineSegments>
  </group>
}
