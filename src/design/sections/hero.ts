// src/design/sections/hero.ts
import { UIComponent } from "@/lib/types";
import {
  CANVAS_W,
  CONTAINER_W,
  LEFT_INSET,
  MAIN_STEP,
  widthForSpan,
} from "@/CanvasRender/grid";

export function withHeroLayout(roots: UIComponent[]): UIComponent[] {
  const clone = (n: UIComponent): UIComponent => ({
    ...n,
    props: { ...(n.props || {}) },
    children: n.children ? n.children.map(clone) : undefined,
  });
  const tree = roots.map(clone);

  const isHero = (n: UIComponent) =>
    String((n.props as any)?.sectionTemplate || "").toLowerCase() === "hero";

  const all: UIComponent[] = [];
  (function collect(list: UIComponent[]) {
    for (const n of list) {
      all.push(n);
      if (n.children?.length) collect(n.children);
    }
  })(tree);

  const textOf = (n?: UIComponent) => {
    if (!n) return "";
    const raw = (n.props as any)?.children;
    return typeof raw === "string" ? raw.replace(/<[^>]+>/g, "").trim() : "";
  };

  // local width estimator for fit-content (mirrors Element.tsx logic)
  const estimateInlineWidth = (n?: UIComponent) => {
    if (!n) return 240;
    const raw = (n.props as any)?.children ?? "";
    const txt = typeof raw === "string" ? raw.replace(/<[^>]+>/g, "") : "";
    const charW = 8.5;
    const sidePad = 32;
    const base = Math.ceil(txt.length * charW) + sidePad;
    const min = n.type === "Button" ? 120 : 160;
    const max = 480;
    return Math.max(min, Math.min(base, max));
  };

  // Conservative first-paint estimates (before autoHeight measures)
  const estimateTitleH = (txt: string, w: number) => {
    if (!txt) return 160;
    const charsPerLine = Math.max(8, Math.floor(w / 11));
    const lines = Math.max(1, Math.min(4, Math.ceil(txt.length / charsPerLine)));
    const lineH = 72;
    return Math.max(160, lines * lineH);
  };
  const estimateBodyH = (txt: string, w: number) => {
    if (!txt) return 56;
    const charsPerLine = Math.max(16, Math.floor(w / 10));
    const lines = Math.max(1, Math.min(6, Math.ceil(txt.length / charsPerLine)));
    const lineH = 28;
    return Math.max(48, lines * lineH);
  };

  for (const sec of all) {
    if (!isHero(sec)) continue;
    (sec as any).isSection = true;

    // Full-bleed band; children align to inner 12-col grid
    sec.x = 0;
    sec.w = CANVAS_W;
    const sectionY = typeof sec.y === "number" ? sec.y : 0;

    const kids = sec.children ?? [];
    const byRole = (r: string) =>
      kids.find((k) => String((k.props as any)?.role || "").toLowerCase() === r);

    const title  = byRole("title");
    const body   = byRole("body");
    const cta    = byRole("buttonprimary");
    const callout = byRole("callout");
    const image =
      byRole("image") ||
      kids.find(
        (k) =>
          k.type === "Container" &&
          String((k.props as any)?.role || "").toLowerCase() === "image"
      );

    // Mode: default split (7/5) OR auto-centered (if no image) OR explicit align=center
    const alignProp =
      ((sec.props as any)?.align ?? (sec as any)?.options?.align) || "";
    const centered =
      String(alignProp).toLowerCase().includes("center") || !image;

    // Spacing
    const PAD_Y = 24;
    const AFTER_HEADING = centered ? 24 : 32;
    const BETWEEN_BLOCKS = centered ? 20 : 16;

    // Grid
    const colX = (startCol: number) => LEFT_INSET + startCol * MAIN_STEP;
    let leftSpan = centered ? 10 : 7;
    let leftW = widthForSpan(leftSpan);
    let leftX = centered
      ? LEFT_INSET + Math.round((CONTAINER_W - leftW) / 2)
      : colX(0);

    const rightSpan = 12 - leftSpan;
    const rightX = colX(leftSpan);
    const rightW = widthForSpan(rightSpan);

    // Ensure tokens if user omitted them; force text centering in centered mode
    const ensureTokens = (n?: UIComponent) => {
      if (!n) return;
      const p = (n.props ||= {});
      const role = String((p as any).role || "").toLowerCase();

      if (!("variant" in p) && !("mix" in p)) {
        if (role === "title") (p as any).mix = ["h1", "text"];
        else if (role === "body") (p as any).mix = ["body", "muted"];
        else if (role === "buttonprimary") (p as any).variant = "Button.primary";
      }

      if (centered && (role === "title" || role === "body")) {
        ((p as any).mix ||= []).push("text-center");
        // inline style to defeat any stray text-left in variants
        (p as any).style = { ...(p as any).style, textAlign: "center" };
        if (role === "title") ((p as any).mix ||= []).push("leading-tight");
      }
      if (centered && role === "buttonprimary") {
        ((p as any).mix ||= []).push("mx-auto", "block");
      }
    };
    ensureTokens(title);
    ensureTokens(body);
    ensureTokens(cta);

    // Left (or centered) stack
    let cursorY = sectionY + PAD_Y;

    // TITLE
    let titleHUsed = 0;
    if (title) {
      title.x = leftX;
      title.w = leftW;
      title.y = cursorY;
      const numeric = typeof title.h === "number" ? (title.h as number) : undefined;
      if (!numeric) {
        title.h = "fit-content" as any;
        (title.props ||= {}), ((title.props as any).autoHeight = true);
      }
      titleHUsed = numeric ?? estimateTitleH(textOf(title), leftW);
      cursorY = (title.y as number) + titleHUsed + AFTER_HEADING;
    }

    // BODY
    let bodyHUsed = 0;
    if (body) {
      body.x = leftX;
      body.w = leftW;
      body.y = cursorY;
      const numeric = typeof body.h === "number" ? (body.h as number) : undefined;
      if (!numeric) {
        body.h = "fit-content" as any;
        (body.props ||= {}), ((body.props as any).autoHeight = true);
      }
      bodyHUsed = numeric ?? estimateBodyH(textOf(body), leftW);
      cursorY = (body.y as number) + bodyHUsed + BETWEEN_BLOCKS;
    }

    // CTA — center using estimated fit-content width
    if (cta) {
      const est = estimateInlineWidth(cta);
      cta.w = "fit-content" as any;
      cta.x = centered
        ? LEFT_INSET + Math.round((CONTAINER_W - est) / 2)
        : leftX;
      cta.y = cursorY;
      cta.h = 44;
      cursorY = (cta.y as number) + 44 + BETWEEN_BLOCKS;
    }

    // Right image column (split layout only)
    const imgTop = sectionY + PAD_Y;
    const leftStackBottom = Math.max(
      title ? (title.y as number) + titleHUsed : imgTop,
      body ? (body.y as number) + bodyHUsed : imgTop,
      cta ? (cta.y as number) + 44 : imgTop
    );
    const desiredImgH = Math.max(220, leftStackBottom - imgTop);

    if (!centered && image) {
      image.x = rightX;
      image.w = rightW;
      image.y = imgTop;
      image.h = Math.round(desiredImgH / 8) * 8;
    }

    // Optional centered callout panel below CTA
    if (centered) {
      const call = callout;
      if (call) {
        const cw = widthForSpan(8);
        const cx = LEFT_INSET + Math.round((CONTAINER_W - cw) / 2);
        call.x = cx;
        call.w = cw;
        call.y = cursorY;
        call.h = (typeof call.h === "number" && call.h) || 220;

        const pad = 20;
        const ch = call.children ?? [];
        const coTitle = ch.find(
          (k) =>
            String((k.props as any)?.role || "").toLowerCase() === "callouttitle"
        );
        const coBody = ch.find(
          (k) =>
            String((k.props as any)?.role || "").toLowerCase() === "calloutbody"
        );

        if (coTitle) {
          coTitle.x = (call.x as number) + pad;
          coTitle.w = (call.w as number) - pad * 2;
          coTitle.y = (call.y as number) + pad;
          coTitle.h = 28;
        }
        if (coBody) {
          coBody.x = (call.x as number) + pad;
          coBody.w = (call.w as number) - pad * 2;
          coBody.y = coTitle
            ? (coTitle.y as number) + (coTitle.h as number) + 12
            : (call.y as number) + pad;
          coBody.h = typeof coBody.h === "number" ? coBody.h : 120;
        }

        cursorY = (call.y as number) + (call.h as number) + BETWEEN_BLOCKS;
      }
    }

    // Section height
    const imgBottom =
      !centered && image
        ? (image.y as number) + (image.h as number)
        : leftStackBottom;
    const maxBottom = Math.max(cursorY, imgBottom, leftStackBottom);
    sec.h = Math.round(((maxBottom - sectionY) + PAD_Y) / 8) * 8;
  }

  return tree;
}
