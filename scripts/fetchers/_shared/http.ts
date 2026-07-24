import PQueue from "p-queue"

const queue = new PQueue({ concurrency: 2, interval: 1000, intervalCap: 4 })

interface FetchOpts {
  retries?: number
  backoffMs?: number
  headers?: Record<string, string>
}

// Pages that rot (moved URLs) or sit behind a bot wall (Medium 403s) often
// survive in the Wayback Machine. The `id_` timestamp suffix returns the
// original HTML without the archive toolbar injected.
async function fetchWaybackSnapshot(url: string): Promise<string | null> {
  try {
    const api = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`
    const res = await fetch(api, { headers: { Accept: "application/json" } })
    if (!res.ok) return null
    const json = (await res.json()) as {
      archived_snapshots?: {
        closest?: { available?: boolean; url?: string; timestamp?: string }
      }
    }
    const closest = json.archived_snapshots?.closest
    if (!closest?.available || !closest.url || !closest.timestamp) return null
    const snapshotUrl = closest.url
      .replace(/^http:/, "https:")
      .replace(`/web/${closest.timestamp}/`, `/web/${closest.timestamp}id_/`)
    const snap = await fetch(snapshotUrl, { redirect: "follow" })
    if (!snap.ok) return null
    return await snap.text()
  } catch {
    return null
  }
}

export async function fetchHtml(
  url: string,
  opts: FetchOpts = {}
): Promise<string> {
  const { retries = 3, backoffMs = 800, headers } = opts
  return queue.add(
    async () => {
      let attempt = 0
      let lastErr: unknown
      while (attempt <= retries) {
        try {
          const res = await fetch(url, {
            method: "GET",
            redirect: "follow",
            headers: {
              // Realistic desktop-browser UA. Several sources (a16z, Medium,
              // some WordPress blogs) serve a stripped index/landing page — or
              // a hard 403 — to obvious bot user-agents, which is how essays
              // previously got scraped as the wrong page.
              "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
              Accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.9",
              "Sec-Fetch-Dest": "document",
              "Sec-Fetch-Mode": "navigate",
              "Upgrade-Insecure-Requests": "1",
              ...headers,
            },
          })
          if (res.ok) {
            return await res.text()
          }
          if (res.status === 429 || res.status >= 500) {
            lastErr = new Error(`HTTP ${res.status}`)
          } else {
            // Hard 4xx — the live page is gone or blocked. Try the Wayback
            // Machine before giving up.
            const snapshot = await fetchWaybackSnapshot(url)
            if (snapshot) return snapshot
            throw new Error(`HTTP ${res.status} for ${url}`)
          }
        } catch (err) {
          lastErr = err
        }
        attempt++
        await new Promise((r) =>
          setTimeout(r, backoffMs * Math.pow(2, attempt - 1))
        )
      }
      throw lastErr instanceof Error
        ? lastErr
        : new Error(`Failed to fetch ${url}`)
    }
  ) as Promise<string>
}
