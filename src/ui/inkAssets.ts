import { inkEnvironment } from '../visual/presets/inkStream'

let prepared: Promise<void> | undefined

export function prepareInkAssets(): Promise<void> {
  if (!prepared) prepared = new Promise<void>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Ink background could not load. Select Ink to retry.'))
    image.src = inkEnvironment.source
  }).catch(error => { prepared = undefined; throw error })
  return prepared
}
