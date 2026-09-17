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
  const { compiled, seed, preset, setScore, regenerate, setPreset } = useStudio()
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
  const playing = playback.status === 'playing'
  const progress = score.duration ? playback.time / score.duration * 100 : 0

  return <main className="studio">
    <header className="topbar">
      <a className="brand" href="./" aria-label="Harmonic Motion home"><img src="/mark.svg" alt="" /><span>Harmonic <em>Motion</em></span></a>
      <span className="topbar-note">A score-to-world engine</span>
      <span className={`status ${playing ? 'is-playing' : ''}`}><i />{playing ? 'Performing' : playback.status === 'ended' ? 'Complete' : playback.status === 'paused' ? 'Paused' : 'Ready to play'}</span>
    </header>

    <section className="world-stage" aria-label="Music world">
      <Scene world={world} plan={plan} preset={preset} playback={snapshot} cameraController={StaticCamera} />
      <div className="scene-caption">
        <p className="eyebrow">Musical constellation</p>
        <h1>{score.metadata.title}</h1>
        <p className="score-source">{score.metadata.source === 'demo' ? 'An original study in C major' : 'Your MIDI, in musical space'}</p>
      </div>
      <div className="scene-reading" aria-label="Current notes">
        <span className="eyebrow">{current?.type === 'chord-hit' ? 'Chord' : 'Note'}</span>
        <span className={`pitch-reading ${sounding.length ? 'sounding' : ''}`}>{pitches.length ? pitches.map(note => pitchLabel(note.midi)).join(' · ') : '—'}</span>
      </div>
      <div className="scene-footer">
        <div className="legend"><span><i className="note-dot" />Note</span><span><i className="chord-dot" />Chord</span><span><i className="performer-dot" />Performer</span></div>
        <span className="world-detail">{world.nodes.length} nodes <span>·</span> {world.layers.length} {world.layers.length === 1 ? 'voice' : 'voices'} <span>·</span> Seed {String(seed).padStart(3, '0')}</span>
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
      <div className="transport-note"><span>{score.metadata.source === 'demo' ? 'Built-in score · 10 notes · 1 chord' : `${score.notes.length} notes · ${score.chords.length} chords · Local MIDI`}</span><span>Music becomes space.</span></div>
      {error && <div className="error-message" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
    </footer>
  </main>
}
