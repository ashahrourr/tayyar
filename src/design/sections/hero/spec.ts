// src/design/sections/hero/spec.ts
export type HeroVariant = 'centered' | 'split-right-media'
export type Theme = 'light' | 'dark' | 'auto'
export type Intent = 'saas' | 'editorial'
export type HeroTransition = 'fade' | 'slide'

/** Optional rotating slides */
export interface HeroRotating {
  intervalMs?: number            // default 4000
  transition?: HeroTransition    // default 'fade'
  slides: Array<{
    palette?: Partial<HeroSpec['palette']>
    content?: Partial<HeroSpec['content']>
    media?: HeroSpec['media']
  }>
}

/** Generic, spec-driven décor — you supply layers from mocks */
export interface DecorLayer {
  id?: string
  x: number
  y: number
  w: number
  h: number
  /** inline style applied to the layer container */
  style?: Record<string, string | number>
  /** optional HTML string rendered inside the layer container */
  html?: string
}

export interface HeroDecor {
  layers: DecorLayer[]           // absolute-positioned inside the hero
}

export interface HeroSpec {
  theme: Theme
  intent: Intent
  variant: HeroVariant
  height: number                 // total section height
  padY: number                   // vertical padding inside
  palette: {
    base?: string                // any CSS color/gradient
    accent?: string              // CTA / accent color
  }
  content: {
    kicker?: string
    heading: string
    sub?: string
    primary?: { label: string }
    secondary?: { label: string }
  }
  media?: {
    kind: 'image' | 'none'
    url?: string
    alt?: string
  }
  rotating?: HeroRotating        // optional carousel
  decor?: HeroDecor              // optional: spec-driven layers (no defaults)
}

// Resolved with sensible defaults
export type HeroSpecResolved = HeroSpec

export function resolveHeroSpec(p: Partial<HeroSpec>): HeroSpecResolved {
  const theme   = p.theme   ?? 'light'
  const intent  = p.intent  ?? 'editorial'
  const variant = p.variant ?? 'split-right-media'
  const height  = p.height  ?? (variant === 'centered' ? 440 : 520)
  const padY    = p.padY    ?? 48

  const palette = {
    base:   p.palette?.base   ?? (theme === 'dark' ? '#0B1220' : '#F8FAFC'),
    accent: p.palette?.accent ?? (intent === 'saas' ? '#2563EB' : '#111827'),
  }

  const content = {
    kicker:  p.content?.kicker ?? 'Introducing',
    heading: p.content?.heading ?? 'Build beautiful UIs, fast.',
    sub:     p.content?.sub ?? 'A modern UI workspace that turns ideas into production-ready layouts.',
    primary: p.content?.primary ?? { label: 'Get Started' },
    secondary: p.content?.secondary ?? { label: 'Learn more' },
  }

  const media = p.media ?? { kind: 'none' as const }

  const rotating = p.rotating && p.rotating.slides?.length
    ? {
        intervalMs: p.rotating.intervalMs ?? 4000,
        transition: p.rotating.transition ?? 'fade',
        slides: p.rotating.slides,
      }
    : undefined

  // Décor is entirely user-supplied; if absent, we render nothing extra
  const decor = p.decor && Array.isArray(p.decor.layers) && p.decor.layers.length > 0
    ? { layers: p.decor.layers }
    : undefined

  return { theme, intent, variant, height, padY, palette, content, media, rotating, decor }
}
