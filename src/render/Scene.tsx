import { Component, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr } from '@react-three/drei'
import type { WorldModel } from '../domain/world'
import type { PerformancePlan } from '../domain/performance'
import type { CameraController, VisualPreset } from '../domain/visual'
import type { PlaybackSnapshot } from './types'
import { WorldRenderer } from './WorldRenderer'
import { PerformerRenderer } from './PerformerRenderer'
import { EnvironmentRenderer } from './EnvironmentRenderer'
import { EffectsRenderer } from './EffectsRenderer'
import { CameraRig } from './CameraRig'

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <div className="scene-fallback">The 3D view could not start. Enable hardware acceleration and reload.</div> : this.props.children
  }
}

export function Scene({ world, plan, preset, playback, cameraController }: {
  world: WorldModel; plan: PerformancePlan; preset: VisualPreset; playback: PlaybackSnapshot; cameraController: CameraController
}) {
  const environment = preset.environment
  const background = environment.type === 'solid' ? environment.color : `linear-gradient(160deg, ${environment.top}, ${environment.bottom})`
  return <div className="scene-canvas" style={{ background }} aria-label="Generated music constellation">
    <SceneBoundary>
      <Canvas dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }} fallback={<div className="scene-fallback">WebGL is unavailable. Enable hardware acceleration to see the world.</div>}>
        <AdaptiveDpr pixelated />
        <ambientLight intensity={preset.theme.lighting.ambient} />
        <directionalLight position={[10, 10, 10]} intensity={preset.theme.lighting.key} color={preset.theme.lighting.color} />
        <CameraRig bounds={world.bounds} config={preset.camera} controller={cameraController} />
        <EnvironmentRenderer config={environment} bounds={world.bounds} />
        <WorldRenderer world={world} theme={preset.theme} playback={playback} />
        {plan.performers.map(performer => <PerformerRenderer key={performer.id} performer={performer} theme={preset.theme} effects={preset.effects} playback={playback} />)}
        <EffectsRenderer world={world} plan={plan} effects={preset.effects} theme={preset.theme} playback={playback} />
      </Canvas>
    </SceneBoundary>
  </div>
}
