// Canonical clock for the site and any tooling that wants to ground itself
// before acting. Returns dates in both UTC (what cron schedules run on) and
// Eastern (what Truman lives in and what the US market trades on), plus the
// current US market state.
//
// Surfaced at /api/now as JSON, and rendered inline in the site footer so
// every page always shows what the server thinks the date is.

export type MarketState = 'open' | 'pre-market' | 'after-hours' | 'closed'

export interface ClockState {
  iso_utc: string
  epoch_seconds: number
  utc: {
    date: string // YYYY-MM-DD
    weekday: string
    time_hhmm: string // HH:MM 24-hour
  }
  eastern: {
    date: string
    weekday: string
    time_hhmm: string
    market_state: MarketState
  }
}

function isoDateInZone(d: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value
  return `${y}-${m}-${day}`
}

function weekdayInZone(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
  }).format(d)
}

function timeInZone(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

// US equity market full-day holidays. Half-day early closes (e.g., the day
// after Thanksgiving, Christmas Eve) are not modeled here; they read as
// 'open' until 1pm ET and we accept that small misclassification.
// Update annually around year-end.
const US_MARKET_HOLIDAYS: Set<string> = new Set([
  // 2026
  '2026-01-01', // New Year's Day
  '2026-01-19', // MLK Day
  '2026-02-16', // Presidents' Day
  '2026-04-03', // Good Friday
  '2026-05-25', // Memorial Day
  '2026-06-19', // Juneteenth
  '2026-07-03', // Independence Day observed (Jul 4 is Saturday)
  '2026-09-07', // Labor Day
  '2026-11-26', // Thanksgiving
  '2026-12-25', // Christmas
  // 2027 (so we don't go stale right at year end)
  '2027-01-01',
  '2027-01-18',
  '2027-02-15',
  '2027-03-26', // Good Friday 2027
  '2027-05-31',
  '2027-06-18', // Juneteenth observed (Jun 19 is Saturday)
  '2027-07-05', // Independence Day observed (Jul 4 is Sunday)
  '2027-09-06',
  '2027-11-25',
  '2027-12-24', // Christmas observed (Dec 25 is Saturday)
])

export function marketStateAt(d: Date): MarketState {
  const weekday = weekdayInZone(d, 'America/New_York')
  if (weekday === 'Saturday' || weekday === 'Sunday') return 'closed'
  const easternDate = isoDateInZone(d, 'America/New_York')
  if (US_MARKET_HOLIDAYS.has(easternDate)) return 'closed'
  const [hh, mm] = timeInZone(d, 'America/New_York').split(':').map(Number)
  const minutes = hh * 60 + mm
  if (minutes >= 9 * 60 + 30 && minutes < 16 * 60) return 'open'
  if (minutes >= 4 * 60 && minutes < 9 * 60 + 30) return 'pre-market'
  if (minutes >= 16 * 60 && minutes < 20 * 60) return 'after-hours'
  return 'closed'
}

export function now(): ClockState {
  const d = new Date()
  return {
    iso_utc: d.toISOString(),
    epoch_seconds: Math.floor(d.getTime() / 1000),
    utc: {
      date: isoDateInZone(d, 'UTC'),
      weekday: weekdayInZone(d, 'UTC'),
      time_hhmm: timeInZone(d, 'UTC'),
    },
    eastern: {
      date: isoDateInZone(d, 'America/New_York'),
      weekday: weekdayInZone(d, 'America/New_York'),
      time_hhmm: timeInZone(d, 'America/New_York'),
      market_state: marketStateAt(d),
    },
  }
}

export function prettyMarketState(s: MarketState): string {
  switch (s) {
    case 'open':
      return 'Market open'
    case 'pre-market':
      return 'Pre-market'
    case 'after-hours':
      return 'After hours'
    case 'closed':
      return 'Closed'
  }
}
