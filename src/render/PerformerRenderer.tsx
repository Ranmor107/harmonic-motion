import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, InstancedMesh, Object3D } from 'three'
import type { PerformerPlan } from '../domain/performance'
import type { EffectProfile, VisualTheme } from '../domain/visual'
import { evaluatePerformer } from '../engine/choreography/evaluator'
import type { PlaybackSnapshot } from './types'

export function PerformerRenderer({ performer, theme, effects, playback }: {
  performer: PerformerPlan; theme: VisualTheme; effects: EffectProfile; playback: PlaybackSnapshot
}) {
  const body = useRef<Group>(null)
  const trail = useRef<InstancedMesh>(null)
  const scratch = useMemo(() => new Object3D(), [])
  useFrame(() => {
    const time = playback.current.time
    const position = evaluatePerformer(performer, time)
    body.current?.position.set(position.x, position.y, position.z)
    if (body.current) body.current.rotation.set(time * 0.4, time * 0.6, 0)
    if (trail.current) {
      for (let index = 0; index < effects.trail.samples; index++) {
        const fraction = index / effects.trail.samples
        const point = evaluatePerformer(performer, Math.max(0, time - fraction * effects.trail.lifetime))
        scratch.position.set(point.x, point.y, point.z)
        scratch.scale.setScalar(effects.trail.radius * (1 - fraction))
        scratch.updateMatrix()
        trail.current.setMatrixAt(index, scratch.matrix)
      }
      trail.current.instanceMatrix.needsUpdate = true
    }
  })
  const { performerStyle: style } = theme
  return <group>
    <group ref={body}>
      <mesh scale={style.radius} renderOrder={10}>
        {style.shape === 'octahedron' ? <octahedronGeometry /> : <sphereGeometry args={[1, 16, 12]} />}
        <meshBasicMaterial color={theme.palette.performer} depthTest={false} depthWrite={false} />
      </mesh>
      <mesh scale={style.radius * style.haloScale}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial color={theme.palette.performer} transparent opacity={style.haloOpacity} depthWrite={false} />
      </mesh>
      <mesh scale={style.radius * style.haloScale * 1.55}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial color={theme.palette.performer} transparent opacity={style.haloOpacity * 0.34} depthWrite={false} />
      </mesh>
    </group>
    {effects.trail.enabled && <instancedMesh key={effects.trail.samples} ref={trail} args={[undefined, undefined, effects.trail.samples]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 4]} />
      <meshBasicMaterial color={theme.palette.performer} transparent opacity={effects.trail.opacity} depthWrite={false} />
    </instancedMesh>}
  </group>
}
