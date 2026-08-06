import { Suspense } from "react"

import { HighlightViewer } from "./HighlightViewer"
import { getDailyHighlight, listHighlights } from "@/lib/data"
import type { HighlightWithResource } from "@/lib/types"

export const metadata = {
  title: "Highlights",
  description: "The internet's greatest founder insights, one at a time.",
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

// Fisher–Yates shuffle, then nudge any consecutive pairs that share a
// resource so back-to-back highlights come from different sources.
function shuffleAvoidingRepeats(
  items: HighlightWithResource[]
): HighlightWithResource[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  const key = (h: HighlightWithResource) => h.resource.id
  for (let i = 1; i < arr.length; i++) {
    if (key(arr[i]) !== key(arr[i - 1])) continue
    for (let j = i + 1; j < arr.length; j++) {
      const prev = key(arr[i - 1])
      const next = i + 1 < arr.length ? key(arr[i + 1]) : null
      if (key(arr[j]) !== prev && (next == null || key(arr[j]) !== next)) {
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
        break
      }
    }
  }
  return arr
}

export default async function HighlightsPage() {
  const [highlightsRaw, daily] = await Promise.all([
    listHighlights({ limit: 200 }),
    getDailyHighlight(todayIso()),
  ])
  const highlights = shuffleAvoidingRepeats(highlightsRaw)

  return (
    <div className="pt-10 pb-12 sm:pt-14">
      <header className="mx-auto mb-8 max-w-4xl px-5 text-center sm:mb-10 sm:px-8">
        <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
          Wisdom from the world&rsquo;s greatest founders
        </h1>
      </header>

      <Suspense
        fallback={
          <p className="text-center text-sm text-ink-muted">Loading…</p>
        }
      >
        <HighlightViewer
          highlights={highlights}
          initialId={daily?.highlight.id}
        />
      </Suspense>
    </div>
  )
}
