import type { Vec3 } from '../domain/world'

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const mixVec = (a: Vec3, b: Vec3, t: number): Vec3 => ({
  x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t),
})

// Mulberry32: no global state; identical seeds always yield identical sequences.
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

// Index of the first item strictly after time. Arrays must be sorted by time.
export function upperBound<T>(items: readonly T[], time: number, key: (item: T) => number): number {
  let low = 0
  let high = items.length
  while (low < high) {
    const mid = (low + high) >>> 1
    if (key(items[mid]!) <= time) low = mid + 1
    else high = mid
  }
  return low
}
