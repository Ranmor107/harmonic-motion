import type { PresentationConfig, VisibilityMode } from '../../domain/visual'
import type { MusicNode } from '../../domain/world'

export interface NodePresentation {
  visible: boolean
  opacity: number
  emphasis: 'active' | 'context' | 'far'
}

export function evaluateNodePresentation(
  node: MusicNode,
  songTime: number,
  mode: VisibilityMode,
  config: PresentationConfig['visibility'],
): NodePresentation {
  if (mode === 'overview') return { visible: true, opacity: 1, emphasis: 'context' }
  const delta = node.time - songTime
  if (delta >= -config.activePast && delta <= config.activeFuture) {
    return { visible: true, opacity: 1, emphasis: 'active' }
  }
  if (mode === 'focus' && delta >= -config.contextPast && delta <= config.contextFuture) {
    return { visible: true, opacity: config.contextOpacity, emphasis: 'context' }
  }
  return { visible: mode === 'focus' && config.farOpacity > 0, opacity: config.farOpacity, emphasis: 'far' }
}

export function selectReadableNodeIds(
  nodes: MusicNode[],
  songTime: number,
  mode: VisibilityMode,
  config: PresentationConfig['visibility'],
): Set<string> | undefined {
  if (mode === 'overview') return undefined
  const past = mode === 'path' ? config.activePast : config.contextPast
  const future = mode === 'path' ? config.activeFuture : config.contextFuture
  const limit = mode === 'path' ? config.pathMaxNodes : config.focusMaxNodes
  return new Set(nodes
    .filter(node => node.time - songTime >= -past && node.time - songTime <= future)
    .sort((a, b) => Math.abs(a.time - songTime) - Math.abs(b.time - songTime) || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map(node => node.id))
}
