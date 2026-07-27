// Generate one-sentence descriptions of resources for the card UI.
//
// These are descriptions *about* the piece (what the reader will learn),
// not verbatim quotes from it — distinct from the highlight extraction that
// scripts/extract.ts handles.
//
// By default, picks up rows where the description is null OR longer than the
// AI-target length (i.e. raw scraped paragraphs that need replacing). Pass
// --overwrite to regenerate everything.
//
// Pass --missing-context to target only resources whose key highlight has no
// usable context (paired with scripts/promote-highlight-contexts.ts).
//
// Run with:  npx tsx --env-file=.env.local scripts/generate-descriptions.ts [--limit 20] [--resource <slug>] [--overwrite] [--missing-context]

import { config as dotenv } from "dotenv"
dotenv({ path: ".env.local" })
dotenv()

import { getAnthropic } from "../src/lib/anthropic"
import { createSupabaseAdminClient } from "../src/lib/supabase/admin"

// Haiku 4.5 — very cheap, more than capable for a single-sentence summary.
const MODEL = "claude-haiku-4-5-20251001"

interface Args {
  limit?: number
  resourceSlug?: string
  overwrite?: boolean
  missingContext?: boolean
}

function parseArgs(): Args {
  const out: Args = {}
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--limit") out.limit = parseInt(argv[++i], 10)
    else if (a === "--resource") out.resourceSlug = argv[++i]
    else if (a === "--overwrite") out.overwrite = true
    else if (a === "--missing-context") out.missingContext = true
  }
  return out
}

const TOOL_NAME = "save_description"

const MAX_DESCRIPTION_CHARS = 140

const toolSchema = {
  name: TOOL_NAME,
  description:
    "Save a one-sentence description of what this resource is about.",
  input_schema: {
    type: "object",
    required: ["description"],
    properties: {
      description: {
        type: "string",
        description: `One complete sentence describing what the resource is about. Hard limit: ${MAX_DESCRIPTION_CHARS} characters. Must end with a period. Never use ellipsis ("...", "…") or trailing dashes. If you can't fit a complete thought, write a shorter one.`,
        maxLength: MAX_DESCRIPTION_CHARS,
      },
    },
  },
} as const

const TARGET_CHARS = 110

const SYSTEM_PROMPT = `You write one-sentence descriptions for cards on a founder-wisdom archive.

Each description sits below the title on a card. The reader is deciding in a glance whether to open the piece. Short and punchy beats thorough.

Rules:
- ONE complete sentence. AIM for under ${TARGET_CHARS} characters. HARD CEILING: ${MAX_DESCRIPTION_CHARS} characters total — if you exceed this, the description is thrown away.
- It must be a finished thought — never cut off, never end with "...", "…", an em-dash, or a trailing word fragment. If you can't finish the thought in ${MAX_DESCRIPTION_CHARS} characters, write something shorter and more compact. Cut adjectives, drop lists, find the single tightest framing.
- End with a single period.
- Describe the durable IDEA a reader takes away — lead with the claim itself, stated plainly.
- NEVER open with the author's name or a possessive framing ("Graham's argument…", "Altman's thesis…", "Bezos's message…"). State the idea, not who said it.
- NEVER describe the artifact instead of its content. Banned openings include: "reprinted from…", "the letter he sent…", "a collection of…", "his closing line…", "in the clip below…", "in this essay/talk…". The reader can already see it's an essay or talk — give them the insight.
- NEVER output a raw quote as the description, and never a teaser ("find out why…") or a recap of the first paragraph.
- Plain, declarative voice. No marketing fluff ("must-read", "essential").
- Start with a concrete noun phrase or a "How / Why / What" framing.
- Faithful to THIS specific piece — capture its central argument, not a generic theme that could describe ten other essays.

Rewrites — weak → strong (these are real failures to avoid):
- BAD: "Graham's argument for why where you live matters." → GOOD: "Where you live shapes your ambition more than you'd expect — each city broadcasts what to want."
- BAD: "Jeff Bezos' original letter, reprinted from Amazon's 1997 Annual Report." → GOOD: "It's always Day 1: long-term thinking and customer obsession over optimizing quarterly numbers."
- BAD: "A collection of open-ended questions about progress and institutions." → GOOD: "Hard questions about why scientific and economic progress slowed, and what would restart it."
- BAD: "You have to know who those first users are." (a raw quote) → GOOD: "Growth starts with a small, intense fire: a few users who want it badly, not many who mildly like it."

Good examples (each a complete sentence, well under ${MAX_DESCRIPTION_CHARS} characters):
- "Why the most successful early-stage startups do things that don't scale." (73)
- "The best startup ideas come from problems you have yourself." (60)
- "Two incompatible ways to use time: the maker's schedule and the manager's schedule." (84)
- "Meanness correlates with startup failure because it costs you talent." (69)

Call the ${TOOL_NAME} tool with your output. Do not respond in plain text.`

interface ResourceRow {
  id: string
  slug: string
  title: string
  medium: string
  description: string | null
  raw_text: string | null
  creator: { name: string } | null
}

function firstSentenceFits(text: string): boolean {
  const m = text.match(/^[\s\S]*?[.!?](?=\s|$)/)
  const sentence = (m?.[0] ?? text).trim()
  return sentence.length > 0 && sentence.length <= MAX_DESCRIPTION_CHARS
}

interface Message {
  role: "user" | "assistant"
  content: string
}

async function callModel(messages: Message[]): Promise<string> {
  const client = getAnthropic()
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [
      {
        ...toolSchema,
        cache_control: { type: "ephemeral" },
      } as never,
    ],
    tool_choice: { type: "tool", name: TOOL_NAME } as never,
    messages,
  })
  const toolUse = response.content.find(
    (c): c is Extract<typeof c, { type: "tool_use" }> => c.type === "tool_use"
  )
  if (!toolUse) throw new Error("Model did not call the tool")
  const input = toolUse.input as { description?: unknown }
  if (typeof input.description !== "string" || !input.description.trim()) {
    throw new Error("Tool returned no description")
  }
  return input.description.trim()
}

function sanitize(raw: string): string {
  // Strip trailing ellipsis / dashes the model emitted despite instruction.
  let out = raw.replace(/\s*(\.{3,}|…)\s*$/, "").replace(/[\s—-]+$/, "")
  if (!/[.!?]$/.test(out)) out += "."
  return out
}

async function generateOne(r: ResourceRow): Promise<string> {
  const creatorName = r.creator?.name ?? "Unknown"

  // Truncate raw_text to ~12k chars — the thesis is almost always in the
  // first few thousand words; Haiku is cheap but no reason to waste tokens.
  const source = r.raw_text ? r.raw_text.slice(0, 12_000) : ""
  const userContent = source
    ? `Resource: "${r.title}" by ${creatorName} (${r.medium}).\n\nContent (may be truncated):\n\n${source}`
    : `Resource: "${r.title}" by ${creatorName} (${r.medium}).\n\nNo full text available — write a description based on the title and what you can infer about a piece with this title by this author.`

  const messages: Message[] = [{ role: "user", content: userContent }]

  for (let attempt = 0; attempt < 3; attempt++) {
    const raw = await callModel(messages)
    const description = sanitize(raw)
    if (
      description.length <= MAX_DESCRIPTION_CHARS &&
      !/(\.{3,}|…)/.test(description)
    ) {
      return description
    }
    // Feed the failed attempt back and ask for a shorter one.
    messages.push({ role: "assistant", content: raw })
    messages.push({
      role: "user",
      content: `That was ${description.length} characters. The hard ceiling is ${MAX_DESCRIPTION_CHARS}. Try again — cut adjectives, drop secondary clauses, find a tighter framing. Must be a complete sentence ending in a period, no ellipsis.`,
    })
  }

  // Final attempt failed — throw so the row stays untouched.
  throw new Error(
    `Could not produce description under ${MAX_DESCRIPTION_CHARS} chars after 3 attempts`
  )
}

async function main() {
  const args = parseArgs()
  const supabase = createSupabaseAdminClient()

  let query = supabase
    .from("resources")
    .select("id, slug, title, medium, description, raw_text, creator:creators(name)")
    .eq("status", "published")
    .order("added_at", { ascending: false })

  if (args.resourceSlug) query = query.eq("slug", args.resourceSlug)

  const { data: allRows, error } = await query
  if (error) throw error

  // Optionally restrict to resources whose key highlight has no usable context.
  let usableContextIds: Set<string> | null = null
  if (args.missingContext) {
    const { data: keys, error: hErr } = await supabase
      .from("highlights")
      .select("resource_id, context")
      .eq("is_key", true)
    if (hErr) throw hErr
    usableContextIds = new Set(
      (keys ?? [])
        .filter((k) => k.context && firstSentenceFits(k.context))
        .map((k) => k.resource_id)
    )
  }

  const filtered = (allRows ?? []).filter((r) => {
    if (args.resourceSlug) return true
    if (args.missingContext) {
      // Only resources whose key highlight context can't be used as-is.
      return !usableContextIds!.has(r.id)
    }
    if (args.overwrite) return true
    if (!r.description) return true
    return r.description.length > MAX_DESCRIPTION_CHARS
  })

  const resources = args.limit ? filtered.slice(0, args.limit) : filtered

  if (resources.length === 0) {
    console.log("Nothing to do.")
    return
  }

  console.log(`Generating descriptions for ${resources.length} resources with ${MODEL}…`)
  let ok = 0
  let failed = 0

  for (const row of resources) {
    const creator = Array.isArray(row.creator) ? row.creator[0] : row.creator
    const r: ResourceRow = {
      id: row.id,
      slug: row.slug,
      title: row.title,
      medium: row.medium,
      description: row.description,
      raw_text: row.raw_text,
      creator: creator ? { name: creator.name } : null,
    }
    try {
      const description = await generateOne(r)
      const { error: updErr } = await supabase
        .from("resources")
        .update({ description })
        .eq("id", r.id)
      if (updErr) throw updErr
      console.log(`  ✓ ${r.title}\n    ${description}`)
      ok++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`  ✗ ${r.title}: ${message}`)
      failed++
    }
  }

  console.log(`\nDone. ok=${ok} failed=${failed}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
