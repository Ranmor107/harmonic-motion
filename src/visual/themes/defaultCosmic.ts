import type { VisualTheme } from '../../domain/visual'

export const DefaultCosmicTheme: VisualTheme = {
  id: 'cosmic', name: 'Default Cosmic',
  palette: { note: '#a6c6d3', chord: '#dfbb91', performer: '#fff4db', connection: '#9cabb8', muted: '#526172' },
  nodeStyle: { radius: 0.12, chordScale: 1.6, upcomingOpacity: 0.6, pastOpacity: 0.23, activeScale: 1.55 },
  connectionStyle: { opacity: 0.21, voiceOpacity: 0.1 },
  performerStyle: { radius: 0.24, shape: 'octahedron', haloScale: 2.5, haloOpacity: 0.08 },
  lighting: { ambient: 0.7, key: 1.4, color: '#e5eefa' },
}
