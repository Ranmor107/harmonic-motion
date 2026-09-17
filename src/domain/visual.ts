import type { Vec3, WorldBounds } from './world'

export interface VisualTheme {
  id: string
  name: string
  palette: { note: string; chord: string; performer: string; connection: string; muted: string }
  nodeStyle: { radius: number; chordScale: number; upcomingOpacity: number; pastOpacity: number; activeScale: number }
  connectionStyle: { opacity: number; voiceOpacity: number }
  performerStyle: { radius: number; shape: 'octahedron' | 'sphere'; haloScale: number; haloOpacity: number }
  lighting: { ambient: number; key: number; color: string }
}

export interface EffectProfile {
  id: string
  name: string
  hit: { enabled: boolean; lifetime: number; radius: number; expansion: number; opacity: number }
  trail: { enabled: boolean; lifetime: number; samples: number; radius: number; opacity: number }
  particles: { enabled: boolean; lifetime: number; count: number; radius: number; distance: number; opacity: number }
}

export type EnvironmentConfig =
  | { type: 'solid'; color: string }
  | { type: 'gradient'; top: string; bottom: string; stars: { enabled: boolean; count: number; seed: number; color: string; opacity: number; size: number } }

export interface CameraConfig { type: 'static'; fov: number; padding: number; direction: Vec3 }
export interface CameraState { position: Vec3; target: Vec3; fov: number; near: number; far: number }
export interface CameraContext { bounds: WorldBounds; aspect: number; config: CameraConfig }
export interface CameraController { getState(time: number, context: CameraContext): CameraState }

export interface VisualPreset {
  id: string
  name: string
  theme: VisualTheme
  effects: EffectProfile
  environment: EnvironmentConfig
  camera: CameraConfig
}
