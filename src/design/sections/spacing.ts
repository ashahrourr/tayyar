// src/design/sections/spacing.ts
import { UIComponent } from "@/lib/types";

const n = (v: any) =>
  typeof v === "number" ? v : (parseInt(String(v ?? 0), 10) || 0);

export function withSectionSpacing(roots: UIComponent[], pad = 32): UIComponent[] {
  // deep clone
  const clone = (node: UIComponent): UIComponent => ({
    ...node,
    props: { ...(node.props || {}) },
    children: node.children ? node.children.map(clone) : undefined,
  });
  const tree = roots.map(clone);

  // collect maps
  const kids = new Map<string, UIComponent[]>();
  const all: UIComponent[] = [];
  (function collect(list: UIComponent[]) {
    for (const node of list) {
      all.push(node);
      if (node.children?.length) {
        kids.set(node.id, node.children);
        collect(node.children);
      }
    }
  })(tree);

  const isHeader = (x: UIComponent) =>
    String((x.props as any)?.sectionTemplate || "").toLowerCase() === "header";
  const isSection = (x: UIComponent) =>
    (x as any).isSection && !isHeader(x);

  const sections = all
    .filter(isSection)
    .sort((a, b) => n(a.y) - n(b.y));

  const shiftSubtree = (root: UIComponent, dy: number) => {
    const stack = [root];
    while (stack.length) {
      const cur = stack.pop()!;
      cur.y = n(cur.y) + dy;
      const ch = kids.get(cur.id) ?? [];
      stack.push(...ch);
    }
  };

  let cursorBottom = -Infinity;
  for (const sec of sections) {
    const y = n(sec.y);
    const h = n(sec.h);
    const targetY = cursorBottom === -Infinity ? y : Math.max(y, cursorBottom + pad);
    const dy = targetY - y;
    if (dy > 0) shiftSubtree(sec, dy);
    cursorBottom = n(sec.y) + h;
  }

  return tree;
}
