// One-shot: manually-curated painting assignments for the 24 resources that
// match-paintings.ts would have covered (API credit balance exhausted
// 2026-06-11; the library was also exhausted — see the 2026-06 expansion in
// data/paintings.ts). Follows the matcher's rules: thematic/symbolic fit,
// one painting per resource, uniqueness across the dataset.
//
// Run with:  npx tsx --env-file=.env.local scripts/_apply-painting-matches.ts

import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { createSupabaseAdminClient } from "../src/lib/supabase/admin"
import type { PaintingEntry } from "../data/paintings"

const MATCHES: Record<string, string> = {
  // resource slug → painting id
  "1997-letter-to-shareholders": "washington-crossing-the-delaware", // Day 1, the bold all-in move
  "2002-letter-to-shareholders": "the-floor-scrapers", // relentless efficiency passed to customers
  "2003-letter-to-shareholders": "ploughing-in-the-nivernais", // owners vs tenants, the long furrow
  "2011-letter-to-shareholders": "the-orrery", // self-service knowledge, no gatekeepers
  "2014-letter-to-shareholders": "wedding-feast-at-cana", // "don't just swipe right, get married"
  "dont-fuck-up-the-culture": "peasant-wedding", // culture as the shared table
  "7-rejections": "hope-watts", // one string left, keep playing
  "jony-ive-recounts-the-time-steve-jobs-called-him-vain": "self-portrait-two-circles", // holding the work to the standard
  "labor-and-capital-are-old-leverage": "work-brown", // labor in all its forms
  "seek-wealth-not-money-or-status": "moneylender-and-wife", // gold weighed against what counts
  "making-money-isnt-about-luck": "fortune-teller-caravaggio", // luck is not the mechanism
  "guide-to-career-planning-part-1-opportunity": "breezing-up", // seize the fair wind
  "guide-to-career-planning-part-2-skills-and-education": "experiment-on-a-bird", // education that transfers
  "guide-to-career-planning-part-3-where-to-go-and-why": "fur-traders-missouri", // go where the frontier is
  "guide-to-big-companies-retaining-great-people": "syndics-of-drapers-guild", // the institution and its people
  "tobi-lutke-explains-what-the-vcs-who-passed-on-shopify-got-wrong": "the-ninth-wave", // vindication after the wreck
  "marc-andreessen-on-the-5-personality-traits-of-an-innovator": "alchymist-phosphorus", // the discoverer's temperament
  "jeff-bezoss-two-pieces-of-advice-for-aspiring-entrepreneurs": "fishermen-at-sea", // positioned in the swell, waiting
  "paul-graham-on-why-starting-with-a-small-intense-fire-is-the-key-to-startup-grow": "the-lacemaker", // one small thing made perfectly
  "keith-rabois-on-how-to-identify-great-talent": "the-gross-clinic", // talent developed under pressure
  "sam-altman-explains-how-he-decides-to-invest-in-a-startup-after-10-minutes": "girl-with-pearl-earring", // the look of someone really listening
  "eric-schmidt-on-why-most-companies-get-strategy-wrong": "the-oxbow", // the landscape read from above
  "mark-zuckerberg-you-cant-8020-everything": "the-doctor-fildes", // all night at one bedside
  "steve-jobs-explains-the-importance-of-both-thinking-and-doing": "art-of-painting", // thinking and making as one act
}

async function main() {
  const raw = await readFile(join(process.cwd(), "data/paintings.enriched.json"), "utf8")
  const library = JSON.parse(raw) as PaintingEntry[]
  const byId = new Map(library.map((p) => [p.id, p]))

  const sb = createSupabaseAdminClient()

  // Enforce uniqueness against paintings already assigned to other resources.
  const { data: all, error: aErr } = await sb
    .from("resources")
    .select("slug, thumbnail_url")
    .eq("status", "published")
  if (aErr) throw aErr
  const targetSlugs = new Set(Object.keys(MATCHES))
  const usedUrls = new Set(
    all!
      .filter((r) => !targetSlugs.has(r.slug) && r.thumbnail_url?.startsWith("/paintings/"))
      .map((r) => r.thumbnail_url as string)
  )

  let ok = 0
  for (const [slug, paintingId] of Object.entries(MATCHES)) {
    const painting = byId.get(paintingId)
    if (!painting?.imageUrl) throw new Error(`painting missing image: ${paintingId}`)
    if (usedUrls.has(painting.imageUrl)) throw new Error(`painting already in use: ${paintingId}`)
    usedUrls.add(painting.imageUrl)

    const { error, count } = await sb
      .from("resources")
      .update({ thumbnail_url: painting.imageUrl }, { count: "exact" })
      .eq("slug", slug)
    if (error) throw error
    if (!count) {
      console.error(`  ✗ ${slug}: no row updated`)
      continue
    }
    console.log(`  ✓ ${slug} → ${painting.title} (${painting.artist})`)
    ok++
  }
  console.log(`\nDone. ok=${ok}/${Object.keys(MATCHES).length}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
