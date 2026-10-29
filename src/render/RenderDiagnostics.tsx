import { useEffect, useRef } from 'react'
import { addAfterEffect, useFrame, useThree } from '@react-three/fiber'
import { BufferAttribute, InterleavedBufferAttribute, InstancedMesh, LineSegments, Mesh } from 'three'
import type { NormalizedScore } from '../domain/score'
import { createRenderMetrics } from './renderMetrics'

// Development-only sampler. Bounded storage, no history or scene objects retained.
export function RenderDiagnostics({ mode, score }: { mode: string; score: NormalizedScore }) {
  const { gl, scene } = useThree()
  const rendered = useRef(false)
  useFrame(() => { rendered.current = true })
  useEffect(() => {
    const surface = gl.domElement
    const sampler = createRenderMetrics({ renderer: 'r3f', mode })
    surface.dataset.renderer = 'r3f'
    surface.dataset.renderMode = mode
    delete surface.dataset.renderMetrics
    let continuous = false
    const remove = addAfterEffect(() => {
      if (!rendered.current) return
      rendered.current = false
      if (document.hidden) { continuous = false; return }
      const frames = sampler.record(performance.now(), continuous)
      continuous = true
      if (frames !== 1 && frames % 30) return
      let objects = 0; let instances = 0; let capacity = 0; let bufferBytes = 0
      const geometries = new Set()
      scene.traverse(object => {
        if (object instanceof InstancedMesh) {
          instances += object.count; capacity += object.instanceMatrix.count
          bufferBytes += object.instanceMatrix.array.byteLength + (object.instanceColor?.array.byteLength ?? 0)
        }
        if (object instanceof Mesh || object instanceof LineSegments) {
          objects++
          if (!geometries.has(object.geometry)) {
            geometries.add(object.geometry)
            for (const attribute of Object.values(object.geometry.attributes)) {
              if (attribute instanceof BufferAttribute || attribute instanceof InterleavedBufferAttribute) bufferBytes += attribute.array.byteLength
            }
            bufferBytes += object.geometry.index?.array.byteLength ?? 0
          }
        }
      })
      surface.dataset.renderMetrics = JSON.stringify({ ...sampler.snapshot(),
        drawCalls: gl.info.render.calls, triangles: gl.info.render.triangles, lines: gl.info.render.lines,
        geometries: gl.info.memory.geometries, textures: gl.info.memory.textures,
        objects, instances, instanceCapacity: capacity, cpuBufferBytes: bufferBytes,
        canvasWidth: surface.width, canvasHeight: surface.height, cssWidth: surface.clientWidth, cssHeight: surface.clientHeight })
    })
    return () => {
      remove()
      delete surface.dataset.renderMetrics
      delete surface.dataset.renderer
      delete surface.dataset.renderMode
    }
  }, [gl, scene, mode, score])
  return null
}
