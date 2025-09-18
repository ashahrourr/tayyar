// src/design/layout/header/layoutHeaderSmart.ts
import type { UIComponent } from '@/lib/types'
import { CANVAS_W, CONTAINER_W, LEFT_INSET } from '@/CanvasRender/grid'
import {
  HeaderSpecResolved,
  SimpleHeaderLayout,
  HeaderItem,
  toSimpleLayout,
} from '../../sections/header/spec'

let nextId = 0
const uid = (p: string) => `${p}-${++nextId}`

// layoutHeaderSmart.ts (unchanged but keep it!)
const ICON_MAP: Record<string, string> = {
    mail: 'Mail',
    message: 'MessageSquare',
    messages: 'MessageSquare',
    chat: 'MessageCircle',
    bell: 'Bell',
    notifications: 'Bell',
    user: 'User',
    profile: 'UserCircle',
    account: 'User',
    settings: 'Settings',
    cog: 'Settings',
    heart: 'Heart',
    favorite: 'Heart',
    cart: 'ShoppingCart',
    basket: 'ShoppingCart',
    bag: 'ShoppingBag',
    search: 'Search',
    magnify: 'Search',
    globe: 'Globe',
    language: 'Languages',
    headphones: 'Headphones',
    support: 'Headphones',
    help: 'HelpCircle',
    signout: 'LogOut',
    logout: 'LogOut',
    login: 'LogIn',
    key: 'Key',
    star: 'Star',
    flag: 'Flag',
    shield: 'Shield',
    lock: 'Lock',
    unlock: 'Unlock',
    download: 'Download',
    upload: 'Upload',
    plus: 'Plus',
    minus: 'Minus',
    chevronDown: 'ChevronDown',
    chevronUp: 'ChevronUp',
    chevronLeft: 'ChevronLeft',
    chevronRight: 'ChevronRight',
    menu: 'Menu',
  }
  
  
/* -------------------------- style packs -------------------------- */
type StylePack = HeaderSpecResolved['stylePack']

function resolvePack(spec: HeaderSpecResolved): StylePack {
  if (spec.stylePack && spec.stylePack !== 'auto') return spec.stylePack
  switch (spec.styleIntent) {
    case 'marketplace': return 'marketplace-amazon'
    case 'utilities':   return 'utilities-compact'
    case 'editorial':   return 'editorial-minimal'
    case 'saas':        return 'saas-neutral'
    case 'boutique':    return 'editorial-minimal'
    default:            return 'utilities-compact'
  }
}

/* ---------------------- color helpers / tokens ------------------- */
const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
const hex = (n: number) => n.toString(16).padStart(2, '0')
const toHex = (r: number, g: number, b: number) => `#${hex(r)}${hex(g)}${hex(b)}`
function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  return toHex(Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255))
}
function parseHex(c: string) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c); if (!m) return null
  const v = m[1].length === 3 ? m[1].split('').map(ch => parseInt(ch + ch, 16))
                              : [m[1].slice(0,2), m[1].slice(2,4), m[1].slice(4,6)].map(h => parseInt(h,16))
  return { r: v[0], g: v[1], b: v[2] }
}
function mix(aHex: string, bHex: string, t: number) {
  const A = parseHex(aHex)!, B = parseHex(bHex)!; t = clamp01(t)
  const r = Math.round(A.r + (B.r - A.r) * t)
  const g = Math.round(A.g + (B.g - A.g) * t)
  const b = Math.round(A.b + (B.b - A.b) * t)
  return toHex(r, g, b)
}

function safeMix(a: string, b: string, t: number, fallback: string) {
    const A = parseHex(a)
    const B = parseHex(b)
    if (!A || !B) return fallback
    return mix(a, b, t)
  }
  

// helper: truthy string means “use exactly this”, no hex restriction
const pick = (val: unknown, fallback: string) =>
    (typeof val === 'string' && val.trim().length > 0) ? val : fallback
  
  type Tokens = {
    bg: string
    text: string
    sub: string
    nav: string
    icon: string
    line: string
    chip: string
    soft: string
    primary: string
    primaryBorder: string
    ctaBg?: string
    ctaText?: string
  }
  
  function tokens(spec: HeaderSpecResolved): Tokens {
    const pack  = resolvePack(spec)
    const theme = spec.theme
  
    // 1) Background: use the raw string if provided; otherwise pick a default.
    const baseVal = spec.palette?.base;
    const isAuto  = typeof baseVal === 'string' && baseVal.trim().toLowerCase() === 'auto';
    
    const bgRaw: string = (!baseVal || isAuto)
      ? (theme === 'dark'
          ? (pack === 'marketplace-amazon' ? '#131921'
             : pack === 'utilities-compact' ? hslToHex(220, 8, 11)
             : hslToHex(220, 10, 12))
          : hslToHex(220, 15, 98))
      : String(baseVal);
  
    // 2) For derived tokens, if bgRaw isn’t hex, blend against a safe hex “proxy”.
    const bgProxy = parseHex(bgRaw) ? bgRaw : (theme === 'dark' ? '#111827' : '#F8FAFC') // slate-900 / slate-50 vibes
    const white = '#ffffff'
    const black = '#000000'
    const dark  = theme === 'dark'
    const anchor = dark ? white : black
  
    const text = safeMix(bgProxy, anchor, dark ? 0.86 : 0.85, dark ? '#E5E7EB' : '#111827')
    const sub  = safeMix(bgProxy, anchor, dark ? 0.62 : 0.55, dark ? '#9CA3AF' : '#6B7280')
    const nav  = safeMix(bgProxy, anchor, dark ? 0.82 : 0.72, dark ? '#D1D5DB' : '#374151')
    const icon = safeMix(bgProxy, anchor, dark ? 0.70 : 0.60, dark ? '#A3A3A3' : '#6B7280')
    const line = safeMix(bgProxy, anchor, dark ? 0.18 : 0.12, dark ? '#2C2C2C' : '#E5E7EB')
    const chip = safeMix(bgProxy, anchor, dark ? 0.10 : 0.06, dark ? '#1F2937' : '#F3F4F6')
    const soft = safeMix(bgProxy, anchor, dark ? 0.06 : 0.03, dark ? '#111827' : '#F9FAFB')
  
    const primary =
      spec.palette.accent
        ? String(spec.palette.accent)                  // accept any CSS color
        : (pack === 'marketplace-amazon' ? '#febd69' : '#2563EB')
  
    return {
      bg: bgRaw,               // use exact string provided for background
      text, sub, nav, icon, line, chip, soft,
      primary,
      primaryBorder: '#1D4ED8'
    }
  }
  
  
  
  
  
/* ---------------- widths ---------------- */
function estWidthFor(item: HeaderItem): number {
  const char = (s: string | undefined, w = 8.5) => Math.ceil((s ?? '').length * w)
  switch (item.type) {
    case 'logoBlock': {
        const top = (item as any).top ?? ''
        const bottom = (item as any).bottom ?? ''
        const longest = Math.max(top.length, bottom.length)
        const charW = 7.2     // average px per char
        const pad = 24        // padding inside
        const neededW = Math.ceil(longest * charW) + pad
        return Math.min(neededW, 220) // will be made square in placeCluster
      }
      
    case 'logoMonogram':   return 40
    case 'logoBadge':      return Math.max(64, Math.min(char(item.text, 8.5) + 24, 200))
    case 'logoSymbolLeft': return Math.max(96, Math.min(char(item.text, 8.5) + 40 + 12, 260)) // icon + gap + text
    case 'logoSymbolAbove':return 72   // compact tile; we’ll center in placeCluster
    case 'icon':   return 40
    case 'action': { const len = (item.label ?? '').length; if (len <= 2) return 40; const base = char(item.label, 8.5) + 28; return Math.max(64, Math.min(base, 180)) }
    case 'stack':  { const topW = char(item.top, 7.5); const botW = char(item.bottom, 8.5); const base = Math.max(topW, botW) + 20; return Math.max(100, Math.min(base, 260)) }
    case 'search': return Math.min(720, Math.max(560, Math.round(CONTAINER_W * 0.62)))
    case 'text':
    default:       { const base = char((item as any).text, 8.5) + 14; return Math.max(96, Math.min(base, 240)) }
  }
}
function clusterTotalWidth(items: HeaderItem[], gap = 16): number {
  const widths = items.map(estWidthFor)
  return widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, items.length - 1)
}

  

/* ---------------- render helpers ---------------- */
function placeCluster(
  items: HeaderItem[],
  anchorX: number,
  y: number,
  align: 'left' | 'center' | 'right',
  controlH: number,
  spec: HeaderSpecResolved,
  forcedWidths?: number[],
): UIComponent[] {
  const t = tokens(spec)
  const pack = resolvePack(spec)
  const gap = 16
  const widths = forcedWidths ?? items.map(it =>
    it.type === 'logoMonogram'
      ? controlH
      : it.type === 'logoSymbolAbove'
        ? Math.max(controlH, Math.min(96, Math.round(controlH * 1.4)))
      : it.type === 'logoBlock'
        ? (() => {
            const est = estWidthFor(it)
            return Math.max(controlH, est) // enforce square: width ≥ height
          })()
      : estWidthFor(it)
  )
  
  
  const totalW = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, items.length - 1)

  let x = anchorX
  if (align === 'center') x = anchorX - Math.round(totalW / 2)
  if (align === 'right')  x = anchorX - totalW

  const styleText = (role?: string) => {
    const pack = resolvePack(spec)
  
    // default weights
    let weight = 600
    if (role === 'logo') weight = 700
  
    // editorial / saas prefer lighter nav & body
    if (pack === 'editorial-minimal' || pack === 'saas-neutral') {
      if (role === 'nav' || !role || role === 'status') weight = 500 // medium
      if (role === 'status')                             weight = 500
      if (!role)                                         weight = 500
    }
  
    // colors by role
    const color =
      role === 'status' ? t.sub :
      role === 'nav'    ? t.nav :
                          t.text
  
    const size =
      role === 'logo' ? 18 :
      role === 'nav'  ? 15 :
                        13
  
    return {
      display: 'flex',
      alignItems: 'center',
      height: '100%',
      padding: '0 8px',
      fontWeight: weight,
      fontSize: size,
      letterSpacing: role === 'logo' ? '0.2px' : undefined,
      color,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    } as const
  }
  

  const BTN_BASE = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100%', padding: '0 12px', borderRadius: pack === 'marketplace-amazon' ? 6 : 9999,
    border: `1px solid ${t.line}`, background: 'transparent',
    fontWeight: 600, cursor: 'pointer', outline: 'none', appearance: 'none',
    color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', gap: '8px',
  } as const

  const logoColors = (palette?: { bg?: string; fg?: string }) => {
    const bg = palette?.bg ?? t.primary          // any CSS color string
    const fg = palette?.fg ?? '#ffffff'
    return { bg, fg }
  }
  
  
  const shapeRadius = (sh?: 'square'|'circle'|'rounded') =>
    sh === 'circle' ? Math.round(controlH/2)
    : sh === 'rounded' ? Math.max(6, Math.round(controlH/4))
    : 4


// inside placeCluster(...)
const styleForAction = (
    role?: string,
    itemPalette?: { bg?: string; text?: string; border?: string }
  ) => {
    const packKind = resolvePack(spec)
    const tLocal = tokens(spec)
  
    const bgOverride     = itemPalette?.bg
    const textOverride   = itemPalette?.text
    const borderOverride = itemPalette?.border
    const ctaBg   = tLocal.ctaBg
    const ctaText = tLocal.ctaText
  
    const BTN_BASE = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: '0 12px',
      boxSizing: 'border-box',   // <<< important
      lineHeight: '1',           // <<< important
      fontSize: 13,              // keep all controls same text size
      borderRadius: packKind === 'marketplace-amazon' ? 6 : 9999,
      border: `1px solid ${borderOverride ?? tLocal.line}`,
      background: bgOverride ?? 'transparent',
      fontWeight: 600,
      cursor: 'pointer',
      outline: 'none',
      appearance: 'none',
      color: textOverride ?? tLocal.text,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      gap: '8px',
    } as const
  
    const editorialPrimary = {
      ...BTN_BASE,
      background: bgOverride ?? ctaBg ?? safeMix('#000000', tLocal.bg, 0.15, '#111827'),
      color:      textOverride ?? ctaText ?? '#ffffff',
      border:     `1px solid ${borderOverride ?? safeMix('#000000', tLocal.bg, 0.35, '#374151')}`,
      padding:    '0 16px',
    } as const
  
    switch (role) {
      case 'cart':
        return packKind === 'utilities-compact'
          ? { ...BTN_BASE, background: bgOverride ?? tLocal.primary, border: `1px solid ${borderOverride ?? tLocal.primaryBorder}`, color: textOverride ?? '#fff', padding: '0 16px' }
          : { ...BTN_BASE, background: bgOverride ?? tLocal.chip }
      case 'cta':
        return editorialPrimary
      case 'orders':
        return { ...BTN_BASE, background: bgOverride ?? tLocal.chip }
      case 'help':
        return { ...BTN_BASE }
      case 'notifications':
        return { ...BTN_BASE, width: 40, padding: '0 8px' }
      case 'favorites':
        return { ...BTN_BASE, background: bgOverride ?? tLocal.soft }
      default:
        return BTN_BASE
    }
  }
  


  const out: UIComponent[] = []
  items.forEach((item, i) => {
    const w = widths[i]

// layoutHeaderSmart.ts  — inside placeCluster(...) where item.type === 'icon'
if (item.type === 'icon') {
    // Map any friendly glyph to a Lucide name if needed
    const lucideName = ICON_MAP[(item.glyph || '').toLowerCase()] || item.glyph || 'HelpCircle'
  
    out.push({
      id: uid('icon'),
      type: 'Icon',                // <-- NEW TYPE
      x, y, w, h: controlH,
      props: {
        pack: 'lucide',            // for future extensibility (lucide/heroicons/etc.)
        name: lucideName,          // Lucide component name string, e.g. 'Bell'
        size: 18,                  // you can tune per density/skin
        strokeWidth: 1.75,         // Lucide looks great between 1.5–2
        color: t.icon,             // from your tokens()
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          width: '100%',
        },
      },
    })
  } else if (item.type === 'logoBlock') {
    const { bg, fg } = logoColors((item as any).palette)
    const radius = shapeRadius((item as any).shape)
    const html = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;background:${bg};color:${fg};border-radius:${radius}px;text-align:center;line-height:1;">
        <span style="font-size:10px;font-weight:600;letter-spacing:.2px;opacity:.95">${(item as any).top}</span>
        <span style="font-size:12px;font-weight:700;letter-spacing:.3px;margin-top:2px">${(item as any).bottom}</span>
      </div>`.trim()
    out.push({ id: uid('logo-block'), type: 'Container', x, y, w, h: controlH, props: { children: html, role: (item as any).role } })
  }
  else if (item.type === 'logoMonogram') {
    const { bg, fg } = logoColors((item as any).palette)
    const radius = shapeRadius((item as any).shape)
    const html = `
      <div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:${bg};color:${fg};border-radius:${radius}px;font-weight:700;letter-spacing:.3px;">
        <span style="font-size:12px">${(item as any).initials}</span>
      </div>`.trim()
    out.push({ id: uid('logo-mono'), type: 'Container', x, y, w: controlH, h: controlH, props: { children: html, role: (item as any).role } })
  }
  else if (item.type === 'logoBadge') {
    const { bg, fg } = logoColors((item as any).palette)
    const html = `
      <div style="display:inline-flex;align-items:center;justify-content:center;height:100%;padding:0 12px;background:${bg};color:${fg};border-radius:${Math.round(controlH/2)}px;font-weight:700;">
        ${(item as any).text}
      </div>`.trim()
    out.push({ id: uid('logo-badge'), type: 'Container', x, y, w, h: controlH, props: { children: html, role: (item as any).role } })
  }
  else if (item.type === 'logoSymbolLeft') {
    const { bg, fg } = logoColors((item as any).palette)
    const radius = shapeRadius((item as any).shape)
    const glyphBox = `
      <div style="width:${controlH}px;height:${controlH}px;border-radius:${radius}px;background:${bg};display:flex;align-items:center;justify-content:center;">
        ${
          (item as any).svgPath
            ? `<svg width="${Math.round(controlH*0.6)}" height="${Math.round(controlH*0.6)}" viewBox="0 0 24 24" fill="none" stroke="${fg}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${(item as any).svgPath}"/></svg>`
            : `<div style="width:${Math.round(controlH*0.5)}px;height:${Math.round(controlH*0.5)}px;border-radius:${radius/2}px;background:${fg};opacity:.95"></div>`
        }
      </div>`
    const html = `
      <div style="display:flex;align-items:center;height:100%;gap:10px;color:${t.text}">
        ${glyphBox}
        <span style="font-size:14px;font-weight:700;letter-spacing:.2px;">${(item as any).text}</span>
      </div>`.trim()
    out.push({ id: uid('logo-symL'), type: 'Container', x, y, w, h: controlH, props: { children: html, role: (item as any).role } })
  }
  else if (item.type === 'logoSymbolAbove') {
    const { bg, fg } = logoColors((item as any).palette)
    const radius = shapeRadius((item as any).shape)
    const iconSize = Math.round(controlH*0.7)
    const tileW = Math.max(controlH, Math.min(96, Math.round(controlH*1.4)))
    const mark = (item as any).svgPath
      ? `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="${fg}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${(item as any).svgPath}"/></svg>`
      : `<div style="width:${iconSize}px;height:${iconSize}px;border-radius:${radius}px;background:${bg};"></div>`
    const html = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;gap:4px;color:${t.text}">
        ${mark}
        <span style="font-size:12px;font-weight:700;letter-spacing:.2px;text-align:center">${(item as any).text}</span>
      </div>`.trim()
    out.push({ id: uid('logo-symA'), type: 'Container', x, y, w: tileW, h: controlH, props: { children: html, role: (item as any).role } })
  }
          
  
      
       else if (item.type === 'stack') {
      const html = `
        <div style="display:flex;flex-direction:column;justify-content:center;height:100%;">
          <span style="font-size:11px;line-height:12px;color:${t.sub};">${item.top}</span>
          <span style="font-size:13px;line-height:16px;font-weight:700;color:${t.text};">${item.bottom}</span>
        </div>`.trim()
      out.push({ id: uid('stack'), type: 'Container', x, y, w, h: controlH, props: { style: { display: 'flex', alignItems: 'center', height: '100%' }, children: html } })
    }  else if (item.type === 'action') {
        const ip = (item as any).palette
      
        // optional special “favorites” pill with avatar stays a container
        if ((item as any).role === 'favorites') {
          const html = `<div style="display:flex;align-items:center;gap:8px;">
            <div style="width:20px;height:20px;border-radius:9999px;background:#EF4444;display:flex;align-items:center;justify-content:center;font-size:12px;color:white;">A</div>
            <span>${item.label}</span>
          </div>`
          out.push({
            id: uid('invite'),
            type: 'Container', x, y, w, h: controlH,
            props: { style: styleForAction((item as any).role, ip), children: html, role: (item as any).role }
          })
        } else {
          // ✅ switch from type: 'Button' to 'Container' to avoid native button quirks
          const html = `<span style="display:inline-flex;align-items:center;">${item.label}</span>`
          out.push({
            id: uid('btn'),
            type: 'Container', x, y, w, h: controlH,
            props: { style: styleForAction((item as any).role, ip), children: html, role: (item as any).role }
          })
        }
      }
                 else if (item.type === 'search') {
      const packCorner = resolvePack(spec) === 'marketplace-amazon' ? Math.max(8, Math.round(controlH / 3)) : Math.round(controlH / 2)

      if (pack === 'marketplace-amazon') {
        // Amazon: category segment + white field + orange submit
        const categoryBg = safeMix('#ffffff', t.bg, 0.15, '#F3F4F6')
        const fieldBg    = '#ffffff'
        const submitBg   = t.primary
        const html = `
          <div style="display:flex;align-items:center;height:100%;width:100%;border-radius:${packCorner}px;overflow:hidden;border:1px solid ${t.line};">
            <div style="height:100%;min-width:64px;padding:0 12px;background:${categoryBg};display:flex;align-items:center;justify-content:center;font-size:13px;color:${t.text};">
              All ▾
            </div>
            <div style="flex:1;height:100%;padding:0 12px;background:${fieldBg};display:flex;align-items:center;font-size:14px;color:#6b7280;">
              ${item.placeholder}
            </div>
            <div style="height:100%;min-width:52px;padding:0 12px;background:${submitBg};display:flex;align-items:center;justify-content:center;font-size:16px;">
              🔍
            </div>
          </div>
        `.trim()
        out.push({ id: uid('search-amz'), type: 'Container', x, y, w, h: controlH, props: { children: html } })
      } else if (pack === 'utilities-compact') {
        // Lovable: compact pill with small side chips
        const html = `
          <div style="display:flex;align-items:center;height:100%;width:100%;border-radius:${packCorner}px;overflow:hidden;border:1px solid ${t.line};background:${t.soft};padding:0 8px;gap:8px;">
            <div style="width:28px;height:28px;border-radius:8px;background:${t.chip};display:flex;align-items:center;justify-content:center;font-size:13px;color:${t.text};">▦</div>
            <div style="flex:1;height:100%;display:flex;align-items:center;font-size:14px;color:${t.sub};">${item.placeholder}</div>
            <div style="display:flex;gap:6px;">
              <div style="width:28px;height:28px;border-radius:6px;background:${t.chip};display:flex;align-items:center;justify-content:center;font-size:13px;color:${t.text};">↗︎</div>
              <div style="width:28px;height:28px;border-radius:6px;background:${t.chip};display:flex;align-items:center;justify-content:center;font-size:13px;color:${t.text};">⟳</div>
            </div>
          </div>
        `.trim()
        out.push({ id: uid('search-util'), type: 'Container', x, y, w, h: controlH, props: { children: html } })
      } else {
        // Editorial/SaaS: minimal input
        const html = `
          <div style="display:flex;align-items:center;height:100%;width:100%;border-radius:${packCorner}px;border:1px solid ${t.line};padding:0 12px;color:${t.sub};">
            ${item.placeholder}
          </div>
        `.trim()
        out.push({ id: uid('search-min'), type: 'Container', x, y, w, h: controlH, props: { children: html } })
      }
    } else {
      out.push({ id: uid('txt'), type: 'Text', x, y, w, h: controlH, props: { children: (item as any).text, style: styleText((item as any).role), role: (item as any).role } })
    }

    x += w + gap
  })
  return out
}

/* ---------------- main ---------------- */
export function layoutHeaderSmart(spec: HeaderSpecResolved): UIComponent[] {
    nextId = 0
  
    // ---- bar/control sizes
    const pack = resolvePack(spec)
    const BAR_H  = pack === 'utilities-compact'
      ? 56
      : (spec.density === 'comfortable' ? 52 : spec.density === 'tight' ? 48 : 50)
  
    const CTRL_H = pack === 'utilities-compact'
      ? 32
      : (spec.density === 'tight' ? 30 : 32)
    const centerY = Math.round((BAR_H - CTRL_H) / 2)
  
    const simple: SimpleHeaderLayout = toSimpleLayout(spec)
  
    // ---- anchors inside authoring container
    const leftAnchor  = LEFT_INSET + 12
    const rightAnchor = LEFT_INSET + CONTAINER_W - 12
  
    // ---- corridor math
    const gap = 16
    const leftW        = clusterTotalWidth(simple.left, gap)
    const rightW       = clusterTotalWidth(simple.right, gap)
    const minSep       = 12
  
    const leftRightEdge = leftAnchor + leftW
    const rightLeftEdge = rightAnchor - rightW
  
    const availLeft   = leftRightEdge + minSep
    const availRight  = rightLeftEdge - minSep
    const availWidth  = Math.max(0, availRight - availLeft)
  
    const desiredMidW = clusterTotalWidth(simple.mid, gap) || 0
    const usableMidW  = availWidth >= 140 ? Math.min(availWidth, desiredMidW) : 0
  
    // center between the two cluster edges; then keep mid within the safe corridor
    const corridorCenter = Math.round((leftRightEdge + rightLeftEdge) / 2)
    const safeX = Math.max(corridorCenter, availLeft)
  
    const t = tokens(spec)
  
    // ---- background bar
    const bg: UIComponent = {
      id: uid('bg'),
      type: 'Container',
      x: 0, y: 0, w: CANVAS_W, h: BAR_H,
      props: {
        style: {
          background: t.bg,
          color: t.text,
          borderBottom:
            (pack === 'editorial-minimal' || pack === 'saas-neutral')
              ? `1px solid ${t.line}`
              : undefined,
        },
      },
    }
  
    // ---- left cluster (unchanged)
    const leftNodes = placeCluster(simple.left, leftAnchor, centerY, 'left', CTRL_H, spec)
  
    // ---- mid cluster (kept inside corridor)
    const midNodes = usableMidW <= 0 || simple.mid.length === 0
      ? []
      : placeCluster(
          simple.mid,
          safeX,
          centerY,
          'center',
          CTRL_H,
          spec,
          simple.mid.map(it => (it.type === 'search' ? usableMidW : estWidthFor(it)))
        )
  
    // -------------------------------------------------------------------
    // RIGHT CLUSTER CLAMP: ensure right cluster never crosses the left one
    // -------------------------------------------------------------------
    const rightGap = 16
    const rightItemWidths = simple.right.map(it => estWidthFor(it))
    const rightBaseW =
      rightItemWidths.reduce((a, b) => a + b, 0) +
      rightGap * Math.max(0, simple.right.length - 1)
  
    // Max width for the whole right cluster so its left edge stays ≥ (leftRightEdge + minSep)
    const maxRightW = Math.max(
      0,
      rightAnchor - (leftAnchor + leftW + minSep)
    )
  
    if (rightBaseW > maxRightW) {
      const overflow = rightBaseW - maxRightW
  
      // Prefer shrinking the search control first (largest, flexible)
      const searchIdx = simple.right.findIndex(it => it.type === 'search')
      if (searchIdx !== -1) {
        const MIN_SEARCH_W = 260
        rightItemWidths[searchIdx] = Math.max(
          MIN_SEARCH_W,
          rightItemWidths[searchIdx] - overflow
        )
      }
  
      // (Optional) If still too big, you could add extra rules here:
      // - shrink text actions
      // - collapse labels next to icons
      // - hide least-important items
      // For now we rely on search clamping which handles your case.
    }
  
    const rightNodes = placeCluster(
      simple.right,
      rightAnchor,
      centerY,
      'right',
      CTRL_H,
      spec,
      rightItemWidths // <-- clamped widths
    )
  
    return [bg, ...leftNodes, ...midNodes, ...rightNodes]
  }
  