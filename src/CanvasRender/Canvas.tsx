// CanvasRender/Canvas.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { UIComponent } from '@/lib/types'
import { Element } from './Element'
import { resolveClassNames } from '@/design/tokens'
import { snappedXLoose, snappedY, closestSpanWidth, maybeSnapXWithEdges } from './grid'
import { CONTAINER_W, NUDGE_COL, NUDGE_GUTTER, LEFT_INSET, NUDGE_COLS, MAIN_STEP, widthForSpan } from './grid'
import { withHeroLayout } from '@/design/sections/hero'
import { withHeaderLayout } from '@/design/sections/header'
import { withFeatureRowLayout } from "@/design/sections/featureRow";
import { withSectionSpacing } from "@/design/sections/spacing";
import { withCards3Layout } from '@/design/sections/cards3'


const CANVAS_W = 980
const CANVAS_H = 756
const GAP = 12

type Mode = 'edit' | 'preview'


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
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const normalizedOnce = useRef<Set<string>>(new Set())

  const [previewState, setPreviewState] = useState<Record<string, any>>({
    cartCount: 0,
    cartItems: [],
  })

  useEffect(() => {
    const compute = () => {
      if (!wrapperRef.current) return
      const parent = wrapperRef.current.parentElement!
      const { clientWidth } = parent
      setScale(Math.min(clientWidth / CANVAS_W, 1))
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

    // One-time initial auto-snap so mock components start "on grid"
    useEffect(() => {
      if (!updateComponent) return
      for (const c of components) {
        if (normalizedOnce.current.has(c.id)) continue
        if (c.id === 'page-bg') { normalizedOnce.current.add(c.id); continue }
  
        const up: Partial<UIComponent> = {}
  
        // Snap X/Y if numeric
        let snappedWidth: number | undefined
        if (typeof c.w === 'number') {
          const sw = closestSpanWidth(c.w)
          if (sw !== c.w) up.w = sw
          snappedWidth = sw
        }

        if (typeof c.x === 'number') {
          const sx = (typeof snappedWidth === 'number' || typeof c.w === 'number')
          ? maybeSnapXWithEdges(c.x, snappedWidth ?? (c.w as number))
          : snappedXLoose(c.x)
          if (sx !== c.x) up.x = sx
        }
        if (typeof c.y === 'number') {
          const sy = snappedY(c.y)
          if (sy !== c.y) up.y = sy
        }
  
        // Snap width to nearest span if numeric
        if (typeof c.w === 'number') {
          const sw = closestSpanWidth(c.w)
          if (sw !== c.w) up.w = sw
        }
        // Optional: snap height to 8px rhythm if numeric (keeps rows tidy)
        if (typeof c.h === 'number') {
          const sh = snappedY(c.h) // reuse 8px rounder
          if (sh !== c.h) up.h = sh
        }
  
        if (Object.keys(up).length) {
          updateComponent(c.id, up)
        }
        normalizedOnce.current.add(c.id)
      }
    }, [components, updateComponent])

// layout pass
const withHeader   = useMemo(() => withHeaderLayout(components), [components]);
const withHero     = useMemo(() => withHeroLayout(withHeader),   [withHeader]);
const withFeatures = useMemo(() => withFeatureRowLayout(withHero), [withHero]);
const withCards    = useMemo(() => withCards3Layout(withFeatures), [withFeatures]);
const spaced       = useMemo(() => withSectionSpacing(withCards, 32), [withCards]);

    
    const expanded = useMemo(() => {
      const out: UIComponent[] = [];
      for (const root of spaced) {
        walk(root, undefined, 0, {}, out, mode === 'preview' ? previewState : {});
      }
      return out;
    }, [spaced, previewState, mode]);



  const visible = useMemo(
    () => filterHiddenByAncestors(expanded, mode === 'preview' ? previewState : {}),
    [expanded, previewState, mode]
  )

  const pageHeight = useMemo(() => {
    const maxY = visible.reduce((m, c) => {
      const y = typeof c.y === 'number' ? c.y : 0
      const h = typeof c.h === 'number' ? c.h : parseInt(String(c.h || 0), 10) || 0
      return Math.max(m, y + h)
    }, 0)
    return Math.max(CANVAS_H, maxY + 24)
  }, [visible])

  const pageBg = useMemo(() => pickPageBg(visible), [visible])

  // Resolve the background class once…
  const bgClass = useMemo(() => {
    if (!pageBg) return undefined
    const p = (pageBg.props ?? {}) as any
    return resolveClassNames({ variant: p.variant, mix: p.mix, className: p.className })
  }, [pageBg])

  const toRender = useMemo(() => visible.filter(c => c.id !== pageBg?.id), [visible, pageBg])

  return (
    // 👇 Apply bg to the wrapper so scrolling past the canvas still shows your page background
    <div
      ref={wrapperRef}
      className={`flex justify-center items-start w-full h-full overflow-y-auto overflow-x-hidden ${bgClass ?? ''}`}
    >
      <div
        ref={canvasRef}
        style={{
          width: CANVAS_W,
          height: pageHeight,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'relative',
          pointerEvents: 'auto',
          overflow: 'hidden',
        }}
      >
        {/* Keep the bg inside the canvas too for pixel-perfect positioning */}
        <div
          className={bgClass}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            ...((pageBg?.props as any)?.style || {}),
            pointerEvents: 'none',
          }}
        />
        {/* Grid overlay (edit mode only) */}
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
    setState={setPreviewState}
    selectedId={selectedId}
    setSelectedId={setSelectedId}
    updateComponent={updateComponent}
    scale={scale}
    // NEW: forward zIndex
    zIndex={i + 1}
    allComponents={toRender}
  />
))}

      </div>
    </div>
  )
}

/* ---------------- helpers ---------------- */

function pickPageBg(list: UIComponent[]) {
  let bg = list.find(c => c.id === 'page-bg')
  if (bg) return bg
  bg = list.find(
    c =>
      c.type === 'Container' &&
      (c.w === '100%' || c.w === 980) &&
      c.h === '100%' &&
      (c.x ?? 0) === 0 &&
      (c.y ?? 0) === 0
  )
  return bg
}

function walk(
  node: UIComponent,
  parentIdOverride: string | undefined,
  deltaY: number,
  inheritedCtx: Record<string, any>,
  out: UIComponent[],
  state: Record<string, any>
) {
  const loop = (node as any).loop
  const children = node.children || []

  if (loop) {
    const arr: any[] = Array.isArray(state[loop.key]) ? state[loop.key] : []
    const baseY = node.y ?? 0
    const rowH = typeof node.h === 'number' ? node.h : parseInt(String(node.h ?? 0), 10) || 0

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
  const byId = new Map(components.map(c => [c.id, c]))
  const memo = new Map<string, boolean>()
  const isVisible = (c: UIComponent): boolean => {
    if (memo.has(c.id)) return memo.get(c.id)!
    const loopCtx = (c.props as any).__loopCtx || {}
    const ctx = { ...state, ...loopCtx }
    const ownVisible = !c.props?.showIf || safeEvalBool(c.props.showIf, ctx)
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
