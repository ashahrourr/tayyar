// src/CanvasRender/behaviors/HeroCarousel.tsx
import React from 'react'
import type { RefObject } from 'react'
import type { UIComponent } from '@/lib/types'
import { Element } from '@/CanvasRender/Element'

type Props = {
  node: UIComponent
  canvasRef?: RefObject<HTMLDivElement | null>
  state?: Record<string, any>
  setState?: React.Dispatch<React.SetStateAction<Record<string, any>>>
  scale?: number
  zIndex?: number
}

const num = (v: any, fallback = 0) =>
  typeof v === 'number' ? v : (parseFloat(String(v)) || fallback)

function computeRect(comp: UIComponent, canvasW: number, canvasH: number) {
  const w = typeof comp.w === 'number' ? comp.w : comp.w === '100%' ? canvasW : num(comp.w)
  const h = typeof comp.h === 'number' ? comp.h : comp.h === '100%' ? canvasH : num(comp.h)
  return { left: num(comp.x), top: num(comp.y), width: w, height: h }
}

export function HeroCarousel({ node, canvasRef, state, setState, scale, zIndex }: Props) {
  const slides = (node.children ?? []) as UIComponent[]
  const ms = (node.props as any)?.autoplayMs ?? 4000
  const transition: 'fade' | 'slide' = (node.props as any)?.transition ?? 'fade'

  const canvasW = canvasRef?.current?.offsetWidth ?? 980
  const canvasH = canvasRef?.current?.offsetHeight ?? 756
  const rect = computeRect(node, canvasW, canvasH)

  const [idx, setIdx] = React.useState(0)
  React.useEffect(() => {
    if (slides.length < 2) return
    const t = setInterval(() => setIdx(i => (i + 1) % slides.length), ms)
    return () => clearInterval(t)
  }, [slides.length, ms])

  return (
    <div
      style={{
        position: 'absolute',
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        overflow: 'hidden',
        zIndex: zIndex ?? 1,
      }}
    >
      {slides.map((slide, i) => {
        const active = i === idx
        return (
          <div
            key={slide.id}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: transition === 'fade' ? (active ? 1 : 0) : 1,
              transform: transition === 'slide' ? `translateX(${(i - idx) * 100}%)` : 'none',
              transition: transition === 'fade' ? 'opacity 500ms ease' : 'transform 600ms ease',
              pointerEvents: active ? 'auto' : 'none',
            }}
          >
            {/* Render the slide's children (not the slide container itself) */}
            {(slide.children ?? []).map((child) => (
              <Element
                key={child.id}
                mode="preview"
                comp={child}
                canvasRef={canvasRef}
                state={state}
                setState={setState}
                scale={scale}
                zIndex={(zIndex ?? 1) + 1}
                allComponents={(slide.children as UIComponent[]) ?? []}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
