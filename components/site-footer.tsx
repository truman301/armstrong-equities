import { now, prettyMarketState } from '@/lib/clock'

export default function SiteFooter() {
  const clock = now()
  const longDate = new Date(clock.iso_utc).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York',
  })

  return (
    <footer className="mt-24 border-t border-divider bg-paper-dim">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col gap-3 text-[12px] text-ink-mute sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display italic">
            © {new Date().getFullYear()} Armstrong Equities
          </p>
          <p>
            Price data from Financial Modeling Prep, end-of-day only.
            <span className="mx-2">·</span>
            Not investment advice.
          </p>
        </div>
        <div className="mt-4 flex flex-col gap-1 border-t border-divider pt-4 text-[11px] uppercase tracking-[0.25em] text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="text-ink-mute">As of</span> {longDate}
            <span className="mx-2">·</span>
            {clock.eastern.time_hhmm} ET
            <span className="mx-2">·</span>
            {clock.utc.time_hhmm} UTC
          </p>
          <p>
            <span
              className={`mr-2 inline-block h-2 w-2 rounded-full align-middle ${
                clock.eastern.market_state === 'open'
                  ? 'bg-emerald-600'
                  : clock.eastern.market_state === 'closed'
                    ? 'bg-ink-soft'
                    : 'bg-accent'
              }`}
            />
            {prettyMarketState(clock.eastern.market_state)}
          </p>
        </div>
      </div>
    </footer>
  )
}
