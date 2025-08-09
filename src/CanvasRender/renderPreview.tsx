// CanvasRender/renderPreview.tsx
import React, { useState, useEffect, useRef } from 'react'
import { UIComponent } from '@/lib/types'
import { RenderComponent } from '@/CanvasRender/renderComponent'

const CANVAS_W = 980
const CANVAS_H = 756
const GAP = 12

export function RenderPreview({
  components,
  navigate,
}: {
  components: UIComponent[]
  navigate: (pageId: string) => void
}) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  // design-time preview state (persists while in Preview mode)
  const [previewState, setPreviewState] = useState<Record<string, any>>({
    cartCount: 0,
    cartItems: [],
  })

  // Scale by WIDTH only; allow vertical scroll.
  useEffect(() => {
    function compute() {
      if (!wrapperRef.current) return
      const parent = wrapperRef.current.parentElement!
      const { clientWidth } = parent
      setScale(Math.min(clientWidth / CANVAS_W, 1))
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  // Build a flat list by walking the authored tree. Handle loops inline.
  const expanded: UIComponent[] = []
  for (const root of components) {
    walk(root, /*parentIdOverride*/ undefined, /*deltaY*/ 0, /*inheritedCtx*/ {}, expanded, previewState)
  }

  // Filter out anything hidden by its own showIf or an ancestor's showIf
  const visible = filterHiddenByAncestors(expanded, previewState)

  // ---- Dynamic page height (max y + h + padding), fallback to CANVAS_H ----
  const pageHeight =
    Math.max(
      CANVAS_H,
      visible.reduce((m, c) => {
        const y = typeof c.y === 'number' ? c.y : 0
        const h = typeof c.h === 'number' ? c.h : parseInt(String(c.h || 0), 10) || 0
        return Math.max(m, y + h)
      }, 0) + 24 // little bottom padding
    )

  // Try to use an authored "page background" if present for className/style
  const pageBg = pickPageBg(visible)
  const toRender = visible.filter(c => c.id !== pageBg?.id)

  return (
    <div ref={wrapperRef} className="flex justify-center items-start w-full h-full overflow-auto">
      <div
        style={{
          width: CANVAS_W,
          height: pageHeight,                // true dynamic height
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'relative',
          pointerEvents: 'auto',
        }}
      >
        {/* full-height background layer */}
        <div
          className={pageBg?.props?.className}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',                   // stretches to pageHeight
            ...(pageBg?.props?.style || {}),
            pointerEvents: 'none',
          }}
        />

        {/* rest of the components */}
        {toRender.map((c) => (
          <RenderComponent
            key={c.id}
            comp={c}
            mode="preview"
            onNavigate={navigate}
            state={previewState}
            setState={setPreviewState}
          />
        ))}
      </div>
    </div>
  )
}

/* ---------------- helpers ---------------- */

function pickPageBg(list: UIComponent[]) {
  // Prefer explicit id
  let bg = list.find(c => c.id === 'page-bg')
  if (bg) return bg
  // Fallback: heuristic for full-bleed container
  bg = list.find(
    c =>
      c.type === 'Container' &&
      (c.w === '100%' || c.w === CANVAS_W) &&
      (c.h === '100%') &&
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

      for (const child of children) {
        walk(child, rootClone.id, delta, loopCtx, out, state)
      }
    })
    return // do NOT render the original loop root (only its clones)
  }

  // Non-loop node: clone once with current delta and context
  const cloned: UIComponent = {
    ...node,
    parentId: parentIdOverride ?? node.parentId,
    y: (node.y ?? 0) + deltaY,
    props: { ...node.props, __loopCtx: inheritedCtx },
  }
  out.push(cloned)

  for (const child of children) {
    walk(child, cloned.id, deltaY, inheritedCtx, out, state)
  }
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
