// src/design/sections/header/module.ts
import type { UIComponent } from '@/lib/types'
import type { SectionModule } from '@/design/engine/sectionEngine'
import { CANVAS_W } from '@/CanvasRender/grid'
import { normalizeHeaderSpec, HeaderSpecResolved } from './spec'
import { layoutHeaderSmart } from './layoutHeaderSmart'

function isHeader(n: UIComponent) {
  return String((n.props as any)?.sectionTemplate || '').toLowerCase() === 'header'
}

/** mark a node and descendants as part of this section (used by group-drag) */
function markSectionRoots(roots: UIComponent[]) {
  for (const n of roots) {
    if (isHeader(n)) (n as any).isSection = true
    if (n.children) markSectionRoots(n.children)
  }
}

/** ensure header container basics; children/layout handled separately */
function ensureHeaderContainer(sec: UIComponent, resolved: HeaderSpecResolved) {
  (sec as any).isSection = true
  const sp = (sec.props ||= {})
  sp.sectionTemplate = 'header'

  // size & position
  sec.x ??= 0
  sec.y ??= 0
  sec.w ??= CANVAS_W as any

  const BAR_H = resolved.density === 'comfortable' ? 72 : resolved.density === 'tight' ? 56 : 64
  sec.h = BAR_H as any
}

export const headerModule: SectionModule = {
  id: 'header',
  apply: (roots) => {
    markSectionRoots(roots)

    // collect all nodes
    const all: UIComponent[] = []
    ;(function walk(list: UIComponent[]) {
      for (const n of list) {
        all.push(n)
        if (n.children?.length) walk(n.children)
      }
    })(roots)

    for (const sec of all) {
      if (!isHeader(sec)) continue

      // 1) read author-provided spec (if any)
      const p = (sec.props as any) ?? {}
      const rawSpec =
      (sec.props as any)?.spec ??
      (sec.props as any)?.layoutSpec;

      // 2) normalize to a resolved spec with defaults
      const resolved = normalizeHeaderSpec(rawSpec)

      // 3) ensure the section container has correct size/flags
      ensureHeaderContainer(sec, resolved)

      // 4) deterministically lay out children
      const kids = layoutHeaderSmart(resolved)
      sec.children = kids
    }

    return roots
  },
}
