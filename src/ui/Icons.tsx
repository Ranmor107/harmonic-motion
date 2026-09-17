export function Icon({ name }: { name: 'play' | 'pause' | 'restart' | 'upload' | 'regenerate' | 'fit' }) {
  const paths = {
    play: 'm8 5 11 7-11 7Z',
    pause: 'M8 5v14M16 5v14',
    restart: 'M3 10a9 9 0 1 1 2 8M3 4v6h6',
    upload: 'M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6',
    regenerate: 'M20 7h-5l5-5v5a9 9 0 0 0-15 1M4 17h5l-5 5v-5a9 9 0 0 0 15-1',
    fit: 'M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5',
  }
  return <svg width="18" height="18" viewBox="0 0 24 24" fill={name === 'play' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
