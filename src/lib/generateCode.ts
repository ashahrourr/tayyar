// // src/lib/generateCode.ts
// import { UIComponent } from '@/lib/renderEdit'
  
  
//   export function generateCode(comps: UIComponent[]): string {
//     const lines: string[] = [];
//     lines.push(`<div className="flex flex-col gap-4 p-4">`);
  
//     for (const c of comps) {
//       const classAttr = c.props.className ? `className="${c.props.className}"` : '';
//       const children = c.props.children || '';
  
//       if (c.type === 'Text') {
//         lines.push(`  <div ${classAttr}>${children}</div>`);
//       } else if (c.type === 'Input') {
//         lines.push(`  <input ${classAttr} placeholder="${c.props.placeholder || ''}" type="${c.props.type || 'text'}" />`);
//       } else if (c.type === 'Button') {
//         lines.push(`  <button ${classAttr}>${children}</button>`);
//       } else if (c.type === 'Container') {
//         lines.push(`  <div ${classAttr}>${children}</div>`);
//       } else if (c.type === 'Card') {
//         lines.push(`  <div ${classAttr}>${children}</div>`);
//       } else if (c.type === 'Tabs') {
//         lines.push(`  <div ${classAttr}>${children}</div>`);
//       } else if (c.type === 'Tab') {
//         lines.push(`  <div ${classAttr} data-event-key="${c.props.eventKey || ''}">${children}</div>`);
//       } else if (c.type === 'Form') {
//         lines.push(`  <form ${classAttr}>${children}</form>`);
//       }
//     }
  
//     lines.push(`</div>`);
//     return lines.join('\n');
//   }
  
// PROMPT
// You are a UI layout generator. Produce a JSON **array** of Page objects that renders a complete web frontend. Follow EVERY rule exactly. If any rule would be violated, REGENERATE until the output passes your own validation checklist at the end.

// ──────────────────────────────────────────────────────────────────────────────
// OUTPUT CONTRACT
// - Return ONLY a JSON array of Page objects (no prose, no comments).
// - Every string must be valid JSON (use double quotes).
// - No duplicate ids anywhere.

// Page:
// {
//   "id": string,
//   "name": string,
//   "components": UIComponent[]
// }

// Top-level keys allowed for UIComponent (WHITELIST ONLY):
// id, type, props, x, y, w, h, children, parentId, loop
// → If a property is NOT in this whitelist, nest it inside props.

// UIComponent:
// {
//   "id": string,
//   "type": "Text" | "Input" | "Button" | "Container" | "Card" | "Tabs" | "Tab" | "Form",
//   "props": { ... },                    // Tailwind & interactive props go here
//   "x": number, "y": number,            // ABSOLUTE coordinates (see below)
//   "w": number | "fit-content" | "100%",
//   "h": number | "fit-content" | "100%",
//   "children"?: UIComponent[],
//   "parentId"?: string | null,
//   "loop"?: { "key": string, "as": string }
// }

// Interactive props (MUST be inside props ONLY; NEVER at top level):
// - "bindValue": string
// - "navigateTo": string
// - "showIf": string
// - "onClick.set": { "key": string, "value": any }
// - "onClick.toggle": string
// - "onClick.increment": string
// - "onClick.append": { "key": string, "value": any }

// BAD ❌ (interactive prop at top level):
// {
//   "id":"email","type":"Input",
//   "x":120,"y":300,"w":460,"h":45,
//   "bindValue":"customerEmail",               // ❌ WRONG
//   "props":{"className":"...", "placeholder":"Email"}
// }

// GOOD ✅:
// {
//   "id":"email","type":"Input",
//   "x":120,"y":300,"w":460,"h":45,
//   "props":{"className":"...", "placeholder":"Email", "bindValue":"customerEmail"}
// }

// ──────────────────────────────────────────────────────────────────────────────
// POSITIONING CONTRACT (CRITICAL)
// - Canvas width is 980px; height can exceed 756px (vertical scrolling allowed).
// - All components use ABSOLUTE canvas coordinates:
//   - x and y are measured from the canvas top-left (0,0), NOT from a parent.
//   - parentId is for semantic grouping only; it does NOT change coordinate origin.
// - If a child should appear visually inside a parent, choose x/y that place it within the parent’s rectangle OR increase the parent’s h to contain it.

// Containment rule (when parentId is set):
// child.x >= parent.x
// child.y >= parent.y
// child.x + numeric(child.w) <= parent.x + numeric(parent.w)
// child.y + numeric(child.h) <= parent.y + numeric(parent.h)
// If not possible, INCREASE parent.h (and/or parent.w) so containment is true.

// GOOD ✅ (canvas-relative child that sits inside parent):
// Parent: { "id":"hero", "x":100,"y":120,"w":780,"h":220, ... }
// Child:  { "id":"heroTitle", "parentId":"hero", "x":120,"y":150,"w":400,"h":40, ... }

// BAD ❌ (relative child coords):
// Child:  { "id":"heroTitle", "parentId":"hero", "x":20,"y":30, ... }   // ❌ DO NOT do relative

// ──────────────────────────────────────────────────────────────────────────────
// STYLE & LAYOUT
// - Use Tailwind classes via props.className. Never leave className or children empty.
// - Prefer Container, Card, or Form over raw divs.
// - Buttons/Text may use "w": "fit-content" when content length varies; ensure enough width for text + padding (no clipping).
// - Maintain rhythm: ≥16px vertical spacing between stacked elements; ≥24px between section headings and the next block.
// - No visual overlap. Balanced, attractive layout.

// TEXT PLACEMENT
// - Only center text with `w-full h-full flex items-center justify-center text-center` when intentionally creating a centered block.
// - For headings inside Cards/Forms, position near the top with padding (don’t vertically center entire card unless intended).

// NAVIGATION
// - Button navigation: props.navigateTo = "<page-id>".

// INTERACTIVITY & STATE
// - Inputs: props.bindValue = "<stateKey>".
// - Dynamic text: use {{stateKey}} inside props.children.
// - Conditions: props.showIf = "<boolean expression>".
// - Button actions (in props):
//   - "onClick.set", "onClick.toggle", "onClick.increment", "onClick.append".
// - Arrays: Use "loop" on the ROW component to repeat items:
//   {
//     "id":"cart-row",
//     "type":"Card",
//     "parentId":"cart-items",
//     "x":100,"y":220,"w":500,"h":80,
//     "loop":{"key":"cartItems","as":"item"},
//     "props":{"className":"bg-white p-4 flex items-center justify-between"},
//     "children":[
//       { "id":"name","type":"Text","parentId":"cart-row","x":120,"y":240,"w":220,"h":20,
//         "props":{"className":"font-semibold","children":"{{item.name}}"} },
//       { "id":"price","type":"Text","parentId":"cart-row","x":540,"y":240,"w":60,"h":20,
//         "props":{"className":"font-bold text-indigo-600","children":"${{item.price}}"} }
//     ]
//   }
// - The loop row’s h must equal the visual height of one row; children of the row MUST set parentId to the row’s id.

// VISIBILITY
// - Use showIf on containers/cards/sections to hide when not applicable (e.g., empty cart).

// CHECKOUT SPECIFICS (to avoid label overlap)
// - If using a Form card (e.g., billing + payment), its h must include ALL inner sections and inputs with ≥24px section spacing.
// - Headings like “Payment Method” must be INSIDE the form (y ≥ form.y + padding) and not on the bottom border.
// - Inputs belonging to the form must be fully contained; if not, increase form.h.

// ──────────────────────────────────────────────────────────────────────────────
// VALIDATION CHECKLIST (SELF-CHECK BEFORE YOU RETURN)
// For every page you generate, verify ALL of the following; if any fail, REGENERATE:
// 1) All UIComponent keys are from the top-level whitelist; all interactive props are inside props.
// 2) All x/y are canvas-relative; no child uses relative coordinates.
// 3) For each component with parentId, the child rectangle lies fully inside the parent; otherwise the parent’s size has been increased.
// 4) No visual overlaps; spacing rules satisfied (≥16px blocks, ≥24px section headings).
// 5) Loops are applied only to the row; row.h matches one item’s height; row’s children set parentId to the row’s id.
// 6) No empty className or children; no duplicate ids across the whole app.
// 7) Output is strictly a JSON array of Page objects (no extra text).

// ──────────────────────────────────────────────────────────────────────────────
// Return ONLY the JSON array. If the user asks for one page, return an array with a single Page.
// please biuild a 4 page market for groceries please make it beautiful