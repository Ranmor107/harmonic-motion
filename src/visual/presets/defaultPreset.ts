import type { VisualPreset } from '../../domain/visual'
import { DefaultCosmicTheme } from '../themes/defaultCosmic'
import { DefaultEffects } from '../effects/defaultEffects'
import { DefaultEnvironment } from '../environments/defaultEnvironment'
import { DefaultCamera } from '../camera/staticCamera'

export const DefaultPreset: VisualPreset = {
  id: 'default', name: 'Default Cosmic',
  theme: DefaultCosmicTheme, effects: DefaultEffects, environment: DefaultEnvironment, camera: DefaultCamera,
}
