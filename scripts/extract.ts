// Reads `extraction_status='pending'` resources, calls Claude with the
// extraction tool schema, writes highlights + topics + flips status.
//
// Run with:  npx tsx scripts/extract.ts [--limit 5] [--resource <slug>]

import { config as dotenv } from "dotenv"
dotenv({ path: ".env.local" })
dotenv()

import { EXTRACTION_MODEL, getAnthropic } from "../src/lib/anthropic"
import {
  EXTRACTION_SYSTEM_PROMPT,
  EXTRACTION_TOOL_NAME,
  ExtractionOutputSchema,
  extractionToolSchema,
} from "../src/lib/extraction-schema"
import { createSupabaseAdminClient } from "../src/lib/supabase/admin"

interface Args {
  limit?: number
  resourceSlug?: string
}

function parseArgs(): Args {
  const out: Args = {}
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--limit") out.limit = parseInt(argv[++i], 10)
    else if (a === "--resource") out.resourceSlug = argv[++i]
  }
  return out
}

async function extractOne(
  resource: {
    id: string
    slug: string
    title: string
    medium: string
    raw_text: string | null
    creator: { name: string } | null
  }
) {
  if (!resource.raw_text) {
    throw new Error("raw_text is null — cannot extract")
  }
  const client = getAnthropic()
  const creatorName = resource.creator?.name ?? "Unknown"
  const userContent = `Resource: "${resource.title}" by ${creatorName} (${resource.medium}).\n\nContent:\n\n${resource.raw_text}`

  const response = await client.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: EXTRACTION_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [
      {
        ...extractionToolSchema,
        cache_control: { type: "ephemeral" },
      } as never,
    ],
    tool_choice: { type: "tool", name: EXTRACTION_TOOL_NAME } as never,
    messages: [{ role: "user", content: userContent }],
  })

  const toolUse = response.content.find(
    (c): c is Extract<typeof c, { type: "tool_use" }> => c.type === "tool_use"
  )
  if (!toolUse) {
    throw new Error("Model did not call the tool")
  }
  return ExtractionOutputSchema.parse(toolUse.input)
}

async function main() {
  const args = parseArgs()
  const supabase = createSupabaseAdminClient()

  let query = supabase
    .from("resources")
    .select(
      "id, slug, title, medium, raw_text, creator:creators(name)"
    )
    .eq("extraction_status", "pending")
    .order("added_at", { ascending: true })

  if (args.resourceSlug) query = query.eq("slug", args.resourceSlug)
  if (args.limit) query = query.limit(args.limit)

  const { data: resources, error } = await query
  if (error) throw error
  if (!resources || resources.length === 0) {
    console.log("Nothing pending.")
    return
  }

  console.log(`Extracting ${resources.length} resources…`)

  // Look up topic ids once.
  const { data: topics } = await supabase.from("topics").select("id, slug")
  const topicBySlug = new Map(topics?.map((t) => [t.slug, t.id]) ?? [])

  let ok = 0
  let failed = 0

  for (const r of resources) {
    // creator from .select() comes back as array when nested — normalize.
    const creator = Array.isArray(r.creator) ? r.creator[0] : r.creator
    try {
      await supabase
        .from("resources")
        .update({ extraction_status: "running" })
        .eq("id", r.id)

      const result = await extractOne({
        id: r.id,
        slug: r.slug,
        title: r.title,
        medium: r.medium,
        raw_text: r.raw_text,
        creator: creator ? { name: creator.name } : null,
      })

      // Transactional-ish: delete existing highlights, insert new, write topics, flip status.
      const { error: delErr } = await supabase
        .from("highlights")
        .delete()
        .eq("resource_id", r.id)
      if (delErr) throw delErr

     // Drop any supporting highlight that just repeats the key highlight —
      // the model often echoes it as the first bullet, which reads as padding.
      const norm = (s: string) =>
        s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim()
      const keyPrefix = norm(result.key_highlight.body).slice(0, 60)
      const dedupedSupporting = result.highlights.filter(
        (h) => norm(h.body).slice(0, 60) !== keyPrefix
      )

      const highlightRows = [
        {
          resource_id: r.id,
          body: result.key_highlight.body,
          is_key: true,
          rank: 0,
          context: result.key_highlight.context ?? null,
          timestamp_seconds: result.key_highlight.timestamp_seconds ?? null,
        },
        ...dedupedSupporting.map((h, i) => ({
          resource_id: r.id,
          body: h.body,
          is_key: false,
          rank: i + 1,
          context: h.context ?? null,
          timestamp_seconds: h.timestamp_seconds ?? null,
        })),
      ]
      const { error: insErr } = await supabase
        .from("highlights")
        .insert(highlightRows)
      if (insErr) throw insErr

      // Topics
      const topicRows = result.topics
        .map((slug) => topicBySlug.get(slug))
        .filter((id): id is string => Boolean(id))
        .map((topic_id) => ({ resource_id: r.id, topic_id }))

      await supabase
        .from("resource_topics")
        .delete()
        .eq("resource_id", r.id)
      if (topicRows.length) {
        const { error: tErr } = await supabase
          .from("resource_topics")
          .insert(topicRows)
        if (tErr) throw tErr
      }

      const { error: updErr } = await supabase
        .from("resources")
        .update({
          extraction_status: "done",
          extracted_at: new Date().toISOString(),
          status: "published",
          extraction_error: null,
        })
        .eq("id", r.id)
      if (updErr) throw updErr

      console.log(`  ✓ ${r.title}`)
      ok++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`  ✗ ${r.title}:`, message)
      await supabase
        .from("resources")
        .update({
          extraction_status: "failed",
          extraction_error: message.slice(0, 1000),
        })
        .eq("id", r.id)
      failed++
    }
  }

  console.log(`\nDone. ok=${ok} failed=${failed}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
