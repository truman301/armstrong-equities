/**
 * One-off test: render a structured PM letter through the new email template
 * and send it. Used to verify the design before the firm starts producing
 * structured letters on its own.
 *
 *   npx tsx scripts/test-digest-design.ts
 */
import { config as loadDotenv } from 'dotenv'
loadDotenv({ path: '.env.local' })

import { sendEmail, renderDigestHtml } from '../lib/email'

const fakeLetter = `Truman,

## Top line
Tick 2 closed without a publish. Both names in front of me went back to the analysts. KAMBI's setup unraveled when I rebuilt the EBITDA base on the new definition, and the asymmetry collapsed from 4.7x to 1.2x.

## Pipeline
**Gaming.** KAMBI returned REWORK (19/30). The Associate caught five load-bearing errors that I confirmed: BC and Atlantic Lottery go-lives are not on Kambi rails, PMU is horse-racing not lottery, the FY25 EBITA base ties off-by-one, and the 1.0x revenue take-out floor is unsourced. Ten specific fixes back to the Analyst. New sourcing: ACEL (Accel Entertainment, $948M cap, six covering analysts). Illinois SB2671 priced as near-certain despite single-sponsor / dead-in-committee status; the Chicago VGT legalization from December gets roughly zero in the implied price. 4.1x bull/bear payoff.

**Software.** CXM returned REWORK (22/30). Thesis not broken; seven fixes back to the Analyst. Buyback magnitude was wrong ($200M total, not $325M aggregate). FY27 ~$150M flat FCF guide is missing from the model. Founder governance framing was too soft (Thomas is still Chairman with Class B 10:1). Bear PT $8.88 reverse-fits at +68% above spot. New sourcing: APPN (Appian, $1.4B cap). The market has mis-bucketed it as AI roadkill, but deterministic process-orchestration is the substrate agentic AI needs in regulated workflows. SBC at 5.9% of revenue versus the 15-25% peer median is the under-priced moat. Pega retrial is a free option. 3:1 skew.

## Read
The Associates are doing real work. Both teardowns this tick found load-bearing errors, not stylistic objections. That is what they are for and the bar is holding. The Analysts get one rework cycle each on KAMBI and CXM; if the second pass still misses the structural issues, those are kills. I will not let a fixed model dress up a broken setup.

## Watching
- ACEL: Illinois SB2671 docket activity. If it moves, the central asymmetry tightens fast.
- APPN: any read on the Pega retrial timing. The free option needs a clock on it.
- KAMBI: the Analyst owes a clean FY25 EBITA base before anything else.

**The desk**`

async function main() {
  const html = renderDigestHtml({
    tickNumber: 2,
    tickDate: '2026-05-23',
    deskNote: fakeLetter,
    drafts: [
      { id: 'demo-kambi', ticker: 'KAMBI', title: 'Kambi Group: B2B sports betting and the AWS supplier read' },
      { id: 'demo-cxm', ticker: 'CXM', title: 'Sprinklr: founder governance, buyback magnitude, and the bear PT recalibration' },
      { id: 'demo-acel', ticker: 'ACEL', title: 'Accel Entertainment: Illinois SB2671 priced as near-certain' },
    ],
  })
  const res = await sendEmail(
    'Armstrong Equities · Tick 2 · Design preview (test)',
    html,
  )
  console.log(res)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
