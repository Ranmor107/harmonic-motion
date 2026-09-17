import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, InstancedMesh, Object3D } from 'three'
import type { WorldModel } from '../domain/world'
import type { VisualTheme } from '../domain/visual'
import { evaluateNode } from '../engine/choreography/evaluator'
import type { PlaybackSnapshot } from './types'

export function WorldRenderer({ world, theme, playback }: { world: WorldModel; theme: VisualTheme; playback: PlaybackSnapshot }) {
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
    world.nodes.forEach((node, index) => {
      const state = evaluateNode(node, time)
      const radius = theme.nodeStyle.radius * (node.kind === 'chord' ? theme.nodeStyle.chordScale : 1) *
        (state === 'active' ? theme.nodeStyle.activeScale : 1)
      scratch.object.position.set(node.position.x, node.position.y, node.position.z)
      scratch.object.scale.setScalar(radius)
      scratch.object.updateMatrix()
      mesh.current!.setMatrixAt(index, scratch.object.matrix)
      const opacity = state === 'active' ? 1 : state === 'past' ? theme.nodeStyle.pastOpacity : theme.nodeStyle.upcomingOpacity
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
      <lineBasicMaterial color={theme.palette.connection} transparent opacity={theme.connectionStyle.opacity} />
    </lineSegments>
    <lineSegments>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[lines.voices, 3]} /></bufferGeometry>
      <lineBasicMaterial color={theme.palette.connection} transparent opacity={theme.connectionStyle.voiceOpacity} />
    </lineSegments>
  </group>
}
