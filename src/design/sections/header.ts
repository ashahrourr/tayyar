// src/design/sections/header.ts
import { UIComponent } from "@/lib/types";
import { CANVAS_W, LEFT_INSET, MAIN_STEP, widthForSpan } from '@/CanvasRender/grid';

export function withHeaderLayout(roots: UIComponent[]): UIComponent[] {
  // deep clone
  const clone = (n: UIComponent): UIComponent => ({
    ...n,
    props: { ...(n.props || {}) },
    children: n.children ? n.children.map(clone) : undefined,
  });
  const tree = roots.map(clone);

  const isHeader = (n: UIComponent) =>
    String((n.props as any)?.sectionTemplate || '').toLowerCase() === 'header';

  const all: UIComponent[] = [];
  (function collect(list: UIComponent[]) {
    for (const n of list) {
      all.push(n);
      if (n.children?.length) collect(n.children);
    }
  })(tree);

  const textOf = (n?: UIComponent) => {
    const raw = n && (n.props as any)?.children;
    return typeof raw === 'string' ? raw.replace(/<[^>]+>/g, '').trim() : '';
  };
  const estimateW = (n?: UIComponent, min = 64, max = 180) => {
    const t = textOf(n);
    const base = Math.ceil(t.length * 8.5) + 20; // chars + padding
    return Math.max(min, Math.min(base, max));
  };

  for (const sec of all) {
    if (!isHeader(sec)) continue;

    (sec as any).isSection = true;
    const sp = (sec.props ||= {});
    sp.variant ||= 'Header.glass'; // don’t overwrite explicit variant

    // full-bleed band
    sec.x = 0; sec.w = CANVAS_W;
    const sectionY = typeof sec.y === 'number' ? sec.y : 0;
    const H = 72; sec.h = H;

    // 12-col slices
    const colX = (start: number) => LEFT_INSET + start * MAIN_STEP;
    const left = 3, center = 6, right = 3;
    const logoX = colX(0),              logoW = widthForSpan(left);
    const midX  = colX(left),           midW  = widthForSpan(center);
    const actX  = colX(left + center),  actW  = widthForSpan(right);
    const centerY = (h: number) => sectionY + Math.round((H - h) / 2);

    const kids = sec.children ?? [];
    const byRole = (r: string) =>
      kids.find(k => String((k.props as any)?.role || '').toLowerCase() === r);

    const logo = byRole('logo') || kids.find(k => k.id === 'logo');
    const cta  = byRole('cta')  || kids.find(k => k.id === 'cta');
    const navItems = kids.filter(
      k => String((k.props as any)?.role || '').toLowerCase() === 'navitem'
    );

    // Logo
    if (logo) {
      const lp = (logo.props ||= {});
      if (!('mix' in lp) && !('variant' in lp)) (lp as any).mix = ['h3','brand'];
      logo.x = logoX; logo.w = logoW; logo.h = 32; logo.y = centerY(32);
    }

    // Center nav links
    if (navItems.length) {
      const GAP = 24;
      const widths = navItems.map(n => estimateW(n, 64, 160));
      const total  = widths.reduce((a, b) => a + b, 0) + GAP * (navItems.length - 1);
      let x = midX + Math.max(0, Math.round((midW - total) / 2));

      navItems.forEach((n, i) => {
        const np = (n.props ||= {});
        np.variant ||= 'Nav.linkOnGlass'; // darker text on light glass
        n.x = x; n.y = centerY(40); n.w = widths[i]; n.h = 40;
        x += widths[i] + GAP;
      });
    }

    // Right CTA
    if (cta) {
      const cp = (cta.props ||= {});
      cp.variant ||= 'Button.primary';     // uses your existing token
      cta.w = Math.max(140, estimateW(cta, 120, 220) + 16);
      cta.h = 40;
      cta.x = actX + actW - cta.w;
      cta.y = centerY(40);
    }
  }

  return tree;
}
