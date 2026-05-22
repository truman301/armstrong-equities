// Comps widget for a company page, fed the latest comps_results row.
// Server component; renders static data.

interface Comps {
  ev_ebitda: number | null
  ev_sales: number | null
  peer_median_ev_ebitda: number | null
  peer_median_ev_sales: number | null
  implied_price: number | null
  implied_upside: number | null
}

function multiple(v: number | null): string {
  return v !== null && Number.isFinite(v) ? `${v.toFixed(1)}x` : '-'
}

function price(v: number | null, currency: string): string {
  if (v === null || !Number.isFinite(v)) return '-'
  return `${currency === 'GBP' ? '£' : '$'}${v.toFixed(2)}`
}

function percent(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return '-'
  const p = v * 100
  return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`
}

export default function CompsWidget({
  comps,
  currency,
}: {
  comps: Comps | null
  currency: string
}) {
  if (!comps) {
    return (
      <p className="mt-5 text-[15px] italic text-ink-mute">
        Comps recompute nightly from peer trading multiples. This populates
        after the first model run.
      </p>
    )
  }

  const rows = [
    {
      label: 'EV / EBITDA',
      own: multiple(comps.ev_ebitda),
      peer: multiple(comps.peer_median_ev_ebitda),
    },
    {
      label: 'EV / Sales',
      own: multiple(comps.ev_sales),
      peer: multiple(comps.peer_median_ev_sales),
    },
  ]

  const upsidePositive =
    comps.implied_upside !== null && comps.implied_upside >= 0

  return (
    <div className="mt-6">
      <div className="grid grid-cols-3 gap-4 border-b border-divider pb-2 text-[11px] uppercase tracking-[0.25em] text-ink-mute">
        <span>Multiple</span>
        <span className="text-right">This name</span>
        <span className="text-right">Peer median</span>
      </div>
      {rows.map((r) => (
        <div
          key={r.label}
          className="grid grid-cols-3 gap-4 border-b border-divider py-3 text-[15px]"
        >
          <span>{r.label}</span>
          <span className="text-right font-mono">{r.own}</span>
          <span className="text-right font-mono">{r.peer}</span>
        </div>
      ))}
      <div className="mt-6 flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-[0.3em] text-ink-mute">
          Comps-implied value
        </span>
        <span className="font-mono text-lg">
          {price(comps.implied_price, currency)}
          <span
            className={`ml-3 text-sm ${
              upsidePositive ? 'text-accent' : 'text-ink-mute'
            }`}
          >
            {percent(comps.implied_upside)}
          </span>
        </span>
      </div>
    </div>
  )
}
