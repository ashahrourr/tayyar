// utils/updateComponentTree.ts
import { UIComponent } from '@/lib/types'

export function updateComponentTree(
  tree: UIComponent[],
  id: string,
  updates: Partial<UIComponent>
): UIComponent[] {
  return tree.map((comp) => {
    if (comp.id === id) {
      return { ...comp, ...updates }
    }

    if (comp.children) {
      return {
        ...comp,
        children: updateComponentTree(comp.children, id, updates),
      }
    }

    return comp
  })
}
