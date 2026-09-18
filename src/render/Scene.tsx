import { Component, type ReactNode, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr } from '@react-three/drei'
import type { WorldModel } from '../domain/world'
import type { PerformancePlan } from '../domain/performance'
import type { NormalizedScore } from '../domain/score'
import type { CameraController, ViewMode, VisibilityMode, VisualPreset } from '../domain/visual'
import type { PlaybackSnapshot } from './types'
import { WorldRenderer } from './WorldRenderer'
import { PerformerRenderer } from './PerformerRenderer'
import { EnvironmentRenderer } from './EnvironmentRenderer'
import { EffectsRenderer } from './EffectsRenderer'
import { CameraRig } from './CameraRig'
import { TrajectoryRenderer } from './TrajectoryRenderer'
import { StreamRenderer } from './StreamRenderer'
import { createMusicalPresentation, evaluateLead } from '../visual/presentation/musicalPresentation'
import { evaluatePerformer } from '../engine/choreography/evaluator'

const STREAM_BOUNDS = { min: { x: -5, y: -5, z: -2 }, max: { x: 11, y: 5, z: 2 } }

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <div className="scene-fallback">The 3D view could not start. Enable hardware acceleration and reload.</div> : this.props.children
  }
}

export function Scene({ score, world, plan, preset, playback, cameraController, viewMode, visibilityMode, fitRequest, follow, onNavigate }: {
  score: NormalizedScore; world: WorldModel; plan: PerformancePlan; preset: VisualPreset; playback: PlaybackSnapshot
  cameraController: CameraController; viewMode: ViewMode; visibilityMode: VisibilityMode; fitRequest: number
  follow: boolean; onNavigate: () => void
}) {
  const model = useMemo(() => createMusicalPresentation(score, preset.presentation), [score, preset.presentation])
  const followPosition = useMemo(() => viewMode === 'stream'
    ? (time: number) => ({ x: evaluateLead(model, time).x, y: 0, z: 0 })
    : (time: number) => plan.performers[0] ? evaluatePerformer(plan.performers[0], time) : { x: 0, y: 0, z: 0 }, [model, plan, viewMode])
  const environment = preset.environment
  const background = environment.type === 'solid' ? environment.color : `linear-gradient(160deg, ${environment.top}, ${environment.bottom})`
  const cameraConfig = useMemo(() => viewMode === 'stream'
    ? { ...preset.camera, direction: { x: 0, y: 0, z: 1 }, padding: 1.08 }
    : preset.camera, [preset.camera, viewMode])
  const cameraBounds = viewMode === 'stream' ? STREAM_BOUNDS : world.bounds
  return <div className="scene-canvas" style={{ background }} aria-label="Generated music constellation">
    <SceneBoundary>
      <Canvas dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }} fallback={<div className="scene-fallback">WebGL is unavailable. Enable hardware acceleration to see the world.</div>}>
        <AdaptiveDpr pixelated />
        <ambientLight intensity={preset.theme.lighting.ambient} />
        <directionalLight position={[10, 10, 10]} intensity={preset.theme.lighting.key} color={preset.theme.lighting.color} />
        <CameraRig bounds={cameraBounds} config={cameraConfig} controller={cameraController} fitRequest={fitRequest} follow={follow} travel={viewMode === 'stream'} followPosition={followPosition} playback={playback} onNavigate={onNavigate} />
        <EnvironmentRenderer config={environment} bounds={world.bounds} />
        {viewMode === 'constellation' ? <>
          <WorldRenderer world={world} score={score} model={model} theme={preset.theme} playback={playback} visibilityMode={visibilityMode} presentation={preset.presentation} />
          {plan.performers.map(performer => <group key={performer.id}>
            <TrajectoryRenderer performer={performer} theme={preset.theme} visibilityMode={visibilityMode} playback={playback} />
            <PerformerRenderer performer={performer} theme={preset.theme} effects={preset.effects} playback={playback} />
          </group>)}
          <EffectsRenderer world={world} plan={plan} effects={preset.effects} theme={preset.theme} playback={playback} />
        </> : <StreamRenderer model={model} theme={preset.theme} effects={preset.effects} presentation={preset.presentation} playback={playback} />}
      </Canvas>
    </SceneBoundary>
  </div>
}
