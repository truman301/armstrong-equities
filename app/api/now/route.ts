// GET /api/now -- canonical clock for the firm.
//
// Returns the current time in both UTC and Eastern, the weekday, the ISO
// date in each zone, and the current US market state. Public; no auth.
//
// Anyone (Claude in a session, an agent in CI, a script, a human reading the
// site) can curl this to ground their assumptions about "what day is it"
// before acting. Cron schedules drift between local sessions and the real
// server clock; this is the source of truth.

import { now } from '@/lib/clock'

export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json(now())
}
