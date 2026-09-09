// src/CanvasRender/Element.tsx
import React, { JSX, RefObject } from 'react'
import { Rnd } from 'react-rnd'
import { UIComponent } from '@/lib/types'
import { interpolate } from '@/utils/interpolate'
import { maybeSnapXWithEdges, maybeSnapY, maybeSnapWidth } from './grid'
import * as Lucide from 'lucide-react'
import { normalizeHeaderSpec, isHeaderSpec } from '@/design/sections/header/spec'
import { layoutHeaderSmart } from '@/design/sections/header/layoutHeaderSmart'
import { HeroCarousel } from '../design/sections/hero/HeroCarousel'
import { TextRotator } from '@/design/sections/hero/TextRotator'

type Mode = 'edit' | 'preview'

/* ================== small live-offset store (global) ================== */
type Offset = { dx: number; dy: number }
type LiveDragState = {
  sectionId?: string
  sourceId?: string
  offset: Offset
}

const liveStore = {
  state: { sectionId: undefined, sourceId: undefined, offset: { dx: 0, dy: 0 } } as LiveDragState,
  listeners: new Set<() => void>(),
  set(sectionId?: string, sourceId?: string, offset: Offset = { dx: 0, dy: 0 }) {
    this.state = { sectionId, sourceId, offset }
    this.listeners.forEach((fn) => fn())
  },
  clear() {
    this.set(undefined, undefined, { dx: 0, dy: 0 })
  },
  subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  },
}

function useLiveSectionOffset(targetSectionId?: string) {
  const [val, setVal] = React.useState<LiveDragState>(liveStore.state)
  React.useEffect(() => liveStore.subscribe(() => setVal(liveStore.state)), [])
  const active = !!(targetSectionId && val.sectionId === targetSectionId && val.sourceId)
  if (!active) return { dx: 0, dy: 0, sourceId: undefined as string | undefined, active: false }
  return { ...val.offset, sourceId: val.sourceId, active: true }
}
/* ===================================================================== */

function evalBool(expr: string, ctx: Record<string, any> = {}): boolean {
  try {
    const fn = new Function(...Object.keys(ctx), `return (${expr})`)
    return !!fn(...Object.values(ctx))
  } catch {
    return false
  }
}

function extractOnClick(p: any) {
  return {
    append: p?.['onClick.append'],
    increment: p?.['onClick.increment'],
    set: p?.['onClick.set'],
    toggle: p?.['onClick.toggle'],
  }
}

const isInlineType = (t: UIComponent['type']) =>
  t === 'Button' || t === 'Input' || t === 'Text' || t === 'Icon'

const CONTROL_H = 40;
const minHFor = (t: UIComponent['type']) =>
    t === 'Button' || t === 'Input' ? CONTROL_H
  : t === 'Text' || t === 'Icon' ? 24
  : 24;
const defaultWFor = (t: UIComponent['type']) =>
    t === 'Button' ? 140
  : t === 'Input' ? 260
  : t === 'Text' ? 200
  : t === 'Icon' ? 24
  : 240
function estimateInlineWidth(comp: UIComponent): number {
  const raw = (comp.props as any)?.children ?? ''
  const text = typeof raw === 'string' ? raw.replace(/<[^>]+>/g, '') : ''
  const charW = 8.5
  const sidePad = 32
  const base = Math.ceil(text.length * charW) + sidePad
  const min = comp.type === 'Button' ? 120 : comp.type === 'Input' ? 220 : 160
  const max = 480
  return Math.max(min, Math.min(base, max))
}

function computeRect(comp: UIComponent, canvasW: number, canvasH: number) {
  const w =
    typeof comp.w === 'number' ? comp.w :
    comp.w === '100%' ? canvasW :
    comp.w === 'fit-content' ? (isInlineType(comp.type) ? estimateInlineWidth(comp) : defaultWFor(comp.type)) :
    (parseInt(String(comp.w || 0), 10) || defaultWFor(comp.type))

  const baseH =
    typeof comp.h === 'number' ? comp.h :
    comp.h === '100%' ? canvasH :
    (comp.h === 'fit-content' || comp.h == null)
      ? (isInlineType(comp.type) ? minHFor(comp.type) : 48)
      : (parseInt(String(comp.h || 0), 10) || (isInlineType(comp.type) ? minHFor(comp.type) : 24))

  const h = Math.max(baseH, isInlineType(comp.type) ? minHFor(comp.type) : baseH)

  return { left: comp.x ?? 0, top: comp.y ?? 0, width: w, height: h }
}

/* ---------- helpers for block drag ---------- */
function buildMaps(list: UIComponent[]) {
  const byId = new Map<string, UIComponent>()
  const kids = new Map<string, UIComponent[]>()
  for (const c of list) {
    byId.set(c.id, c)
    if (c.parentId) {
      const arr = kids.get(c.parentId) ?? []
      arr.push(c)
      kids.set(c.parentId, arr)
    }
  }
  return { byId, kids }
}

function findSectionRoot(comp: UIComponent, byId: Map<string, UIComponent>) {
  let cur: UIComponent | undefined = comp
  while (cur) {
    if ((cur as any).isSection) return cur
    cur = cur.parentId ? byId.get(cur.parentId) : undefined
  }
  return undefined
}

function collectSubtree(root: UIComponent, kids: Map<string, UIComponent[]>) {
  const out: UIComponent[] = [root]
  const stack = [root]
  while (stack.length) {
    const node = stack.pop()!
    const ch = kids.get(node.id) ?? []
    out.push(...ch)
    stack.push(...ch)
  }
  return out
}

/* ---- simple className passthrough (no tokens) ---- */
function getClassName(p?: any): string {
  const cls = p?.className
  if (!cls) return ''
  return Array.isArray(cls) ? cls.filter(Boolean).join(' ') : String(cls)
}


// [ADD] Generic icon renderer (safe fallback if name is wrong)
type IconProps = {
  pack?: 'lucide'
  name: string            // e.g. 'Bell', 'User', 'ShoppingCart'
  size?: number           // default 18
  strokeWidth?: number    // default 1.75
  color?: string
  style?: React.CSSProperties
}

function IconNode({
  pack = 'lucide',
  name,
  size = 18,
  strokeWidth = 1.75,
  color,
  style,
}: IconProps) {
  // Find the component on the Lucide namespace
  const Comp = (Lucide as any)[name] as React.ComponentType<any> | undefined
  const Safe = Comp || (Lucide as any).HelpCircle

  return (
    <span style={{ display: 'inline-flex', lineHeight: 0, ...style }}>
      <Safe size={size} strokeWidth={strokeWidth} color={color} />
    </span>
  )
}

/* ============================== Component ============================== */
export function Element({
  mode,
  comp,
  selectedId,
  setSelectedId,
  updateComponent = () => {},
  canvasRef,
  onNavigate,
  state = {},
  setState,
  scale = 1,
  zIndex = 1,
  allComponents = [],
}: {
  mode: Mode
  comp: UIComponent
  selectedId?: string | null
  setSelectedId?: (id: string) => void
  updateComponent?: (id: string, up: Partial<UIComponent>) => void
  canvasRef?: RefObject<HTMLDivElement | null>
  onNavigate?: (pageId: string) => void
  state?: Record<string, any>
  setState?: React.Dispatch<React.SetStateAction<Record<string, any>>>
  scale?: number
  zIndex?: number
  allComponents?: UIComponent[]
}): JSX.Element | null {

  /* ----- compute context shared by both modes (no hooks below this line change order) ----- */
  const loopCtx = (comp.props as any)?.__loopCtx || {}
  const ctx = { ...(state || {}), ...loopCtx }
  const showIfExpr = (comp.props as any)?.showIf

  const canvasW = canvasRef?.current?.offsetWidth ?? 980
  const canvasH = canvasRef?.current?.offsetHeight ?? 756
  const rect = computeRect(comp, canvasW, canvasH)

  // Measuring ref for auto-height (used in both preview & edit)
  const innerRef = React.useRef<HTMLElement | null>(null)
  const [measuredH, setMeasuredH] = React.useState<number | null>(null)
  // keep this ref on the inner rendered element (you already have innerRef)
  const [selRadius, setSelRadius] = React.useState('0px');
  const [outset, setOutset] = React.useState(0); // px to grow the overlay
  const CLICK_SLOP = 3; // px: treat below this as a click, not a drag

  React.useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const cs = getComputedStyle(el);

    setSelRadius(cs.borderRadius);

    const bw = Math.max(
      parseFloat(cs.borderTopWidth || '0'),
      parseFloat(cs.borderRightWidth || '0'),
      parseFloat(cs.borderBottomWidth || '0'),
      parseFloat(cs.borderLeftWidth || '0')
    );

    let ring = 0;
    const raw = cs.boxShadow || '';
    for (const layer of raw.split(',')) {
      const s = layer.trim();
      if (!s || /inset/i.test(s)) continue;
      const nums = s.match(/-?\d+\.?\d*px/g) || [];
      if (nums.length >= 4) {
        const blur = parseFloat(nums[2]);
        const spread = parseFloat(nums[3]);
        if (blur === 0 && spread > 0) ring = Math.max(ring, spread);
      }
    }

    setOutset(Math.ceil(bw + ring));
  }, [comp.id]);

  React.useLayoutEffect(() => {
    const el = innerRef.current
    if (!el) return
    const h = Math.ceil(el.scrollHeight)
    if (Number.isFinite(h) && h > 0) setMeasuredH(h)
  }, [comp.id, (comp.props as any)?.children, rect.width, scale])

  const { byId, kids } = React.useMemo(() => buildMaps(allComponents), [allComponents])
  const mySection = React.useMemo(() => findSectionRoot(comp, byId), [comp, byId])
  const mySectionId = mySection?.id
  const isSectionRoot = !!(mySectionId && comp.id === mySectionId)
  const role = ((comp.props as any) || {}).role

  const { dx: liveDx, dy: liveDy, sourceId: liveSourceId, active: liveActive } =
    useLiveSectionOffset(mySectionId)

  // ⛔️ DO NOT return before hooks are declared; declare all hooks first:
  const [dragging, setDragging] = React.useState(false)
  const [blockDrag, setBlockDrag] = React.useState(false)
  const dragStartRef = React.useRef<{ left: number; top: number }>({ left: rect.left, top: rect.top })

  // Hooks must run on every render, so the early return for hidden nodes happens
  // below, after the effects. The effects no-op while hidden.
  const isHidden = !!(showIfExpr && !evalBool(showIfExpr, ctx))

  const zBoost = liveActive ? 10000 : 0

  const wantsAuto =
    comp.h === 'fit-content' || ((comp.props as any)?.autoHeight === true)

  // auto-height sync
  React.useEffect(() => {
    if (isHidden) return;
    if (mode !== 'edit') return;
    if (measuredH == null) return;

    const optedIn = (comp.h === 'fit-content') || ((comp.props as any)?.autoHeight === true);
    const isText = comp.type === 'Text';
    const frameH = rect.height;
    const overflows = measuredH > frameH + 1;
    const shouldAuto = optedIn || (isText && overflows);

    if (!shouldAuto) return;

    const target = Math.max(measuredH, minHFor(comp.type));
    const newH = maybeSnapY(target);

    if (typeof comp.h !== 'number' || comp.h !== newH) {
      updateComponent?.(comp.id, { h: newH });
    }
  }, [isHidden, mode, measuredH, comp.id, comp.h, rect.height, updateComponent]);

  // ensure parents contain children (edit mode)
  React.useEffect(() => {
    if (isHidden) return;
    if (mode !== 'edit') return
    if (measuredH == null) return
    if (!comp.parentId) return

    const num = (v: any) =>
      typeof v === 'number' ? v : (parseInt(String(v ?? 0), 10) || 0)

    const ensureParentContainsChildren = (pid?: string) => {
      if (!pid) return
      const p = byId.get(pid)
      if (!p) return

      // skip section roots
      if ((p as any).isSection) return;

      const pY = num(p.y)
      const curH = num(p.h)

      const ch = kids.get(pid) ?? []
      let maxBottom = pY
      for (const child of ch) {
        const cy = num(child.y)
        const chh = num(child.h)
        maxBottom = Math.max(maxBottom, cy + chh)
      }

      const needH = maybeSnapY(Math.max(curH, (maxBottom - pY) + 16))
      if (needH > curH) {
        updateComponent?.(p.id, { h: needH })
      }

      if (p.parentId) ensureParentContainsChildren(p.parentId)
    }

    ensureParentContainsChildren(comp.parentId)
  }, [isHidden, mode, measuredH, comp.parentId, byId, kids, updateComponent])

  if (isHidden) return null


/* ===== PREVIEW ===== */
if (mode === 'preview') {
  const {
    navigateTo,
    __loopCtx: _ignore,
    children,
    dangerouslySetInnerHTML: _danger,
    bindValue,
    ...safeProps
  } = (comp.props as any) ?? {}

  const interpolatedChildren =
    typeof children === 'string' ? interpolate(children, ctx) : children

  const className = getClassName(safeProps)
  const { className: _cn, variant: _v, mix: _m, ...restProps } = (safeProps as any) || {}

  const outerHeight = wantsAuto && measuredH ? measuredH : rect.height

  // HERO ROTATION (minimal + parent guard)
  const parentRole = comp.parentId
    ? (byId.get(comp.parentId)?.props as any)?.role
    : undefined

  // Skip the slide container itself AND any nodes under a slide.
  if (role === 'hero-slide' || parentRole === 'hero-slide') return null

  if (role === 'hero-carousel') {
    return (
      <HeroCarousel
        node={comp}
        canvasRef={canvasRef}
        state={state}
        setState={setState}
        scale={scale}
        zIndex={zIndex}
      />
    )
  }

  if (comp.type === 'TextRotator') {
    return (
      <TextRotator
        node={comp}
        canvasRef={canvasRef}
        zIndex={zIndex}
      />
    )
  }

  const outerBoxStyle: React.CSSProperties = {
    position: 'absolute',
    left: rect.left + (mySectionId && liveSourceId !== comp.id ? liveDx : 0),
    top: rect.top + (mySectionId && liveSourceId !== comp.id ? liveDy : 0),
    width: rect.width,
    height: outerHeight,
    zIndex: zIndex + zBoost,
  }

  const innerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    whiteSpace: comp.type === 'Button' || comp.type === 'Input' ? 'nowrap' : 'normal',
    wordBreak: comp.type === 'Text' ? 'break-word' : 'normal',
    ...(safeProps?.style || {}),
    cursor: comp.type === 'Button' ? 'pointer' : (safeProps?.style?.cursor as any),
  }

  const actions = extractOnClick(comp.props)
  const handleClick =
    comp.type === 'Button'
      ? () => {
          if (setState) {
            const { append, increment, set, toggle } = actions
            if (append) {
              const { key, value } = append
              setState(s => ({ ...s, [key]: [...(s[key] ?? []), value] }))
            }
            if (increment) {
              const k = increment
              setState(s => ({ ...s, [k]: (s[k] ?? 0) + 1 }))
            }
            if (set) {
              const { key, value } = set
              setState(s => ({ ...s, [key]: value }))
            }
            if (toggle) {
              const k = toggle
              setState(s => ({ ...s, [k]: !s[k] }))
            }
          }
          if (navigateTo) onNavigate?.(navigateTo)
        }
      : undefined

  const hasHTML =
    typeof interpolatedChildren === 'string' &&
    /<\/?[a-z][\s\S]*>/i.test(interpolatedChildren)

  const Tag = comp.type === 'Form' ? 'form' : 'div'

  return (
    <div style={outerBoxStyle}>
      {comp.type === 'Input' && (safeProps as any)?.bindValue && setState ? (
        <input
          ref={innerRef as any}
          {...restProps}
          className={className}
          style={innerStyle}
          value={(state?.[(safeProps as any).bindValue] ?? '') as any}
          onChange={(e) =>
            setState(s => ({ ...s, [(safeProps as any).bindValue]: e.currentTarget.value }))
          }
        />
      ) : comp.type === 'Text' ? (
        <div
          ref={innerRef as any}
          className={className}
          style={innerStyle}
          onClick={handleClick}
        >
          {interpolatedChildren}
        </div>
      ) : comp.type === 'Button' ? (
        <button
          ref={innerRef as any}
          className={className}
          style={innerStyle}
          onClick={handleClick}
        >
          {interpolatedChildren}
        </button>
      ) : comp.type === 'Icon' ? (
        <div
          ref={innerRef as any}
          className={className}
          style={{ ...innerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={handleClick}
        >
          <IconNode
            pack={(safeProps as any)?.pack ?? 'lucide'}
            name={(safeProps as any)?.name ?? 'HelpCircle'}
            size={(safeProps as any)?.size ?? 18}
            strokeWidth={(safeProps as any)?.strokeWidth ?? 1.75}
            color={(safeProps as any)?.color}
            style={(safeProps as any)?.style}
          />
        </div>
      ) : comp.type === 'Image' ? (
        <img
          ref={innerRef as any}
          src={(safeProps as any)?.src}
          alt={(safeProps as any)?.alt ?? ''}
          className={className}
          style={{
            ...innerStyle,
            objectFit: (safeProps as any)?.objectFit ?? 'cover',
            display: 'block',
          }}
        />
      ) : hasHTML ? (
        <Tag
          ref={innerRef as any}
          {...restProps}
          className={className}
          style={innerStyle}
          onClick={handleClick}
          dangerouslySetInnerHTML={{ __html: interpolatedChildren as string }}
        />
      ) : (
        <Tag
          ref={innerRef as any}
          {...restProps}
          className={className}
          style={innerStyle}
          onClick={handleClick}
        >
          {interpolatedChildren}
        </Tag>
      )}
    </div>
  )
}


  /* ===== EDIT ===== */
if (role === 'hero-slide' && (((comp.props as any).index ?? 0) > 0)) {
  return null // only show the first slide in edit
}

  const isLocked =
  comp.id === 'page-bg' ||
  (comp as any).isSection || // ← lock section roots created by the pipeline
  (comp.type === 'Container' && comp.w === '100%' && comp.h === '100%')

  if (isLocked) {
    const p = (comp.props as any) || {}
    const cls = getClassName(p)
    return (
      <div
        className={cls}
        style={{
          position: 'absolute',
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          pointerEvents: 'none',
        }}
      />
    )
  }
  

  return (
    <Rnd
      key={`${comp.id}:${rect.left}:${rect.top}:${rect.width}:${rect.height}`}
      default={{ x: rect.left, y: rect.top, width: rect.width, height: rect.height }}
      scale={scale}
      enableResizing
      style={{ zIndex: zIndex + zBoost }}
      onDragStart={(e) => {
        setDragging(true)
        const wantsBlock = (e as MouseEvent).shiftKey === true || isSectionRoot
        setBlockDrag(wantsBlock)
        dragStartRef.current = { left: rect.left, top: rect.top }
        if (wantsBlock && mySectionId) {
          liveStore.set(mySectionId, comp.id, { dx: 0, dy: 0 })
        }
      }}
      onDrag={(e, d) => {
        if (!blockDrag || !mySectionId || !mySection) return
        const dx = d.x - dragStartRef.current.left
        const dy = d.y - dragStartRef.current.top
        liveStore.set(mySectionId, comp.id, { dx, dy })
      }}
      onDragStop={(_, d) => {
        setDragging(false)
        const dx = d.x - dragStartRef.current.left
        const dy = d.y - dragStartRef.current.top
        const moved = Math.abs(dx) >= CLICK_SLOP || Math.abs(dy) >= CLICK_SLOP

        if (!blockDrag) {
          if (!moved) return
          const x = maybeSnapXWithEdges(d.x, rect.width)
          const y = maybeSnapY(d.y)
          updateComponent(comp.id, { x, y })
          return
        }

        if (!mySectionId || !mySection) {
          if (!moved) { liveStore.clear(); return }
          const x = maybeSnapXWithEdges(d.x, rect.width)
          const y = maybeSnapY(d.y)
          updateComponent(comp.id, { x, y })
          liveStore.clear()
          return
        }

        if (!moved) { liveStore.clear(); return }

        const newRootX = Number(mySection.x ?? 0) + dx
        const newRootY = Number(mySection.y ?? 0) + dy
        updateComponent(mySection.id, { x: newRootX, y: newRootY })

        const subtree = collectSubtree(mySection, kids)
        for (const node of subtree) {
          if (node.id === mySection.id) continue
          updateComponent(node.id, { x: (node.x ?? 0) + dx, y: (node.y ?? 0) + dy })
        }
        liveStore.clear()
      }}
      onResizeStop={(_, __, ref, ___, pos) => {
        setDragging(false)
        const rawW = ref.offsetWidth
        const w = maybeSnapWidth(pos.x, rawW)
        const y = maybeSnapY(pos.y)
        const x = maybeSnapXWithEdges(pos.x, w)
        updateComponent(comp.id, { x, y, w, h: ref.offsetHeight })
      }}
    >
      <div
        onPointerDown={(e) => { e.stopPropagation(); setSelectedId?.(comp.id) }}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          willChange: liveActive ? 'transform' : (dragging ? 'transform' : undefined),
          transform:
            mySectionId && liveActive && liveSourceId !== comp.id
              ? `translate(${liveDx}px, ${liveDy}px)`
              : undefined,
          zIndex: zIndex + zBoost,
        }}
      >
        {renderInner(comp, ctx, innerRef, canvasRef)}
        {selectedId === comp.id && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: -outset,
              top: -outset,
              width: `calc(100% + ${outset * 2}px)`,
              height: `calc(100% + ${outset * 2}px)`,
              pointerEvents: 'none',
              boxSizing: 'border-box',
              border: '2px solid #f97316',
              borderRadius: `calc(${selRadius} + ${outset}px)`,
              zIndex: (zIndex ?? 1) + 100000,
            }}
          />
        )}
      </div>
    </Rnd>
  )
}

function renderInner(
  comp: UIComponent,
  ctx: Record<string, any>,
  ref?: React.Ref<any>,
  canvasRef?: RefObject<HTMLDivElement | null> // 👈 add this
) {
  const rawChildren = (comp.props as any)?.children
  const children = typeof rawChildren === 'string' ? interpolate(rawChildren, ctx) : rawChildren

  const {
    children: _ch,
    dangerouslySetInnerHTML: _danger,
    className,
    variant: _variant,
    mix: _mix,
    style: inlineStyle,
    ...safeProps
  } = (comp.props as any) ?? {}

  const classNameResolved = getClassName({ className })
  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    whiteSpace: comp.type === 'Button' || comp.type === 'Input' ? 'nowrap' : 'normal',
    wordBreak: comp.type === 'Text' ? 'break-word' : 'normal',
    ...(inlineStyle || {}),
  };

  const hasHTML = typeof children === 'string' && /<\/?[a-z][\s\S]*>/i.test(children)
  if (comp.type === 'Icon') {
    return (
      <div
        ref={ref as any}
        className={classNameResolved}
        style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <IconNode
          pack={(safeProps as any)?.pack ?? 'lucide'}
          name={(safeProps as any)?.name ?? 'HelpCircle'}
          size={(safeProps as any)?.size ?? 18}
          strokeWidth={(safeProps as any)?.strokeWidth ?? 1.75}
          color={(safeProps as any)?.color}
          style={(safeProps as any)?.style}
        />
      </div>
    )
  }
  if (comp.type === 'Text')
    return <div ref={ref as any} className={classNameResolved} style={style}>{children}</div>
  if (comp.type === 'Input')
    return <input ref={ref as any} {...safeProps} className={classNameResolved} style={style} />
  if (comp.type === 'Button')
    return <button ref={ref as any} {...safeProps} className={classNameResolved} style={style}>{children}</button>
  if (comp.type === 'TextRotator') {
    return (
      <TextRotator
        node={comp}
        canvasRef={canvasRef} // pass through the real ref
        zIndex={1}
        inline
      />
    )
  }
  if (comp.type === 'Image') {
    return (
      <img
        ref={ref as any}
        src={(safeProps as any)?.src}
        alt={(safeProps as any)?.alt ?? ''}
        className={classNameResolved}
        style={{
          ...style,
          objectFit: (safeProps as any)?.objectFit ?? 'cover',
          display: 'block',
        }}
      />
    )
  }
  
  
  
  const Tag = comp.type === 'Form' ? 'form' : 'div'
  if (hasHTML) {
    return (
      <Tag
        ref={ref as any}
        {...safeProps}
        className={classNameResolved}
        style={style}
        dangerouslySetInnerHTML={{ __html: children as string }}
      />
    )
  }
  return <Tag ref={ref as any} {...safeProps} className={classNameResolved} style={style}>{children}</Tag>
}
