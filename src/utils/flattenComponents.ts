// utils/flattenComponents.ts
import { UIComponent } from '@/lib/types'

export function flattenComponents(components: UIComponent[]): UIComponent[] {
  const flatList: UIComponent[] = []

  const traverse = (comp: UIComponent) => {
    flatList.push(comp)
    if (comp.children && comp.children.length > 0) {
      comp.children.forEach(traverse)
    }
  }

  components.forEach(traverse)
  return flatList
}
