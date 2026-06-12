// One-shot: manually-authored card descriptions for the 19 resources the
// describe step would have covered (API credit balance exhausted 2026-06-11).
// Follows generate-descriptions.ts rules: one sentence, <=140 chars, plain
// declarative voice, about the piece rather than a quote from it.
//
// Run with:  npx tsx --env-file=.env.local scripts/_apply-manual-descriptions.ts

import { createSupabaseAdminClient } from "../src/lib/supabase/admin"

const MAX = 140

const DESCRIPTIONS: Record<string, string> = {
  "2014-letter-to-shareholders":
    "The four traits of a dreamy business, and how Marketplace, Prime, and AWS each earned the label.",
  "2011-letter-to-shareholders":
    "Why self-service platforms beat gatekeepers: AWS, FBA, and KDP let improbable ideas get tried.",
  "2003-letter-to-shareholders":
    "Why long-term thinking is the mark of true ownership — owners are different from tenants.",
  "2002-letter-to-shareholders":
    "How Amazon turned customer experience into a fixed cost to deliver both great service and low prices.",
  "dont-fuck-up-the-culture":
    "Why culture matters more than anything else — the letter Chesky sent the entire Airbnb team in 2013.",
  "making-money-isnt-about-luck":
    "The four kinds of luck, and how to build a character that makes wealth find you.",
  "labor-and-capital-are-old-leverage":
    "Labor and capital are old leverage: both must be granted by others and are hard to scale.",
  "seek-wealth-not-money-or-status":
    "The difference between wealth, money, and status — and why only wealth buys freedom.",
  "guide-to-career-planning-part-2-skills-and-education":
    "Which skills actually compound in a career — and what formal education is and isn't good for.",
  "guide-to-career-planning-part-1-opportunity":
    "Why planning a career is pointless — and why seizing opportunities beats following a plan.",
  "guide-to-career-planning-part-3-where-to-go-and-why":
    "How to pick the industry, company, and role where your opportunities will compound.",
  "guide-to-big-companies-retaining-great-people":
    "How big companies lose their best people, and what it takes to keep them.",
  "eric-schmidt-on-why-most-companies-get-strategy-wrong":
    "Why strategy should start from what the world will look like in five years, not from your products.",
  "mark-zuckerberg-you-cant-8020-everything":
    "Why some problems demand 100% of the work — you can't 80/20 everything.",
  "keith-rabois-on-how-to-identify-great-talent":
    "How to spot great talent: expand each person's responsibilities until they break.",
  "sam-altman-explains-how-he-decides-to-invest-in-a-startup-after-10-minutes":
    "What a 10-minute YC interview reveals about a founder's potential.",
  "marc-andreessen-on-the-5-personality-traits-of-an-innovator":
    "The five personality traits that separate true innovators from everyone else.",
  "steve-jobs-explains-the-importance-of-both-thinking-and-doing":
    "Why the people who change industries are thinkers and doers in one person.",
  "jeff-bezoss-two-pieces-of-advice-for-aspiring-entrepreneurs":
    "Why entrepreneurs shouldn't chase the hot thing — position for the wave, then wait.",
}

async function main() {
  const sb = createSupabaseAdminClient()
  let ok = 0
  for (const [slug, description] of Object.entries(DESCRIPTIONS)) {
    if (description.length > MAX) throw new Error(`${slug}: ${description.length} chars > ${MAX}`)
    const { error, count } = await sb
      .from("resources")
      .update({ description }, { count: "exact" })
      .eq("slug", slug)
    if (error) throw error
    if (!count) {
      console.error(`  ✗ ${slug}: no row updated`)
      continue
    }
    console.log(`  ✓ ${slug} (${description.length})`)
    ok++
  }
  console.log(`\nDone. ok=${ok}/${Object.keys(DESCRIPTIONS).length}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
