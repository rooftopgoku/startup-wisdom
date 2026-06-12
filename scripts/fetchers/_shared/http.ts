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
              "User-Agent":
                "archive-scraper/0.1 (+https://archive.example) AppleWebKit/537.36",
              Accept: "text/html,application/xhtml+xml",
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
