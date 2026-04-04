import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-revalidate-token')

  if (token !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const body = await request.json()
  const path = body.path || '/'

  revalidatePath(path, 'page')

  return NextResponse.json({ revalidated: true, path, timestamp: new Date().toISOString() })
}
