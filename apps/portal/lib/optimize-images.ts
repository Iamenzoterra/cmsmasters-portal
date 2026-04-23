// Docs: docs/r2-images-bucket-icons-management.md
// - bucket layout, URL conventions, CF dashboard config, troubleshooting.
const CDN_HOST = 'https://assets.cmsmasters.studio'

const ASSET_HOST_PATTERNS = [
  /^https:\/\/pub-[a-f0-9]+\.r2\.dev\//i,
  /^https:\/\/assets\.cmsmasters\.studio\//i,
]

const DEFAULT_WIDTHS = [400, 800, 1200, 1600]
const DEFAULT_SRC_WIDTH = 800
const DEFAULT_QUALITY = 85

type TransformOpts = {
  width?: number
  quality?: number
  format?: 'auto' | 'webp' | 'avif' | 'png' | 'jpeg'
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad'
}

export function buildImageUrl(pathOrUrl: string, opts: TransformOpts = {}): string {
  const path = toAssetPath(pathOrUrl)
  if (path === null) return pathOrUrl

  const params: string[] = [`format=${opts.format ?? 'auto'}`, `quality=${opts.quality ?? DEFAULT_QUALITY}`]
  if (opts.width) params.push(`width=${opts.width}`)
  if (opts.fit) params.push(`fit=${opts.fit}`)

  return `${CDN_HOST}/cdn-cgi/image/${params.join(',')}/${path}`
}

export function buildImageSrcSet(pathOrUrl: string, widths: number[] = DEFAULT_WIDTHS): string {
  const path = toAssetPath(pathOrUrl)
  if (path === null) return ''
  return widths.map((w) => `${buildImageUrl(path, { width: w })} ${w}w`).join(', ')
}

export function rewriteImages(html: string): string {
  return html.replace(/<img\b([^>]*)>/gi, (match, attrsRaw: string) => {
    const attrs = ` ${attrsRaw.trim()}`
    const srcMatch = attrs.match(/\ssrc\s*=\s*["']([^"']+)["']/i)
    if (!srcMatch) return match

    const src = srcMatch[1]
    const path = toAssetPath(src)
    if (path === null) return match

    // SVG: migrate to canonical CDN host (so legacy r2.dev URLs move to
    // assets.cmsmasters.studio for cache headers + uniformity), but do not
    // add /cdn-cgi/image/ — format=auto would rasterise vector.
    if (isSvg(path)) {
      const canonical = `${CDN_HOST}/${path}`
      if (src === canonical) return match
      return match.replace(src, canonical)
    }

    if (/\ssrcset\s*=/i.test(attrs)) return match

    const newSrc = buildImageUrl(path, { width: DEFAULT_SRC_WIDTH })
    const srcset = buildImageSrcSet(path)

    let newAttrs = attrs.replace(/\ssrc\s*=\s*["'][^"']+["']/i, ` src="${newSrc}"`)
    newAttrs = `${newAttrs} srcset="${srcset}"`
    if (!/\sloading\s*=/i.test(attrs)) newAttrs += ' loading="lazy"'
    if (!/\sdecoding\s*=/i.test(attrs)) newAttrs += ' decoding="async"'

    return `<img${newAttrs}>`
  })
}

function toAssetPath(url: string): string | null {
  if (!url.includes('://')) {
    return url.replace(/^\/+/, '')
  }
  for (const pattern of ASSET_HOST_PATTERNS) {
    const m = url.match(pattern)
    if (m) return url.slice(m[0].length)
  }
  return null
}

function isSvg(path: string): boolean {
  return /\.svg(\?|$)/i.test(path)
}
