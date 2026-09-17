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

const timeLabel = (time: number) => `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(Math.floor(time % 60)).padStart(2, '0')}`
const pitchLabel = (midi: number) => `${['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][midi % 12]}${Math.floor(midi / 12) - 1}`

export function App() {
  const {
    compiled, seed, preset, viewMode, visibilityMode,
    setScore, regenerate, setPreset, setViewMode, setVisibilityMode,
  } = useStudio()
  const { score, world, plan } = compiled
  const [controller] = useState(() => {
    const clock = new PlaybackClock(0, audioNow)
    return new PlaybackController(clock, new ToneAudioEngine(clock))
  })
  const [playback, setPlayback] = useState<PlaybackState>({ status: 'stopped', time: 0, duration: score.duration })
  const snapshot = useRef(playback)
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [starting, setStarting] = useState(false)
  const [fitRequest, setFitRequest] = useState(0)
  const importRevision = useRef(0)
  const noteById = useMemo(() => new Map(score.notes.map(note => [note.id, note])), [score])

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
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (media.matches) {
      const current = useStudio.getState().preset
      setPreset({ ...current, effects: { ...current.effects, hit: { ...current.effects.hit, enabled: false }, trail: { ...current.effects.trail, enabled: false }, particles: { ...current.effects.particles, enabled: false } } })
    }
  }, [setPreset])

  const togglePlayback = async () => {
    setError('')
    if (controller.clock.getState().status === 'playing') { controller.pause(); return }
    setStarting(true)
    try { await controller.play() } catch { setError('Audio could not start. Check your browser audio settings and press Play again.') }
    finally { setStarting(false) }
  }

  const onLoad = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const revision = ++importRevision.current
    setBusy(true)
    setError('')
    try {
      if (file.size > MIDI_LIMITS.bytes) throw new Error('Choose a MIDI file smaller than 10 MB.')
      const parsed = parseMidi(await file.arrayBuffer(), file.name)
      if (revision === importRevision.current) { controller.stop(); setScore(parsed) }
    } catch (cause) { if (revision === importRevision.current) setError(cause instanceof Error ? cause.message : 'Could not read this file.') }
    finally { if (revision === importRevision.current) setBusy(false) }
  }

  const toggleEffects = () => {
    const enabled = !preset.effects.hit.enabled
    setPreset({ ...preset, effects: {
      ...preset.effects, hit: { ...preset.effects.hit, enabled },
      trail: { ...preset.effects.trail, enabled }, particles: { ...preset.effects.particles, enabled },
    } })
  }

  const eventIndex = upperBound(plan.events, playback.time, event => event.time) - 1
  const current = plan.events[eventIndex]
  const noteIds = current ? current.type === 'chord-hit' ? current.noteIds : [current.noteId] : []
  const pitches = noteIds.map(id => noteById.get(id)).filter(note => note !== undefined)
  const sounding = pitches.filter(note => playback.time < note.startTime + note.duration)
  const activeTrack = sounding[0] ? score.tracks.find(track => track.id === sounding[0]!.trackId) : undefined
  const playing = playback.status === 'playing'
  const progress = score.duration ? playback.time / score.duration * 100 : 0
  const bpm = score.bpm ?? score.metadata.tempoMap?.[0]?.bpm

  return <main className="studio">
    <header className="topbar">
      <a className="brand" href="./" aria-label="Harmonic Motion home">
        <svg className="brand-motif" viewBox="0 0 52 28" aria-hidden="true"><path d="M2 7h48M2 14h48M2 21h48" /><circle cx="13" cy="14" r="3.4" /><circle cx="28" cy="7" r="2.5" /><circle cx="41" cy="21" r="3" /><path className="motif-link" d="M13 14 28 7l13 14" /></svg>
        <span>Harmonic <em>Motion</em></span>
      </a>
      <span className="topbar-note">Scores, performed as spatial studies</span>
      <span className={`status ${playing ? 'is-playing' : ''}`}><i />{playing ? 'Performing' : playback.status === 'ended' ? 'Complete' : playback.status === 'paused' ? 'Paused' : 'Ready to play'}</span>
    </header>

    <section className="world-stage" aria-label="Music world">
      <Scene score={score} world={world} plan={plan} preset={preset} playback={snapshot} cameraController={StaticCamera} viewMode={viewMode} visibilityMode={visibilityMode} fitRequest={fitRequest} />
      <div className="score-card">
        <p className="eyebrow">Music artwork · {score.metadata.source === 'demo' ? 'Original study' : 'Local MIDI'}</p>
        <h1>{score.metadata.title}</h1>
        <p className="score-source">{viewMode === 'constellation' ? 'A score arranged as a navigable constellation' : 'A local performance moving through musical time'}</p>
        <dl className="artwork-data">
          <div><dt>Duration</dt><dd>{timeLabel(score.duration)}</dd></div>
          <div><dt>Tracks</dt><dd>{score.tracks.length}</dd></div>
          <div><dt>Notes</dt><dd>{score.notes.length}</dd></div>
          <div><dt>Chords</dt><dd>{score.chords.length}</dd></div>
          {bpm && <div><dt>Tempo</dt><dd>{Math.round(bpm)} BPM</dd></div>}
        </dl>
      </div>
      <div className="live-reading" aria-label="Current music">
        <span className="eyebrow">Now · {current?.type === 'chord-hit' ? 'Chord' : 'Note'}</span>
        <span className={`pitch-reading ${sounding.length ? 'sounding' : ''}`}>{pitches.length ? pitches.map(note => pitchLabel(note.midi)).join(' · ') : '—'}</span>
        <span className="voice-reading">{activeTrack?.name || (activeTrack ? `Voice ${score.tracks.indexOf(activeTrack) + 1}` : 'Waiting for the next onset')}</span>
      </div>
      <div className="view-controls" aria-label="View controls">
        <div className="control-group"><span>View</span><div className="segmented">
          {(['constellation', 'stream'] as const).map(mode => <button key={mode} className={viewMode === mode ? 'selected' : ''} onClick={() => setViewMode(mode)}>{mode === 'constellation' ? 'Constellation' : 'Stream'}</button>)}
        </div></div>
        <div className="control-group"><span>Visibility</span><div className="segmented">
          {(['overview', 'focus', 'path'] as const).map(mode => <button key={mode} className={visibilityMode === mode ? 'selected' : ''} onClick={() => setVisibilityMode(mode)} disabled={viewMode === 'stream'}>{mode === 'path' ? 'Current path' : mode[0]!.toUpperCase() + mode.slice(1)}</button>)}
        </div></div>
        <button className="fit-button" onClick={() => setFitRequest(value => value + 1)}><Icon name="fit" />Fit world</button>
      </div>
      <div className="scene-footer">
        <div className="legend"><span><i className="note-dot" />Note</span><span><i className="chord-dot" />Chord</span><span><i className="performer-dot" />Main performer</span></div>
        <span className="world-detail">{viewMode === 'stream' ? 'Local time window' : `${world.nodes.length} world nodes`} <span>·</span> {world.layers.length} {world.layers.length === 1 ? 'voice' : 'voices'} <span>·</span> Seed {String(seed).padStart(3, '0')}</span>
      </div>
    </section>

    <footer className="transport">
      <div className="transport-primary">
        <button className="play-button" onClick={() => void togglePlayback()} disabled={busy || starting} aria-label={playing ? 'Pause' : 'Play'}>
          <Icon name={playing ? 'pause' : 'play'} /><span>{starting ? 'Starting' : playing ? 'Pause' : 'Play'}</span>
        </button>
        <span className="time current-time">{timeLabel(playback.time)}</span>
        <div className="timeline-wrap">
          <div className="onset-marks" aria-hidden="true">{plan.events.length < 200 && plan.events.map(event => <i key={event.id} className={event.type === 'chord-hit' ? 'chord-mark' : ''} style={{ left: `${event.time / score.duration * 100}%` }} />)}</div>
          <input className="timeline" type="range" aria-label="Song position" min={0} max={score.duration} step={0.001} value={playback.time} style={{ background: `linear-gradient(to right, var(--sand) ${progress}%, var(--line) ${progress}%)` }} onChange={event => {
            controller.seek(Number(event.target.value))
            snapshot.current = controller.clock.getState()
            setPlayback(snapshot.current)
          }} aria-valuetext={`${playback.time.toFixed(2)} seconds of ${score.duration.toFixed(2)}`} />
        </div>
        <span className="time total-time">{timeLabel(score.duration)}</span>
      </div>
      <div className="transport-secondary">
        <div className="actions">
          <input ref={input} type="file" accept=".mid,.midi,audio/midi,audio/x-midi" hidden onChange={event => void onLoad(event)} />
          <button onClick={() => input.current?.click()} disabled={busy}><Icon name="upload" />{busy ? 'Reading MIDI…' : 'Load MIDI'}</button>
          <button onClick={() => { setError(''); void controller.restart().catch(() => setError('Audio could not start. Press Play to try again.')) }} disabled={busy || starting}><Icon name="restart" />Restart</button>
          <button onClick={regenerate} disabled={busy}><Icon name="regenerate" />Regenerate</button>
        </div>
        <button className="effects-toggle" onClick={toggleEffects} aria-pressed={preset.effects.hit.enabled}><span className={`toggle-dot ${preset.effects.hit.enabled ? 'on' : ''}`} />Effects {preset.effects.hit.enabled ? 'on' : 'off'}</button>
      </div>
      <div className="transport-note"><span>Scroll to zoom · drag to pan · all views follow authoritative song time</span><span>Read the score in motion.</span></div>
      {error && <div className="error-message" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
    </footer>
  </main>
}
