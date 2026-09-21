import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, InterleavedBufferAttribute, InstancedMesh, LineSegments, Mesh } from 'three'

// Development-only sampler. Bounded storage, no history or scene objects retained.
export function RenderDiagnostics() {
  const samples = useRef<number[]>([])
  const previous = useRef(0)
  const frames = useRef(0)
  useFrame(({ gl, scene }) => {
    const now = performance.now()
    if (previous.current) samples.current.push(now - previous.current)
    previous.current = now
    if (samples.current.length > 120) samples.current.shift()
    if (++frames.current % 30) return
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
    const sorted = [...samples.current].sort((a, b) => a - b)
    gl.domElement.dataset.renderMetrics = JSON.stringify({ frames: frames.current, sampleCount: sorted.length,
      frameMedianMs: sorted[Math.floor(sorted.length * 0.5)], frameP95Ms: sorted[Math.floor(sorted.length * 0.95)],
      drawCalls: gl.info.render.calls, triangles: gl.info.render.triangles, lines: gl.info.render.lines,
      geometries: gl.info.memory.geometries, textures: gl.info.memory.textures,
      objects, instances, instanceCapacity: capacity, cpuBufferBytes: bufferBytes })
  })
  return null
}
