// src/design/sections/hero/layout.ts
import type { UIComponent } from '@/lib/types'
import { CANVAS_W, CONTAINER_W, LEFT_INSET } from '@/CanvasRender/grid'
import type { HeroSpecResolved } from './spec'

/* minimal token helper */
function tokens(spec: HeroSpecResolved) {
  const dark = spec.theme === 'dark'
  const bg   = spec.palette.base!
  const text = dark ? '#E5E7EB' : '#111827'
  const sub  = dark ? '#94A3B8' : '#6B7280'
  const ring = spec.palette.accent!
  const ctaBg  = spec.palette.accent!
  const ctaTxt = '#ffffff'
  const chip  = dark ? '#111827' : '#F3F4F6'
  const line  = dark ? '#1F2937' : '#E5E7EB'
  return { bg, text, sub, ring, ctaBg, ctaTxt, chip, line }
}

/* rough text height estimator so layout can flow after wrapped text */
function estimateTextHeight(
  text: string | undefined,
  width: number,
  fontSize: number,
  linePx: number
) {
  const avgCharW = fontSize * 0.52 // heuristic
  const charsPerLine = Math.max(1, Math.floor(width / avgCharW))
  const lines = Math.max(1, Math.ceil((text?.length ?? 0) / charsPerLine))
  return Math.ceil(lines * linePx)
}

/* ✅ make IDs stable per layout call (same as header) */
let nextId = 0
const uid = (p: string) => `${p}-${++nextId}`

export function layoutHeroSmart(spec: HeroSpecResolved): UIComponent[] {
  nextId = 0 /* ✅ reset on each layout */

  const t = tokens(spec)
  const H = spec.height
  const padX = LEFT_INSET + 12
  const innerW = CONTAINER_W - 24

  // optional column overrides coming from mocks (keeps spec.ts unchanged)
  const columns = (spec as any).columns ?? {}
  const gap = typeof columns.gap === 'number' ? columns.gap : 24
  const textRatioDefault = spec.variant === 'centered' ? 0.78 : 0.52
  const textRatio = typeof columns.textRatio === 'number' ? columns.textRatio : textRatioDefault

  const out: UIComponent[] = []

  // Background
  out.push({
    id: uid('hero-bg'),
    type: 'Container',
    x: 0, y: 0, w: CANVAS_W, h: H,
    props: { style: { background: t.bg } }
  })

  // 🎨 Spec-driven décor layers (capture, but DO NOT push yet)
  const layers = (spec as any).decor?.layers as Array<{
    id?: string; x: number; y: number; w: number; h: number;
    style?: Record<string, string | number>;
    html?: string;
    blockText?: boolean;
    role?: string;
    props?: Record<string, any>;
  }> | undefined

  // Layout columns (start with ratio)
  let textW  = Math.round(innerW * textRatio)
  const textX  = spec.variant === 'centered' ? padX + Math.round((innerW - textW) / 2) : padX
  let mediaX = padX + textW + gap
  let mediaW = innerW - textW - (spec.variant === 'centered' ? 0 : gap)

  // Optional: align certain decor layers to the text column
  if (layers?.length) {
    for (const L of layers) {
      const alignToText = (L as any).props?.align === 'text'
      if (alignToText) {
        L.x = textX
        // if width wants to match text col
        if ((L as any).props?.width === 'text') {
          L.w = textW
        }
      }
    }
  }

  // ⛔️ Text guard: if any decor layer marks blockText, clamp text width so it
  // doesn't cross into that layer (adds a small margin).
  if (layers?.length) {
    const GUARD_MARGIN = 24
    let guardRight: number | undefined
    for (const L of layers) {
      if ((L as any).blockText === true) {
        const r = Math.max(0, L.x - GUARD_MARGIN) // left edge of blocking layer - margin
        guardRight = guardRight == null ? r : Math.min(guardRight, r)
      }
    }
    if (guardRight != null) {
      // clamp text width so textX + textW <= guardRight
      const maxTextW = Math.max(320, guardRight - textX)
      textW = Math.min(textW, maxTextW)
      // recompute right column based on new textW
      mediaX = padX + textW + gap
      mediaW = innerW - textW - (spec.variant === 'centered' ? 0 : gap)
    }
  }

  let y = spec.padY

  // If a text-rotator is used as the main heading (your heading is empty),
  // reserve its vertical space so the sub/CTAs don't overlap.
  const rotatorLayer = layers?.find(L => L.role === 'text-rotator')
  const headingIsEmpty = !spec.content.heading || spec.content.heading.trim() === ''
  let headingReserved = false
  if (rotatorLayer && headingIsEmpty) {
    const reserveH = Math.max(
      Number(rotatorLayer.h) || 0,
      Math.ceil(((rotatorLayer as any).props?.fontSize ?? 48) * 1.0)
    )
    y += reserveH + 16
    headingReserved = true
  }

  // Kicker
  if (spec.content.kicker) {
    out.push({
      id: uid('kicker'),
      type: 'Text',
      x: textX, y, w: textW, h: 24,
      props: {
        style: {
          color: t.sub, fontSize: 13, fontWeight: 600, letterSpacing: '0.3px',
          textTransform: 'uppercase',
          textAlign: spec.variant === 'centered' ? 'center' : 'left',
        },
        children: spec.content.kicker
      }
    })
    y += 28
  }

  // Heading (only if not reserved for rotator)
  if (!headingReserved) {
    const headingFS = 48
    const headingLH = 56
    const headingH  = Math.max(headingLH, estimateTextHeight(spec.content.heading, textW, headingFS, headingLH))
    out.push({
      id: uid('heading'),
      type: 'Text',
      x: textX, y, w: textW, h: headingH,
      props: {
        style: {
          color: t.text, fontSize: headingFS, fontWeight: 800,
          lineHeight: `${headingLH}px`, letterSpacing: '-0.3px',
          textAlign: spec.variant === 'centered' ? 'center' : 'left',
        },
        children: spec.content.heading
      }
    })
    y += headingH + 16
  }

  // Sub copy (dynamic height)
  if (spec.content.sub) {
    const subFS = 16
    const subLH = 24
    const subH  = Math.max(subLH, estimateTextHeight(spec.content.sub, textW, subFS, subLH))
    out.push({
      id: uid('sub'),
      type: 'Text',
      x: textX, y, w: textW, h: subH,
      props: {
        style: {
          color: t.sub, fontSize: subFS, lineHeight: `${subLH}px`, fontWeight: 500,
          textAlign: spec.variant === 'centered' ? 'center' : 'left',
        },
        children: spec.content.sub
      }
    })
    y += subH + 24
  }

  // CTAs row
  const btnH = 40
  const primaryW = 168
  const secondaryW = 168
  const ctasX = spec.variant === 'centered'
    ? textX + Math.round((textW - (primaryW + 12 + secondaryW)) / 2)
    : textX

  out.push({
    id: uid('cta-primary'),
    type: 'Container',
    x: ctasX, y, w: primaryW, h: btnH,
    props: { style: {
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', borderRadius: 9999, background: t.ctaBg, color: t.ctaTxt,
      fontWeight: 700, fontSize: 14, border: `1px solid ${t.ctaBg}`,
      boxShadow: `0 6px 18px rgba(0,0,0,0.12)`,
    }, children: spec.content.primary?.label ?? 'Get Started', role: 'cta' }
  })
  out.push({
    id: uid('cta-secondary'),
    type: 'Container',
    x: ctasX + primaryW + 12, y, w: secondaryW, h: btnH,
    props: { style: {
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', borderRadius: 9999, background: 'transparent', color: t.text,
      fontWeight: 600, fontSize: 14, border: `1px solid ${t.line}`,
      boxShadow: `0 1px 0 rgba(255,255,255,0.6) inset`,
    }, children: spec.content.secondary?.label ?? 'Learn more' }
  })

  // Media (split variant only) — render ONLY when an actual image exists.
  if (spec.variant === 'split-right-media' && spec.media?.kind === 'image' && spec.media.url) {
    const mediaH = H - spec.padY * 2
    out.push({
      id: uid('media'),
      type: 'Container',
      x: mediaX, y: spec.padY, w: Math.max(280, mediaW), h: mediaH,
      props: {
        style: { borderRadius: 16, overflow: 'hidden', border: `1px solid ${t.line}`, background: t.chip },
        children: `<img src="${spec.media.url}" alt="${spec.media.alt ?? ''}" style="width:100%;height:100%;object-fit:cover;" />`
      }
    })
  }

  // NOW push decor layers (after we know textX/textW and after we reserved space)
  if (layers?.length) {
    for (let i = 0; i < layers.length; i++) {
      const L = layers[i]
      out.push({
        id: uid(L.id ?? `decor-${i + 1}`),
        type: 'Container',
        x: L.x, y: L.y, w: L.w, h: L.h,
        props: {
          ...(L.props || {}),
          role: L.role,
          style: { pointerEvents: 'none', ...(L.style || {}) },
          children: L.html,
        }
      })
    }
  }

  return out
}
