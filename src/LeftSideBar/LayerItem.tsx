// src/lib/LayerItem.tsx
import { UIComponent } from '../lib/types'
import { useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/20/solid'

export function LayerItem({
  comp,
  depth,
  selectedId,
  setSelectedId,
}: {
  comp: UIComponent
  depth: number
  selectedId: string | null
  setSelectedId: (id: string) => void
}) {
  const hasChildren = comp.children && comp.children.length > 0

  /* ⬇ start closed: false  */
  const [open, setOpen] = useState(false)

  const isSelected = selectedId === comp.id
  const indent     = depth * 16                                          // 16 px per level

  return (
    <div>
      <div
        onClick={() => setSelectedId(comp.id)}
        style={{ paddingLeft: indent }}
        className={`flex items-center gap-1 cursor-pointer text-sm py-1 rounded ${
          isSelected ? 'bg-[#444] text-white' : 'text-[#aaa89f] hover:bg-[#333]'
        }`}
      >
        {hasChildren ? (
          open ? (
            <ChevronDownIcon
              className="w-3 h-3 text-[#888]"
              onClick={(e) => { e.stopPropagation(); setOpen(false) }}
            />
          ) : (
            <ChevronRightIcon
              className="w-3 h-3 text-[#888]"
              onClick={(e) => { e.stopPropagation(); setOpen(true) }}
            />
          )
        ) : (
          <span className="w-3 h-3" />  
        )}

        <span>{comp.type}</span>
        <span className="opacity-40">— {comp.id}</span>
      </div>

      {open &&
        hasChildren &&
        comp.children!.map(child => (
          <LayerItem
            key={child.id}
            comp={child}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            depth={depth + 1}
          />
        ))}
    </div>
  )
}
