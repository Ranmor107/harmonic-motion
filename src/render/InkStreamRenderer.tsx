import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, Color, DoubleSide, InstancedMesh, Object3D, Quaternion, Vector3 } from 'three'
import type { EffectProfile, PresentationConfig, VisualTheme } from '../domain/visual'
import type { Vec3 } from '../domain/world'
import { evaluateLead, visibleStreamNotes, type MusicalPresentation } from '../visual/presentation/musicalPresentation'
import { inkNoteAppearance } from '../visual/effects/inkAppearance'
import { upperBound } from '../utils/math'
import type { PlaybackSnapshot } from './types'
import { inkMarkFragment, inkMarkVertex, inkStrokeFragment, inkStrokeVertex } from './inkShaders'

export function InkStreamRenderer({ model, theme, effects, presentation, playback, focusTrackId }: {
  model: MusicalPresentation; theme: VisualTheme; effects: EffectProfile; presentation: PresentationConfig; playback: PlaybackSnapshot; focusTrackId?: string
}) {
  const notes = useRef<InstancedMesh>(null)
  const washes = useRef<InstancedMesh>(null)
  const pen = useRef<InstancedMesh>(null)
  const strokes = useRef<BufferGeometry>(null)
  const limit = presentation.stream.maxVisibleNotes
  const samples = presentation.relations.samples
  const capacity = (limit * 4 + 2) * samples * 6
  const buffers = useMemo(() => ({
    notes: new Float32Array(limit * 3), washes: new Float32Array(limit * 3), pen: new Float32Array((effects.trail.samples + 1) * 3),
    positions: new Float32Array(capacity * 3), colors: new Float32Array(capacity * 4), uvs: new Float32Array(capacity * 2),
  }), [limit, capacity, effects.trail.samples])
  const scratch = useMemo(() => ({ object: new Object3D(), color: new Color(), side: new Vector3(), direction: new Vector3(), spin: new Quaternion() }), [])
  const uniforms = useMemo(() => ({
    notes: { inkColor: { value: new Color(theme.palette.chord) } },
    washes: { inkColor: { value: new Color(theme.palette.note) } },
    pen: { inkColor: { value: new Color(theme.palette.performer) } },
  }), [theme])

  useFrame(({ camera }) => {
    if (!notes.current || !washes.current || !pen.current || !strokes.current) return
    const time = playback.current.time
    const lead = evaluateLead(model, time)
    const visible = visibleStreamNotes(model, time, presentation.stream)
    const mark = (mesh: InstancedMesh, data: Float32Array, index: number, point: Vec3, width: number, height: number, opacity: number, seed: number, kind: number, angle = 0) => {
      scratch.object.position.set(point.x, point.y, point.z)
      scratch.object.quaternion.copy(camera.quaternion)
      scratch.spin.setFromAxisAngle(scratch.direction.set(0, 0, 1), angle)
      scratch.object.quaternion.multiply(scratch.spin)
      scratch.object.scale.set(width, height, 1)
      scratch.object.updateMatrix()
      mesh.setMatrixAt(index, scratch.object.matrix)
      data.set([opacity, seed, kind], index * 3)
    }
    let washCount = 0
    visible.forEach((note, index) => {
      const state = inkNoteAppearance(note, time, presentation.stream, effects)
      const point = model.positions.get(note.id)!
      const main = model.leadIds.has(note.id)
      const focused = !focusTrackId || note.trackId === focusTrackId
      const emphasis = focused ? 1 : 0.42
      const depth = point.z > lead.z ? 1 : 0.72
      const radius = theme.nodeStyle.radius * state.scale * (0.8 + note.velocity * 0.5)
      const leaf = !main && !model.chordIds.has(note.id) && state.seed > 0.68
      mark(notes.current!, buffers.notes, index, point, radius * (leaf ? 3.6 : 2.4), radius * (leaf ? 1.15 : 2.4),
        state.opacity * (main ? 1 : 0.66) * emphasis * depth, state.seed, leaf ? 1 : 0, state.angle + (leaf ? 0.38 : 0))
      if (state.washOpacity > 0) mark(washes.current!, buffers.washes, washCount++, point, state.washRadius * 2, state.washRadius * 1.65,
        state.washOpacity * emphasis * depth, state.seed, 2, state.angle)
    })
    notes.current.count = visible.length
    washes.current.count = washCount
    mark(pen.current, buffers.pen, 0, lead, theme.performerStyle.radius * 2.8, theme.performerStyle.radius * 1.8, 1, 0.107, 0, -0.25)
    let penCount = 1
    if (effects.trail.enabled) for (let i = 0; i < effects.trail.samples; i++) {
      const fraction = (i + 1) / (effects.trail.samples + 1)
      const point = evaluateLead(model, Math.max(0, time - fraction * effects.trail.lifetime))
      const radius = effects.trail.radius * (1 - fraction)
      mark(pen.current, buffers.pen, penCount++, point, radius * 3.4, radius * 1.5, effects.trail.opacity * (1 - fraction), fraction, 0, -0.25)
    }
    pen.current.count = penCount
    for (const mesh of [notes.current, washes.current, pen.current]) {
      mesh.instanceMatrix.needsUpdate = true
      mesh.geometry.getAttribute('inkParams').needsUpdate = true
    }

    let vertex = 0
    camera.getWorldDirection(scratch.direction)
    const draw = (points: Vec3[], color: string, opacity: number, width: number) => {
      scratch.color.set(color)
      for (let i = 1; i < points.length && vertex + 6 <= capacity; i++) {
        const p = points[i - 1]!, q = points[i]!
        scratch.side.set(q.x - p.x, q.y - p.y, q.z - p.z).cross(scratch.direction).normalize().multiplyScalar(width)
        for (const [point, side, u] of [[p, -1, 0], [p, 1, 0], [q, 1, 1], [p, -1, 0], [q, 1, 1], [q, -1, 1]] as const) {
          buffers.positions.set([point.x + scratch.side.x * side, point.y + scratch.side.y * side, point.z + scratch.side.z * side], vertex * 3)
          buffers.colors.set([scratch.color.r, scratch.color.g, scratch.color.b, opacity], vertex * 4)
          buffers.uvs.set([u, side < 0 ? 0 : 1], vertex * 2)
          vertex++
        }
      }
    }
    // The original Ribbon's exact musical curve and time window, rendered as a narrow brush stroke.
    const first = Math.max(1, upperBound(model.lead, time - presentation.stream.fadeOutTime, p => p.note.startTime))
    const last = Math.min(model.lead.length - 1, upperBound(model.lead, time + presentation.stream.leadInTime, p => p.note.startTime))
    for (let i = first; i <= last; i++) {
      const a = model.lead[i - 1]!, b = model.lead[i]!
      const start = Math.max(a.note.startTime, time - presentation.stream.fadeOutTime)
      const end = Math.min(b.note.startTime, time + presentation.stream.leadInTime)
      if (start > end) continue
      const points = Array.from({ length: samples + 1 }, (_, step) => evaluateLead(model, start + (end - start) * step / samples))
      draw(points, theme.palette.chord, 0.38 + b.note.velocity * 0.32, 0.045 + b.note.velocity * 0.045)
    }
    for (const note of visible) {
      const point = model.positions.get(note.id)!
      const state = inkNoteAppearance(note, time, presentation.stream, effects)
      const main = model.leadIds.has(note.id)
      const opacity = state.opacity * (focusTrackId && note.trackId !== focusTrackId ? 0.42 : 1)
      const support = model.supportPaths.get(note.id)
      if (support) draw(support, theme.palette.note, opacity * 0.32, 0.028)
      if (note.duration > 0.25) draw([point, { ...point, x: point.x + Math.min(note.duration, presentation.stream.leadInTime) * presentation.stream.timeScale }],
        main ? theme.palette.chord : theme.palette.note, opacity * 0.3, main ? 0.035 : 0.022)
    }
    strokes.current.setDrawRange(0, vertex)
    for (const attribute of ['position', 'inkColor', 'uv']) strokes.current.getAttribute(attribute).needsUpdate = true
  })
  return <group>
    <mesh frustumCulled={false} renderOrder={2}>
      <bufferGeometry ref={strokes}>
        <bufferAttribute attach="attributes-position" args={[buffers.positions, 3]} />
        <bufferAttribute attach="attributes-inkColor" args={[buffers.colors, 4]} />
        <bufferAttribute attach="attributes-uv" args={[buffers.uvs, 2]} />
      </bufferGeometry>
      <shaderMaterial vertexShader={inkStrokeVertex} fragmentShader={inkStrokeFragment} side={DoubleSide} transparent depthWrite={false} />
    </mesh>
    <instancedMesh ref={washes} args={[undefined, undefined, limit]} frustumCulled={false} renderOrder={1}>
      <planeGeometry><instancedBufferAttribute attach="attributes-inkParams" args={[buffers.washes, 3]} /></planeGeometry>
      <shaderMaterial uniforms={uniforms.washes} vertexShader={inkMarkVertex} fragmentShader={inkMarkFragment} transparent depthWrite={false} />
    </instancedMesh>
    <instancedMesh ref={notes} args={[undefined, undefined, limit]} frustumCulled={false} renderOrder={3}>
      <planeGeometry><instancedBufferAttribute attach="attributes-inkParams" args={[buffers.notes, 3]} /></planeGeometry>
      <shaderMaterial uniforms={uniforms.notes} vertexShader={inkMarkVertex} fragmentShader={inkMarkFragment} transparent depthWrite={false} />
    </instancedMesh>
    <instancedMesh ref={pen} args={[undefined, undefined, effects.trail.samples + 1]} frustumCulled={false} renderOrder={4}>
      <planeGeometry><instancedBufferAttribute attach="attributes-inkParams" args={[buffers.pen, 3]} /></planeGeometry>
      <shaderMaterial uniforms={uniforms.pen} vertexShader={inkMarkVertex} fragmentShader={inkMarkFragment} transparent depthWrite={false} />
    </instancedMesh>
  </group>
}
