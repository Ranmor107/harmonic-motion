import { useLayoutEffect, useRef, type ComponentRef } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { PerspectiveCamera } from 'three'
import type { CameraConfig, CameraController } from '../domain/visual'
import type { WorldBounds } from '../domain/world'

export function CameraRig({ bounds, config, controller, fitRequest }: {
  bounds: WorldBounds; config: CameraConfig; controller: CameraController; fitRequest: number
}) {
  const { camera, size } = useThree()
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  useLayoutEffect(() => {
    const state = controller.getState(0, { bounds, config, aspect: size.width / size.height })
    camera.position.set(state.position.x, state.position.y, state.position.z)
    camera.lookAt(state.target.x, state.target.y, state.target.z)
    camera.near = state.near
    camera.far = state.far
    if (camera instanceof PerspectiveCamera) camera.fov = state.fov
    camera.updateProjectionMatrix()
    controls.current?.target.set(state.target.x, state.target.y, state.target.z)
    controls.current?.update()
  }, [bounds, config, controller, camera, size, fitRequest])
  return <OrbitControls
    ref={controls}
    makeDefault
    enableRotate={false}
    enablePan
    enableZoom
    enableDamping
    dampingFactor={0.09}
    zoomSpeed={0.72}
    panSpeed={0.65}
    screenSpacePanning
    minDistance={config.minDistance}
    maxDistance={config.maxDistance}
    mouseButtons={{ LEFT: 2, MIDDLE: 1, RIGHT: 2 }}
  />
}
