// utils/buildComponentTree.ts
import { UIComponent } from '@/lib/types'

export function buildComponentTree(flat: UIComponent[]): UIComponent[] {
  const map = new Map<string, UIComponent>()
  const roots: UIComponent[] = []

  // clone nodes and initialise empty children arrays
  flat.forEach(c => map.set(c.id, { ...c, children: [] }))

  // wire up children via parentId
  flat.forEach(c => {
    if (c.parentId) {
      map.get(c.parentId)?.children!.push(map.get(c.id)!)
    } else {
      roots.push(map.get(c.id)!)
    }
  })

  return roots
}
