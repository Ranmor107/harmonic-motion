import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, Color, Group, InstancedMesh, Object3D } from 'three'
import type { EffectProfile, PresentationConfig, VisualTheme } from '../domain/visual'
import type { NoteEvent } from '../domain/score'
import type { Vec3 } from '../domain/world'
import { ENSEMBLE_BUDGET, ensembleMotion, ensembleNoteState, ensemblePath, ensemblePoint, visibleEnsembleNotes, type EnsemblePresentation } from '../visual/presentation/ensemblePresentation'
import type { PlaybackSnapshot } from './types'

const LINE_VERTICES = ENSEMBLE_BUDGET * 48
const pointOnArc = (angle: number, radius: number, z = 0): Vec3 => ({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, z })

export function EnsembleRenderer({ model, theme, effects, presentation, playback, focusTrackId }: {
  model: EnsemblePresentation; theme: VisualTheme; effects: EffectProfile; presentation: PresentationConfig; playback: PlaybackSnapshot; focusTrackId?: string
}) {
  const stage = useRef<Group>(null)
  const notes = useRef<InstancedMesh>(null)
  const accents = useRef<InstancedMesh>(null)
  const lines = useRef<BufferGeometry>(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const scratch = useMemo(() => ({ object: new Object3D(), color: new Color() }), [])
  const buffers = useMemo(() => ({ positions: new Float32Array(LINE_VERTICES * 3), colors: new Float32Array(LINE_VERTICES * 4) }), [])
  const guides = useMemo(() => {
    const vertices: number[] = []
    for (const region of model.regions) for (let i = 0; i < 40; i++) {
      for (const step of [i, i + 1]) {
        const point = pointOnArc(region.angle + (step / 40 - 0.5) * region.span, region.radius)
        vertices.push(point.x, point.y, -0.02)
      }
    }
    return new Float32Array(vertices)
  }, [model])
  useFrame(() => {
    if (!stage.current || !notes.current || !accents.current || !lines.current) return
    const time = playback.current.time
    const motion = ensembleMotion(model, time, reducedMotion)
    stage.current.position.set(motion.x, motion.y, 0)
    stage.current.rotation.set(motion.tiltX, motion.rotation, motion.tiltY)
    stage.current.scale.setScalar(motion.scale)
    let vertex = 0
    const draw = (a: Vec3, b: Vec3, color: string, opacity: number) => {
      if (vertex + 2 > LINE_VERTICES) return
      scratch.color.set(color)
      for (const point of [a, b]) {
        buffers.positions.set([point.x, point.y, point.z], vertex * 3)
        buffers.colors.set([scratch.color.r, scratch.color.g, scratch.color.b, opacity], vertex * 4)
        vertex++
      }
    }
    const drawPath = (path: Vec3[], color: string, opacity: number) => {
      for (let i = 1; i < path.length; i++) draw(path[i - 1]!, path[i]!, color, opacity)
    }
    const visible = visibleEnsembleNotes(model, time)
    const points = new Map<string, Vec3>()
    const states = new Map(visible.map(note => [note.id, ensembleNoteState(model, note, time)]))
    let accentCount = 0
    visible.forEach((note, i) => {
      const point = ensemblePoint(model, note, time)
      points.set(note.id, point)
      const state = states.get(note.id)!
      const lead = model.source.leadIds.has(note.id)
      const focus = !focusTrackId || note.trackId === focusTrackId ? 1 : 0.4
      drawPath(ensemblePath(model, note, time), lead ? theme.palette.chord : theme.palette.note, state.opacity * (lead ? 0.24 : 0.16) * focus)
      const radius = theme.nodeStyle.radius * (lead ? 0.9 : 0.7) * state.scale * (0.7 + note.velocity * 0.35) * (focusTrackId && focus === 1 ? 1.18 : 1)
      scratch.object.position.set(point.x, point.y, point.z)
      scratch.object.scale.setScalar(radius)
      scratch.object.updateMatrix()
      notes.current!.setMatrixAt(i, scratch.object.matrix)
      scratch.color.set(lead ? theme.palette.chord : theme.palette.note).multiplyScalar(state.opacity * focus)
      notes.current!.setColorAt(i, scratch.color)
      const age = time - note.startTime
      if (effects.hit.enabled && age >= 0 && age < effects.hit.lifetime && accentCount < 16) {
        scratch.object.scale.setScalar(radius * (1.5 + age / effects.hit.lifetime * 2))
        scratch.object.updateMatrix()
        accents.current!.setMatrixAt(accentCount, scratch.object.matrix)
        scratch.color.set(lead ? theme.palette.chord : theme.palette.note).multiplyScalar((1 - age / effects.hit.lifetime) * focus)
        accents.current!.setColorAt(accentCount++, scratch.color)
      }
    })
    for (const [mesh, count] of [[notes.current, visible.length], [accents.current, accentCount]] as const) {
      mesh.count = count
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
    const lastByVoice = new Map<string, NoteEvent>()
    const chords = new Map<string, NoteEvent[]>()
    for (const note of visible) {
      const point = points.get(note.id)!
      const opacity = states.get(note.id)!.opacity
      const placement = model.placements.get(note.id)!
      const previous = lastByVoice.get(note.trackId)
      if (previous && note.startTime - previous.startTime > 0.03 && note.startTime - previous.startTime < presentation.relations.phraseGap) {
        const a = points.get(previous.id)!
        // A short curved phrase link leaves the centre free for cross-voice harmony.
        const length = Math.hypot(point.x - a.x, point.y - a.y) || 1
        const midpoint = { x: (a.x + point.x) * 0.54 - (point.y - a.y) / length * 0.16,
          y: (a.y + point.y) * 0.54 + (point.x - a.x) / length * 0.16, z: (a.z + point.z) * 0.5 - 0.02 }
        drawPath([a, midpoint, point], theme.palette.note, opacity * 0.28 * (focusTrackId && note.trackId !== focusTrackId ? 0.4 : 1))
      }
      lastByVoice.set(note.trackId, note)
      const remaining = Math.max(0, note.startTime + note.duration - Math.max(time, note.startTime))
      if (note.duration > 0.4) {
        const radius = Math.hypot(point.x, point.y)
        const length = Math.min(remaining, 3) * 0.13
        for (let i = 0; i < 8; i++) draw(pointOnArc(placement.angle + length * i / 8, radius, point.z),
          pointOnArc(placement.angle + length * (i + 1) / 8, radius, point.z), theme.palette.chord,
          opacity * 0.65 * (focusTrackId && note.trackId !== focusTrackId ? 0.4 : 1))
      }
      const chord = model.chordByNote.get(note.id)
      if (chord && Math.abs(note.startTime - time) < 1.5) {
        const members = chords.get(chord) ?? []
        members.push(note)
        chords.set(chord, members)
      }
    }
    const localChords = [...chords.values()].sort((a, b) => Math.abs(a[0]!.startTime - time) - Math.abs(b[0]!.startTime - time)).slice(0, 6)
    for (const chord of localChords) {
      const members = [...chord].sort((a, b) => model.placements.get(a.id)!.angle - model.placements.get(b.id)!.angle)
      for (let i = 1; i < Math.min(members.length, 5); i++) {
        const a = members[i - 1]!, b = members[i]!
        draw(points.get(a.id)!, points.get(b.id)!, theme.palette.chord,
          Math.min(states.get(a.id)!.opacity, states.get(b.id)!.opacity) * 0.32 * (focusTrackId && a.trackId !== focusTrackId && b.trackId !== focusTrackId ? 0.4 : 1))
      }
    }
    lines.current.setDrawRange(0, vertex)
    lines.current.getAttribute('position').needsUpdate = true
    lines.current.getAttribute('color').needsUpdate = true
  })
  return <group ref={stage}>
    <lineSegments>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[guides, 3]} /></bufferGeometry>
      <lineBasicMaterial color={theme.palette.muted} transparent opacity={0.24} depthWrite={false} />
    </lineSegments>
    <lineSegments frustumCulled={false}>
      <bufferGeometry ref={lines}><bufferAttribute attach="attributes-position" args={[buffers.positions, 3]} /><bufferAttribute attach="attributes-color" args={[buffers.colors, 4]} /></bufferGeometry>
      <lineBasicMaterial vertexColors transparent depthWrite={false} />
    </lineSegments>
    <instancedMesh ref={notes} args={[undefined, undefined, ENSEMBLE_BUDGET]} frustumCulled={false}>
      <sphereGeometry args={[1, 12, 8]} /><meshBasicMaterial />
    </instancedMesh>
    <instancedMesh ref={accents} args={[undefined, undefined, 16]} frustumCulled={false}>
      <ringGeometry args={[0.93, 1, 32]} /><meshBasicMaterial transparent opacity={0.7} depthWrite={false} />
    </instancedMesh>
  </group>
}
