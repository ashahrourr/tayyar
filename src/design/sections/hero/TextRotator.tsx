import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { UIComponent } from '@/lib/types'

type Props = {
  node: UIComponent
  canvasRef?: RefObject<HTMLDivElement | null>
  zIndex?: number
  inline?: boolean
}

const num = (v: any, fb = 0) => (typeof v === 'number' ? v : (parseFloat(String(v)) || fb))
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const frac = (x: number) => x - Math.floor(x)

function computeRect(comp: UIComponent, cw: number, ch: number) {
  const w =
    typeof comp.w === 'number' ? comp.w :
    comp.w === '100%' ? cw :
    comp.w === 'fit-content' ? undefined :
    num(comp.w)

  const h =
    typeof comp.h === 'number' ? comp.h :
    comp.h === '100%' ? ch :
    comp.h === 'fit-content' ? undefined :
    num(comp.h)

  return { left: num(comp.x), top: num(comp.y), width: w, height: h }
}

export function TextRotator({ node, canvasRef, zIndex, inline = false }: Props) {
  const canvasW = canvasRef?.current?.offsetWidth ?? 1200
  const canvasH = canvasRef?.current?.offsetHeight ?? 800
  const rect = computeRect(node, canvasW, canvasH)

  const p = (node.props as any) || {}
  const words: string[] = Array.isArray(p.words) && p.words.length ? p.words : ['Work', 'Magic', 'Decisions']
  const before: string = p.before ?? 'Where'
  const after: string  = p.after  ?? 'happens'

  // style
  const fontSize  = num(p.fontSize, 96)
  const weight    = num(p.weight, 800)
  const color     = p.color ?? '#111827'
  const lineH     = Number(p.lineH ?? 1.12)
  const slotH     = Math.ceil(fontSize * lineH)

  // spacing
  const gapPx           = (typeof p.gapEm === 'number' ? p.gapEm : 0.5) * fontSize
  const spreadPxDefault = (typeof p.spreadEm === 'number' ? p.spreadEm : 2.0) * fontSize

  // timing (fractions of total)
  const durationMs = num(p.durationMs, 3800)
  const holdInFrac = clamp(Number(p.holdInFrac ?? 0.16), 0.05, 0.6)
  const expandFrac = clamp(Number(p.expandFrac ?? 0.20), 0.05, 0.5)
  const spinFrac   = clamp(Number(p.spinFrac   ?? 0.44), 0.10, 0.8)
  const decelFrac  = clamp(Number(p.decelFrac  ?? 0.20), 0.10, 0.35)
  const closeOverlapFrac = clamp(Number(p.closeOverlapFrac ?? 0.10), 0, Math.min(0.25, spinFrac - 0.02))

  // normalize so total = 1
  const totalBase = holdInFrac + expandFrac + spinFrac + decelFrac
  const scale = totalBase > 0 ? 1 / totalBase : 1
  const hold = holdInFrac * scale
  const open = expandFrac * scale
  const spin = spinFrac   * scale
  const decel = decelFrac * scale

  // animated loop params
  const n = Math.max(1, words.length)
  const [startIndexState, setStartIndexState] = useState<number>(() =>
    (typeof p.startIndex === 'number' ? (p.startIndex % n + n) % n : Math.floor(Math.random() * n))
  )
  const [cycle, setCycle] = useState(0) // increments each iteration to rebuild keyframes

  // measure widest word if slotWidth === 'auto'
  const measurerRef = useRef<HTMLSpanElement | null>(null)
  const [autoWidth, setAutoWidth] = useState<number | null>(null)
  const slotWidthProp = p.slotWidth
  const slotWidth: number =
    slotWidthProp === 'auto'
      ? (autoWidth ?? Math.max(560, 6 * fontSize))
      : num(slotWidthProp, 560)

  useEffect(() => {
    if (slotWidthProp !== 'auto') return
    const el = measurerRef.current
    if (!el) return
    const id = requestAnimationFrame(() => {
      const spans = Array.from(el.querySelectorAll('[data-w]')) as HTMLSpanElement[]
      const maxW = spans.reduce((m, s) => Math.max(m, s.clientWidth), 0)
      setAutoWidth(Math.ceil(maxW + fontSize * 0.1))
    })
    return () => cancelAnimationFrame(id)
  }, [words, fontSize, weight, lineH, slotWidthProp, cycle])

  // time markers (percent)
  const A = 0
  const B = (hold) * 100
  const C = (hold + open) * 100
  const E = (hold + open + spin) * 100         // spin ends
  const D = 100
  const EcloseStart = Math.max(B, (hold + open + Math.max(0, spin - closeOverlapFrac)) * 100)

  // loops & landing
  const spreadPx = num(p.spreadPx, spreadPxDefault)
  let loopsTotal = (typeof p.loops === 'number') ? p.loops : num(p.spinLoops, 3.0)
  const landSlotsTarget = clamp(Number(p.landSlotsTarget ?? 0.5), 0.25, 0.75)

  const yStartPx = -(startIndexState) * slotH
  const totalTimeFrac = (open + spin) || 1
  const totalTravelPx_raw = loopsTotal * n * slotH

  const travelToC_raw = totalTravelPx_raw * (open / totalTimeFrac)
  const travelToE_raw = totalTravelPx_raw * (spin / totalTimeFrac)

  const kE_raw = (travelToC_raw + travelToE_raw) / slotH
  const distFrac = frac(kE_raw)
  const deltaSlots = distFrac - (1 - landSlotsTarget)
  loopsTotal = loopsTotal - (deltaSlots / n)

  const totalTravelPx = loopsTotal * n * slotH
  const travelToC = totalTravelPx * (open / totalTimeFrac)
  const travelToE = totalTravelPx * (spin / totalTimeFrac)

  const yAtC = yStartPx - travelToC
  const yAtE = yAtC - travelToE

  const kE = (yStartPx - yAtE) / slotH
  const kD = Math.round(kE)
  const yAtD = yStartPx - kD * slotH
  const landingIndex = ((startIndexState + kD) % n + n) % n

  // render enough rows for the distance (+1)
  const repeats = Math.ceil(loopsTotal) + 2
  const renderWords = Array.from({ length: repeats }).flatMap(() => words).concat(words[0])

  // unique names per cycle so keyframes refresh cleanly
  const idSafe = (String(node.id ?? 'rot') + '_' + cycle).replace(/[^a-zA-Z0-9_-]/g, '')
  const animNameY       = `trY_${idSafe}`
  const animNameSpreadL = `trL_${idSafe}`
  const animNameSpreadR = `trR_${idSafe}`

  const trRef = useRef<HTMLSpanElement | null>(null) // the column wrapper

  // Build keyframes for this cycle
  useEffect(() => {
    const styleEl = document.createElement('style')
    styleEl.setAttribute('data-tr-style', idSafe)
    styleEl.textContent = `
      /* Y: hold → open (linear) → spin (linear) → long ease-out decel to land */
      @keyframes ${animNameY} {
        ${A}% { transform: translateY(${yStartPx}px); animation-timing-function: linear; }
        ${B}% { transform: translateY(${yStartPx}px); animation-timing-function: linear; }
        ${C}% { transform: translateY(${yAtC}px);    animation-timing-function: linear; }
        ${E}% { transform: translateY(${yAtE}px);    animation-timing-function: cubic-bezier(.16,1,.3,1); }
        ${D}% { transform: translateY(${yAtD}px); }
      }

      /* Ends: quick open, hold wide during spin, start closing before spin ends, finish by D */
      @keyframes ${animNameSpreadL} {
        ${A}%           { transform: translateX(0);              animation-timing-function: cubic-bezier(.2,.9,.2,1); }
        ${B}%           { transform: translateX(0);              animation-timing-function: cubic-bezier(.2,.9,.2,1); }
        ${C}%           { transform: translateX(-${spreadPx}px); animation-timing-function: linear; }
        ${EcloseStart}% { transform: translateX(-${spreadPx}px); animation-timing-function: cubic-bezier(.16,1,.3,1); }
        ${D}%           { transform: translateX(0); }
      }
      @keyframes ${animNameSpreadR} {
        ${A}%           { transform: translateX(0);              animation-timing-function: cubic-bezier(.2,.9,.2,1); }
        ${B}%           { transform: translateX(0);              animation-timing-function: cubic-bezier(.2,.9,.2,1); }
        ${C}%           { transform: translateX(${spreadPx}px);  animation-timing-function: linear; }
        ${EcloseStart}% { transform: translateX(${spreadPx}px);  animation-timing-function: cubic-bezier(.16,1,.3,1); }
        ${D}%           { transform: translateX(0); }
      }
    `.trim()
    document.head.appendChild(styleEl)
    return () => { try { document.head.removeChild(styleEl) } catch {} }
  }, [animNameY, animNameSpreadL, animNameSpreadR, yStartPx, yAtC, yAtE, yAtD, spreadPx, A, B, C, E, D, EcloseStart, idSafe])

  // Start animations for this cycle (single-iteration, then we restart with new startIndex)
  useEffect(() => {
    const root = trRef.current?.closest('[data-tr-root]')
    const col = trRef.current
    if (!root || !col) return

    const dur = `${durationMs}ms`

    // Assign animations (no 'infinite'); hold final frame with 'forwards'
    const left = root.querySelector<HTMLElement>('.tr-left')
    const right = root.querySelector<HTMLElement>('.tr-right')

    if (left)  left.style.animation  = `${animNameSpreadL} ${dur} forwards 1`
    if (right) right.style.animation = `${animNameSpreadR} ${dur} forwards 1`
    col.style.animation = `${animNameY} ${dur} forwards 1`

    const onEnd = () => {
      // Promote landing word to be the new start for the next cycle
      setStartIndexState(landingIndex)
      // Force a rebuild of keyframes tied to 'cycle'
      setCycle(c => c + 1)
    }

    // 'animationend' on any of the three is okay; column is reliable
    col.addEventListener('animationend', onEnd, { once: true })
    return () => { col.removeEventListener('animationend', onEnd) }
  }, [durationMs, animNameSpreadL, animNameSpreadR, animNameY, landingIndex])

  // Outer wrapper: center; inner shrink-wraps so no giant box
  const outerStyle: React.CSSProperties = inline
    ? {
        position: 'relative',
        width: '100%',
        height: '100%',
        zIndex: zIndex ?? 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'auto',
      }
    : {
        position: 'absolute',
        left: rect.left, top: rect.top,
        width: rect.width ?? '100%',
        height: rect.height ?? 'auto',
        zIndex: zIndex ?? 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'auto',
      }

  return (
    <div style={outerStyle}>
      {/* hidden measurer for slotWidth:'auto' */}
      <span
        ref={measurerRef}
        aria-hidden
        style={{
          position: 'absolute',
          visibility: 'hidden',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          fontSize, fontWeight: weight, lineHeight: `${slotH}px`,
        }}
      >
        {words.map((w, i) => (
          <span key={i} data-w style={{ display: 'inline-block', marginRight: gapPx }}>
            {w}
          </span>
        ))}
      </span>

      {/* inner shrink-wrap; 'data-tr-root' marks the scope we mutate per-cycle */}
      <div data-tr-root style={{ display: 'inline-block', width: 'fit-content', maxWidth: '92%' }}>
  <div
    style={{
      display: 'inline-flex',            // shrink-wraps the trio
      alignItems: 'center',
      fontWeight: weight,
      fontSize,
      lineHeight: `${slotH}px`,
      letterSpacing: '-0.02em',
      color,
      userSelect: 'none',
      transform: 'translateZ(0)',
      gap: gapPx * 0.6,                  // ↓ tighter spacing between the three parts
    }}
  >
    <span className="tr-left" style={{ whiteSpace: 'nowrap' }}>
      {before}
    </span>

    <span
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'inline-block',
        width: slotWidth,
        height: slotH,
        // (no extra margin here)
      }}
    >
      <span
        ref={trRef}
        className="tr-col"
        style={{
          position: 'absolute', left: 0, top: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          transform: 'translateZ(0)',
        }}
      >
        {renderWords.map((w, i) => (
          <span
            key={`${w}-${i}-${cycle}`}
            style={{
              height: slotH,
              lineHeight: `${slotH}px`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              whiteSpace: 'nowrap',
              padding: '0 1px',         // tiny buffer to avoid glyph clipping
            }}
          >
            {w}
          </span>
        ))}
      </span>
    </span>

    <span className="tr-right" style={{ whiteSpace: 'nowrap' }}>
      {after}
    </span>
  </div>
</div>

    </div>
  )
}
