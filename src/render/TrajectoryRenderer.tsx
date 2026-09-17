import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry } from 'three'
import type { PerformerPlan } from '../domain/performance'
import type { VisualTheme, VisibilityMode } from '../domain/visual'
import { evaluateSegment } from '../engine/choreography/trajectory'
import { upperBound } from '../utils/math'
import type { PlaybackSnapshot } from './types'

const SEGMENT_SAMPLES = 28

export function TrajectoryRenderer({ performer, theme, visibilityMode, playback }: {
  performer: PerformerPlan; theme: VisualTheme; visibilityMode: VisibilityMode; playback: PlaybackSnapshot
}) {
  const geometry = useRef<BufferGeometry>(null)
  const positions = useMemo(() => new Float32Array((SEGMENT_SAMPLES - 1) * 2 * 3), [])
  useFrame(() => {
    if (!geometry.current) return
    const segments = performer.trajectorySegments
    const index = upperBound(segments, playback.current.time, segment => segment.startTime) - 1
    const segment = segments[Math.max(0, Math.min(segments.length - 1, index))]
    if (!segment) { geometry.current.setDrawRange(0, 0); return }
    let cursor = 0
    for (let sample = 0; sample < SEGMENT_SAMPLES - 1; sample++) {
      for (const step of [sample, sample + 1]) {
        const time = segment.startTime + (segment.endTime - segment.startTime) * step / (SEGMENT_SAMPLES - 1)
        const point = evaluateSegment(segment, time)
        positions[cursor++] = point.x; positions[cursor++] = point.y; positions[cursor++] = point.z
      }
    }
    const attribute = geometry.current.getAttribute('position')
    if (attribute) attribute.needsUpdate = true
    geometry.current.setDrawRange(0, cursor / 3)
  })
  return <lineSegments>
    <bufferGeometry ref={geometry}><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
    <lineBasicMaterial color={theme.palette.performer} transparent opacity={visibilityMode === 'overview' ? 0.38 : 0.86} />
  </lineSegments>
}
