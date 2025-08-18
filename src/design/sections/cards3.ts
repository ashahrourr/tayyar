// src/design/sections/cards3.ts
import { UIComponent } from "@/lib/types";
import { LEFT_INSET, MAIN_STEP, widthForSpan, snappedY } from "@/CanvasRender/grid";

export function withCards3Layout(roots: UIComponent[]): UIComponent[] {
  const clone = (n: UIComponent): UIComponent => ({
    ...n,
    props: { ...(n.props || {}) },
    children: n.children?.map(clone),
  });
  const tree = roots.map(clone);

  const isCards = (n: UIComponent) =>
    String((n.props as any)?.sectionTemplate || "").toLowerCase() === "cards-3up";

  const all: UIComponent[] = [];
  (function walk(list: UIComponent[]) {
    for (const n of list) {
      all.push(n);
      if (n.children?.length) walk(n.children);
    }
  })(tree);

  const colX = (c: number) => LEFT_INSET + c * MAIN_STEP;

  for (const sec of all) {
    if (!isCards(sec)) continue;
    (sec as any).isSection = true;

    const sectionY = typeof sec.y === "number" ? sec.y : 0;
    const PAD_Y = 24;
    const GAP_Y = 16;

    const kids = sec.children ?? [];
    const title = kids.find(
      (k) => String((k.props as any)?.role || "").toLowerCase() === "title"
    );

    let titleBottom = sectionY + PAD_Y;
    if (title) {
      title.x = colX(0);
      title.w = widthForSpan(12);
      title.y = sectionY + PAD_Y;
      title.h = 40;
      titleBottom = (title.y ?? sectionY + PAD_Y) + (title.h ?? 0);
    }

    const cards = kids.filter(
      (k) => String((k.props as any)?.role || "").toLowerCase() === "card"
    );
    const spans = [0, 4, 8];
    const cardW = widthForSpan(4);
    const topY = titleBottom + GAP_Y;

    cards.slice(0, 3).forEach((card, i) => {
      card.x = colX(spans[i]);
      card.y = topY;
      card.w = cardW;
      card.h = 196;

      const h = card.children ?? [];
      const head = h.find(
        (k) => String((k.props as any)?.role || "").toLowerCase() === "cardtitle"
      );
      const body = h.find(
        (k) => String((k.props as any)?.role || "").toLowerCase() === "cardbody"
      );

      let y = topY + 20;
      if (head) {
        head.x = (card.x ?? 0) + 20;
        head.w = (card.w as number) - 40;
        head.y = y;
        head.h = 28;
        y += 36;
      }
      if (body) {
        body.x = (card.x ?? 0) + 20;
        body.w = (card.w as number) - 40;
        body.y = y;
        body.h = 64;
      }
    });

    const bottoms = [
      titleBottom,
      ...cards.map((c) => ((c.y ?? sectionY) + (c.h as number || 0))),
    ];
    sec.h = snappedY(Math.max(...bottoms) - sectionY + PAD_Y);
  }

  return tree;
}
