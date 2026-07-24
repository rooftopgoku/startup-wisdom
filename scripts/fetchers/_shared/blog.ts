// Shared generic blog-post fetcher. Most of our text sources are
// "give me one HTML page, return the article body" — this handles the
// common shape. Per-source files just call this with the right slugs and
// optionally a custom container selector.

import { load, type CheerioAPI } from "cheerio"

import { fetchHtml } from "./http"
import { slugify } from "./slug"
import type { FetchedResource } from "./types"

interface ParsedHtml {
  title: string
  bodyText: string
  publishedAt?: string
  description?: string
  thumbnailUrl?: string
}

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9,
  oct: 10, nov: 11, dec: 12,
}

function extractDate(text: string): string | undefined {
  // Common formats: "January 2024", "March 14, 2023", "2023-04-12"
  const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) return isoMatch[0]

  const longMatch = text.match(
    /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/
  )
  if (longMatch) {
    const m = MONTHS[longMatch[1].toLowerCase()]
    if (m) {
      const day = parseInt(longMatch[2], 10)
      const year = parseInt(longMatch[3], 10)
      return `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    }
  }

  const monthYear = text.match(/([A-Za-z]+)\s+(\d{4})/)
  if (monthYear) {
    const m = MONTHS[monthYear[1].toLowerCase()]
    if (m) {
      return `${parseInt(monthYear[2], 10)}-${String(m).padStart(2, "0")}-01`
    }
  }
  return undefined
}

function readMetaProperty(
  $: CheerioAPI,
  property: string
): string | undefined {
  const value =
    $(`meta[property="${property}"]`).attr("content") ||
    $(`meta[name="${property}"]`).attr("content")
  return value?.trim() || undefined
}

interface ParseOptions {
  /** Selectors to try as the article body, in order. Falls back to <body>. */
  contentSelectors?: string[]
  /** Extra selectors to remove before extracting text. */
  stripSelectors?: string[]
}

export function parseBlogHtml(html: string, opts: ParseOptions = {}): ParsedHtml {
  const $ = load(html)

  // Always strip these — they pollute the article text.
  const baseStrip = [
    "script",
    "style",
    "noscript",
    "nav",
    "header",
    "footer",
    "aside",
    "form",
    "iframe",
    "svg",
    "[role=navigation]",
    "[aria-label*=navigation i]",
    ".sidebar",
    ".comments",
    ".comment-list",
    "#sidebar",
    "#comments",
    ".site-footer",
    ".site-header",
    ".entry-footer",
    ".post-navigation",
    ".sharedaddy",
    ".jp-relatedposts",
    ".wp-block-buttons",
  ]
  for (const sel of [...baseStrip, ...(opts.stripSelectors ?? [])]) {
    $(sel).remove()
  }

  // Title: prefer og:title, then <h1>, then <title>.
  const ogTitle = readMetaProperty($, "og:title")
  const title =
    ogTitle ||
    $("h1").first().text().trim() ||
    $("title").text().trim()

  // Description (for card preview)
  const description =
    readMetaProperty($, "og:description") ||
    readMetaProperty($, "description")

  // OG image — used as the card thumbnail when present.
  const thumbnailUrl =
    readMetaProperty($, "og:image") ||
    readMetaProperty($, "twitter:image")

  // Date: prefer article:published_time, fall back to scanning the page text.
  let publishedAt = readMetaProperty($, "article:published_time")?.slice(0, 10)
  if (publishedAt && !/^\d{4}-\d{2}-\d{2}$/.test(publishedAt)) {
    publishedAt = extractDate(publishedAt)
  }

  // Body: try selectors in order, fall back to whole body.
  const selectors = [
    ...(opts.contentSelectors ?? []),
    "article",
    "main",
    ".post-content",
    ".entry-content",
    ".article-content",
    "#content",
    "body",
  ]
  let bodyText = ""
  for (const sel of selectors) {
    const el = $(sel).first()
    if (el.length) {
      const text = el.text().replace(/[ \t]+/g, " ").replace(/\s+\n/g, "\n").trim()
      if (text.length > bodyText.length) bodyText = text
      if (text.length > 500) break // good enough; stop scanning
    }
  }

  if (!publishedAt) {
    publishedAt = extractDate(bodyText.slice(0, 800))
  }

  return { title, bodyText, publishedAt, description, thumbnailUrl }
}

interface BlogFetcherConfig {
  sourceSlug: string
  creatorSlug: string
  medium?: FetchedResource["medium"]
  contentSelectors?: string[]
  stripSelectors?: string[]
}

export async function fetchGenericBlog(
  url: string,
  config: BlogFetcherConfig,
  hintedTitle?: string
): Promise<FetchedResource> {
  const html = await fetchHtml(url)
  const parsed = parseBlogHtml(html, {
    contentSelectors: config.contentSelectors,
    stripSelectors: config.stripSelectors,
  })

 const title = hintedTitle || parsed.title
  const wordCount = parsed.bodyText.split(/\s+/).filter(Boolean).length

  // Quality gate: reject blocked / wrong / index-page scrapes before they get
  // saved as junk. Previously, bot-walled sources returned a 200 index or
  // landing page and it was stored as the article body.
  if (wordCount < 150) {
    throw new Error(
      `scrape too thin (${wordCount} words) for ${url} — likely blocked or a non-article page`
    )
  }
  if (hintedTitle) {
    const significantWords = (s: string) =>
      new Set(
        s
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length >= 4)
      )
    const wanted = significantWords(hintedTitle)
    const got = significantWords(parsed.title || "")
    if (wanted.size > 0 && ![...wanted].some((w) => got.has(w))) {
      throw new Error(
        `possible wrong page for "${hintedTitle}" — got page titled "${parsed.title}" at ${url}`
      )
    }
  }

  return {
    source_slug: config.sourceSlug,
    creator_slug: config.creatorSlug,
    external_url: url,
    slug: slugify(title),
    title,
    description: parsed.description,
    medium: config.medium ?? "essay",
    word_count: wordCount,
    published_at: parsed.publishedAt,
    thumbnail_url: parsed.thumbnailUrl,
    raw_text: parsed.bodyText,
  }
}
