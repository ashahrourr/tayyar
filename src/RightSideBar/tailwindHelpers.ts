// utils/tailwindHelpers.ts
const TEXT_SIZES = [
    'text-xs','text-sm','text-base','text-lg','text-xl',
    'text-2xl','text-3xl','text-4xl','text-5xl','text-6xl'
  ];
  
  export function getCurrentTextSize(cls = '') {
    return TEXT_SIZES.find(c => cls.includes(c)) ?? 'text-base';
  }
  
  export function shiftTextSize(cls = '', delta: 1 | -1) {
    const current = getCurrentTextSize(cls);
    const idx = TEXT_SIZES.indexOf(current);
    const next = TEXT_SIZES[Math.max(0, Math.min(TEXT_SIZES.length - 1, idx + delta))];
    return cls
      .replace(current, '')          // remove old size
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .concat(next)                  // add new size
      .join(' ');
  }
  
  export function getCurrentPadding(cls = '') {
    const match = cls.match(/\bp-(\d+)\b/);
    return match ? Number(match[1]) : 4;      // default Tailwind p-4
  }
  
  export function setPadding(cls = '', value: number) {
    const cleaned = cls.replace(/\bp-\d+\b/, '').trim();
    return `${cleaned} p-${value}`.trim();
  }
  
  // -------- COLORS --------
const COLOR_RX = (prefix: 'text' | 'bg') =>
  new RegExp(`${prefix}-\\[#([0-9a-fA-F]{6})\\]`);


export function setColor(cls = '', prefix: 'text' | 'bg', hex: string) {
  const cleaned = cls
    // remove arbitrary hex colors
    .replace(COLOR_RX(prefix), '')
    // remove named Tailwind colours (e.g. text-red-500, bg-blue-200)
    .replace(new RegExp(`${prefix}-[^ ]+`, 'g'), '')
    .trim();

  return `${cleaned} ${prefix}-[${hex}]`.trim();
}
export function setInlineColor(
  style: Record<string, any> | undefined,
  prefix: 'text' | 'bg',
  hex: string
) {
  const key = prefix === 'text' ? 'color' : 'backgroundColor';
  return { ...(style ?? {}), [key]: hex };
}

export function getCurrentColor(
  cls: string = '',
  prefix: 'text' | 'bg',
  style?: Record<string, any>
): string {
  const key = prefix === 'text' ? 'color' : 'backgroundColor';

  // First check inline style
  if (style && style[key]) return style[key];

  // Then fallback to className
  const m = cls.match(COLOR_RX(prefix));
  return m ? `#${m[1]}` : '#ffffff';
}