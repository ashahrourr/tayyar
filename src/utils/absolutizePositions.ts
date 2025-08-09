// utils/absolutizePositions.ts
import { UIComponent } from '@/lib/types'

export function absolutizePositions(roots: UIComponent[]): UIComponent[] {
  // Build id -> node (using existing children arrays)
  const byId = new Map<string, UIComponent>()
  const collect = (n: UIComponent) => {
    byId.set(n.id, n)
    n.children?.forEach(collect)
  }
  roots.forEach(collect)

  // Copy so we don't mutate originals
  const clone = (n: UIComponent): UIComponent => ({
    ...n,
    props: { ...(n.props || {}) },
    children: n.children?.map(clone),
  })

  const processed = new Set<string>()
  const rebased = new Map<string, UIComponent>()

  // Rebase a node's x/y by walking up parents once
  const rebase = (n: UIComponent): UIComponent => {
    if (processed.has(n.id)) return rebased.get(n.id)!
    const p = n.parentId ? byId.get(n.parentId) : undefined
    const out = clone(n)
    if (p) {
      const P = rebase(p) // ensure parent rebased first
      out.x = (n.x ?? 0) + (P.x ?? 0)
      out.y = (n.y ?? 0) + (P.y ?? 0)
      out.parentId = P.id // keep parent link
    }
    if (out.children) out.children = out.children.map(rebase)
    processed.add(out.id)
    rebased.set(out.id, out)
    return out
  }

  return roots.map(rebase)
}
