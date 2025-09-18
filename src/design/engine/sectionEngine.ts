// src/design/engine/sectionEngine.ts
import type { UIComponent } from '@/lib/types'
import { SECTION_MODULES } from '../sections'

export interface SectionModule {
  /** human id: 'header', 'hero', etc. */
  id: string
  /** pure transform over the *entire* tree (works on a deep clone) */
  apply: (roots: UIComponent[]) => UIComponent[]
}

/** shallow+children clone (no shared refs) */
function clone(n: UIComponent): UIComponent {
  return {
    ...n,
    props: { ...(n.props || {}) },
    children: n.children ? n.children.map(clone) : undefined,
  }
}

export function runSectionPipeline(input: UIComponent[]): UIComponent[] {
  // always transform a fresh clone so modules stay pure
  let acc = input.map(clone)
  for (const mod of SECTION_MODULES) {
    acc = mod.apply(acc)
  }
  return acc
}
