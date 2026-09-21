import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, InstancedMesh, Object3D } from 'three'
import type { PerformancePlan } from '../domain/performance'
import type { WorldModel } from '../domain/world'
import type { EffectProfile, VisualTheme } from '../domain/visual'
import { eventsInWindow } from '../engine/choreography/evaluator'
import { seededRandom } from '../utils/math'
import { complexityPolicy } from '../visual/presentation/renderBudget'
import type { PlaybackSnapshot } from './types'

// A draw budget, independent of the event timeline. Never drops musical events.
const MAX_VISIBLE_HITS = 64

export function EffectsRenderer({ world, plan, effects, theme, playback }: {
  world: WorldModel; plan: PerformancePlan; effects: EffectProfile; theme: VisualTheme; playback: PlaybackSnapshot
}) {
  const rings = useRef<InstancedMesh>(null)
  const particles = useRef<InstancedMesh>(null)
  const scratch = useMemo(() => ({ object: new Object3D(), color: new Color() }), [])
  const nodes = useMemo(() => new Map(world.nodes.map(node => [node.id, node])), [world])
  const vectors = useMemo(() => {
    const random = seededRandom(world.metadata.seed)
    return Array.from({ length: effects.particles.count }, () => {
      const azimuth = random() * Math.PI * 2
      const z = random() * 2 - 1
      const radius = Math.sqrt(1 - z * z)
      return { x: Math.cos(azimuth) * radius, y: Math.sin(azimuth) * radius, z }
    })
  }, [world.metadata.seed, effects.particles.count])
  useFrame(({ camera, size, controls }) => {
    const time = playback.current.time
    if (!rings.current && !particles.current) return
    const target = (controls as unknown as { target?: { x: number; y: number; z: number } })?.target
    const distance = target ? Math.hypot(camera.position.x - target.x, camera.position.y - target.y, camera.position.z - target.z) : camera.position.length()
    const detail = Math.min(1, size.height * theme.nodeStyle.radius / Math.max(1, distance) / 5)
    const budget = complexityPolicy(world.nodes.length, detail).hitBudget
    const hits = eventsInWindow(plan, time, Math.max(effects.hit.lifetime, effects.particles.lifetime)).slice(-budget)
    let ringCount = 0
    let particleCount = 0
    for (const event of hits) {
      const node = nodes.get(event.nodeId)!
      const age = time - event.time
      const color = event.type === 'chord-hit' ? theme.palette.chord : theme.palette.note
      if (rings.current && age < effects.hit.lifetime) {
        const progress = age / effects.hit.lifetime
        scratch.object.position.set(node.position.x, node.position.y, node.position.z)
        scratch.object.quaternion.copy(camera.quaternion)
        scratch.object.scale.setScalar(effects.hit.radius + progress * effects.hit.expansion * event.strength)
        scratch.object.updateMatrix()
        rings.current.setMatrixAt(ringCount, scratch.object.matrix)
        rings.current.setColorAt(ringCount++, scratch.color.set(color).multiplyScalar(1 - progress))
      }
      if (particles.current && age < effects.particles.lifetime) {
        const progress = age / effects.particles.lifetime
        for (const direction of vectors.slice(0, Math.max(2, Math.ceil(vectors.length * (0.3 + detail * 0.7))))) {
          const distance = progress * effects.particles.distance * event.strength
          scratch.object.position.set(node.position.x + direction.x * distance, node.position.y + direction.y * distance, node.position.z + direction.z * distance)
          scratch.object.scale.setScalar(effects.particles.radius * (1 - progress))
          scratch.object.updateMatrix()
          particles.current.setMatrixAt(particleCount, scratch.object.matrix)
          particles.current.setColorAt(particleCount++, scratch.color.set(color).multiplyScalar(1 - progress))
        }
      }
    }
    for (const [mesh, count] of [[rings.current, ringCount], [particles.current, particleCount]] as const) {
      if (!mesh) continue
      mesh.count = count
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
  })
  return <group>
    {effects.hit.enabled && <instancedMesh ref={rings} args={[undefined, undefined, MAX_VISIBLE_HITS]} frustumCulled={false}>
      <ringGeometry args={[0.97, 1, 40]} />
      <meshBasicMaterial transparent opacity={effects.hit.opacity} depthWrite={false} />
    </instancedMesh>}
    {effects.particles.enabled && <instancedMesh key={effects.particles.count} ref={particles} args={[undefined, undefined, MAX_VISIBLE_HITS * effects.particles.count]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 4]} />
      <meshBasicMaterial transparent opacity={effects.particles.opacity} depthWrite={false} />
    </instancedMesh>}
  </group>
}
