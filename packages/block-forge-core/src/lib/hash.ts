export function stableHash8(input: string): string {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0
  }
  return (hash >>> 0).toString(16).padStart(8, '0').slice(0, 8)
}

export function suggestionId(
  heuristic: string,
  selector: string,
  bp: number,
  property: string,
  value: string,
): string {
  return `${heuristic}-${stableHash8(`${selector}|${bp}|${property}|${value}`)}`
}
