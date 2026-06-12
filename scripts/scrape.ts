// Manifest-driven scraper. Reads data/manifest.ts, dispatches to per-source
// fetchers, upserts results into Supabase as draft/pending rows.
//
// Run with:  npx tsx scripts/scrape.ts [--source pmarchive] [--limit 5]

import { config as dotenv } from "dotenv"
dotenv({ path: ".env.local" })
dotenv()

import { manifest, type ManifestEntry, type ManifestSource } from "../data/manifest"
import { createSupabaseAdminClient } from "../src/lib/supabase/admin"
import { fetchAltman } from "./fetchers/altman"
import { fetchBezos } from "./fetchers/bezos"
import { fetchChesky } from "./fetchers/chesky"
import { fetchCollison } from "./fetchers/collison"
import { fetchHorowitz } from "./fetchers/bhorowitz"
import { fetchNaval } from "./fetchers/naval"
import { fetchPaulGraham } from "./fetchers/paulgraham"
import { fetchPmarchive } from "./fetchers/pmarchive"
import { fetchStartupArchive } from "./fetchers/startuparchive"
import type { FetchedResource } from "./fetchers/_shared/types"

type FetcherFn = (url: string, title?: string) => Promise<FetchedResource>

const fetchers: Partial<Record<ManifestSource, FetcherFn>> = {
  pmarchive: fetchPmarchive,
  paulgraham: fetchPaulGraham,
  altman: fetchAltman,
  naval: fetchNaval,
  collison: fetchCollison,
  chesky: fetchChesky,
  bezos: fetchBezos,
  bhorowitz: fetchHorowitz,
  // startup-archive-yt: text sourced from startupArchive.org blog posts
  // (curated writeups of the channel's clips). Each manifest entry's `url`
  // points at startupArchive.org/p/<slug>; the fetcher extracts the embedded
  // YouTube URL as the canonical external_url.
  "startup-archive-yt": fetchStartupArchive,
}

interface Args {
  source?: ManifestSource
  limit?: number
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const out: Args = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--source") out.source = argv[++i] as ManifestSource
    else if (a === "--limit") out.limit = parseInt(argv[++i], 10)
  }
  return out
}

async function main() {
  const args = parseArgs()
  const supabase = createSupabaseAdminClient()

  // Pre-load lookup maps so we don't roundtrip on every upsert.
  const [{ data: creators }, { data: sources }] = await Promise.all([
    supabase.from("creators").select("id, slug"),
    supabase.from("sources").select("id, slug"),
  ])
  const creatorBySlug = new Map(creators?.map((c) => [c.slug, c.id]) ?? [])
  const sourceBySlug = new Map(sources?.map((s) => [s.slug, s.id]) ?? [])

  let entries: ManifestEntry[] = manifest
  if (args.source) entries = entries.filter((e) => e.source === args.source)
  if (args.limit) entries = entries.slice(0, args.limit)

  console.log(`Scraping ${entries.length} entries…`)

  let ok = 0
  let skipped = 0
  let failed = 0

  for (const entry of entries) {
    const fetcher = fetchers[entry.source]
    if (!fetcher) {
      console.log(`  skip [${entry.source}] no fetcher implemented`)
      skipped++
      continue
    }
    if (!entry.url) {
      console.log(`  skip [${entry.source}] no url`)
      skipped++
      continue
    }

    const sourceId = sourceBySlug.get(entry.source)
    if (!sourceId) {
      console.log(`  skip [${entry.source}] source not in DB — seed creators+sources first`)
      skipped++
      continue
    }

    // Idempotency: skip if row exists with non-null raw_text.
    const { data: existing } = await supabase
      .from("resources")
      .select("id, raw_text")
      .eq("source_id", sourceId)
      .eq("external_url", entry.url)
      .maybeSingle()
    if (existing?.raw_text) {
      console.log(`  ✓ exists ${entry.url}`)
      skipped++
      continue
    }

    try {
      const fetched = await fetcher(entry.url, entry.title)
      const creatorId = creatorBySlug.get(fetched.creator_slug)
      if (!creatorId) {
        throw new Error(`creator not in DB: ${fetched.creator_slug}`)
      }
      // Some fetchers canonicalize external_url (e.g. startup-archive-yt
      // stores the embedded YouTube URL, not the manifest URL), so the
      // pre-fetch existence check above can miss. Re-check before upserting,
      // or every run would reset extracted rows back to draft/pending.
      if (fetched.external_url !== entry.url) {
        const { data: existingCanonical } = await supabase
          .from("resources")
          .select("id, raw_text")
          .eq("source_id", sourceId)
          .eq("external_url", fetched.external_url)
          .maybeSingle()
        if (existingCanonical?.raw_text) {
          console.log(`  ✓ exists ${fetched.external_url}`)
          skipped++
          continue
        }
      }
      const { error } = await supabase.from("resources").upsert(
        {
          source_id: sourceId,
          creator_id: creatorId,
          slug: fetched.slug,
          title: fetched.title,
          external_url: fetched.external_url,
          external_id: fetched.external_id ?? null,
          medium: fetched.medium,
          description: fetched.description ?? null,
          duration_seconds: fetched.duration_seconds ?? null,
          word_count: fetched.word_count ?? null,
          published_at: entry.published ?? fetched.published_at ?? null,
          thumbnail_url: fetched.thumbnail_url ?? null,
          raw_text: fetched.raw_text,
          status: "draft",
          extraction_status: "pending",
        },
        { onConflict: "source_id,external_url" }
      )
      if (error) throw error
      console.log(`  + ${fetched.title}`)
      ok++
    } catch (err) {
      console.error(`  ✗ ${entry.url}:`, err instanceof Error ? err.message : err)
      failed++
    }
  }

  console.log(`\nDone. ok=${ok} skipped=${skipped} failed=${failed}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
