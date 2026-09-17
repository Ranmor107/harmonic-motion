import type { EnvironmentConfig } from '../../domain/visual'

export const DefaultEnvironment: EnvironmentConfig = {
  type: 'gradient', top: '#10151d', bottom: '#172331',
  stars: { enabled: true, count: 280, seed: 108, color: '#b7c5d7', opacity: 0.25, size: 0.028 },
}
