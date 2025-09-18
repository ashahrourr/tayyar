// src/CanvasRender/Canvas.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
} from 'react'
import { UIComponent } from '@/lib/types'
import { Element } from './Element'
import {
  CANVAS_W,
  CONTAINER_W,
  NUDGE_COL,
  NUDGE_GUTTER,
  LEFT_INSET,
  NUDGE_COLS,
} from './grid'

import { runSectionPipeline } from '@/design/engine/sectionEngine'

const GAP = 12
const VIEW_GUTTER = 24
const DEFAULT_PAGE_MIN = 960
const PAGE_BOTTOM_PAD = 160

// You can keep your 0.70 step; leaving it as-is.
const ZOOM_STEPS = [0.5, 0.7, 1, 2, 4] as const
const DEFAULT_ZOOM = ZOOM_STEPS[1]

type Mode = 'edit' | 'preview'
const stepIndex = (z: number) =>
  ZOOM_STEPS.reduce(
    (best, v, i) => (Math.abs(v - z) < Math.abs(ZOOM_STEPS[best] - z) ? i : best),
    0,
  )
const clampIndex = (i: number) => Math.max(0, Math.min(ZOOM_STEPS.length - 1, i))
const stepZoom = (current: number, delta: 1 | -1) =>
  ZOOM_STEPS[clampIndex(stepIndex(current) + delta)]

export function Canvas({
  mode,
  components,
  navigate,
  selectedId,
  setSelectedId,
  updateComponent,
}: {
  mode: Mode
  components: UIComponent[]
  navigate?: (pageId: string) => void
  selectedId?: string | null
  setSelectedId?: (id: string) => void
  updateComponent?: (id: string, up: Partial<UIComponent>) => void
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const [vpSize, setVpSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const update = () => {
      const vp = viewportRef.current
      if (!vp) return
      setVpSize({ w: vp.clientWidth, h: vp.clientHeight })
    }
    update()
    const ro = new ResizeObserver(update)
    if (viewportRef.current) ro.observe(viewportRef.current)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  const [zoom, setZoom] = useState<number>(DEFAULT_ZOOM)
  const scale = zoom
  const lastZoomBy = useRef<'keyboard' | 'program' | null>(null)

  const [previewState] = useState<Record<string, any>>({
    cartCount: 0,
    cartItems: [],
  })

  // ---------- sections pipeline (header-only for now) ----------
  const spaced = useMemo(() => runSectionPipeline(components), [components])

  // ---------- expand loops + visibility ----------
  const expanded = useMemo(() => {
    const out: UIComponent[] = []
    for (const root of spaced) {
      walk(root, undefined, 0, {}, out, mode === 'preview' ? previewState : {})
    }
    return out
  }, [spaced, previewState, mode])

  const visible = useMemo(
    () => filterHiddenByAncestors(expanded, mode === 'preview' ? previewState : {}),
    [expanded, previewState, mode],
  )

  // ---------- page sizing ----------
  const pageHeight = useMemo(() => {
    const contentBottom = visible.reduce((m, c) => {
      const y = Number(c.y) || 0
      const h = typeof c.h === 'number' ? c.h : parseInt(String(c.h || 0), 10) || 0
      return Math.max(m, y + h)
    }, 0)
    return Math.max(DEFAULT_PAGE_MIN, contentBottom + PAGE_BOTTOM_PAD)
  }, [visible])

  // ---------- background layer (no tokens dependency) ----------
  const pageBg = useMemo(() => pickPageBg(visible), [visible])
  const bgProps = ((pageBg?.props ?? {}) as any) || {}

  const toRender = useMemo(() => visible.filter((c) => c.id !== pageBg?.id), [visible, pageBg])

  // ---------- viewport centering + zoom ----------
  const scaledW = Math.round(CANVAS_W * scale)
  const scaledH = Math.round(pageHeight * scale)

  const extraV = Math.max(0, vpSize.h - scaledH)
  const TOP_BIAS = 0.25
  const padTop = VIEW_GUTTER + Math.floor(extraV * TOP_BIAS)
  const padBottom = VIEW_GUTTER + (extraV - Math.floor(extraV * TOP_BIAS))

  const centerViewport = useCallback(
    (nextScale: number) => {
      const vp = viewportRef.current
      if (!vp) return
      const nextW = CANVAS_W * nextScale
      const nextH = pageHeight * nextScale
      const desiredLeft = Math.max(0, (nextW - vp.clientWidth) / 2)
      const desiredTop = Math.max(0, (nextH - vp.clientHeight) / 2)
      vp.scrollLeft = desiredLeft
      vp.scrollTop = desiredTop
    },
    [pageHeight],
  )

  useEffect(() => {
    const by = lastZoomBy.current
    if (by === 'keyboard' || by === 'program' || !by) {
      requestAnimationFrame(() => centerViewport(scale))
      lastZoomBy.current = null
    }
  }, [vpSize.w, vpSize.h, scale, centerViewport])

  // --- keyboard zoom (block page zoom) ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null
      const typing =
        !!el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT' ||
          el.isContentEditable)
      if (typing) return
      if (!(e.metaKey || e.ctrlKey)) return

      if (e.key === '0') {
        lastZoomBy.current = 'keyboard'
        setZoom(DEFAULT_ZOOM)
        return
      }
      if (e.key === '-' || e.key === '=' || e.key === '+') {
        e.preventDefault()
        const next = e.key === '-' ? stepZoom(zoom, -1) : stepZoom(zoom, +1)
        lastZoomBy.current = 'keyboard'
        setZoom(next)
      }
    }

    window.addEventListener('keydown', onKey, { passive: false })
    return () => window.removeEventListener('keydown', onKey)
  }, [zoom])

  // --- block pinch-zoom outside canvas; allow inside viewport w/ ctrl/cmd ---
  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return

    const blockWheelIfZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault()
    }
    const stopGesture = (e: Event) => e.preventDefault()

    vp.addEventListener('wheel', blockWheelIfZoom, { passive: false })
    vp.addEventListener('gesturestart', stopGesture as EventListener, { passive: false })
    vp.addEventListener('gesturechange', stopGesture as EventListener, { passive: false })
    vp.addEventListener('gestureend', stopGesture as EventListener, { passive: false })

    return () => {
      vp.removeEventListener('wheel', blockWheelIfZoom)
      vp.removeEventListener('gesturestart', stopGesture as EventListener)
      vp.removeEventListener('gesturechange', stopGesture as EventListener)
      vp.removeEventListener('gestureend', stopGesture as EventListener)
    }
  }, [])

  // --- trackpad/cmd-scroll canvas zoom (on viewport only) ---
  const onWheelZoom = useCallback(
    (e: React.WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      const dir: 1 | -1 = e.deltaY < 0 ? +1 : -1
      const next = stepZoom(zoom, dir)
      lastZoomBy.current = 'program'
      setZoom(next)
    },
    [zoom],
  )

  return (
    <div
      ref={viewportRef}
      className="w-full h-full overflow-auto bg-[#30302e] flex justify-center"
      style={{
        minWidth: 0,
        alignItems: 'flex-start',
        paddingTop: padTop,
        paddingBottom: padBottom,
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
      }}
      onWheel={onWheelZoom}
    >
      <div style={{ width: scaledW, height: scaledH, position: 'relative' }}>
        <div
          ref={canvasRef}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: CANVAS_W,
            height: pageHeight,
            position: 'absolute',
            left: 0,
            top: 0,
            overflow: 'hidden',
            willChange: 'transform',
            pointerEvents: 'auto',
            background: 'transparent',
          }}
        >
          {/* full-page background layer (className optional) */}
          <div
            className={bgProps.className as string | undefined}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              ...(bgProps.style || {}),
            }}
          />

          {mode === 'edit' && (
            <div
              aria-hidden
              style={{
                position: 'absolute',
                left: LEFT_INSET,
                top: 0,
                width: CONTAINER_W,
                height: '100%',
                pointerEvents: 'none',
                display: 'grid',
                gridTemplateColumns: `repeat(${NUDGE_COLS}, ${NUDGE_COL}px)`,
                columnGap: `${NUDGE_GUTTER}px`,
                opacity: 0,
              }}
            >
              {Array.from({ length: NUDGE_COLS }).map((_, i) => (
                <div key={i} style={{ background: '#fff' }} />
              ))}
            </div>
          )}

          {toRender.map((c, i) => (
            <Element
              key={c.id}
              mode={mode}
              comp={c}
              canvasRef={canvasRef}
              onNavigate={navigate}
              state={previewState}
              setState={() => {}}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              updateComponent={updateComponent}
              scale={scale}
              zIndex={i + 1}
              allComponents={toRender}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------------- helpers ---------------- */

function pickPageBg(list: UIComponent[]) {
  let bg = list.find((c) => c.id === 'page-bg')
  if (bg) return bg
  bg = list.find(
    (c) =>
      c.type === 'Container' &&
      (c.w === '100%' || c.w === CANVAS_W) &&
      c.h === '100%' &&
      (c.x ?? 0) === 0 &&
      (c.y ?? 0) === 0,
  )
  return bg
}

function walk(
  node: UIComponent,
  parentIdOverride: string | undefined,
  deltaY: number,
  inheritedCtx: Record<string, any>,
  out: UIComponent[],
  state: Record<string, any>,
) {
  const loop = (node as any).loop
  const children = node.children || []

  if (loop) {
    const arr: any[] = Array.isArray(state[loop.key]) ? state[loop.key] : []
    const baseY = node.y ?? 0
    const rowH =
      typeof node.h === 'number'
        ? node.h
        : parseInt(String(node.h ?? 0), 10) || 0

    arr.forEach((item, idx) => {
      const delta = deltaY + idx * (rowH + GAP)
      const loopCtx = { ...inheritedCtx, [loop.as]: item }
      const idSuffix = `__${idx}`
      const rootClone: UIComponent = {
        ...node,
        id: node.id + idSuffix,
        parentId: parentIdOverride ?? node.parentId,
        y: baseY + delta,
        props: { ...node.props, __loopCtx: loopCtx },
      }
      out.push(rootClone)
      for (const child of children) walk(child, rootClone.id, delta, loopCtx, out, state)
    })
    return
  }

  const cloned: UIComponent = {
    ...node,
    parentId: parentIdOverride ?? node.parentId,
    y: (node.y ?? 0) + deltaY,
    props: { ...node.props, __loopCtx: inheritedCtx },
  }
  out.push(cloned)
  for (const child of children) walk(child, cloned.id, deltaY, inheritedCtx, out, state)
}

function safeEvalBool(expr: string, ctx: Record<string, any>) {
  try {
    const fn = new Function(...Object.keys(ctx), `return (${expr})`)
    return !!fn(...Object.values(ctx))
  } catch {
    return false
  }
}

function filterHiddenByAncestors(components: UIComponent[], state: Record<string, any>) {
  const byId = new Map(components.map((c) => [c.id, c]))
  const memo = new Map<string, boolean>()

  const isVisible = (c: UIComponent): boolean => {
    if (memo.has(c.id)) return memo.get(c.id)!
    const loopCtx = (c.props as any).__loopCtx || {}
    const ctx = { ...state, ...loopCtx }

    const ownVisible = !c.props?.showIf || safeEvalBool(c.props?.showIf, ctx)
    if (!ownVisible) return memo.set(c.id, false).get(c.id)!

    let pid = c.parentId
    while (pid) {
      const p = byId.get(pid)
      if (!p) break
      if (!isVisible(p)) return memo.set(c.id, false).get(c.id)!
      pid = p.parentId
    }
    return memo.set(c.id, true).get(c.id)!
  }

  return components.filter(isVisible)
}
