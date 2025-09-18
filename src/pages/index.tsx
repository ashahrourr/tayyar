// pages/index.tsx
import { useRouter } from 'next/router'
import { useState, useRef, useEffect, useMemo } from 'react'
import { mockPages } from '@/lib/mockComponents'
import { UIComponent } from '@/lib/types'
import { updateComponentTree } from '@/utils/updateComponentTree'
import { LayerItem } from '@/LeftSideBar/LayerItem'
import { buildComponentTree } from '@/utils/buildComponentTree'
import { Canvas } from '@/CanvasRender/Canvas'
import { Element } from '@/CanvasRender/Element'
import {
  CANVAS_W,
  CONTAINER_W,
  LEFT_INSET,
  NUDGE_COLS,
  NUDGE_COL,
  NUDGE_GUTTER,
} from '@/CanvasRender/grid'
import { runSectionPipeline } from '@/design/engine/sectionEngine'

/* ---------------- helpers copied from Canvas (minimal) ---------------- */

const GAP = 12
const DEFAULT_PAGE_MIN = 960
const PAGE_BOTTOM_PAD = 160

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
    const loopCtx = (c.props as any)?.__loopCtx || {}
    const ctx = { ...state, ...loopCtx }
    const ownVisible = !(c.props as any)?.showIf || safeEvalBool((c.props as any)?.showIf, ctx)
    if (!ownVisible) return memo.set(c.id, false).get(c.id)!
    let pid = c.parentId
    while (pid) {
      const p = byId.get(pid)!
      if (!isVisible(p)) return memo.set(c.id, false).get(c.id)!
      pid = p?.parentId
    }
    return memo.set(c.id, true).get(c.id)!
  }
  return components.filter(isVisible)
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

/* ---------------- Page-only fullscreen overlay (Framer-style) ---------------- */

function PageOnlyOverlay({
  components,
  onClose,
}: {
  components: UIComponent[]
  onClose: () => void
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)

  const previewState = { cartCount: 0, cartItems: [] as any[] }

  const spaced = useMemo(() => runSectionPipeline(components), [components])
  const expanded = useMemo(() => {
    const out: UIComponent[] = []
    for (const root of spaced) {
      walk(root, undefined, 0, {}, out, previewState)
    }
    return out
  }, [spaced])
  const visible = useMemo(
    () => filterHiddenByAncestors(expanded, previewState),
    [expanded]
  )

  const pageHeight = useMemo(() => {
    const contentBottom = visible.reduce((m, c) => {
      const y = Number(c.y) || 0
      const h = typeof c.h === 'number' ? c.h : parseInt(String(c.h || 0), 10) || 0
      return Math.max(m, y + h)
    }, 0)
    return Math.max(DEFAULT_PAGE_MIN, contentBottom + PAGE_BOTTOM_PAD)
  }, [visible])

  const pageBg = useMemo(() => pickPageBg(visible), [visible])
  const bgProps = ((pageBg?.props ?? {}) as any) || {}
  const toRender = useMemo(() => visible.filter((c) => c.id !== pageBg?.id), [visible, pageBg])

  const [vpWidth, setVpWidth] = useState<number>(0)
  useEffect(() => {
    const update = () => setVpWidth(window.innerWidth)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const scale = useMemo(() => (vpWidth ? vpWidth / CANVAS_W : 1), [vpWidth])
  const scaledW = Math.round(CANVAS_W * scale)
  const scaledH = Math.round(pageHeight * scale)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div ref={viewportRef} className="fixed inset-0 z-[100000] bg-white overflow-auto">
      {/* Show UI button always at top left */}
      <button
        onClick={onClose}
        className="fixed top-3 left-3 px-3 py-1.5 rounded-full text-sm bg-black/70 text-white hover:bg-black/80 z-[100001]"
      >
        Show UI
      </button>

      {/* Scaled wrapper pinned at the top */}
      <div
        style={{
          width: scaledW,
          height: scaledH,
          margin: '0 auto', // flush to top
          position: 'relative',
        }}
      >
        <div
          ref={pageRef}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: CANVAS_W,
            height: pageHeight,
            position: 'absolute',
            left: 0,
            top: 0,
            background: 'transparent',
          }}
        >
          {/* Background */}
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
          {/* Components */}
          {toRender.map((c, i) => (
            <Element
              key={c.id}
              mode="preview"
              comp={c}
              selectedId={null}
              setSelectedId={() => {}}
              updateComponent={() => {}}
              canvasRef={pageRef as any}
              zIndex={i + 1}
              allComponents={toRender}
            />
          ))}
        </div>
      </div>
    </div>
  )
}


/* ---------------------------------- Page ---------------------------------- */

export default function Home() {
  const router = useRouter()
  const projectId = router.query.project_id as string | undefined

  const [leftWidth] = useState(230)
  const [rightWidth] = useState(230)

  const [pages, setPages] = useState<typeof mockPages>([])
  const [currentPageId, setCurrentPageId] = useState('page-1')
  const currentPage = pages.find(p => p.id === currentPageId)
  const components = currentPage?.components ?? []
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const layerTree = buildComponentTree(components)

  const [mode, setMode] = useState<'edit' | 'preview'>('edit')

  // Page-only overlay flag
  const [pageOnly, setPageOnly] = useState(false)

  useEffect(() => {
    if (!projectId) setPages(mockPages)
  }, [projectId])

  function handleUpdate(id: string, updates: Partial<UIComponent>) {
    setPages(prev =>
      prev.map(p =>
        p.id === currentPageId
          ? { ...p, components: updateComponentTree(p.components, id, updates) }
          : p
      )
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#262624]">
      <header
        className="h-14 bg-[#1f1e1d] border-b flex items-center justify-between px-4 sticky top-0 z-50"
        style={{ borderColor: '#4a4a47' }}
      >
        <div className="flex items-center">
          <span className="text-xl font-bold text-white">Tayyar</span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setMode('edit')}
            className={mode === 'edit' ? 'text-white font-semibold' : 'text-[#aaa89f] hover:text-white'}
          >
            Edit
          </button>
          <button
            onClick={() => setMode('preview')}
            className={mode === 'preview' ? 'text-white font-semibold' : 'text-[#aaa89f] hover:text-white'}
          >
            Preview
          </button>
          {/* Framer-style "Full Screen" (page only) */}
          <button
            onClick={() => { setMode('preview'); setPageOnly(true) }}
            className="text-[#aaa89f] hover:text-white ml-4"
          >
            Full Screen
          </button>
        </div>
      </header>

      <div className="flex flex-1 h-[calc(100vh-3.5rem)]">
        {/* Left Sidebar */}
        <div
          className="flex-none shrink-0 min-h-screen min-w-[230px] bg-[#1f1e1d] border-r relative"
          style={{ borderColor: '#4a4a47', width: `${leftWidth}px` }}
        >
          <div className="p-4 text-[#aaa89f] overflow-y-auto h-full max-h-[calc(100vh-3.5rem)]">
            <div className="mb-4 space-y-1">
              <h2 className="text-white font-bold text-sm">Pages</h2>
              {pages.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setCurrentPageId(p.id); setSelectedId(null) }}
                  className={`block w-full text-left px-2 py-1 rounded ${
                    p.id === currentPageId ? 'bg-[#444] text-white' : 'text-[#aaa89f] hover:bg-[#333]'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            <h2 className="text-white font-bold text-sm mb-2">Layers</h2>
            {layerTree.map(root => (
              <LayerItem
                key={root.id}
                comp={root}
                selectedId={selectedId}
                setSelectedId={setSelectedId}
                depth={0}
              />
            ))}
          </div>
        </div>

        {/* Center Pane */}
        <div className="flex-1 min-w-0 relative">
          <div className="absolute inset-0 bg-[#0b0b0b] overflow-hidden">
            <Canvas
              mode={mode}
              components={components}
              navigate={setCurrentPageId}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              updateComponent={handleUpdate}
            />
          </div>
        </div>

        {/* Right Sidebar */}
        <div
          className="flex-none shrink-0 min-h-screen min-w-[230px] bg-[#1f1e1d] border-l relative"
          style={{ borderColor: '#4a4a47', width: `${rightWidth}px` }}
        />
      </div>

      {/* Page-only overlay (covers the editor) */}
      {pageOnly && (
        <PageOnlyOverlay
          components={components}
          onClose={() => setPageOnly(false)}
        />
      )}
    </div>
  )
}
