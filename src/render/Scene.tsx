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
import { InkStreamRenderer } from './InkStreamRenderer'
import { EnsembleRenderer } from './EnsembleRenderer'
import { createEnsemblePresentation, ENSEMBLE_STAGE } from '../visual/presentation/ensemblePresentation'
import { createMusicalPresentation } from '../visual/presentation/musicalPresentation'
import { createInkPresentation } from '../visual/presentation/inkPresentation'
import { RIBBON_STAGE, streamCameraTarget } from '../visual/camera/streamCamera'
import { evaluatePerformer } from '../engine/choreography/evaluator'
import { RenderDiagnostics } from './RenderDiagnostics'

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <div className="scene-fallback">The 3D view could not start. Enable hardware acceleration and reload.</div> : this.props.children
  }
}

export function Scene({ score, world, plan, preset, playback, cameraController, viewMode, visibilityMode, fitRequest, follow, onNavigate, focusTrackId }: {
  score: NormalizedScore; world: WorldModel; plan: PerformancePlan; preset: VisualPreset; playback: PlaybackSnapshot
  cameraController: CameraController; viewMode: ViewMode; visibilityMode: VisibilityMode; fitRequest: number
  follow: boolean; onNavigate: () => void; focusTrackId?: string
}) {
  const ink = viewMode === 'stream' && preset.streamStyle === 'ink'
  const model = useMemo(() => createMusicalPresentation(score, preset.presentation, focusTrackId), [score, preset.presentation, focusTrackId])
  const ensemble = useMemo(() => viewMode === 'ensemble' ? createEnsemblePresentation(score, model) : undefined, [score, model, viewMode])
  const inkModel = useMemo(() => ink ? createInkPresentation(score, preset.presentation, focusTrackId) : undefined, [score, preset.presentation, focusTrackId, ink])
  const followPosition = useMemo(() => viewMode === 'stream'
    ? (time: number) => streamCameraTarget(model, time)
    : (time: number) => plan.performers[0] ? evaluatePerformer(plan.performers[0], time) : { x: 0, y: 0, z: 0 }, [model, plan, viewMode])
  const environment = preset.environment
  const background = environment.type === 'solid' ? environment.color : environment.type === 'image'
    ? `${environment.color} url("${environment.source}") center / cover no-repeat`
    : `linear-gradient(160deg, ${environment.top}, ${environment.bottom})`
  const stage = viewMode === 'ensemble' ? ENSEMBLE_STAGE : RIBBON_STAGE
  const cameraConfig = useMemo(() => viewMode !== 'constellation'
    ? { ...preset.camera, direction: stage.direction, padding: 1.08 }
    : preset.camera, [preset.camera, viewMode, stage])
  const cameraBounds = viewMode === 'ensemble' ? ensemble!.bounds : viewMode === 'stream' ? RIBBON_STAGE.bounds : world.bounds
  return <div className="scene-canvas" style={{ background }} aria-label={ink ? '水墨音乐舞台' : 'Generated music constellation'}>
    <SceneBoundary>
      <Canvas frameloop={ink ? 'never' : 'always'} style={{ visibility: ink ? 'hidden' : 'visible' }} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }} fallback={<div className="scene-fallback">WebGL is unavailable. Enable hardware acceleration to see the world.</div>}>
        <AdaptiveDpr pixelated />
        {import.meta.env.DEV && new URLSearchParams(window.location.search).has('benchmark') && <RenderDiagnostics />}
        <ambientLight intensity={preset.theme.lighting.ambient} />
        <directionalLight position={[10, 10, 10]} intensity={preset.theme.lighting.key} color={preset.theme.lighting.color} />
        <CameraRig bounds={cameraBounds} config={cameraConfig} controller={cameraController} fitRequest={fitRequest} follow={viewMode !== 'ensemble' && follow} travel={viewMode === 'stream'} followPosition={followPosition} playback={playback} onNavigate={onNavigate} />
        <EnvironmentRenderer config={environment} bounds={world.bounds} />
        {viewMode === 'constellation' ? <>
          <WorldRenderer world={world} score={score} model={model} theme={preset.theme} playback={playback} visibilityMode={visibilityMode} presentation={preset.presentation} focusTrackId={focusTrackId} />
          {plan.performers.map(performer => <group key={performer.id}>
            <TrajectoryRenderer performer={performer} theme={preset.theme} visibilityMode={visibilityMode} playback={playback} />
            <PerformerRenderer performer={performer} theme={preset.theme} effects={preset.effects} playback={playback} />
          </group>)}
          <EffectsRenderer world={world} plan={plan} effects={preset.effects} theme={preset.theme} playback={playback} />
        </> : viewMode === 'stream' ? <StreamRenderer model={model} theme={preset.theme} effects={preset.effects} presentation={preset.presentation} playback={playback} focusTrackId={focusTrackId} />
          : <EnsembleRenderer model={ensemble!} theme={preset.theme} effects={preset.effects} presentation={preset.presentation} playback={playback} focusTrackId={focusTrackId} />}
      </Canvas>
    </SceneBoundary>
    {ink && <InkStreamRenderer model={inkModel!} mode={preset.inkMode ?? 'drops'} playback={playback} effects={preset.effects.hit.enabled} />}
  </div>
}
