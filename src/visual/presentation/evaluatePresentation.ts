import type { PresentationConfig, VisibilityMode } from '../../domain/visual'
import type { MusicNode } from '../../domain/world'
import { nearestNodes } from './renderBudget'

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
  return new Set(nearestNodes(nodes, songTime, past, future, limit).map(node => node.id))
}
