import type { CameraConfig, CameraController } from '../../domain/visual'

export const DefaultCamera: CameraConfig = {
  type: 'navigable', fov: 42, padding: 1.18, direction: { x: 0.15, y: 0.08, z: 1 },
  minDistance: 1.4, maxDistance: 180,
}

export const StaticCamera: CameraController = {
  getState(_time, { bounds, aspect, config }) {
    const target = {
      x: (bounds.min.x + bounds.max.x) / 2,
      y: (bounds.min.y + bounds.max.y) / 2,
      z: (bounds.min.z + bounds.max.z) / 2,
    }
    const vertical = config.fov * Math.PI / 360
    const { x, y, z } = config.direction
    const length = Math.hypot(x, y, z)
    const forward = { x: x / length, y: y / length, z: z / length }
    const rightLength = Math.hypot(forward.x, forward.z)
    const right = { x: forward.z / rightLength, y: 0, z: -forward.x / rightLength }
    const up = { x: forward.y * right.z, y: forward.z * right.x - forward.x * right.z, z: -forward.y * right.x }
    let distance = config.minDistance
    let radius = 1
    for (const cx of [bounds.min.x, bounds.max.x]) for (const cy of [bounds.min.y, bounds.max.y]) for (const cz of [bounds.min.z, bounds.max.z]) {
      const p = { x: cx - target.x, y: cy - target.y, z: cz - target.z }
      const dot = (v: typeof p) => p.x * v.x + p.y * v.y + p.z * v.z
      const extent = Math.max((Math.abs(dot(right)) + 0.6) / (Math.tan(vertical) * Math.max(0.1, aspect)), (Math.abs(dot(up)) + 0.6) / Math.tan(vertical))
      distance = Math.max(distance, dot(forward) + extent * config.padding)
      radius = Math.max(radius, Math.hypot(p.x, p.y, p.z))
    }
    return {
      position: { x: target.x + x / length * distance, y: target.y + y / length * distance, z: target.z + z / length * distance },
      target, fov: config.fov, near: 0.1, far: distance + radius * 10,
    }
  },
}
