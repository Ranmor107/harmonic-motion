import type { MusicNode, WorldModel } from '../../domain/world'
import type { PresentationConfig, VisibilityMode } from '../../domain/visual'
import { clamp, upperBound } from '../../utils/math'

export const RENDER_BUDGET = { overviewNear: 640, overviewFar: 220, chordMembers: 160, ghostPoints: 96 }

export function complexityPolicy(count: number, detail: number) {
  const near = clamp(detail, 0, 1)
  return {
    overviewNodes: Math.round(RENDER_BUDGET.overviewFar + near * (RENDER_BUDGET.overviewNear - RENDER_BUDGET.overviewFar)),
    secondary: count < 160 ? 1 : 0.25 + near * 0.75,
    hitBudget: count < 160 ? 32 : Math.round(8 + near * 8),
  }
}

// Input is a display-owned time index. Walk out from time, never sort the whole score per frame.
export function nearestNodes(nodes: readonly MusicNode[], time: number, past: number, future: number, limit: number) {
  let right = upperBound(nodes, time, node => node.time)
  let left = right - 1
  const selected: MusicNode[] = []
  while (selected.length < limit && (left >= 0 || right < nodes.length)) {
    const a = left >= 0 && nodes[left]!.time >= time - past ? nodes[left] : undefined
    const b = right < nodes.length && nodes[right]!.time <= time + future ? nodes[right] : undefined
    if (!a && !b) break
    if (a && (!b || time - a.time <= b.time - time)) { selected.push(a); left-- }
    else if (b) { selected.push(b); right++ }
  }
  return selected
}

export function createDisplayIndex(world: WorldModel) {
  const nodes = [...world.nodes].sort((a, b) => a.time - b.time || a.id.localeCompare(b.id))
  const cells = new Map<string, number>()
  const cell = (node: MusicNode) => [Math.floor(node.position.x / 2), Math.floor(node.position.y / 2), Math.floor(node.position.z / 2)]
  for (const node of nodes) { const key = cell(node).join(':'); cells.set(key, (cells.get(key) ?? 0) + 1) }
  const density = new Map<string, number>()
  for (const node of nodes) {
    const [x, y, z] = cell(node) as [number, number, number]
    let neighbors = 0
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      neighbors += cells.get(`${x + dx}:${y + dy}:${z + dz}`) ?? 0
    }
    density.set(node.id, clamp((neighbors - 10) / 65, 0, 1))
  }
  return { nodes, density }
}

export function selectDisplayNodes(index: ReturnType<typeof createDisplayIndex>, time: number, mode: VisibilityMode,
  config: PresentationConfig['visibility'], detail: number) {
  const local = nearestNodes(index.nodes, time, mode === 'path' ? config.activePast : config.contextPast,
    mode === 'path' ? config.activeFuture : config.contextFuture, mode === 'path' ? config.pathMaxNodes : config.focusMaxNodes)
  if (mode !== 'overview') return local
  const limit = complexityPolicy(index.nodes.length, detail).overviewNodes
  if (index.nodes.length <= limit) return index.nodes
  // Uniform temporal landmarks preserve the entire piece; local detail is reserved first.
  const chosen = new Map(local.map(node => [node.id, node]))
  const remaining = limit - chosen.size
  for (let i = 0; i < remaining; i++) {
    const node = index.nodes[Math.round(i * (index.nodes.length - 1) / Math.max(1, remaining - 1))]!
    chosen.set(node.id, node)
  }
  return [...chosen.values()]
}
