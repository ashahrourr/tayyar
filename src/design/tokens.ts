// src/design/tokens.ts
/**
 * Light, Cluely-style palette:
 * - Page background: #dfe4ef
 * - Glass header with subtle blur
 * - Dark text, muted neutrals, crisp blue brand
 */

export const tokens = {
  /* -------- Colors (light baseline) -------- */
  colors: {
    bg: "bg-[#dfe4ef]",                  // page background
    surface: "bg-white",                 // base surface (cards, panels)
    surfaceElevated: "bg-white",         // elevated surface
    overlay: "bg-black/5",               // subtle overlay
    text: "text-[#111827]",              // slate-900
    textMuted: "text-[#6b7280]",         // slate-500
    brand: "text-[#4C6FFF]",             // Cluely-ish blue
    brandBg: "bg-[#4C6FFF]",
    borderSubtle: "border-black/10",
    borderStrong: "border-black/20",
    success: "text-[#16a34a]",
    warning: "text-[#eab308]",
    danger: "text-[#ef4444]",
    ring: "ring-2 ring-[#4C6FFF]/55",
  },

  /* -------- Radius -------- */
  radius: {
    xs: "rounded",
    sm: "rounded-md",
    md: "rounded-xl",
    lg: "rounded-2xl",
    pill: "rounded-full",
  },

  /* -------- Shadows -------- */
  shadow: {
    sm: "shadow-[0_1px_0_0_rgba(0,0,0,0.04)]",
    md: "shadow-[0_6px_18px_rgba(0,0,0,0.12)]",
    lg: "shadow-[0_12px_32px_rgba(0,0,0,0.18)]",
    focus: "ring-2 ring-[#4C6FFF]/55",
  },

  /* -------- Motion -------- */
  motion: {
    fast: "transition-all duration-150 ease-out",
    normal: "transition-all duration-300 ease-out",
    slow: "transition-all duration-500 ease-in-out",
  },

  /* -------- Spacing -------- */
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },

  /* -------- Type scale -------- */
  type: {
    display: "text-6xl md:text-7xl font-extrabold tracking-tight",
    h1: "text-5xl md:text-6xl font-extrabold tracking-tight",
    h2: "text-3xl md:text-4xl font-bold",
    h3: "text-xl md:text-2xl font-semibold",
    subtitle: "text-lg md:text-xl text-[#111827]/90",
    body: "text-base leading-7",
    small: "text-sm leading-6",
    muted: "text-sm text-[#6b7280]",
    eyebrow: "uppercase tracking-wider text-xs text-[#6b7280]",
    code: "font-mono text-sm",
  },

  /* -------- Control sizes -------- */
  size: {
    xs: "px-2.5 py-1 text-xs",
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
    xl: "px-6 py-3 text-lg",
  },

  /* -------- Layout helper -------- */
  container: "max-w-[980px] mx-auto px-6",
};

/* ================= PRIMITIVES ================= */
export const primitives = {
  /* Page (light + gentle highlight) */
  Page: `
    min-h-screen
    ${tokens.colors.text}
    ${tokens.colors.bg}
    bg-[radial-gradient(70%_50%_at_50%_-10%,rgba(255,255,255,0.7),rgba(223,228,239,0))]
    selection:bg-black/10
  `,

  /* Sections */
  Section: "py-12",
  "Section.alt": `py-12 ${tokens.colors.surfaceElevated}`,
  Hero: "py-16",

  /* Header (solid + glass) */
  Header: `
    px-6 py-4 sticky top-0 z-40
    border-b ${tokens.colors.borderSubtle}
    bg-[#dfe4ef]
  `,
  "Header.glass": `
    px-6 py-3 sticky top-0 z-40
    border-b ${tokens.colors.borderSubtle}
    backdrop-blur
    bg-[rgba(223,228,239,0.60)]
    supports-[backdrop-filter]:bg-[rgba(223,228,239,0.60)]
  `,

  NavBar: "flex items-center justify-between gap-4",

  /* Nav links (dark by default to read on glass) */
  "Nav.link": `
    px-3 py-1 rounded-md ${tokens.motion.fast}
    text-[#5b6472] hover:text-[#111827] hover:bg-black/5
  `,
  // alias for clarity (same style)
  "Nav.linkOnGlass": `
    px-3 py-1 rounded-md ${tokens.motion.fast}
    text-[#5b6472] hover:text-[#111827] hover:bg-black/5
  `,

  /* Cards */
  Card: `
    p-6 ${tokens.radius.md} ${tokens.colors.surface}
    border ${tokens.colors.borderSubtle} ${tokens.shadow.md}
  `,
  "Card.hover": `
    p-6 ${tokens.radius.md} ${tokens.colors.surface}
    border ${tokens.colors.borderSubtle} ${tokens.shadow.lg}
    hover:border-black/20 ${tokens.motion.normal}
  `,

  /* Buttons */
  "Button.primary": `
    inline-flex items-center justify-center gap-2 ${tokens.radius.sm}
    ${tokens.size.md} ${tokens.motion.fast}
    bg-[#4C6FFF] text-white hover:opacity-90 focus-visible:outline-none ${tokens.shadow.focus}
  `,
  "Button.secondary": `
    inline-flex items-center justify-center gap-2 ${tokens.radius.sm}
    ${tokens.size.md} ${tokens.motion.fast}
    bg-black/5 text-[#111827] hover:bg-black/10 focus-visible:outline-none ${tokens.shadow.focus}
  `,
  "Button.ghost": `
    inline-flex items-center justify-center gap-2 ${tokens.radius.sm}
    ${tokens.size.md} ${tokens.motion.fast}
    bg-transparent text-[#111827] hover:bg-black/5 focus-visible:outline-none ${tokens.shadow.focus}
  `,
  "Button.destructive": `
    inline-flex items-center justify-center gap-2 ${tokens.radius.sm}
    ${tokens.size.md} ${tokens.motion.fast}
    bg-[#ef4444] text-white hover:brightness-110 focus-visible:outline-none ${tokens.shadow.focus}
  `,
  "Button.cta": `
    inline-flex items-center justify-center gap-2 ${tokens.radius.sm}
    ${tokens.size.md} ${tokens.motion.fast}
    bg-[#4C6FFF] text-white hover:opacity-90 focus-visible:outline-none ${tokens.shadow.focus}
    shadow-[0_8px_24px_rgba(76,111,255,0.35)]
  `,

  /* Inputs */
  Input: `
    px-3 py-2 ${tokens.radius.xs}
    bg-white border ${tokens.colors.borderSubtle}
    text-[#111827] placeholder:text-[#6b7280]
    focus:outline-none focus:ring-2 focus:ring-[#4C6FFF]/55
  `,

  /* Badges */
  Badge: `
    inline-flex items-center ${tokens.radius.pill} px-2.5 py-0.5 text-xs
    ${tokens.colors.brandBg} text-white
  `,

  /* Grids */
  Grid2: "grid grid-cols-1 md:grid-cols-2 gap-6",
  Grid3: "grid grid-cols-1 md:grid-cols-3 gap-6",
} as const;

/* ---------------- Types & Resolver ---------------- */
export type VariantRef = keyof typeof primitives

type MixKey =
  | keyof typeof tokens.type
  | keyof typeof tokens.colors
  | keyof typeof tokens.radius
  | keyof typeof tokens.shadow
  | keyof typeof tokens.motion
  | keyof typeof tokens.size

const registry: Record<string, string> = {
  ...tokens.type,
  ...tokens.colors,
  ...tokens.radius,
  ...tokens.shadow,
  ...tokens.motion,
  ...tokens.size,
}

export function resolveClassNames(props: {
  variant?: VariantRef
  mix?: MixKey[]
  className?: string
}): string {
  const parts: string[] = []
  if (props.variant && primitives[props.variant]) parts.push(primitives[props.variant])
  if (props.mix?.length) {
    for (const key of props.mix) {
      const v = registry[key as string]
      if (v) parts.push(v)
    }
  }
  if (props.className) parts.push(props.className)
  return parts.filter(Boolean).join(" ")
}
