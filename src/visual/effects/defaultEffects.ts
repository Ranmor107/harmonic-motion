import type { EffectProfile } from '../../domain/visual'

export const DefaultEffects: EffectProfile = {
  id: 'soft', name: 'Soft response',
  hit: { enabled: true, lifetime: 0.65, radius: 0.18, expansion: 1.35, opacity: 0.55 },
  trail: { enabled: true, lifetime: 0.42, samples: 22, radius: 0.045, opacity: 0.38 },
  particles: { enabled: true, lifetime: 0.8, count: 10, radius: 0.025, distance: 1.1, opacity: 0.7 },
}
