export interface UIComponent {
    id: string
    type: 'Text' | 'Input' | 'Button' | 'Container' | 'Card' | 'Tabs' | 'Tab' | 'Form'
    props: Record<string, any>
    x: number
    y: number
    w: number | string
    h: number | string
    children?: UIComponent[]
    parentId?: string | null
    loop?: {
      key: string  // key in localState that holds an array
      as: string   // alias for each item
      index?: string
    }
    showIfExpr?: string
    showIf?: string
  }
  