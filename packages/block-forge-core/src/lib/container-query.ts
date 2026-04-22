export function buildAtContainer(bp: number, body: string): string {
  return `@container slot (max-width: ${bp}px) {\n${body}\n}`
}

export function parseContainerBp(atRule: string): number | null {
  const m = atRule.match(/^@container\s+slot\s*\(\s*max-width\s*:\s*(\d+)px\s*\)\s*$/i)
  return m ? Number(m[1]) : null
}
