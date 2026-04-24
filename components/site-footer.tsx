export default function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-divider bg-paper-dim">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-[12px] text-ink-mute">
          <p className="font-display italic">
            © {new Date().getFullYear()} Armstrong Equities
          </p>
          <p>
            Price data from Financial Modeling Prep, end-of-day only.
            <span className="mx-2">·</span>
            Not investment advice.
          </p>
        </div>
      </div>
    </footer>
  )
}
