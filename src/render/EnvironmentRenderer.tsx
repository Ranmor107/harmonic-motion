import { useMemo } from 'react'
import type { EnvironmentConfig } from '../domain/visual'
import type { WorldBounds } from '../domain/world'
import { seededRandom } from '../utils/math'

export function EnvironmentRenderer({ config, bounds }: { config: EnvironmentConfig; bounds: WorldBounds }) {
  const positions = useMemo(() => {
    if (config.type !== 'gradient') return new Float32Array()
    const random = seededRandom(config.stars.seed)
    const radius = Math.max(15, Math.hypot(bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y, bounds.max.z - bounds.min.z) * 2)
    const center = { x: (bounds.min.x + bounds.max.x) / 2, y: (bounds.min.y + bounds.max.y) / 2, z: bounds.min.z - 5 }
    return Float32Array.from({ length: config.stars.count * 3 }, (_, index) =>
      (random() - 0.5) * radius * 2 + [center.x, center.y, center.z][index % 3]!)
  }, [config, bounds])
  if (config.type === 'solid') return <color attach="background" args={[config.color]} />
  if (!config.stars.enabled) return null
  return <points>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
    <pointsMaterial color={config.stars.color} size={config.stars.size} transparent opacity={config.stars.opacity} depthWrite={false} />
  </points>
}
