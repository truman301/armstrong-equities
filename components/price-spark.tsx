// Inline SVG price sparkline. Server component; no interactivity, no deps.

export default function PriceSpark({
  closes,
  width = 640,
  height = 120,
}: {
  closes: number[]
  width?: number
  height?: number
}) {
  if (closes.length < 2) return null

  const min = Math.min(...closes)
  const max = Math.max(...closes)
  const span = max - min || 1
  const pad = 4

  const points = closes.map((c, i) => {
    const x = (i / (closes.length - 1)) * (width - pad * 2) + pad
    const y = height - pad - ((c - min) / span) * (height - pad * 2)
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })

  const rising = closes[closes.length - 1] >= closes[0]

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label="Price history"
    >
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={rising ? 'var(--color-ink)' : 'var(--color-accent)'}
        strokeWidth={1.5}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
