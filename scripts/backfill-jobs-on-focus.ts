// One-shot: backfill raw_text (YouTube caption transcript, WWDC 1997 Q&A)
// and highlights for the manually-inserted "jobs-on-focus" clip, which
// shipped with extraction_status='done' but no transcript and no highlights.
//
// Run with:  npx tsx --env-file=.env.local scripts/_apply-jobs-on-focus.ts

import { ExtractionOutputSchema, type ExtractionOutput } from "../src/lib/extraction-schema"
import { createSupabaseAdminClient } from "../src/lib/supabase/admin"

const RAW_TEXT = `(Audience) What about OpenDoc? It's dead, right?

Well, let me say something, as this is sort of generic. I know some of you spent a lot of time working on stuff that we put a bullet in the head of. I apologize. I feel your pain. But Apple suffered for several years from lousy engineering management — I have to say it — and there were people that were going off in eighteen different directions doing arguably interesting things in each one of them. Good engineers. Lousy management. And what happened was, you look at the farm that's been created with all these different animals going in different directions, and it doesn't add up — the total is less than the sum of the parts.

And so we had to decide: what are the fundamental directions we're going in, and what makes sense and what doesn't. And there were a bunch of things that didn't. Microcosmically they might have made sense; macrocosmically they made no sense.

And you know, the hardest thing is — when you think about focusing, right? You think, well, focusing is saying yes. No. Focusing is about saying no. Focusing is about saying no. And you've got to say no, no, no, and when you say no, you piss off people, and they go talk to the San Jose Mercury and they write a shitty article about you. And it's really a pisser, because you want to be nice — you don't want to tell the San Jose Mercury that the person telling you this was just asked to leave, or this or that. So you take the lumps, and Apple has been taking their share of lumps for the last six months in a very unfair way, and it's been taking them like an adult, and I'm proud of that. And there's more to come, I'm sure.

I read these articles about some of these people that have left. I know some of these people — they haven't done it in seven years — and they leave, and it's like the company's going to fall apart the next day. I think there'll be stories like that; they come and go. But focus is about saying no, and the result of that focus is going to be some really great products where the total is much greater than the sum of the parts.

And OpenDoc — I mean, I was for putting a bullet in the head of OpenDoc. A: I didn't think it was great technology, but B: it didn't fit. The rest of the world isn't going to use OpenDoc, and I think as a container strategy there's some stuff in the Java space that's much better. And even the OpenDoc guys were basically trying to rewrite the whole thing in Java anyway, which was a restart. So it didn't make sense.`

const EXTRACTION: ExtractionOutput = {
  key_highlight: {
    body: "When you think about focusing, you think, well, focusing is saying yes. No. Focusing is about saying no.",
    context:
      "Jobs answering a hostile question about killing OpenDoc at WWDC 1997, weeks after returning to Apple.",
    timestamp_seconds: 87,
  },
  highlights: [
    {
      body: "Apple suffered for several years from lousy engineering management. There were people going off in eighteen different directions doing arguably interesting things in each one of them. Good engineers. Lousy management.",
      context: null,
      timestamp_seconds: 39,
    },
    {
      body: "You look at the farm that's been created with all these different animals going in different directions, and it doesn't add up — the total is less than the sum of the parts.",
      context: null,
      timestamp_seconds: 57,
    },
    {
      body: "There were a bunch of things that didn't make sense. Microcosmically they might have made sense; macrocosmically they made no sense.",
      context: "On deciding which projects survived Apple's 1997 product-line purge.",
      timestamp_seconds: 76,
    },
    {
      body: "You've got to say no, no, no — and when you say no, you piss off people, and they go talk to the San Jose Mercury and they write a shitty article about you. So you take the lumps.",
      context: null,
      timestamp_seconds: 101,
    },
    {
      body: "Focus is about saying no, and the result of that focus is going to be some really great products where the total is much greater than the sum of the parts.",
      context: null,
      timestamp_seconds: 151,
    },
    {
      body: "I know some of you spent a lot of time working on stuff that we put a bullet in the head of. I apologize. I feel your pain.",
      context: "How Jobs opened the answer — owning the cost of the cuts before defending them.",
      timestamp_seconds: 27,
    },
  ],
  topics: ["strategy", "decision-making", "leadership"],
}

async function main() {
  const supabase = createSupabaseAdminClient()
  const result = ExtractionOutputSchema.parse(EXTRACTION)

  const { data: resource, error: rErr } = await supabase
    .from("resources")
    .select("id, title")
    .eq("slug", "jobs-on-focus")
    .single()
  if (rErr || !resource) throw rErr ?? new Error("jobs-on-focus not found")

  const { data: topics } = await supabase.from("topics").select("id, slug")
  const topicBySlug = new Map(topics?.map((t) => [t.slug, t.id]) ?? [])

  const wordCount = RAW_TEXT.split(/\s+/).filter(Boolean).length
  const { error: txtErr } = await supabase
    .from("resources")
    .update({ raw_text: RAW_TEXT, word_count: wordCount })
    .eq("id", resource.id)
  if (txtErr) throw txtErr

  const { error: delErr } = await supabase
    .from("highlights")
    .delete()
    .eq("resource_id", resource.id)
  if (delErr) throw delErr

  const highlightRows = [
    {
      resource_id: resource.id,
      body: result.key_highlight.body,
      is_key: true,
      rank: 0,
      context: result.key_highlight.context ?? null,
      timestamp_seconds: result.key_highlight.timestamp_seconds ?? null,
    },
    ...result.highlights.map((h, i) => ({
      resource_id: resource.id,
      body: h.body,
      is_key: false,
      rank: i + 1,
      context: h.context ?? null,
      timestamp_seconds: h.timestamp_seconds ?? null,
    })),
  ]
  const { error: insErr } = await supabase.from("highlights").insert(highlightRows)
  if (insErr) throw insErr

  const topicRows = result.topics
    .map((s) => topicBySlug.get(s))
    .filter((id): id is string => Boolean(id))
    .map((topic_id) => ({ resource_id: resource.id, topic_id }))
  await supabase.from("resource_topics").delete().eq("resource_id", resource.id)
  if (topicRows.length) {
    const { error: tErr } = await supabase.from("resource_topics").insert(topicRows)
    if (tErr) throw tErr
  }

  const { error: updErr } = await supabase
    .from("resources")
    .update({ extraction_status: "done", extracted_at: new Date().toISOString(), extraction_error: null })
    .eq("id", resource.id)
  if (updErr) throw updErr

  console.log(`✓ ${resource.title}: transcript (${wordCount}w) + ${highlightRows.length} highlights + ${topicRows.length} topics`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
