export const metadata = {
  title: 'Research',
}

export default function ResearchPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-[11px] uppercase tracking-[0.35em] text-ink-mute">
        Archive
      </p>
      <h2 className="mt-3 font-display text-5xl font-semibold tracking-tight">
        Research
      </h2>
      <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-mute">
        Written initiations, coverage updates, and sector notes.
      </p>

      <div className="mt-16 border border-divider bg-paper-dim/70 px-8 py-14 text-center">
        <p className="font-display text-2xl italic text-ink">
          The archive is empty for now.
        </p>
        <p className="mt-5 mx-auto max-w-md text-[15px] leading-relaxed text-ink-mute">
          First initiations publish mid-May 2026. Each name receives a full framework
          treatment: variant perception, valuation football field, dated catalysts,
          invalidation criteria, and a paired hedge where the book calls for one.
        </p>
      </div>
    </div>
  )
}
