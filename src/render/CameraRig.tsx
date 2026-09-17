import { useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { PerspectiveCamera } from 'three'
import type { CameraConfig, CameraController } from '../domain/visual'
import type { WorldBounds } from '../domain/world'

export function CameraRig({ bounds, config, controller }: { bounds: WorldBounds; config: CameraConfig; controller: CameraController }) {
  const { camera, size } = useThree()
  useLayoutEffect(() => {
    const state = controller.getState(0, { bounds, config, aspect: size.width / size.height })
    camera.position.set(state.position.x, state.position.y, state.position.z)
    camera.lookAt(state.target.x, state.target.y, state.target.z)
    camera.near = state.near
    camera.far = state.far
    if (camera instanceof PerspectiveCamera) camera.fov = state.fov
    camera.updateProjectionMatrix()
  }, [bounds, config, controller, camera, size])
  return null
}
