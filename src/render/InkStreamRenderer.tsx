import { useEffect, useRef, useState } from 'react'
import type { InkMode } from '../domain/visual'
import { buildInkFrame, INK_LIMITS, type InkPresentation } from '../visual/presentation/inkPresentation'
import type { PlaybackSnapshot } from './types'
import { inkVertex, inkFragment } from './inkShaders'

// Owns only GPU resources. Musical time is always read from the host snapshot.
export function InkStreamRenderer({ model, mode, playback, effects }: {
  model: InkPresentation; mode: InkMode; playback: PlaybackSnapshot; effects: boolean
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [failure, setFailure] = useState('')
  const [revision, setRevision] = useState(0)
  const current = useRef({ model, mode, effects })
  useEffect(() => { current.current = { model, mode, effects } }, [model, mode, effects])
  useEffect(() => {
    const surface = canvas.current!
    const gl = surface.getContext('webgl2', { alpha: true, premultipliedAlpha: false, antialias: true })
    if (!gl) { setFailure('水墨画面需要图形加速。请在浏览器中开启图形加速后重试。'); return }
    const shaders: WebGLShader[] = []
    const buffers: WebGLBuffer[] = []
    let program: WebGLProgram | null = null
    let vao: WebGLVertexArrayObject | null = null
    let frame = 0
    let observer: ResizeObserver | undefined
    const dispose = () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      buffers.forEach(buffer => gl.deleteBuffer(buffer))
      shaders.forEach(shader => gl.deleteShader(shader))
      if (vao) gl.deleteVertexArray(vao)
      if (program) gl.deleteProgram(program)
    }
    const lost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(frame); setFailure('水墨画面暂时中断，音乐仍可控制。请重试画面。') }
    const restored = () => { setFailure(''); setRevision(value => value + 1) }
    surface.addEventListener('webglcontextlost', lost)
    surface.addEventListener('webglcontextrestored', restored)
    try {
      program = gl.createProgram()!
      for (const [type, source] of [[gl.VERTEX_SHADER, inkVertex], [gl.FRAGMENT_SHADER, inkFragment]] as const) {
        const shader = gl.createShader(type)!
        shaders.push(shader)
        gl.shaderSource(shader, source)
        gl.compileShader(shader)
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'Ink shader compilation failed')
        gl.attachShader(program, shader)
      }
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'Ink shader link failed')
      const uniforms = Object.fromEntries(['uSize', 'uTime', 'uFade', 'uOffset', 'uEffects'].map(name => [name, gl.getUniformLocation(program!, name)]))
      vao = gl.createVertexArray()
      gl.bindVertexArray(vao)
      const corners = gl.createBuffer()!, instances = gl.createBuffer()!
      buffers.push(corners, instances)
      gl.bindBuffer(gl.ARRAY_BUFFER, corners)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW)
      const corner = gl.getAttribLocation(program, 'aCorner')
      gl.enableVertexAttribArray(corner)
      gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, instances)
      gl.bufferData(gl.ARRAY_BUFFER, INK_LIMITS.marks * 48, gl.DYNAMIC_DRAW)
      for (const [name, offset] of [['aStamp', 0], ['aStyle', 16], ['aLife', 32]] as const) {
        const location = gl.getAttribLocation(program, name)
        gl.enableVertexAttribArray(location)
        gl.vertexAttribPointer(location, 4, gl.FLOAT, false, 48, offset)
        gl.vertexAttribDivisor(location, 1)
      }
      gl.enable(gl.BLEND)
      // Shared wet edges merge without summing into a black mass.
      gl.blendEquation(gl.MAX)
      gl.blendFunc(gl.ONE, gl.ONE)
      gl.clearColor(0, 0, 0, 0)
      const values = new Float32Array(INK_LIMITS.marks * 12)
      let width = 0, height = 0, dirty = true, lastTime = -1
      let previous = current.current
      observer = new ResizeObserver(() => { dirty = true })
      observer.observe(surface)
      const draw = () => {
        frame = requestAnimationFrame(draw)
        if (document.hidden) return
        const time = playback.current.time
        const settings = current.current
        if (!dirty && time === lastTime && settings === previous) return
        if (dirty) {
          width = surface.clientWidth; height = surface.clientHeight
          const dpr = Math.min(devicePixelRatio || 1, 1.75)
          surface.width = Math.max(1, Math.round(width * dpr))
          surface.height = Math.max(1, Math.round(height * dpr))
          gl.viewport(0, 0, surface.width, surface.height)
          dirty = false
        }
        if (!width || !height) return
        const marks = buildInkFrame(settings.model, settings.mode, time, width, height, settings.effects)
        marks.forEach((m, i) => values.set([m.x,m.y,m.radius,m.born,m.seed,m.strength,m.aspect,m.angle,m.duration,m.type,m.dry,m.memory], i * 12))
        gl.useProgram(program)
        gl.bindVertexArray(vao)
        gl.bindBuffer(gl.ARRAY_BUFFER, instances)
        if (marks.length) gl.bufferSubData(gl.ARRAY_BUFFER, 0, values.subarray(0, marks.length * 12))
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.uniform2f(uniforms.uSize!, width, height)
        gl.uniform1f(uniforms.uTime!, time)
        gl.uniform1f(uniforms.uFade!, 1)
        gl.uniform1f(uniforms.uEffects!, settings.effects ? 1 : 0)
        gl.uniform1f(uniforms.uOffset!, Math.max(0, time - 9) * width * .84 / INK_LIMITS.window)
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, marks.length)
        lastTime = time; previous = settings
      }
      draw()
    } catch (error) {
      console.error('Ink renderer:', error)
      setFailure('水墨画面未能启动。请检查浏览器图形加速，或切回原版观看。')
      dispose()
    }
    return () => {
      dispose()
      surface.removeEventListener('webglcontextlost', lost)
      surface.removeEventListener('webglcontextrestored', restored)
    }
  }, [playback, revision])
  return <div className="ink-paper-stage">
    <canvas ref={canvas} aria-label={mode === 'drops' ? '宣纸落墨音乐舞台' : '墨脉音乐舞台'} />
    {failure && <div className="scene-fallback" role="alert">{failure}<button onClick={() => { setFailure(''); setRevision(value => value + 1) }}>重试画面</button></div>}
  </div>
}
