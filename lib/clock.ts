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

export function marketStateAt(d: Date): MarketState {
  const weekday = weekdayInZone(d, 'America/New_York')
  if (weekday === 'Saturday' || weekday === 'Sunday') return 'closed'
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
