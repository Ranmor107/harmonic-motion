import { useLayoutEffect, useRef, type ComponentRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { PerspectiveCamera } from 'three'
import type { CameraConfig, CameraController } from '../domain/visual'
import type { Vec3, WorldBounds } from '../domain/world'
import type { PlaybackSnapshot } from './types'

export function CameraRig({ bounds, config, controller, fitRequest, follow, travel, followPosition, playback, onNavigate }: {
  bounds: WorldBounds; config: CameraConfig; controller: CameraController; fitRequest: number
  follow: boolean; followPosition: (time: number) => Vec3; playback: PlaybackSnapshot; onNavigate: () => void
  travel: boolean
}) {
  const { camera, size, gl } = useThree()
  const { width, height } = size
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const lastTarget = useRef<Vec3>({ x: 0, y: 0, z: 0 })
  const wasFollowing = useRef(false)
  useLayoutEffect(() => {
    const state = controller.getState(0, { bounds, config, aspect: width / height })
    const point = followPosition(playback.current.time)
    const offset = travel ? point.x - followPosition(0).x : 0
    state.position.x += offset
    state.target.x += offset
    camera.position.set(state.position.x, state.position.y, state.position.z)
    camera.lookAt(state.target.x, state.target.y, state.target.z)
    camera.near = state.near
    camera.far = state.far
    if (camera instanceof PerspectiveCamera) camera.fov = state.fov
    camera.updateProjectionMatrix()
    controls.current?.target.set(state.target.x, state.target.y, state.target.z)
    controls.current?.update()
    lastTarget.current = point
    wasFollowing.current = false
    // R3F can replace size on a UI repaint without changing its dimensions.
    // Depending on the object resets manual navigation every playback snapshot.
  }, [bounds, config, controller, camera, width, height, fitRequest, followPosition, playback, travel])
  useFrame(() => {
    const point = followPosition(playback.current.time)
    if (follow && controls.current) {
      const origin = !wasFollowing.current && !travel ? controls.current.target : lastTarget.current
      const dx = point.x - origin.x
      const dy = point.y - origin.y
      const dz = point.z - origin.z
      camera.position.x += dx; camera.position.y += dy; camera.position.z += dz
      controls.current.target.x += dx; controls.current.target.y += dy; controls.current.target.z += dz
      controls.current.update()
    }
    lastTarget.current = point
    wasFollowing.current = follow
  })
  return <OrbitControls
    ref={controls}
    domElement={gl.domElement}
    makeDefault
    onStart={onNavigate}
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
