import type { CameraConfig, CameraController } from '../../domain/visual'

export const DefaultCamera: CameraConfig = {
  type: 'navigable', fov: 42, padding: 1.12, direction: { x: 0.35, y: 0.14, z: 1 },
  minDistance: 1.4, maxDistance: 180,
}

export const StaticCamera: CameraController = {
  getState(_time, { bounds, aspect, config }) {
    const target = {
      x: (bounds.min.x + bounds.max.x) / 2,
      y: (bounds.min.y + bounds.max.y) / 2,
      z: (bounds.min.z + bounds.max.z) / 2,
    }
    const radius = Math.max(3, Math.hypot(bounds.max.x - target.x, bounds.max.y - target.y, bounds.max.z - target.z) + 1.5)
    const vertical = config.fov * Math.PI / 360
    const limitingAngle = Math.min(vertical, Math.atan(Math.tan(vertical) * Math.max(0.1, aspect)))
    const distance = radius * config.padding / Math.sin(limitingAngle)
    const { x, y, z } = config.direction
    const length = Math.hypot(x, y, z)
    return {
      position: { x: target.x + x / length * distance, y: target.y + y / length * distance, z: target.z + z / length * distance },
      target, fov: config.fov, near: 0.1, far: distance + radius * 10,
    }
  },
}
