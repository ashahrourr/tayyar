// CanvasRender/renderComponent.tsx
import React, { RefObject, useLayoutEffect, JSX } from 'react'
import { Rnd } from 'react-rnd'
import { UIComponent } from '@/lib/types'
import { interpolate } from '../utils/interpolate'

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
    append: p['onClick.append'],
    increment: p['onClick.increment'],
    set: p['onClick.set'],
    toggle: p['onClick.toggle'],
  }
}

interface Props {
  comp: UIComponent
  mode: 'edit' | 'preview'
  selectedId?: string | null
  setSelectedId?: (id: string) => void
  updateComponent?: (id: string, up: Partial<UIComponent>) => void
  canvasRef?: RefObject<HTMLDivElement | null>
  onNavigate?: (pageId: string) => void
  state?: Record<string, any>
  setState?: React.Dispatch<React.SetStateAction<Record<string, any>>>
}

export function RenderComponent({
  comp,
  mode,
  selectedId,
  setSelectedId,
  updateComponent = () => {},
  canvasRef,
  onNavigate,
  state = {},
  setState,
}: Props): JSX.Element | null {
  if (mode === 'preview') {
    const {
      navigateTo,
      showIf,
      __loopCtx,
      children,                    // <-- we'll handle manually
      ['onClick.append']: _ocAppend,
      ['onClick.increment']: _ocInc,
      ['onClick.set']: _ocSet,
      ['onClick.toggle']: _ocTgl,
      bindValue: _bindValue,
      dangerouslySetInnerHTML: _danger,  // strip it if present
      ...safeProps                       // <-- safeProps has NO children/danger now
    } = comp.props as any
    

    const loopCtx = (__loopCtx as any) || {}
    const ctx = { ...state, ...loopCtx }

    if (showIf && !evalBool(showIf, ctx)) return null

    const onClickActions = extractOnClick(comp.props)

    function applyButtonActions() {
      if (!setState) return
      const { append, increment, set, toggle } = onClickActions
      if (append) {
        const { key, value } = append
        setState((s) => ({ ...s, [key]: [...(s[key] ?? []), value] }))
      }
      if (increment) {
        const k = increment
        setState((s) => ({ ...s, [k]: (s[k] ?? 0) + 1 }))
      }
      if (set) {
        const { key, value } = set
        setState((s) => ({ ...s, [key]: value }))
      }
      if (toggle) {
        const k = toggle
        setState((s) => ({ ...s, [k]: !s[k] }))
      }
    }

    const interpolatedChildren =
      typeof children === 'string' ? interpolate(children, ctx) : children

    const style = {
      position: 'absolute' as const,
      left: comp.x ?? 0,
      top: comp.y ?? 0,
      width: comp.w,
      height: comp.h,
      ...safeProps.style,
      cursor: comp.type === 'Button' ? 'pointer' : undefined,
    }

    const handleClick =
      comp.type === 'Button'
        ? () => {
            applyButtonActions()
            if (navigateTo) onNavigate?.(navigateTo)
          }
        : undefined

    switch (comp.type) {
      case 'Text':
        return (
          <div {...safeProps} style={style} onClick={handleClick}>
            {interpolatedChildren}
          </div>
        )
      case 'Input':
        return <input {...safeProps} style={style} />
      case 'Button':
        return (
          <button {...safeProps} style={style} onClick={handleClick}>
            {interpolatedChildren}
          </button>
        )
        default: {
          const Tag = comp.type === 'Form' ? 'form' : 'div'
          const hasHTML =
            typeof interpolatedChildren === 'string' &&
            /<\/?[a-z][\s\S]*>/i.test(interpolatedChildren)
        
          if (hasHTML) {
            return (
              <Tag
                {...safeProps}                 // no children here
                style={style}
                onClick={handleClick}
                dangerouslySetInnerHTML={{ __html: interpolatedChildren as string }}
              />
            )
          }
        
          return (
            <Tag {...safeProps} style={style} onClick={handleClick}>
              {interpolatedChildren}
            </Tag>
          )
        }
      }        
  }

  /* ===== EDIT MODE ===== */

const isLocked =
  comp.id === 'page-bg' ||
  (comp.type === 'Container' && comp.w === '100%' && comp.h === '100%')


  if (isLocked) {
    return (
      <div
        className={comp.props.className}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />
    )
  }
  

  const loopCtx = (comp.props as any).__loopCtx || {}
  const ctx = { ...(state || {}), ...loopCtx }
  if ((comp.props as any).showIf && !evalBool((comp.props as any).showIf, ctx)) return null

  const border = selectedId === comp.id ? 'border-2 border-[#fda292] rounded' : ''
// right before the return (Edit mode)
const canvasW = canvasRef?.current?.offsetWidth ?? 980
const canvasH = canvasRef?.current?.offsetHeight ?? 756

const widthNum =
  typeof comp.w === 'number' ? comp.w : comp.w === '100%' ? canvasW : parseInt(String(comp.w || 0), 10)
const heightNum =
  typeof comp.h === 'number' ? comp.h : comp.h === '100%' ? canvasH : parseInt(String(comp.h || 0), 10)

  return (
    <Rnd
    size={{ width: widthNum, height: heightNum }}   // ← was parseInt(...)
    position={{ x: comp.x ?? 0, y: comp.y ?? 0 }}
      enableResizing
      onDragStop={(_, d) => updateComponent(comp.id, { x: d.x, y: d.y })}
      onResizeStop={(_, __, ref, ___, pos) =>
        updateComponent(comp.id, { w: ref.offsetWidth, h: ref.offsetHeight, x: pos.x, y: pos.y })
      }
    >
      <div
        onClick={(e) => { e.stopPropagation(); setSelectedId?.(comp.id) }}
        className={border}
        style={{ width: '100%', height: '100%', position: 'absolute' }}
      >
        {renderByTypeWithSize(comp, ctx)}
      </div>
    </Rnd>
  )
}

function renderByTypeWithSize(comp: UIComponent, ctx: Record<string, any> = {}) {
  const style = { width: '100%', height: '100%', ...comp.props.style }

  const loopCtx = (comp.props as any).__loopCtx || {}
  const fullCtx = { ...ctx, ...loopCtx }

  const rawChildren = comp.props.children
  const renderedChildren =
    typeof rawChildren === 'string' ? interpolate(rawChildren, fullCtx) : rawChildren

  // strip children + existing dangerouslySetInnerHTML so we never pass both
  const {
    children: _ch,
    dangerouslySetInnerHTML: _danger,
    className,
    style: _style,            // we already merged above
    ...safeProps
  } = comp.props as any

  const hasHTML =
    typeof renderedChildren === 'string' &&
    /<\/?[a-z][\s\S]*>/i.test(renderedChildren)

  switch (comp.type) {
    case 'Text':
      return (
        <div className={className} style={style}>
          {renderedChildren}
        </div>
      )
    case 'Input':
      return <input {...safeProps} className={className} style={style} />
    case 'Button':
      return (
        <button {...safeProps} className={className} style={style}>
          {renderedChildren}
        </button>
      )
    default: {
      const Tag = comp.type === 'Form' ? 'form' : 'div'
      if (hasHTML) {
        return (
          <Tag
            {...safeProps}              // <-- no children here
            className={className}
            style={style}
            dangerouslySetInnerHTML={{ __html: renderedChildren as string }}
          />
        )
      }
      return (
        <Tag {...safeProps} className={className} style={style}>
          {renderedChildren}
        </Tag>
      )
    }
  }
}
