export type SizeVal = number | '100%' | 'fit-content' | 'auto'

export interface UIComponent {
  id: string
  type: 'Text' | 'Input' | 'Button' | 'Container' | 'Card' | 'Tabs' | 'Tab' | 'Form' | 'Icon' | 'TextRotator' | "Image" 
  props: Record<string, any>

  // 👇 make layout fields optional so mocks can omit them
  x?: number
  y?: number
  w?: SizeVal
  h?: SizeVal

  children?: UIComponent[]
  parentId?: string | null
  loop?: {
    key: string
    as: string
    index?: string
  }

  // (optional metadata used by your layout engines)
  isSection?: boolean
  pattern?: string
  options?: Record<string, any>

  // If you want to keep these, note your code actually reads props.showIf
  showIfExpr?: string
  showIf?: string
}

export interface Page {
  id: string
  name: string
  components: UIComponent[]
}

