export const metadata = {
  title: 'Methodology',
}

export default function MethodologyPage() {
  return (
    <article className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-[11px] uppercase tracking-[0.35em] text-ink-mute">
        How the work gets done
      </p>
      <h2 className="mt-3 font-display text-5xl font-semibold tracking-tight">
        Methodology
      </h2>

      <div className="mt-12 space-y-7 text-[18px] leading-[1.7]">
        <p>
          Armstrong Equities treats sector coverage as a continuously-updated book of
          positions, not a library of published reports. Every active name carries a
          rating, a price target, a variant view against consensus, a primary catalyst
          with a specific date, and an invalidation criterion written down before the
          trade goes on.
        </p>

        <h3 className="font-display text-[26px] font-semibold tracking-tight pt-6">
          Framework
        </h3>
        <p>
          Each initiation follows a ten-phase buy-side process. Business mapping at the
          unit-economic level. Industry and sub-sector context. A KPI stack with a
          specific variant view on the one or two metrics that actually drive the
          stock. Alt-data and channel verification. A bottoms-up three-statement model
          with explicit KPI drivers. Multi-methodology valuation &mdash; multiples, DCF,
          and sum-of-the-parts where applicable &mdash; cross-checked on a football
          field. Dated catalysts. A written risk taxonomy with explicit invalidation
          criteria. A paired hedge when one isolates the variant view. And a written
          initiation structured to the institutional fourteen-page standard.
        </p>

        <h3 className="font-display text-[26px] font-semibold tracking-tight pt-6">
          Cadence
        </h3>
        <p>
          Coverage breathes on a weekly cycle. Monday through Friday, one name in
          active coverage is refreshed. Saturday is a health-check over every live
          thesis: has any invalidation criterion triggered, have consensus revisions
          eroded the variant view, has the catalyst schedule shifted. Sunday is the
          idea pipeline &mdash; new candidates for the watch list, new promotions to
          active coverage, and a published schedule of the five names due up the
          following week.
        </p>

        <h3 className="font-display text-[26px] font-semibold tracking-tight pt-6">
          The role of AI
        </h3>
        <p>
          Large language models are used as a research assistant, not as an oracle.
          The model drafts, summarizes filings, pulls consensus estimates, structures
          the framework, and flags contradictions. A human analyst reads every draft,
          edits for voice and judgment, and is the one accountable for every rating
          and price target on this site. Nothing publishes without sign-off.
        </p>

        <h3 className="font-display text-[26px] font-semibold tracking-tight pt-6">
          Disclosure
        </h3>
        <p>
          Armstrong Equities does not manage outside capital. Ratings reflect the
          analyst&apos;s best-effort variant view and are not investment advice. Price
          data is end-of-day from third-party providers. When the analyst holds a
          position in a name under coverage, the position is disclosed at the top of
          the initiation.
        </p>
      </div>
    </article>
  )
}
