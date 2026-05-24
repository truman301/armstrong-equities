import type { NextRequest } from 'next/server'
import { getScoreboard } from '@/lib/scoreboard'

// GET /api/firm/scoreboard -- returns the firm's live track record as JSON.
// Bearer-authed against INGEST_TOKEN.
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<Response> {
  if (
    request.headers.get('authorization') !==
    `Bearer ${process.env.INGEST_TOKEN}`
  ) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await getScoreboard()
  return Response.json(data)
}
