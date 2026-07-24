// Queue-driven scraper. Reads pending rows from the `content_queue` table in
// Supabase, dispatches to per-source fetchers, upserts results into Supabase
// as draft/pending resources, then flips each queue row to done (or error).
//
// Add new content by inserting a row into content_queue (status defaults to
// 'queued') — no code edits needed. Run with:
//   npx tsx scripts/scrape.ts [--source pmarchive] [--limit 5]

import { config as dotenv } from "dotenv"
dotenv({ path: ".env.local" })
dotenv()

import { type ManifestSource } from "../data/manifest"
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
  // (curated writeups of the channel's clips). Each queue row's `url`
  // points at startupArchive.org/p/<slug>; the fetcher extracts the embedded
  // YouTube URL as the canonical external_url.
  "startup-archive-yt": fetchStartupArchive,
}

interface QueueEntry {
  id: string
  source: ManifestSource
  url?: string
  externalId?: string
  title?: string
  published?: string
  notes?: string
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

  // Flip a queue row to its terminal state so it isn't reprocessed next run.
  const mark = async (
    id: string,
    status: "done" | "error",
    error?: string
  ) => {
    await supabase
      .from("content_queue")
      .update({
        status,
        error: error ?? null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", id)
  }

  // Pre-load lookup maps so we don't roundtrip on every upsert.
  const [{ data: creators }, { data: sources }] = await Promise.all([
    supabase.from("creators").select("id, slug"),
    supabase.from("sources").select("id, slug"),
  ])
  const creatorBySlug = new Map(creators?.map((c) => [c.slug, c.id]) ?? [])
  const sourceBySlug = new Map(sources?.map((s) => [s.slug, s.id]) ?? [])

  // Load the work list from the queue table (status = 'queued').
  let queueQuery = supabase
    .from("content_queue")
    .select("id, source, url, external_id, title, published, notes")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
  if (args.source) queueQuery = queueQuery.eq("source", args.source)

  const { data: queueRows, error: queueErr } = await queueQuery
  if (queueErr) throw queueErr

  let entries: QueueEntry[] = (queueRows ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    source: r.source as ManifestSource,
    url: (r.url as string) ?? undefined,
    externalId: (r.external_id as string) ?? undefined,
    title: (r.title as string) ?? undefined,
    published: (r.published as string) ?? undefined,
    notes: (r.notes as string) ?? undefined,
  }))
  if (args.limit) entries = entries.slice(0, args.limit)

  console.log(`Scraping ${entries.length} queued entr${entries.length === 1 ? "y" : "ies"}…`)

  let ok = 0
  let skipped = 0
  let failed = 0

  for (const entry of entries) {
    const fetcher = fetchers[entry.source]
    if (!fetcher) {
      console.log(`  skip [${entry.source}] no fetcher implemented`)
      await mark(entry.id, "error", "no fetcher implemented for this source")
      failed++
      continue
    }
    if (!entry.url) {
      console.log(`  skip [${entry.source}] no url`)
      await mark(entry.id, "error", "no url provided")
      failed++
      continue
    }

    const sourceId = sourceBySlug.get(entry.source)
    if (!sourceId) {
      console.log(`  skip [${entry.source}] source not in DB — seed creators+sources first`)
      await mark(entry.id, "error", "source not seeded in DB (creators+sources)")
      failed++
      continue
    }

    // Idempotency: if a row already exists with non-null raw_text, treat the
    // queue row as done rather than re-fetching.
    const { data: existing } = await supabase
      .from("resources")
      .select("id, raw_text")
      .eq("source_id", sourceId)
      .eq("external_url", entry.url)
      .maybeSingle()
    if (existing?.raw_text) {
      console.log(`  ✓ exists ${entry.url}`)
      await mark(entry.id, "done")
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
      // stores the embedded YouTube URL, not the queue URL), so the
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
          await mark(entry.id, "done")
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
      await mark(entry.id, "done")
      ok++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  ✗ ${entry.url}:`, msg)
      await mark(entry.id, "error", msg)
      failed++
    }
  }

  console.log(`\nDone. ok=${ok} skipped=${skipped} failed=${failed}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
