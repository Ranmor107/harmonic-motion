import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useStudio } from '../state/store'
import { loadSavedState, savePreferences, saveSessions, type SavedPreferences } from '../state/persistence'
import { PlaybackClock, type PlaybackState } from '../playback/clock'
import { PlaybackController } from '../playback/controller'
import { ToneAudioEngine, audioNow, DEFAULT_VOLUME } from '../audio/ToneAudioEngine'
import { parseMidi, MIDI_LIMITS } from '../midi/parser'
import { Scene } from '../render/Scene'
import { StaticCamera } from '../visual/camera/staticCamera'
import { Icon } from './Icons'
import { upperBound } from '../utils/math'
import { branding } from '../branding/config'
import type { StreamStyleId } from '../domain/visual'
import { resolveStreamPreset } from '../visual/presets/inkStream'

const timeLabel = (time: number) => `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(Math.floor(time % 60)).padStart(2, '0')}`
const pitchLabel = (midi: number) => `${['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][midi % 12]}${Math.floor(midi / 12) - 1}`

function StreamStyleButtons({ style, onSelect, mobile = false }: {
  style: StreamStyleId; onSelect: (style: StreamStyleId) => void; mobile?: boolean
}) {
  return <div className={`stream-style ${mobile ? 'stream-style-mobile' : 'stream-style-desktop'}`}>
    <span className="style-label">观看</span>
    <div className="style-buttons" role="group" aria-label="Stream style">
      {(['original', 'ink'] as const).map(id => <button key={id} aria-pressed={style === id} onClick={() => onSelect(id)}>{id === 'original' ? 'Original' : '水墨册页'}</button>)}
    </div>
  </div>
}

export function App() {
  const {
    compiled, preset, viewMode, visibilityMode, streamStyleId, inkMode, sessions, activeSessionId,
    addScores, restoreSessions, selectSession, removeSession, regenerate, setPreset, setViewMode, setVisibilityMode, setStreamStyleId, setInkMode,
  } = useStudio()
  const { score, world, plan } = compiled
  const [{ controller, audio }] = useState(() => {
    const clock = new PlaybackClock(0, audioNow)
    const audio = new ToneAudioEngine(clock)
    return { controller: new PlaybackController(clock, audio), audio }
  })
  const [playback, setPlayback] = useState<PlaybackState>({ status: 'stopped', time: 0, duration: score.duration })
  const snapshot = useRef(playback)
  const input = useRef<HTMLInputElement>(null)
  const studio = useRef<HTMLElement>(null)
  const drawerTrigger = useRef<HTMLButtonElement>(null)
  const drawerClose = useRef<HTMLButtonElement>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [starting, setStarting] = useState(false)
  const [volume, setVolume] = useState(DEFAULT_VOLUME)
  const [muted, setMuted] = useState(false)
  const [readReady, setReadReady] = useState(false)
  const [ready, setReady] = useState(false)
  const [storageReady, setStorageReady] = useState(false)
  const restorePosition = useRef<number | null>(null)
  const lastSavedPosition = useRef(0)
  const [entered, setEntered] = useState(false)
  const [guideOpen, setGuideOpen] = useState(true)
  const [fitRequest, setFitRequest] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [followViews, setFollowViews] = useState({ constellation: false, stream: true, ensemble: false })
  const [melodyTracks, setMelodyTracks] = useState<Record<string, string>>({})
  const importRevision = useRef(0)
  const noteById = useMemo(() => new Map(score.notes.map(note => [note.id, note])), [score])
  const focusTrackIndex = score.tracks.findIndex(track => track.id === melodyTracks[activeSessionId] && track.notes.length > 0)
  const focusTrack = score.tracks[focusTrackIndex]
  const focusTrackId = focusTrack?.id
  const follow = followViews[viewMode]
  const effectivePreset = useMemo(() => resolveStreamPreset(preset, viewMode, streamStyleId, inkMode), [preset, viewMode, streamStyleId, inkMode])
  const ink = effectivePreset.streamStyle === 'ink'
  const selectStreamStyle = (style: StreamStyleId) => {
    if (style === 'ink') setViewMode('stream')
    setStreamStyleId(style)
  }
  const setFollow = (value: boolean) => setFollowViews(current => ({ ...current, [viewMode]: value }))
  const storageFailed = useCallback(() => {
    setStorageReady(false)
    setError('Local saving is unavailable. Your scores will remain only in this session.')
  }, [])
  const currentPreferences = useCallback((): SavedPreferences => ({
    version: 1, activeSessionId, position: controller.clock.getState().time,
    viewMode, visibilityMode, streamStyleId, inkMode, effectsEnabled: preset.effects.hit.enabled,
    volume, muted, followViews, melodyTracks,
  }), [activeSessionId, controller, viewMode, visibilityMode, streamStyleId, inkMode, preset.effects.hit.enabled, volume, muted, followViews, melodyTracks])
  const persistNow = useCallback(() => {
    if (!storageReady) return
    const preferences = currentPreferences()
    lastSavedPosition.current = preferences.position
    void savePreferences(preferences).catch(storageFailed)
  }, [storageReady, currentPreferences, storageFailed])

  useEffect(() => {
    document.title = `${branding.name} — ${branding.descriptor}`
  }, [])

  useEffect(() => {
    const syncFullscreen = () => setFullscreen(document.fullscreenElement === studio.current)
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])

  useEffect(() => {
    let active = true
    void loadSavedState().then(({ sessions: saved, preferences }) => {
      if (!active) return
      const restored = restoreSessions(saved, preferences?.activeSessionId ?? 'score-0')
      if (restored < saved.length) setError('Some saved scores could not be restored.')
      if (preferences) {
        setViewMode(preferences.viewMode)
        setStreamStyleId(preferences.streamStyleId ?? 'original')
        setInkMode(preferences.inkMode ?? 'drops')
        setVisibilityMode(preferences.visibilityMode)
        const current = useStudio.getState().preset
        setPreset({ ...current, effects: {
          ...current.effects,
          hit: { ...current.effects.hit, enabled: preferences.effectsEnabled },
          trail: { ...current.effects.trail, enabled: preferences.effectsEnabled },
          particles: { ...current.effects.particles, enabled: preferences.effectsEnabled },
        } })
        setVolume(preferences.volume)
        audio.setVolume(preferences.volume)
        setMuted(preferences.muted)
        audio.setMuted(preferences.muted)
        setFollowViews(preferences.followViews)
        const savedTracks = preferences.melodyTracks
        if (savedTracks && typeof savedTracks === 'object' && !Array.isArray(savedTracks)) {
          const library = useStudio.getState().sessions
          setMelodyTracks(Object.fromEntries(Object.entries(savedTracks).filter(([id, trackId]) =>
            typeof trackId === 'string' && library.some(session => session.id === id &&
              session.compiled.score.tracks.some(track => track.id === trackId && track.notes.length > 0)))))
        }
        restorePosition.current = preferences.position
        setEntered(true)
      } else if (saved.length) setEntered(true)
      setStorageReady(true)
    }).catch(() => { if (active) storageFailed() }).finally(() => { if (active) setReadReady(true) })
    return () => { active = false }
  }, [audio, restoreSessions, setPreset, setViewMode, setVisibilityMode, storageFailed, setStreamStyleId, setInkMode])

  useEffect(() => {
    if (!readReady) return
    let active = true
    void controller.load(score).then(() => {
      if (!active) return
      if (restorePosition.current !== null) {
        const position = restorePosition.current >= score.duration ? 0 : Math.max(0, restorePosition.current)
        restorePosition.current = null
        controller.seek(position)
        snapshot.current = controller.clock.getState()
        setPlayback(snapshot.current)
      }
      setReady(true)
    }).catch(cause => { if (active) setError(String(cause)) })
    return () => { active = false }
  }, [controller, score, readReady])

  useEffect(() => {
    if (!ready || !storageReady) return
    void saveSessions(sessions.filter(session => session.id !== 'score-0').map(session => ({
      id: session.id, filename: session.filename, seed: session.seed, score: session.compiled.score,
    }))).catch(storageFailed)
  }, [ready, storageReady, sessions, storageFailed])

  useEffect(() => {
    if (!ready || !storageReady) return
    persistNow()
    const savePosition = () => {
      if (Math.abs(currentPreferences().position - lastSavedPosition.current) >= 1) persistNow()
    }
    const timer = setInterval(savePosition, 3000)
    window.addEventListener('pagehide', persistNow)
    return () => { clearInterval(timer); window.removeEventListener('pagehide', persistNow) }
  }, [ready, storageReady, currentPreferences, persistNow])

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
    setEntered(true)
    setError('')
  }
  const deleteScore = (id: string) => {
    if (id === activeSessionId) stopForSwitch()
    removeSession(id)
    setMelodyTracks(current => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }
  const togglePlayback = useCallback(async () => {
    setError('')
    if (controller.clock.getState().status === 'playing') { controller.pause(); persistNow(); return }
    setStarting(true)
    try { await controller.play(); setEntered(true) } catch { setError('Audio could not start. Check your browser audio settings and press Play again.') }
    finally { setStarting(false) }
  }, [controller, persistNow])

  const seekBy = useCallback((seconds: number) => {
    controller.seek(controller.clock.getCurrentTime() + seconds)
    snapshot.current = controller.clock.getState()
    setPlayback(snapshot.current)
    persistNow()
  }, [controller, persistNow])

  const replayRecent = useCallback(() => {
    const state = controller.clock.getState()
    controller.seek(Math.max(0, state.time - 10))
    snapshot.current = controller.clock.getState()
    setPlayback(snapshot.current)
    persistNow()
    if (state.status !== 'playing') void togglePlayback()
  }, [controller, persistNow, togglePlayback])

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await studio.current?.requestFullscreen()
    } catch { setError('Fullscreen is unavailable in this browser. You can still use the windowed view.') }
  }, [])

  useEffect(() => {
    if (!ready) return
    const shortcut = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing || busy || starting) return
      if (event.key === 'Escape' && fullscreen) {
        event.preventDefault()
        void document.exitFullscreen()
        return
      }
      const target = event.target
      if (target instanceof Element && (target.closest('button, a, input, select, textarea, [role="button"]') ||
        (target instanceof HTMLElement && target.isContentEditable))) return
      if (!['Space', 'ArrowLeft', 'ArrowRight', 'KeyR', 'KeyF'].includes(event.code)) return
      event.preventDefault()
      if (event.repeat) return
      if (event.code === 'Space') void togglePlayback()
      else if (event.code === 'ArrowLeft') seekBy(-5)
      else if (event.code === 'ArrowRight') seekBy(5)
      else if (event.code === 'KeyR') replayRecent()
      else void toggleFullscreen()
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [ready, busy, starting, fullscreen, togglePlayback, seekBy, replayRecent, toggleFullscreen])

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
      if (imported.length) { stopForSwitch(); addScores(imported); setEntered(true) }
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
  const toggleMute = () => {
    if (muted || volume === 0) {
      const restored = volume || DEFAULT_VOLUME
      setVolume(restored)
      audio.setVolume(restored)
      setMuted(false)
      audio.setMuted(false)
    } else {
      setMuted(true)
      audio.setMuted(true)
    }
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
  const firstVisit = !entered && activeSessionId === 'score-0'
  const showGuide = entered && activeSessionId === 'score-0'
  const effectivelyMuted = muted || volume === 0

  if (!ready) return <main className="studio restoring">Restoring your local library…</main>

  return <main ref={studio} className="studio" data-appearance={ink ? 'ink' : 'original'}>
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
      <span className="brand-descriptor">{ink ? 'HARMONIC MOTION / 纸上听音' : branding.descriptor}</span>
      <StreamStyleButtons style={ink ? 'ink' : 'original'} onSelect={selectStreamStyle} />
      <span className={`status ${playing ? 'is-playing' : ''}`}><i />{ink ? playing ? '演奏中' : playback.status === 'ended' ? '曲终' : playback.status === 'paused' ? '已暂停' : '静候起音' : playing ? 'Performing' : playback.status === 'ended' ? 'Complete' : playback.status === 'paused' ? 'Paused' : 'Ready'}</span>
      <button ref={drawerTrigger} className="drawer-trigger" aria-controls="controls-drawer" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(open => !open)}>{ink ? '曲库与设置' : 'Controls'} <span aria-hidden="true">☷</span></button>
    </header>

    <section className={`world-stage ${firstVisit ? 'is-intro' : ''} ${showGuide ? 'has-guide' : ''}`} aria-label="Music world" tabIndex={0} onPointerDown={event => {
      if (event.target instanceof Element && !event.target.closest('button, a, input, select, textarea')) event.currentTarget.focus({ preventScroll: true })
    }}>
      <Scene score={score} world={world} plan={plan} preset={effectivePreset} playback={snapshot} cameraController={StaticCamera} viewMode={viewMode} visibilityMode={visibilityMode} focusTrackId={focusTrackId} fitRequest={fitRequest} follow={follow} onNavigate={() => setFollow(false)} />
      <div className="score-card">
        <p className="eyebrow">{ink ? '纸上听音' : 'Opus'} {String(sessionIndex + 1).padStart(2, '0')} / {score.metadata.source === 'demo' ? ink ? '原创小品' : 'Quick Study' : ink ? '本机乐谱' : 'Local score'}</p>
        <h1>{score.metadata.title}</h1>
        {ink && <p className="ink-work-caption">{score.tracks.filter(track => track.notes.length).length} 条轨道<span>·</span>{timeLabel(score.duration)}<span>·</span>{inkMode === 'drops' ? '一音落纸，余韵渐开' : '主脉行进，众声相和'}</p>}
        <dl className="artwork-data">
          <div><dt>Duration</dt><dd>{timeLabel(score.duration)}</dd></div>
          <div><dt>Tracks</dt><dd>{score.tracks.length}</dd></div>
          <div><dt>Notes</dt><dd>{score.notes.length}</dd></div>
          <div><dt>Chords</dt><dd>{score.chords.length}</dd></div>
          {tempoMin !== undefined && <div className="tempo"><dt>Tempo</dt><dd>{tempoMin === tempoMax ? tempoMin : `${tempoMin}–${tempoMax}`} <small>BPM</small></dd></div>}
        </dl>
      </div>
      {!ink && (firstVisit ? <div className="first-experience">
        <p className="eyebrow">Begin here · Quick Study</p>
        <p className="first-experience-copy">Hear a melody gather bass and harmony as the music becomes a space.</p>
        <button className="study-action" onClick={() => void togglePlayback()} disabled={busy || starting}><Icon name="play" />Listen to a study <span>~30 sec</span></button>
        <button className="midi-action" onClick={() => input.current?.click()} disabled={busy}>Open my MIDI <span aria-hidden="true">↗</span></button>
        <p className="first-experience-note">Processed on this device. Saved in this browser; no files are uploaded.</p>
      </div> : showGuide ? <div className="reading-guide">
        {guideOpen ? <><button className="guide-close" aria-label="Close visual guide" onClick={() => setGuideOpen(false)}>×</button><p className="eyebrow">What am I seeing?</p><p>{`Follow the warm ${focusTrack ? 'focused part' : 'lead'}. Cool strands show accompanying voices; notes brighten as they sound.`}</p></> : <button className="guide-reopen" onClick={() => setGuideOpen(true)}>What am I seeing? <span aria-hidden="true">↗</span></button>}
      </div> : <blockquote className="score-quote"><p>“{branding.quote.text}”</p><cite><a href={branding.quote.source} target="_blank" rel="noreferrer">{branding.quote.author}</a></cite></blockquote>)}
      {ink && <>
        <div className="ink-colophon" aria-hidden="true"><span>声<br />墨</span><p>音乐成迹 · 留白有声</p></div>
        {playback.time === 0 && <p className="ink-start">点击播放，让声音落在纸上。</p>}
        <div className="ink-view-selector">
          <div role="group" aria-label="水墨观看方式">
            <button aria-pressed={inkMode === 'drops'} onClick={() => setInkMode('drops')}>宣纸落墨</button>
            <span aria-hidden="true">/</span>
            <button aria-pressed={inkMode === 'veins'} onClick={() => setInkMode('veins')}>墨脉</button>
          </div>
          <p>{inkMode === 'drops' ? '听见起音，看见晕染与余韵。' : '以浓淡笔性，观看旋律与声部相和。'}</p>
        </div>
      </>}
      <div className="live-reading" aria-label="Current music">
        <span className="eyebrow">{ink ? '此刻' : `${viewMode} / ${viewMode === 'stream' ? 'ribbon' : viewMode === 'ensemble' ? 'voices' : visibilityMode}`}</span>
        {focusTrack && <span className="focus-reading" title={focusTrack.name}>Focus · {String(focusTrackIndex + 1).padStart(2, '0')} {focusTrack.name || `Track ${focusTrackIndex + 1}`}</span>}
        <span className={`pitch-reading ${sounding.length ? 'sounding' : ''}`}>{pitches.length ? pitches.map(note => pitchLabel(note.midi)).join(' · ') : '—'}</span>
        {!ink && <div className="legend"><span><i className="lead-dot" />{focusTrack ? 'Focus' : 'Lead'}</span><span><i className="voice-dot" />Voices</span><span><i className="performer-dot" />{viewMode === 'ensemble' ? 'Harmony' : 'Performer'}</span></div>}
      </div>
      {!ink && <span className="navigation-hint">Scroll to zoom · drag to explore</span>}
    </section>

    <aside id="controls-drawer" className={`controls-drawer ${drawerOpen ? 'is-open' : ''}`} aria-label="View and library" aria-hidden={!drawerOpen} inert={!drawerOpen}>
      <div className="drawer-heading"><span>{ink ? '曲库与设置' : 'Score settings'}</span><button ref={drawerClose} aria-label="Close controls" onClick={() => { setDrawerOpen(false); drawerTrigger.current?.focus() }}>×</button></div>
      <section className="control-section"><h2>{ink ? '观看空间' : 'View'}</h2><div className="segmented">
        {(['constellation', 'stream', 'ensemble'] as const).map(mode => <button key={mode} aria-pressed={viewMode === mode} onClick={() => setViewMode(mode)}>{mode[0]!.toUpperCase() + mode.slice(1)}</button>)}
      </div>
      <p className="control-note">{ink ? '宣纸落墨与墨脉在同一首曲目中切换，进度保持不变。' : viewMode === 'constellation' ? 'See how notes and voices connect.' : viewMode === 'stream' ? 'Follow the music as it unfolds in time.' : 'See voices gather around the circular stage.'}</p>
      <StreamStyleButtons mobile style={ink ? 'ink' : 'original'} onSelect={selectStreamStyle} />
      </section>
      <section className="control-section"><h2>{ink ? '主线' : 'Part focus'}</h2>
        <label className="part-label" htmlFor="melody-track">{ink ? '想跟随哪个声部？' : 'Follow a MIDI track'}</label>
        <select id="melody-track" className="part-select" value={focusTrackId ?? ''} onChange={event => setMelodyTracks(current => {
          const next = { ...current }
          if (event.target.value) next[activeSessionId] = event.target.value
          else delete next[activeSessionId]
          return next
        })}>
          <option value="">{ink ? '自动选择主线' : 'Auto lead'}</option>
          {score.tracks.map((track, index) => track.notes.length > 0 && <option key={track.id} value={track.id}>{String(index + 1).padStart(2, '0')} · {track.name || `Track ${index + 1}`}</option>)}
        </select>
        <p className="control-note">{ink ? '所选轨道以浓墨呈现，其余声部仍然可见、可听。' : 'Follow one source track across views. Other tracks stay visible and audible.'}</p>
      </section>
      {!ink && <section className="control-section"><h2>Visibility</h2><div className="segmented">
        {(['overview', 'focus', 'path'] as const).map(mode => <button key={mode} aria-pressed={visibilityMode === mode} onClick={() => setVisibilityMode(mode)} disabled={viewMode !== 'constellation'}>{mode === 'path' ? 'Current path' : mode[0]!.toUpperCase() + mode.slice(1)}</button>)}
      </div>{viewMode === 'stream' && <p className="control-note">A moving window around the performance.</p>}</section>}
      <section className="control-section"><h2>{ink ? '观看' : 'Camera'}</h2><div className="camera-actions">
        {!ink && <><button onClick={fit}><Icon name="fit" />Fit {viewMode !== 'constellation' ? 'stage' : 'world'}</button>
        <button onClick={() => { setFollow(false); setFitRequest(value => value + 1) }}>Reset</button></>}
        <button onClick={() => void toggleFullscreen()} aria-pressed={fullscreen} aria-keyshortcuts="F"><Icon name="fullscreen" />{ink ? fullscreen ? '退出全屏' : '全屏观看' : fullscreen ? 'Exit full' : 'Fullscreen'}</button>
      </div>{!ink && viewMode !== 'ensemble' && <button className="setting-toggle" onClick={() => { setFollow(!follow); if (!follow) setFitRequest(value => value + 1) }} aria-pressed={follow}>Follow performer <span>{follow ? 'On' : 'Off'}</span></button>}
      <p className="control-note">{ink ? '空格 播放/暂停 · ←/→ 跳转 5 秒 · R 重听 10 秒 · F 全屏 · Esc 退出' : 'Stage shortcuts: Space play/pause · ←/→ 5s · R replay 10s · F fullscreen. Esc exits fullscreen.'}</p></section>
      <section className="control-section"><h2>{ink ? '笔墨' : 'Visual'}</h2><button className="setting-toggle" onClick={toggleEffects} aria-pressed={preset.effects.hit.enabled}>{ink ? '墨晕与共鸣' : 'Performance effects'} <span>{preset.effects.hit.enabled ? ink ? '开' : 'On' : ink ? '关' : 'Off'}</span></button>{!ink && <button className="quiet-action" onClick={regenerate} disabled={busy}><Icon name="regenerate" />Regenerate constellation</button>}</section>
      <section className="control-section"><h2>{ink ? '声音' : 'Sound'}</h2><label className="volume-label" htmlFor="master-volume">{ink ? '音量' : 'Volume'} <span>{Math.round(volume * 100)}%</span></label><input id="master-volume" className="volume-range" type="range" min="0" max="100" value={Math.round(volume * 100)} aria-valuetext={`${Math.round(volume * 100)} percent`} onChange={event => {
        const next = Number(event.target.value) / 100
        setVolume(next)
        audio.setVolume(next)
        if (muted) { setMuted(false); audio.setMuted(false) }
      }} /></section>
      <section className="control-section library"><div className="library-heading"><h2>{ink ? '本机曲库' : 'Library'} <span>{sessions.length}</span></h2><button onClick={() => input.current?.click()} disabled={busy}>{ink ? '+ 添一曲' : '+ Add'}</button></div>
        <p className="control-note">{ink ? '曲目保存在此浏览器；移除仅删除本机保存的副本。' : 'Saved in this browser · removing a score deletes its saved copy'}</p>
        <ol>{sessions.map((session, index) => <li key={session.id} className={session.id === activeSessionId ? 'is-current' : ''}>
          <button className="score-select" aria-current={session.id === activeSessionId ? 'true' : undefined} onClick={() => switchScore(session.id)} disabled={busy || starting} title={session.filename}><span className="score-number">{String(index + 1).padStart(2, '0')}</span><span className="score-name">{session.compiled.score.metadata.title}<small>{timeLabel(session.compiled.score.duration)} · {session.compiled.score.tracks.length} tracks</small></span></button>
          <button className="score-remove" aria-label={`Remove ${session.compiled.score.metadata.title}`} onClick={() => deleteScore(session.id)} disabled={busy || starting || (sessions.length === 1 && session.id === 'score-0')}>×</button>
        </li>)}</ol>
      </section>
    </aside>

    <footer className="transport">
      <div className="transport-primary">
        <button className="play-button" onClick={() => void togglePlayback()} disabled={busy || starting} aria-label={playing ? 'Pause' : 'Play'} aria-keyshortcuts="Space"><Icon name={playing ? 'pause' : 'play'} /></button>
        <button className="track-step" aria-label="Previous score" disabled={sessionIndex <= 0 || busy || starting} onClick={() => switchScore(sessions[sessionIndex - 1]!.id)}>‹</button>
        <button className="track-step" aria-label="Next score" disabled={sessionIndex >= sessions.length - 1 || busy || starting} onClick={() => switchScore(sessions[sessionIndex + 1]!.id)}>›</button>
        <span className="time current-time">{timeLabel(playback.time)}</span>
        <div className="timeline-wrap">
          <input className="timeline" type="range" aria-label="Song position" min={0} max={score.duration} step={0.001} value={playback.time} style={{ background: `linear-gradient(to right, var(--brass) ${progress}%, var(--line) ${progress}%)` }} onKeyDown={event => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); if (!event.repeat) seekBy(event.key === 'ArrowLeft' ? -5 : 5) }
          }} onChange={event => {
            controller.seek(Number(event.target.value))
            snapshot.current = controller.clock.getState()
            setPlayback(snapshot.current)
            persistNow()
          }} aria-valuetext={`${playback.time.toFixed(2)} seconds of ${score.duration.toFixed(2)}`} />
          <div className="timeline-ticks" aria-hidden="true">{[0, 0.25, 0.5, 0.75, 1].map(fraction => <span key={fraction} style={{ left: `${fraction * 100}%` }}>{timeLabel(fraction * score.duration)}</span>)}</div>
        </div>
        <span className="time total-time">{timeLabel(score.duration)}</span>
        <button className="replay-button" aria-label="Replay last 10 seconds" title="Replay last 10 seconds (R)" aria-keyshortcuts="R" onClick={replayRecent} disabled={busy || starting || score.duration === 0}><Icon name="replay" /></button>
        <button className="restart-button" aria-label="Restart" onClick={() => { setError(''); void controller.restart().catch(() => setError('Audio could not start. Press Play to try again.')) }} disabled={busy || starting}><Icon name="restart" /></button>
        <button className="mute-button" aria-label={effectivelyMuted ? 'Unmute audio' : 'Mute audio'} aria-pressed={effectivelyMuted} title={effectivelyMuted ? 'Unmute audio' : 'Mute audio'} onClick={toggleMute}><Icon name={effectivelyMuted ? 'muted' : 'volume'} /></button>
        <button className="import-button" aria-label={ink ? '打开乐谱 MIDI' : 'Add MIDI'} onClick={() => input.current?.click()} disabled={busy}><Icon name="upload" /><span>{busy ? ink ? '读取中…' : 'Reading…' : ink ? '打开乐谱' : 'Add MIDI'}</span></button>
        <input ref={input} type="file" multiple accept=".mid,.midi,audio/midi,audio/x-midi" hidden onChange={event => void onLoad(event)} />
      </div>
      {error && <div className="error-message" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
    </footer>
  </main>
}
