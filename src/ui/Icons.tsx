export function Icon({ name }: { name: 'play' | 'pause' | 'restart' | 'upload' | 'regenerate' | 'fit' | 'volume' | 'muted' }) {
  const paths = {
    play: 'm8 5 11 7-11 7Z',
    pause: 'M8 5v14M16 5v14',
    restart: 'M3 10a9 9 0 1 1 2 8M3 4v6h6',
    upload: 'M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6',
    regenerate: 'M20 7h-5l5-5v5a9 9 0 0 0-15 1M4 17h5l-5 5v-5a9 9 0 0 0 15-1',
    fit: 'M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5',
    volume: 'M3 9h4l5-4v14l-5-4H3V9m12-1c2 2 2 6 0 8m3-11c4 4 4 10 0 14',
    muted: 'M3 9h4l5-4v14l-5-4H3V9m13 1 5 5m0-5-5 5',
  }
  return <svg width="18" height="18" viewBox="0 0 24 24" fill={name === 'play' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
