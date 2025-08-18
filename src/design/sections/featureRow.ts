import { UIComponent } from "@/lib/types";
import { LEFT_INSET, MAIN_STEP, widthForSpan } from "@/CanvasRender/grid";

const snap8 = (n: number) => Math.round(n / 8) * 8;

export function withFeatureRowLayout(roots: UIComponent[]): UIComponent[] {
  const clone = (n: UIComponent): UIComponent => ({
    ...n,
    props: { ...(n.props || {}) },
    children: n.children ? n.children.map(clone) : undefined,
  });
  const tree = roots.map(clone);

  const isFeature = (n: UIComponent) =>
    String((n.props as any)?.sectionTemplate || "").toLowerCase() === "featurerow";

  const all: UIComponent[] = [];
  (function collect(list: UIComponent[]) {
    for (const n of list) { all.push(n); if (n.children?.length) collect(n.children); }
  })(tree);

  for (const sec of all) {
    if (!isFeature(sec)) continue;

    (sec as any).isSection = true;
    const sp = (sec.props ||= {});
    sp.variant = sp.variant || "Section.alt";
    sec.x = 0;
sec.w = '100%';        // Element.computeRect -> canvasW (980)
sec.y = typeof sec.y === 'number' ? sec.y : 0;
(sp as any).__padT = 24;   // PAD_T
(sp as any).__padB = 24;   // PAD_B

    const sectionY = typeof sec.y === "number" ? sec.y : 0;
    const H_MIN = 320;
    const PAD_T = 24;
    const PAD_B = 24;
    const GAP   = 16;

    const colX = (startCol: number) => LEFT_INSET + startCol * MAIN_STEP;
    const textSpan = 6, imgSpan = 6;
    const textX = colX(0),         textW = widthForSpan(textSpan);
    const imgX  = colX(textSpan),  imgW  = widthForSpan(imgSpan);

    const kids   = sec.children ?? [];
    const byRole = (r: string) => kids.find(k => String((k.props as any)?.role || "").toLowerCase() === r);

    const eyebrow = byRole("eyebrow");
    const title   = byRole("title");
    const body    = byRole("body");
    const bullets = byRole("bulletlist");
    const cta     = byRole("buttonprimary");
    const image   = byRole("image") || kids.find(k => k.type === "Container");

    // Left column
    let yCursor = sectionY + PAD_T;
    if (eyebrow) { eyebrow.x = textX; eyebrow.w = textW; eyebrow.h = 20; eyebrow.y = yCursor; yCursor += (eyebrow.h as number) + 8; }
    if (title)   { title.x   = textX; title.w   = textW; title.h   = 96;  title.y   = yCursor; yCursor += (title.h   as number) + GAP; }
    if (body)    { body.x    = textX; body.w    = textW; body.h    = 56;  body.y    = yCursor; yCursor += (body.h    as number) + GAP; }
    if (bullets) { bullets.x = textX; bullets.w = textW; bullets.h = 88;  bullets.y = yCursor; yCursor += (bullets.h as number) + GAP; }
    if (cta)     { cta.x     = textX; cta.w     = 148;  cta.h     = 40;  cta.y     = yCursor; yCursor += (cta.h     as number) + GAP; }
    const leftBottom = yCursor;

    // Initial image size (to match left stack)
    const imgTop = sectionY + PAD_T;
    if (image) {
      const desiredH = Math.max(220, leftBottom - imgTop);
      image.x = imgX; image.w = imgW; image.y = imgTop; image.h = snap8(desiredH);
    }

    // Compute section height
    let secBottom = sectionY + H_MIN;
    for (const k of [eyebrow, title, body, bullets, cta, image]) {
      if (!k) continue;
      const h = typeof k.h === "number" ? k.h : 0;
      const b = (k.y as number) + h;
      if (b > secBottom) secBottom = b;
    }
    sec.h = snap8(secBottom - sectionY + PAD_B);

    // ✅ Stretch image to the section bottom (minus PAD_B)
    if (image) {
      const fullH = snap8((sec.y as number) + (sec.h as number) - PAD_B - imgTop);
      if (fullH > (image.h as number)) image.h = fullH;
    }
  }

  return tree;
}
