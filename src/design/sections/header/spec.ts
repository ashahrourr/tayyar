// src/design/sections/header/spec.ts

export type Theme = 'light' | 'dark' | 'auto'
export type Density = 'comfortable' | 'regular' | 'tight'
export type StyleIntent = 'marketplace' | 'boutique' | 'editorial' | 'saas' | 'utilities'
export type SearchEmphasis = 'dominant' | 'balanced' | 'minimal'
export type DesktopMode = 'balanced' | 'search-dominant' | 'nav-dominant'
export type TabletMode = 'compact'
export type MobileMode = 'overlay-search' | 'inline-search'
export type ActionType =
    | 'locale'
    | 'account'
    | 'orders'
    | 'cart'
    | 'help'
    | 'signin'
    | 'favorites'
    | 'notifications'

/** New: visual skins */
export type StylePack =
    | 'auto'
    | 'utilities-compact'   // Lovable pill header
    | 'marketplace-amazon'  // Amazon-style header
    | 'editorial-minimal'
    | 'saas-neutral'

/** Limits used by the normalizer */
export const HEADER_LIMITS = {
    brandName: 24,
    logoText: 18,
    locLine1: 16,
    locLine2: 18,
    placeholder: 32,
    actionLabel: 18,
    secondaryItemsMax: 8,
} as const

/**
 * OPTIONAL flexible API (preferred going forward)
 * You can put anything in left / center / right without using clusters.
 */
export type AreaItem =
    | {
        kind: 'logo'
        text?: string               // brand text; may include \n to hint 2 lines
        style?: 'wordmark' | 'block' | 'monogram' | 'symbol-left' | 'symbol-above' | 'badge'
        initials?: string           // fallback if short mark is desired
        icon?: string               // optional Lucide-ish name; if absent we’ll draw a simple mark
        svgPath?: string            // optional raw SVG path (procedural mark)
        shape?: 'square' | 'circle' | 'rounded'
        palette?: { bg?: string; fg?: string }
        case?: 'as-is' | 'upper' | 'lower' | 'title'
        variant?: 'compact' | 'wide'
    }
    | { kind: 'nav'; label: string }                 // simple link-like text
    | { kind: 'text'; text: string; role?: 'status' | 'nav' | string }
    | { kind: 'stack'; top: string; bottom: string } // 2-line block (e.g., location)
    | { kind: 'search'; placeholder?: string; category?: boolean; emphasis?: SearchEmphasis }
    | { kind: 'cta'; label: string }                 // button-style action
    | { kind: 'locale'; label?: string }
    | { kind: 'cart'; label?: string }
    | { kind: 'icon'; glyph: string; tooltip?: string } // small icon chip
    | { kind: 'spacer'; grow?: number }

export interface AreasInput {
    left?: AreaItem[]
    center?: AreaItem[]
    right?: AreaItem[]
}

export interface HeaderSpec {
    theme?: Theme
    density?: Density
    styleIntent?: StyleIntent
    stylePack?: StylePack            // NEW (choose a skin; default = 'auto')
    brand?: {
        name: string
        tone?: 'friendly' | 'elegant' | 'bold' | 'neutral'
    }
    palette?: {
        base?: 'auto' | string
        accent?: string | null
    }

    /** Legacy (still supported) */
    clusters?: {
        left?: {
            logo?: { text?: string }
            location?: { line1?: string; line2?: string } | null
        }
        center?: {
            search?: {
                enabled?: boolean
                placeholder?: string
                category?: boolean
                emphasis?: SearchEmphasis
            } | null
        }
        right?: {
            actions?: { type: ActionType; label?: string | null }[]
        }
    }

    /** New flexible API */
    areas?: AreasInput

    secondaryNav?: {
        visible?: boolean
        items?: string[]
    }
    breakpoints?: {
        desktop?: DesktopMode
        tablet?: TabletMode
        mobile?: MobileMode
    }
    constraints?: {
        lockLogo?: boolean
        lockActions?: boolean
    }
}

/** Everything present & sanitized for the engine (legacy shape kept) */
export interface HeaderSpecResolved {
    theme: Theme
    density: Density
    styleIntent: StyleIntent
    stylePack: StylePack                       // NEW
    brand: { name: string; tone: 'friendly' | 'elegant' | 'bold' | 'neutral' }
    palette: { base: 'auto' | string; accent: string | null }
    clusters: {
        left: { logo: { text: string }; location: { line1: string; line2: string } | null }
        center: {
            // null = no search
            search: ({ enabled: true; placeholder: string; category: boolean; emphasis: SearchEmphasis } | null)
        }
        right: { actions: { type: ActionType; label: string | null }[] }
    }
    secondaryNav: { visible: boolean; items: string[] }
    breakpoints: { desktop: DesktopMode; tablet: TabletMode; mobile: MobileMode }
    constraints: { lockLogo: boolean; lockActions: boolean }

    /** Passed through if user uses the new flexible API */
    areas?: AreasInput
}

/* ---------------- normalizer (legacy fields) ---------------- */

const clamp = (s: string, max: number) => (s.length > max ? s.slice(0, max) : s)
const isHex = (s?: string | null) => !!s && /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(s)

export function normalizeHeaderSpec(input: Partial<HeaderSpec> | undefined): HeaderSpecResolved {
    const i = input ?? {}

    // theme / density / intent
    const theme: Theme = (['light', 'dark', 'auto'] as const).includes(i.theme as any) ? (i.theme as Theme) : 'light'
    const density: Density = (['comfortable', 'regular', 'tight'] as const).includes(i.density as any)
        ? (i.density as Density)
        : 'regular'
    const styleIntent: StyleIntent = (
        ['marketplace', 'boutique', 'editorial', 'saas', 'utilities'] as const
    ).includes(i.styleIntent as any)
        ? (i.styleIntent as StyleIntent)
        : 'marketplace'

    // NEW: style pack
    const stylePack: StylePack = (
        ['auto', 'utilities-compact', 'marketplace-amazon', 'editorial-minimal', 'saas-neutral'] as const
    ).includes(i.stylePack as any)
        ? (i.stylePack as StylePack)
        : 'auto'

    // brand
    const brandRaw = i.brand ?? { name: 'Brand', tone: 'neutral' as const }
    const brand = {
        name: clamp(brandRaw.name || 'Brand', HEADER_LIMITS.brandName),
        tone: (['friendly', 'elegant', 'bold', 'neutral'] as const).includes(brandRaw.tone as any)
            ? (brandRaw.tone as any)
            : ('neutral' as const),
    } as const

    // palette
    const base = (i.palette?.base ?? 'auto') as 'auto' | string
    const palette = {
        base: base === 'auto' || isHex(base) ? base : 'auto',
        accent: i.palette?.accent ? (isHex(i.palette.accent) ? i.palette.accent : null) : null,
    } as const

    // clusters.left
    const left = i.clusters?.left ?? {}
    const logoText = left.logo?.text ?? clamp(brand.name, HEADER_LIMITS.logoText)

    const loc =
        left.location === null
            ? null
            : left.location
                ? {
                    line1: clamp(left.location.line1 ?? 'Deliver to', HEADER_LIMITS.locLine1),
                    line2: clamp(left.location.line2 ?? 'Your area', HEADER_LIMITS.locLine2),
                }
                : null

    // clusters.center.search (optional)
    const centerSearchRaw = i.clusters?.center?.search
    const defaultEnabled = i.styleIntent === 'marketplace' || i.styleIntent === 'utilities'
    let search: HeaderSpecResolved['clusters']['center']['search']
    if (centerSearchRaw === null) {
        search = null
    } else {
        const enabled = centerSearchRaw?.enabled ?? defaultEnabled
        if (!enabled) {
            search = null
        } else {
            const emphasisDefault: SearchEmphasis =
                styleIntent === 'marketplace' ? 'dominant'
                    : styleIntent === 'editorial' ? 'minimal'
                        : 'balanced'
            search = {
                enabled: true,
                placeholder: clamp(centerSearchRaw?.placeholder ?? `Search ${brand.name}`, HEADER_LIMITS.placeholder),
                category: centerSearchRaw?.category ?? true,
                emphasis:
                    (['dominant', 'balanced', 'minimal'] as const).includes(centerSearchRaw?.emphasis as any)
                        ? (centerSearchRaw!.emphasis as SearchEmphasis)
                        : emphasisDefault,
            }
        }
    }

    // clusters.right.actions
    const defaultActions: ActionType[] = ['locale', 'account', 'orders', 'cart']
    const rawActions = i.clusters?.right?.actions?.length
        ? i.clusters!.right!.actions!
        : defaultActions.map((t) => ({ type: t, label: null }))

    const actions = rawActions.map((a) => {
        const type: ActionType = (
            ['locale', 'account', 'orders', 'cart', 'help', 'signin', 'favorites', 'notifications'] as const
        ).includes(a.type as any)
            ? (a.type as ActionType)
            : 'help'
        const label = a.label == null ? null : clamp(String(a.label), HEADER_LIMITS.actionLabel)
        return { type, label }
    })

    // secondary nav
    const secondaryRaw = i.secondaryNav ?? {}
    const items =
        secondaryRaw.items?.slice(0, HEADER_LIMITS.secondaryItemsMax).map((s) => clamp(s, HEADER_LIMITS.actionLabel)) ?? []
    const secondaryNav = { visible: secondaryRaw.visible ?? false, items } as const

    // breakpoints
    const breakpoints = {
        desktop: (['balanced', 'search-dominant', 'nav-dominant'] as const).includes(i.breakpoints?.desktop as any)
            ? (i.breakpoints?.desktop as DesktopMode)
            : ('balanced' as const),
        tablet: 'compact' as const,
        mobile: (['overlay-search', 'inline-search'] as const).includes(i.breakpoints?.mobile as any)
            ? (i.breakpoints?.mobile as MobileMode)
            : ('overlay-search' as const),
    } as const

    // constraints
    const constraints = {
        lockLogo: i.constraints?.lockLogo ?? false,
        lockActions: i.constraints?.lockActions ?? false,
    } as const

    // Pass-through flexible API
    const areas = i.areas
        ? { left: i.areas.left ?? [], center: i.areas.center ?? [], right: i.areas.right ?? [] }
        : undefined

    return {
        theme,
        density,
        styleIntent,
        stylePack,
        brand,
        palette,
        clusters: { left: { logo: { text: logoText }, location: loc }, center: { search }, right: { actions } },
        secondaryNav,
        breakpoints,
        constraints,
        areas,
    }
}

/** Type guard for external JSON */
export function isHeaderSpec(x: any): x is HeaderSpec {
    return x && typeof x === 'object'
}

/* ---------------- simple plan for the layout engine ---------------- */

export type HeaderItem =
    | { type: 'text'; text: string; role?: string }                  // logo, nav labels
    | { type: 'stack'; top: string; bottom: string; role?: string }   // 2-line block
    | { type: 'action'; label: string; role?: string }                // buttons/links
    | { type: 'icon'; glyph: string; role?: string }                  // tiny icon chip
    | { type: 'search'; placeholder: string; emphasis: SearchEmphasis } // search control
    | { type: 'logoBlock'; top: string; bottom: string; role?: string; palette?: { bg?: string; fg?: string }; shape?: 'square' | 'circle' | 'rounded' }
    | { type: 'logoMonogram'; initials: string; role?: string; palette?: { bg?: string; fg?: string }; shape?: 'square' | 'circle' | 'rounded' }
    | { type: 'logoBadge'; text: string; role?: string; palette?: { bg?: string; fg?: string } }
    | { type: 'logoSymbolLeft'; text: string; svgPath?: string; icon?: string; role?: string; palette?: { bg?: string; fg?: string }; shape?: 'square' | 'circle' | 'rounded' }
    | { type: 'logoSymbolAbove'; text: string; svgPath?: string; icon?: string; role?: string; palette?: { bg?: string; fg?: string }; shape?: 'square' | 'circle' | 'rounded' }

export interface SimpleHeaderLayout {
    left: HeaderItem[]
    mid: HeaderItem[]
    right: HeaderItem[]
}

/** Use areas when provided, otherwise fall back to legacy clusters */
export function toSimpleLayout(spec: HeaderSpecResolved): SimpleHeaderLayout {
    const clampS = (s: string, max: number) => (s.length > max ? s.slice(0, max) : s)

    if (spec.areas && (spec.areas.left?.length || spec.areas.center?.length || spec.areas.right?.length)) {
        const mapItem = (a: AreaItem): HeaderItem[] => {
            switch (a.kind) {
                case 'logo': {
                    const raw = (a.text ?? spec.brand.name) as string
                    const applyCase = (s: string) =>
                        a.case === 'upper' ? s.toUpperCase()
                            : a.case === 'lower' ? s.toLowerCase()
                                : a.case === 'title' ? s.replace(/\b\w/g, m => m.toUpperCase())
                                    : s
                    const parts = raw.split(/\r?\n/).map(s => applyCase(s.trim())).filter(Boolean)
                    const style = a.style ?? (parts.length >= 2 ? 'block' : 'wordmark')
                    const palette = a.palette
                    const shape = a.shape
                    const initials = (a.initials ?? raw.split(/\s+/).map(w => w[0] ?? '').join('').slice(0, 3)).toUpperCase()

                    switch (style) {
                        case 'wordmark':
                            return [{ type: 'text', text: applyCase(raw), role: 'logo' }]
                        case 'block': {
                            const top = parts[0] ?? applyCase(raw)
                            const bottom = parts[1] ?? ''
                            return [{ type: 'logoBlock', top, bottom, role: 'logo', palette, shape }]
                        }
                        case 'monogram':
                            return [{ type: 'logoMonogram', initials, role: 'logo', palette, shape }]
                        case 'symbol-left':
                            return [{ type: 'logoSymbolLeft', text: applyCase(raw), svgPath: a.svgPath, icon: a.icon, role: 'logo', palette, shape }]
                        case 'symbol-above':
                            return [{ type: 'logoSymbolAbove', text: applyCase(raw), svgPath: a.svgPath, icon: a.icon, role: 'logo', palette, shape }]
                        case 'badge':
                            return [{ type: 'logoBadge', text: applyCase(raw), role: 'logo', palette }]
                        default:
                            return [{ type: 'text', text: applyCase(raw), role: 'logo' }]
                    }
                } case 'text': return [{ type: 'text', text: clampS(a.text, HEADER_LIMITS.actionLabel), role: a.role }]
                case 'nav': return [{ type: 'text', text: clampS(a.label, HEADER_LIMITS.actionLabel), role: 'nav' }]
                case 'stack': return [{ type: 'stack', top: clampS(a.top, HEADER_LIMITS.locLine1), bottom: clampS(a.bottom, HEADER_LIMITS.locLine2), role: 'location' }]
                case 'icon': return [{ type: 'icon', glyph: a.glyph, role: 'icon' }]
                case 'cta': return [{ type: 'action', label: clampS(a.label, HEADER_LIMITS.actionLabel), role: 'cta' }]
                case 'locale': return [{ type: 'action', label: clampS(a.label ?? 'EN', HEADER_LIMITS.actionLabel), role: 'locale' }]
                case 'cart': return [{ type: 'action', label: clampS(a.label ?? 'Cart', HEADER_LIMITS.actionLabel), role: 'cart' }]
                case 'search': {
                    const em: SearchEmphasis =
                        a.emphasis ??
                        (spec.styleIntent === 'marketplace' ? 'dominant' : spec.styleIntent === 'editorial' ? 'minimal' : 'balanced')
                    return [{ type: 'search', placeholder: clampS(a.placeholder ?? `Search ${spec.brand.name}`, HEADER_LIMITS.placeholder), emphasis: em }]
                }
                default: return []
            }
        }
        return {
            left: (spec.areas.left ?? []).flatMap(mapItem),
            mid: (spec.areas.center ?? []).flatMap(mapItem),
            right: (spec.areas.right ?? []).flatMap(mapItem),
        }
    }

    // ---- fallback to legacy clusters ----
    const left: HeaderItem[] = []
    if (spec.brand.name) left.push({ type: 'text', text: spec.brand.name, role: 'logo' })
    if (spec.clusters.left.location) {
        left.push({ type: 'stack', top: spec.clusters.left.location.line1, bottom: spec.clusters.left.location.line2, role: 'location' })
    }

    const searchCfg = spec.clusters?.center?.search ?? { placeholder: '', category: false, emphasis: 'minimal' as const }
    const em = (searchCfg.emphasis ?? 'balanced') as SearchEmphasis
    const mid: HeaderItem[] = em !== 'minimal' ? [{ type: 'search', placeholder: searchCfg.placeholder ?? '', emphasis: em }] : []

    const right: HeaderItem[] = spec.clusters.right.actions.map(a => ({ type: 'action', label: a.label ?? a.type, role: a.type }))
    return { left, mid, right }
}
