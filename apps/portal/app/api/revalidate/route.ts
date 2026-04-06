import { revalidatePath, revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-revalidate-token')

  if (token !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const body = await request.json()
  const path = body.path as string | undefined
  const tags = body.tags as string[] | undefined

  const revalidated: { paths: string[]; tags: string[] } = { paths: [], tags: [] }

  if (tags && tags.length > 0) {
    for (const tag of tags) {
      revalidateTag(tag)
      revalidated.tags.push(tag)
    }
  }

  if (path) {
    revalidatePath(path, 'page')
    revalidated.paths.push(path)
  }

  // If neither path nor tags provided, revalidate everything
  if (!path && (!tags || tags.length === 0)) {
    for (const tag of ['themes', 'blocks', 'layouts', 'pages', 'templates', 'global-elements']) {
      revalidateTag(tag)
      revalidated.tags.push(tag)
    }
  }

  return NextResponse.json({
    revalidated: true,
    ...revalidated,
    timestamp: new Date().toISOString(),
  })
}
