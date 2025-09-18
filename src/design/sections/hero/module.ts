// src/design/sections/hero/module.ts
import type { UIComponent } from '@/lib/types'
import type { SectionModule } from '@/design/engine/sectionEngine'
import { CANVAS_W } from '@/CanvasRender/grid'
import { resolveHeroSpec, type HeroSpecResolved } from './spec'
import { layoutHeroSmart } from './layout'

function isHero(n: UIComponent) {
  return String((n.props as any)?.sectionTemplate || '').toLowerCase() === 'hero'
}
function isHeaderRoot(n: UIComponent) {
  return n.type === 'Container' &&
    String((n.props as any)?.sectionTemplate || '').toLowerCase() === 'header'
}
const num = (v: unknown) => (typeof v === 'number' ? v : parseFloat(String(v)) || 0)

function getHeaderBottom(roots: UIComponent[]): number {
  let bottom = 0
  const walk = (list: UIComponent[]) => {
    for (const n of list) {
      if (isHeaderRoot(n)) bottom = Math.max(bottom, num(n.y) + num(n.h))
      if (n.children?.length) walk(n.children)
    }
  }
  walk(roots)
  return bottom
}

function ensureHeroContainer(
  sec: UIComponent,
  resolved: HeroSpecResolved,
  yOffset: number
) {
  (sec as any).isSection = true
  const sp = (sec.props ||= {})
  sp.sectionTemplate = 'hero'
  sp.style = { ...(sp.style || {}), position: 'relative', zIndex: 0 }

  sec.x = 0
  sec.y = yOffset
  sec.w = CANVAS_W as any
  sec.h = resolved.height as any
}

function translateY(nodes: UIComponent[], dy: number): UIComponent[] {
  return nodes.map(n => ({
    ...n,
    y: num(n.y) + dy,
    children: n.children ? translateY(n.children, dy) : undefined,
  }))
}

function mergeSlide(base: HeroSpecResolved, s: any): HeroSpecResolved {
  return {
    ...base,
    palette: { ...base.palette, ...(s?.palette ?? {}) },
    content: { ...base.content, ...(s?.content ?? {}) },
    media: s?.media ?? base.media,
  }
}

export const heroModule: SectionModule = {
  id: 'hero',
  apply: (roots) => {
    const SECTION_GAP = 16
    const startY = getHeaderBottom(roots) + SECTION_GAP

    const all: UIComponent[] = []
    ;(function collect(list: UIComponent[]) {
      for (const n of list) {
        all.push(n)
        if (n.children?.length) collect(n.children)
      }
    })(roots)

    let yCursor = startY

    for (const sec of all) {
      if (!isHero(sec)) continue

      const rawSpec = (sec.props as any)?.spec ?? (sec.props as any)?.layoutSpec
      const resolved = resolveHeroSpec(rawSpec ?? {})
      const absolute = Boolean((sec.props as any)?.absolute)
      const baseY = absolute ? (num(sec.y) || yCursor) : yCursor

      ensureHeroContainer(sec, resolved, baseY)

      // 🔁 If rotating, emit a carousel wrapper with slide containers
      if (resolved.rotating && resolved.rotating.slides?.length >= 2) {
        const { intervalMs, transition, slides } = resolved.rotating

        // let the wrapper be recognized by Element -> HeroCarousel
        ;(sec.props as any).role = 'hero-carousel'
        ;(sec.props as any).autoplayMs = intervalMs
        ;(sec.props as any).transition = transition

        const slideNodes: UIComponent[] = slides.map((s, i) => {
          const slideSpec = mergeSlide(resolved, s)
          const kids = layoutHeroSmart(slideSpec) // NOTE: no translateY here
          return {
            id: `hero-slide-${i + 1}`,
            type: 'Container',
            x: 0, y: 0, w: CANVAS_W, h: resolved.height,
            props: { style: { position: 'absolute', inset: 0 }, role: 'hero-slide', index: i },
            children: kids,
          } as UIComponent
        })

        sec.children = slideNodes
      } else {
        // single hero (legacy path) — keep translate for safety
        const kids = translateY(layoutHeroSmart(resolved), 0)
        sec.children = kids
      }

      if (!absolute) yCursor = baseY + num(sec.h)
    }

    return roots
  },
}
