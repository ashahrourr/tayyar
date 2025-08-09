// // pages/api/generate.ts
// import type { NextApiRequest, NextApiResponse } from 'next';
// import { OpenAI } from 'openai';

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

//   const { prompt } = req.body as { prompt?: string };
//   if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

//   try {
//     const completion = await openai.chat.completions.create({
//       model: 'gpt-4o',
//       response_format: { type: 'json_object' },
//       messages: [
//         {
//           role: 'system',
//           content: `You are a frontend UI generator for a visual editor.

// Return a JSON object with a top-level "components" array.

// Each component must include:
// - id: unique string
// - type: one of: "Text", "Input", "Button", "Container", "Card", "Tabs", "Tab", "Form", "Image"
// - props: include className (Tailwind CSS) and other needed props
// - x, y: number (top-left position)
// - w, h: number or string (width, height)
// - children: optional nested components

// Rules:
// - Components may be **nested** using the `children` field.
// - Use **flexbox or grid** layout via Tailwind where possible.
// - Use `x`, `y`, `w`, `h` only for absolutely positioned elements.
// - Snap positions and sizes to an **8px grid** (e.g. 8, 16, 24...).
// - ClassName must use **Tailwind CSS only** — no inline styles.
// - Do NOT return explanations or text — only a pure JSON object like: `{ "components": [ ... ] }`

//           `,
//         },
//         { role: 'user', content: prompt },
//       ],
//       temperature: 0.4,
//     });

//     const content = completion.choices[0].message.content;
//     console.log('🧠 Raw LLM output:', content);
//     if (!content) return res.status(500).json({ error: 'LLM returned empty content' });

//     const components = JSON.parse(content);
//     return res.status(200).json(components);
//   } catch (err) {
//     console.error('generate error', err);
//     return res.status(500).json({ error: 'Failed to generate UI components' });
//   }
// }