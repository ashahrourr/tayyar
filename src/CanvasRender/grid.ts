// CanvasRender/grid.ts

export const CANVAS_W   = 980;
export const CONTAINER_W= 920;

/** Content grid (semantic spans) */
export const MAIN_COLS  = 12;
export const MAIN_GUTTER= 16;

/** Nudge grid (fine drag alignment) */
export const SUBDIV     = 2;      // 2 → 24 subcols, 3 → 36 subcols
export const NUDGE_COLS = MAIN_COLS * SUBDIV;
export const NUDGE_GUTTER = 12;

/** Derived */
export const LEFT_INSET = Math.round((CANVAS_W - CONTAINER_W) / 2);

// Content grid math (use for widths/spans)
export const MAIN_COL   = (CONTAINER_W - (MAIN_COLS - 1) * MAIN_GUTTER) / MAIN_COLS;
export const MAIN_STEP  = MAIN_COL + MAIN_GUTTER;

// Nudge grid math (use for X snapping)
export const NUDGE_COL  = (CONTAINER_W - (NUDGE_COLS - 1) * NUDGE_GUTTER) / NUDGE_COLS;
export const NUDGE_STEP = NUDGE_COL + NUDGE_GUTTER;

// Vertical rhythm
export const Y_STEP = 8;

/** ----- Widths: snap to CONTENT spans (clean 1..12) ----- */
export function widthForSpan(span: number): number {
  const s = Math.max(1, Math.min(MAIN_COLS, Math.round(span)));
  return s * MAIN_COL + (s - 1) * MAIN_GUTTER;
}

export function closestSpanWidth(rawW: number): number {
  let best = widthForSpan(1);
  let bestDiff = Math.abs(rawW - best);
  for (let s = 2; s <= MAIN_COLS; s++) {
    const w = widthForSpan(s);
    const diff = Math.abs(rawW - w);
    if (diff < bestDiff) { best = w; bestDiff = diff; }
  }
  return best;
}

/** ----- X snapping: use the NUDGE grid (fine placement) ----- */
export function snappedXLoose(x: number): number {
  const n = Math.round((x - LEFT_INSET) / NUDGE_STEP);
  return LEFT_INSET + n * NUDGE_STEP;
}

export function maybeSnapX(x: number, radius = 6): number {
  const s = snappedXLoose(x);
  return Math.abs(s - x) <= radius ? s : x;
}

export function snappedY(y: number): number {
  return Math.round(y / Y_STEP) * Y_STEP;
}

export function maybeSnapY(y: number, radius = 6): number {
  const s = snappedY(y);
  return Math.abs(s - y) <= radius ? s : y;
}

/** Soft snap width to nearest CONTENT span (keeps 1..12 grid clean) */
export function maybeSnapWidth(left: number, rawW: number, radius = 8): number {
  const s = closestSpanWidth(rawW);
  return Math.abs(s - rawW) <= radius ? s : rawW;
}

/** Choose nearest of: nudge columns, container edges, canvas edges */
export function maybeSnapXWithEdges(x: number, width: number, radius = 8): number {
  // nudge grid
  const n = Math.round((x - LEFT_INSET) / NUDGE_STEP);
  const colLeft = LEFT_INSET + n * NUDGE_STEP;

  // container edges (align left or right)
  const containerLeft = LEFT_INSET;
  const containerRightLeft = LEFT_INSET + CONTAINER_W - width;

  // canvas edges (align left or right)
  const canvasLeft = 0;
  const canvasRightLeft = CANVAS_W - width;

  const candidates = [colLeft, containerLeft, containerRightLeft, canvasLeft, canvasRightLeft];

  let best = x, bestDist = radius + 1;
  for (const c of candidates) {
    const d = Math.abs(c - x);
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return bestDist <= radius ? best : x;
}
