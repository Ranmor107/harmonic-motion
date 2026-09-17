export interface Vec3 { x: number; y: number; z: number }

export interface MusicNode {
  id: string
  noteIds: string[]
  time: number
  duration: number
  position: Vec3
  strength: number
  layerIds: string[]
  kind: 'note' | 'chord' | 'anchor' | 'rest'
}

export interface MusicConnection {
  id: string
  fromNodeId: string
  toNodeId: string
  kind: 'sequence' | 'voice'
}

export interface WorldLayer { id: string; trackIds: string[] }
export interface WorldBounds { min: Vec3; max: Vec3 }
export interface WorldModel {
  nodes: MusicNode[]
  connections: MusicConnection[]
  layers: WorldLayer[]
  bounds: WorldBounds
  metadata: { seed: number; strategyId: string }
}
