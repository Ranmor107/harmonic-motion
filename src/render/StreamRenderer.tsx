import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, Color, Group, InstancedMesh, Mesh, MeshBasicMaterial, Object3D } from 'three'
import type { EffectProfile, PresentationConfig, VisualTheme } from '../domain/visual'
import type { Vec3 } from '../domain/world'
import { curveBetween, evaluateLead, noteLifecycle, visibleStreamNotes, type MusicalPresentation } from '../visual/presentation/musicalPresentation'
import { upperBound } from '../utils/math'
import type { PlaybackSnapshot } from './types'

export function StreamRenderer({ model, theme, effects, presentation, playback }: {
  model: MusicalPresentation; theme: VisualTheme; effects: EffectProfile; presentation: PresentationConfig; playback: PlaybackSnapshot
}) {
  const notes = useRef<InstancedMesh>(null)
  const performer = useRef<Group>(null)
  const trail = useRef<InstancedMesh>(null)
  const hit = useRef<Mesh>(null)
  const positions = useRef<BufferAttribute>(null)
  const colors = useRef<BufferAttribute>(null)
  const scratch = useMemo(() => ({ object: new Object3D(), color: new Color() }), [])
  const samples = presentation.relations.samples
  const capacity = (presentation.stream.maxVisibleNotes * 4 + 2) * samples * 2
  const buffers = useMemo(() => ({ positions: new Float32Array(capacity * 3), colors: new Float32Array(capacity * 4) }), [capacity])
  useFrame(() => {
    const time = playback.current.time
    const lead = evaluateLead(model, time)
    performer.current?.position.set(lead.x, lead.y, lead.z)
    if (performer.current) performer.current.rotation.set(time * 0.34, time * 0.52, 0)
    if (!notes.current || !positions.current || !colors.current) return
    const visible = visibleStreamNotes(model, time, presentation.stream)
    const visibleIds = new Set(visible.map(n => n.id))
    visible.forEach((note, index) => {
      const state = noteLifecycle(note, time, presentation.stream)
      const point = model.positions.get(note.id)!
      scratch.object.position.set(point.x, point.y, point.z)
      scratch.object.scale.setScalar(theme.nodeStyle.radius * state.scale * (0.7 + note.velocity * 0.7))
      scratch.object.updateMatrix()
      notes.current!.setMatrixAt(index, scratch.object.matrix)
      scratch.color.set(model.leadIds.has(note.id) || state.phase === 'hit' || state.phase === 'active' ? theme.palette.chord : theme.palette.note).multiplyScalar(state.opacity)
      notes.current!.setColorAt(index, scratch.color)
    })
    notes.current.count = visible.length
    notes.current.instanceMatrix.needsUpdate = true
    if (notes.current.instanceColor) notes.current.instanceColor.needsUpdate = true
    let vertex = 0
    const draw = (points: Vec3[], color: string, opacity: number) => {
      scratch.color.set(color)
      for (let i = 1; i < points.length && vertex + 2 <= capacity; i++) for (const p of [points[i - 1]!, points[i]!]) {
        positions.current!.setXYZ(vertex, p.x, p.y, p.z)
        colors.current!.setXYZW(vertex++, scratch.color.r, scratch.color.g, scratch.color.b, opacity)
      }
    }
    const first = Math.max(1, upperBound(model.lead, time - presentation.stream.fadeOutTime, p => p.note.startTime))
    const last = Math.min(model.lead.length - 1, upperBound(model.lead, time + presentation.stream.leadInTime, p => p.note.startTime))
    for (let i = first; i <= last; i++) {
      const a = model.lead[i - 1]!
      const b = model.lead[i]!
      const start = Math.max(a.note.startTime, time - presentation.stream.fadeOutTime)
      const end = Math.min(b.note.startTime, time + presentation.stream.leadInTime)
      if (start > end) continue
      const points = Array.from({ length: samples + 1 }, (_, step) => evaluateLead(model, start + (end - start) * step / samples))
      draw(points, theme.palette.chord, 0.52 + b.note.velocity * 0.42)
    }
    for (const phrase of model.phrases) {
      const active = phrase.notes.filter(note => visibleIds.has(note.id))
      active.forEach((note, index) => {
        const point = model.positions.get(note.id)!
        const anchor = index ? model.positions.get(active[index - 1]!.id)! : evaluateLead(model, note.startTime)
        const state = noteLifecycle(note, time, presentation.stream)
        draw(curveBetween(anchor, point, presentation.relations.curveHeight, samples), theme.palette.note, state.opacity * 0.6)
      })
    }
    // Sustained notes have short time-directed strokes instead of disappearing after the hit.
    for (const note of visible) {
      const point = model.positions.get(note.id)!
      const length = Math.min(note.duration, presentation.stream.leadInTime) * presentation.stream.timeScale
      draw([point, { ...point, x: point.x + length }], model.leadIds.has(note.id) ? theme.palette.chord : theme.palette.note, noteLifecycle(note, time, presentation.stream).opacity * 0.22)
    }
    buffers.positions.fill(0, vertex * 3)
    buffers.colors.fill(0, vertex * 4)
    positions.current.needsUpdate = true
    colors.current.needsUpdate = true
    if (hit.current) {
      const point = model.lead[upperBound(model.lead, time, p => p.note.startTime) - 1]
      const age = point ? time - point.note.startTime : Infinity
      hit.current.visible = effects.hit.enabled && age < effects.hit.lifetime
      if (point && hit.current.visible) {
        hit.current.position.set(point.position.x, point.position.y, point.position.z)
        hit.current.scale.setScalar(effects.hit.radius + age / effects.hit.lifetime * effects.hit.expansion)
        ;(hit.current.material as MeshBasicMaterial).opacity = effects.hit.opacity * (1 - age / effects.hit.lifetime)
      }
    }
    if (trail.current) {
      for (let i = 0; i < effects.trail.samples; i++) {
        const fraction = i / effects.trail.samples
        const point = evaluateLead(model, Math.max(0, time - fraction * effects.trail.lifetime))
        scratch.object.position.set(point.x, point.y, point.z)
        scratch.object.scale.setScalar(effects.trail.radius * (1 - fraction))
        scratch.object.updateMatrix()
        trail.current.setMatrixAt(i, scratch.object.matrix)
      }
      trail.current.instanceMatrix.needsUpdate = true
    }
  })
  const style = theme.performerStyle
  return <group>
    <lineSegments frustumCulled={false}>
      <bufferGeometry><bufferAttribute ref={positions} attach="attributes-position" args={[buffers.positions, 3]} /><bufferAttribute ref={colors} attach="attributes-color" args={[buffers.colors, 4]} /></bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.95} depthWrite={false} />
    </lineSegments>
    <instancedMesh ref={notes} args={[undefined, undefined, presentation.stream.maxVisibleNotes]} frustumCulled={false}>
      <sphereGeometry args={[1, 12, 8]} /><meshBasicMaterial />
    </instancedMesh>
    <group ref={performer}>
      <mesh scale={style.radius * 1.32} renderOrder={10}>
        {style.shape === 'octahedron' ? <octahedronGeometry /> : <sphereGeometry args={[1, 16, 12]} />}
        <meshBasicMaterial color={theme.palette.performer} depthTest={false} depthWrite={false} />
      </mesh>
      <mesh scale={style.radius * style.haloScale * 1.3}>
        <sphereGeometry args={[1, 18, 12]} />
        <meshBasicMaterial color={theme.palette.performer} transparent opacity={style.haloOpacity} depthWrite={false} />
      </mesh>
    </group>
    <mesh ref={hit}>
      <ringGeometry args={[0.94, 1, 40]} /><meshBasicMaterial color={theme.palette.chord} transparent depthWrite={false} />
    </mesh>
    {effects.trail.enabled && <instancedMesh key={effects.trail.samples} ref={trail} args={[undefined, undefined, effects.trail.samples]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 4]} /><meshBasicMaterial color={theme.palette.performer} transparent opacity={effects.trail.opacity} depthWrite={false} />
    </instancedMesh>}
  </group>
}
