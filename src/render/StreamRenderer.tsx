import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Group, InstancedMesh, Object3D } from 'three'
import type { NormalizedScore } from '../domain/score'
import type { PresentationConfig, VisualTheme } from '../domain/visual'
import { evaluateStreamPerformer, evaluateStreamSatellites, prepareStreamScore } from '../visual/presentation/evaluatePresentation'
import type { PlaybackSnapshot } from './types'

export function StreamRenderer({ score, theme, presentation, playback }: {
  score: NormalizedScore; theme: VisualTheme; presentation: PresentationConfig; playback: PlaybackSnapshot
}) {
  const notes = useRef<InstancedMesh>(null)
  const performer = useRef<Group>(null)
  const scratch = useMemo(() => ({ object: new Object3D(), color: new Color() }), [])
  const prepared = useMemo(() => prepareStreamScore(score), [score])
  useFrame(() => {
    const songTime = playback.current.time
    const lead = evaluateStreamPerformer(songTime, score.duration)
    performer.current?.position.set(lead.x, lead.y, lead.z)
    if (performer.current) performer.current.rotation.set(songTime * 0.34, songTime * 0.52, 0)
    if (!notes.current) return
    const satellites = evaluateStreamSatellites(score, songTime, presentation.stream, prepared)
    satellites.forEach((satellite, index) => {
      scratch.object.position.set(satellite.position.x, satellite.position.y, satellite.position.z)
      scratch.object.scale.setScalar(theme.nodeStyle.radius * satellite.scale * (satellite.isChord ? 1.15 : 0.9))
      scratch.object.updateMatrix()
      notes.current!.setMatrixAt(index, scratch.object.matrix)
      const color = satellite.isChord ? theme.palette.chord : theme.palette.note
      notes.current!.setColorAt(index, scratch.color.set(color).multiplyScalar(satellite.opacity))
    })
    notes.current.count = satellites.length
    notes.current.instanceMatrix.needsUpdate = true
    if (notes.current.instanceColor) notes.current.instanceColor.needsUpdate = true
  })

  const style = theme.performerStyle
  return <group>
    <mesh position={[0, 0, -0.6]} rotation={[0, 0, Math.PI / 2]}>
      <planeGeometry args={[0.012, 23]} />
      <meshBasicMaterial color={theme.palette.connection} transparent opacity={0.22} depthWrite={false} />
    </mesh>
    <instancedMesh ref={notes} args={[undefined, undefined, presentation.stream.maxVisibleNotes]} frustumCulled={false}>
      <sphereGeometry args={[1, 12, 8]} />
      <meshBasicMaterial />
    </instancedMesh>
    <group ref={performer}>
      <mesh scale={style.radius * 1.32}>
        <octahedronGeometry />
        <meshBasicMaterial color={theme.palette.performer} />
      </mesh>
      <mesh scale={style.radius * style.haloScale * 1.3}>
        <sphereGeometry args={[1, 18, 12]} />
        <meshBasicMaterial color={theme.palette.performer} transparent opacity={style.haloOpacity * 2.2} depthWrite={false} />
      </mesh>
    </group>
  </group>
}
