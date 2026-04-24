import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/sectors', label: 'Sectors' },
  { href: '/research', label: 'Research' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/contact', label: 'Contact' },
]

export default function SiteHeader() {
  return (
    <header>
      <div className="border-b border-divider">
        <div className="mx-auto max-w-5xl px-6 pt-12 pb-5 text-center">
          <Link href="/" className="inline-block group">
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight text-ink group-hover:text-accent transition-colors">
              Armstrong Equities
            </h1>
          </Link>
          <p className="mt-3 text-[11px] uppercase tracking-[0.35em] text-ink-mute">
            Sector Coverage · Est. 2026
          </p>
        </div>
      </div>
      <nav className="border-b border-divider bg-paper-dim">
        <div className="mx-auto max-w-5xl px-6">
          <ul className="flex flex-wrap justify-center gap-x-12 gap-y-2 py-4 text-[13px] uppercase tracking-[0.25em] text-ink-mute">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="hover:text-accent transition-colors"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  )
}
