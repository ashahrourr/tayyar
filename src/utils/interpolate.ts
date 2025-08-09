// utils/interpolate.ts
export function interpolate(template: string, context: Record<string, any>) {
    return template.replace(/\{\{(.*?)\}\}/g, (_, expr) => {
      try {
        const fn = new Function(...Object.keys(context), `return (${expr})`)
        return fn(...Object.values(context))
      } catch (e) {
        return `{{${expr}}}` // fallback
      }
    })
  }
  