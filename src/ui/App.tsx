import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useStudio } from '../state/store'
import { PlaybackClock, type PlaybackState } from '../playback/clock'
import { PlaybackController } from '../playback/controller'
import { ToneAudioEngine, audioNow } from '../audio/ToneAudioEngine'
import { parseMidi, MIDI_LIMITS } from '../midi/parser'
import { Scene } from '../render/Scene'
import { StaticCamera } from '../visual/camera/staticCamera'
import { Icon } from './Icons'
import { upperBound } from '../utils/math'
import { branding } from '../branding/config'

const timeLabel = (time: number) => `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(Math.floor(time % 60)).padStart(2, '0')}`
const pitchLabel = (midi: number) => `${['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][midi % 12]}${Math.floor(midi / 12) - 1}`

export function App() {
  const {
    compiled, preset, viewMode, visibilityMode, sessions, activeSessionId,
    addScores, selectSession, removeSession, regenerate, setPreset, setViewMode, setVisibilityMode,
  } = useStudio()
  const { score, world, plan } = compiled
  const [controller] = useState(() => {
    const clock = new PlaybackClock(0, audioNow)
    return new PlaybackController(clock, new ToneAudioEngine(clock))
  })
  const [playback, setPlayback] = useState<PlaybackState>({ status: 'stopped', time: 0, duration: score.duration })
  const snapshot = useRef(playback)
  const input = useRef<HTMLInputElement>(null)
  const drawerTrigger = useRef<HTMLButtonElement>(null)
  const drawerClose = useRef<HTMLButtonElement>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [starting, setStarting] = useState(false)
  const [fitRequest, setFitRequest] = useState(0)
  const [followViews, setFollowViews] = useState({ constellation: false, stream: true })
  const importRevision = useRef(0)
  const noteById = useMemo(() => new Map(score.notes.map(note => [note.id, note])), [score])
  const follow = followViews[viewMode]
  const setFollow = (value: boolean) => setFollowViews(current => ({ ...current, [viewMode]: value }))

  useEffect(() => {
    document.title = `${branding.name} — ${branding.descriptor}`
  }, [])

  useEffect(() => {
    void controller.load(score).catch(cause => setError(String(cause)))
  }, [controller, score])

  useEffect(() => {
    let frame: number
    let lastPaint = 0
    const tick = (timestamp: number) => {
      snapshot.current = controller.clock.getState()
      if (timestamp - lastPaint > 32) { setPlayback(snapshot.current); lastPaint = timestamp }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frame); controller.dispose() }
  }, [controller])

  useEffect(() => {
    if (!drawerOpen) return
    drawerClose.current?.focus({ preventScroll: true })
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setDrawerOpen(false); drawerTrigger.current?.focus() }
    }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [drawerOpen])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (media.matches) {
      const current = useStudio.getState().preset
      setPreset({ ...current, effects: { ...current.effects, hit: { ...current.effects.hit, enabled: false }, trail: { ...current.effects.trail, enabled: false }, particles: { ...current.effects.particles, enabled: false } } })
    }
  }, [setPreset])

  const stopForSwitch = () => {
    controller.stop()
    snapshot.current = controller.clock.getState()
    setPlayback(snapshot.current)
  }
  const switchScore = (id: string) => {
    if (id === activeSessionId) return
    stopForSwitch()
    selectSession(id)
    setError('')
  }
  const deleteScore = (id: string) => {
    if (id === activeSessionId) stopForSwitch()
    removeSession(id)
  }
  const togglePlayback = async () => {
    setError('')
    if (controller.clock.getState().status === 'playing') { controller.pause(); return }
    setStarting(true)
    try { await controller.play() } catch { setError('Audio could not start. Check your browser audio settings and press Play again.') }
    finally { setStarting(false) }
  }

  const onLoad = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return
    const revision = ++importRevision.current
    setBusy(true)
    setError('')
    const imported = []
    const failures: string[] = []
    for (const file of files) {
      try {
        if (file.size > MIDI_LIMITS.bytes) throw new Error('Choose a MIDI file smaller than 10 MB.')
        imported.push({ score: parseMidi(await file.arrayBuffer(), file.name), filename: file.name })
      } catch (cause) { failures.push(`${file.name}: ${cause instanceof Error ? cause.message : 'Could not read this file.'}`) }
    }
    if (revision !== importRevision.current) return
    try {
      if (imported.length) { stopForSwitch(); addScores(imported) }
      setError(failures.join(' · '))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not prepare this score.') }
    finally { setBusy(false) }
  }

  const toggleEffects = () => {
    const enabled = !preset.effects.hit.enabled
    setPreset({ ...preset, effects: {
      ...preset.effects, hit: { ...preset.effects.hit, enabled },
      trail: { ...preset.effects.trail, enabled }, particles: { ...preset.effects.particles, enabled },
    } })
  }
  const fit = () => {
    setFollow(viewMode === 'stream')
    setFitRequest(value => value + 1)
  }
  const eventIndex = upperBound(plan.events, playback.time, event => event.time) - 1
  const current = plan.events[eventIndex]
  const noteIds = current ? current.type === 'chord-hit' ? current.noteIds : [current.noteId] : []
  const pitches = noteIds.map(id => noteById.get(id)).filter(note => note !== undefined)
  const sounding = pitches.filter(note => playback.time < note.startTime + note.duration)
  const playing = playback.status === 'playing'
  const progress = score.duration ? playback.time / score.duration * 100 : 0
  const tempos = score.metadata.tempoMap?.map(tempo => tempo.bpm) ?? (score.bpm ? [score.bpm] : [])
  const tempoMin = tempos.length ? Math.round(Math.min(...tempos)) : undefined
  const tempoMax = tempos.length ? Math.round(Math.max(...tempos)) : undefined
  const sessionIndex = sessions.findIndex(session => session.id === activeSessionId)

  return <main className="studio">
    <header className="topbar">
      <a className="brand" href="./" aria-label={`${branding.name} home`}>
        <svg className="brand-motif" viewBox="0 0 62 36" aria-hidden="true">
          <path d="M1 12h60M1 20h60M1 28h60" />
          <path className="motif-slur" d="M8 22Q29 -3 53 13" />
          <ellipse cx="12" cy="24" rx="4.5" ry="3" transform="rotate(-24 12 24)" />
          <ellipse cx="48" cy="16" rx="4.5" ry="3" transform="rotate(-24 48 16)" />
          <path className="motif-stem" d="M16 23V7M52 15V3" />
        </svg>
        <span>{branding.name}</span>
      </a>
      <span className="brand-descriptor">{branding.descriptor}</span>
      <span className={`status ${playing ? 'is-playing' : ''}`}><i />{playing ? 'Performing' : playback.status === 'ended' ? 'Complete' : playback.status === 'paused' ? 'Paused' : 'Ready'}</span>
      <button ref={drawerTrigger} className="drawer-trigger" aria-controls="controls-drawer" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(open => !open)}>View <span aria-hidden="true">☷</span></button>
    </header>

    <section className="world-stage" aria-label="Music world">
      <Scene score={score} world={world} plan={plan} preset={preset} playback={snapshot} cameraController={StaticCamera} viewMode={viewMode} visibilityMode={visibilityMode} fitRequest={fitRequest} follow={follow} onNavigate={() => setFollow(false)} />
      <div className="score-card">
        <p className="eyebrow">Opus {String(sessionIndex + 1).padStart(2, '0')} / {score.metadata.source === 'demo' ? 'Original study' : 'Local score'}</p>
        <h1>{score.metadata.title}</h1>
        <dl className="artwork-data">
          <div><dt>Duration</dt><dd>{timeLabel(score.duration)}</dd></div>
          <div><dt>Tracks</dt><dd>{score.tracks.length}</dd></div>
          <div><dt>Notes</dt><dd>{score.notes.length}</dd></div>
          <div><dt>Chords</dt><dd>{score.chords.length}</dd></div>
          {tempoMin !== undefined && <div className="tempo"><dt>Tempo</dt><dd>{tempoMin === tempoMax ? tempoMin : `${tempoMin}–${tempoMax}`} <small>BPM</small></dd></div>}
        </dl>
      </div>
      <blockquote className="score-quote"><p>“{branding.quote.text}”</p><cite><a href={branding.quote.source} target="_blank" rel="noreferrer">{branding.quote.author}</a></cite></blockquote>
      <div className="live-reading" aria-label="Current music">
        <span className="eyebrow">{viewMode} / {viewMode === 'stream' ? preset.presentation.stream.shape : visibilityMode}</span>
        <span className={`pitch-reading ${sounding.length ? 'sounding' : ''}`}>{pitches.length ? pitches.map(note => pitchLabel(note.midi)).join(' · ') : '—'}</span>
        <div className="legend"><span><i className="lead-dot" />Lead</span><span><i className="voice-dot" />Voices</span><span><i className="performer-dot" />Performer</span></div>
      </div>
      <span className="navigation-hint">Scroll to zoom · drag to explore</span>
    </section>

    <aside id="controls-drawer" className={`controls-drawer ${drawerOpen ? 'is-open' : ''}`} aria-label="View and library" aria-hidden={!drawerOpen} inert={!drawerOpen}>
      <div className="drawer-heading"><span>Score settings</span><button ref={drawerClose} aria-label="Close controls" onClick={() => { setDrawerOpen(false); drawerTrigger.current?.focus() }}>×</button></div>
      <section className="control-section"><h2>View</h2><div className="segmented">
        {(['constellation', 'stream'] as const).map(mode => <button key={mode} aria-pressed={viewMode === mode} onClick={() => setViewMode(mode)}>{mode === 'constellation' ? 'Constellation' : 'Stream'}</button>)}
      </div>
      {viewMode === 'stream' && <div className="segmented shape-options">{(['ribbon', 'helix'] as const).map(shape => <button key={shape} aria-pressed={preset.presentation.stream.shape === shape} onClick={() => setPreset({ ...preset, presentation: { ...preset.presentation, stream: { ...preset.presentation.stream, shape } } })}>{shape === 'ribbon' ? 'Ribbon' : 'Helix'}</button>)}</div>}
      </section>
      <section className="control-section"><h2>Visibility</h2><div className="segmented">
        {(['overview', 'focus', 'path'] as const).map(mode => <button key={mode} aria-pressed={visibilityMode === mode} onClick={() => setVisibilityMode(mode)} disabled={viewMode === 'stream'}>{mode === 'path' ? 'Current path' : mode[0]!.toUpperCase() + mode.slice(1)}</button>)}
      </div>{viewMode === 'stream' && <p className="control-note">A moving window around the performance.</p>}</section>
      <section className="control-section"><h2>Camera</h2><div className="camera-actions">
        <button onClick={fit}><Icon name="fit" />Fit {viewMode === 'stream' ? 'stage' : 'world'}</button>
        <button onClick={() => { setFollow(false); setFitRequest(value => value + 1) }}>Reset</button>
      </div><button className="setting-toggle" onClick={() => { setFollow(!follow); if (!follow) setFitRequest(value => value + 1) }} aria-pressed={follow}>Follow performer <span>{follow ? 'On' : 'Off'}</span></button></section>
      <section className="control-section"><h2>Visual</h2><button className="setting-toggle" onClick={toggleEffects} aria-pressed={preset.effects.hit.enabled}>Performance effects <span>{preset.effects.hit.enabled ? 'On' : 'Off'}</span></button><button className="quiet-action" onClick={regenerate} disabled={busy}><Icon name="regenerate" />Regenerate constellation</button></section>
      <section className="control-section library"><div className="library-heading"><h2>Library <span>{sessions.length}</span></h2><button onClick={() => input.current?.click()} disabled={busy}>+ Add</button></div>
        <p className="control-note">Local scores · kept for this session</p>
        <ol>{sessions.map((session, index) => <li key={session.id} className={session.id === activeSessionId ? 'is-current' : ''}>
          <button className="score-select" aria-current={session.id === activeSessionId ? 'true' : undefined} onClick={() => switchScore(session.id)} disabled={busy || starting} title={session.filename}><span className="score-number">{String(index + 1).padStart(2, '0')}</span><span className="score-name">{session.compiled.score.metadata.title}<small>{timeLabel(session.compiled.score.duration)} · {session.compiled.score.tracks.length} tracks</small></span></button>
          <button className="score-remove" aria-label={`Remove ${session.compiled.score.metadata.title}`} onClick={() => deleteScore(session.id)} disabled={busy || starting || (sessions.length === 1 && session.id === 'score-0')}>×</button>
        </li>)}</ol>
      </section>
    </aside>

    <footer className="transport">
      <div className="transport-primary">
        <button className="play-button" onClick={() => void togglePlayback()} disabled={busy || starting} aria-label={playing ? 'Pause' : 'Play'}><Icon name={playing ? 'pause' : 'play'} /></button>
        <button className="track-step" aria-label="Previous score" disabled={sessionIndex <= 0 || busy || starting} onClick={() => switchScore(sessions[sessionIndex - 1]!.id)}>‹</button>
        <button className="track-step" aria-label="Next score" disabled={sessionIndex >= sessions.length - 1 || busy || starting} onClick={() => switchScore(sessions[sessionIndex + 1]!.id)}>›</button>
        <span className="time current-time">{timeLabel(playback.time)}</span>
        <div className="timeline-wrap">
          <input className="timeline" type="range" aria-label="Song position" min={0} max={score.duration} step={0.001} value={playback.time} style={{ background: `linear-gradient(to right, var(--brass) ${progress}%, var(--line) ${progress}%)` }} onChange={event => {
            controller.seek(Number(event.target.value))
            snapshot.current = controller.clock.getState()
            setPlayback(snapshot.current)
          }} aria-valuetext={`${playback.time.toFixed(2)} seconds of ${score.duration.toFixed(2)}`} />
          <div className="timeline-ticks" aria-hidden="true">{[0, 0.25, 0.5, 0.75, 1].map(fraction => <span key={fraction} style={{ left: `${fraction * 100}%` }}>{timeLabel(fraction * score.duration)}</span>)}</div>
        </div>
        <span className="time total-time">{timeLabel(score.duration)}</span>
        <button className="restart-button" aria-label="Restart" onClick={() => { setError(''); void controller.restart().catch(() => setError('Audio could not start. Press Play to try again.')) }} disabled={busy || starting}><Icon name="restart" /></button>
        <button className="import-button" aria-label="Add MIDI" onClick={() => input.current?.click()} disabled={busy}><Icon name="upload" /><span>{busy ? 'Reading…' : 'Add MIDI'}</span></button>
        <input ref={input} type="file" multiple accept=".mid,.midi,audio/midi,audio/x-midi" hidden onChange={event => void onLoad(event)} />
      </div>
      {error && <div className="error-message" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
    </footer>
  </main>
}
