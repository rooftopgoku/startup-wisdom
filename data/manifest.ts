// The editorial source of truth. Adding a row = adding a resource.
// Order doesn't matter — scrape.ts will dedupe by (source, url) or (source, externalId).
// Comments per section explain the curation logic.

export type ManifestSource =
  | "paulgraham"
  | "pmarchive"
  | "altman"
  | "naval"
  | "collison"
  | "chesky"
  | "bezos"
  | "bhorowitz"
  | "startup-archive-yt"

export interface ManifestEntry {
  source: ManifestSource
  /** Canonical URL of the resource. Required for non-YouTube. */
  url?: string
  /** YouTube video ID — only for the startup-archive-yt source. */
  externalId?: string
  /** Optional override / hint when the source page is ambiguous. */
  title?: string
  /** Optional manual published_at override in YYYY-MM-DD; auto-detected otherwise. */
  published?: string
  /** Editorial note for future Claude / reviewer eyes. Never shown publicly. */
  notes?: string
}

export const manifest: ManifestEntry[] = [
  // ── Paul Graham ──────────────────────────────────────────────────────
  // ~20 most-cited essays. Selection biased toward (a) founder-actionable,
  // (b) widely quoted, (c) timeless.
  { source: "paulgraham", url: "https://paulgraham.com/ds.html",         title: "Do Things That Don't Scale" },
  { source: "paulgraham", url: "https://paulgraham.com/startupideas.html", title: "How to Get Startup Ideas" },
  { source: "paulgraham", url: "https://paulgraham.com/makersschedule.html", title: "Maker's Schedule, Manager's Schedule" },
  { source: "paulgraham", url: "https://paulgraham.com/foundermode.html", title: "Founder Mode" },
  { source: "paulgraham", url: "https://paulgraham.com/start.html",       title: "How to Start a Startup" },
  { source: "paulgraham", url: "https://paulgraham.com/cities.html",      title: "Cities and Ambition" },
  { source: "paulgraham", url: "https://paulgraham.com/schlep.html",      title: "Schlep Blindness" },
  { source: "paulgraham", url: "https://paulgraham.com/relres.html",      title: "Relentlessly Resourceful" },
  { source: "paulgraham", url: "https://paulgraham.com/wealth.html",      title: "How to Make Wealth" },
  { source: "paulgraham", url: "https://paulgraham.com/disagree.html",    title: "How to Disagree" },
  { source: "paulgraham", url: "https://paulgraham.com/disc.html",        title: "The Anatomy of Determination" },
  { source: "paulgraham", url: "https://paulgraham.com/mean.html",        title: "Mean People Fail" },
  { source: "paulgraham", url: "https://paulgraham.com/swan.html",        title: "Black Swan Farming" },
  { source: "paulgraham", url: "https://paulgraham.com/love.html",        title: "How to Do What You Love" },
  { source: "paulgraham", url: "https://paulgraham.com/lwba.html",        title: "Life Is Short" },
  { source: "paulgraham", url: "https://paulgraham.com/gba.html",         title: "Why It's Safe for Founders to Be Nice" },
  { source: "paulgraham", url: "https://paulgraham.com/hp.html",          title: "How You Know" },
  { source: "paulgraham", url: "https://paulgraham.com/users.html",       title: "The Top Idea in Your Mind" },
  { source: "paulgraham", url: "https://paulgraham.com/before.html",      title: "Before the Startup" },
  { source: "paulgraham", url: "https://paulgraham.com/superlinear.html", title: "Superlinear Returns" },
  // Playbook additions (2026-05) — back the 4 startup-playbook collections
  { source: "paulgraham", url: "https://paulgraham.com/organic.html",      title: "Organic Startup Ideas" },
  { source: "paulgraham", url: "https://paulgraham.com/when.html",         title: "When to Do What You Love" },
  { source: "paulgraham", url: "https://paulgraham.com/13sentences.html",  title: "Startups in 13 Sentences" },
  { source: "paulgraham", url: "https://paulgraham.com/startuplessons.html", title: "The Hardest Lessons for Startups to Learn" },
  { source: "paulgraham", url: "https://paulgraham.com/ace.html",          title: "Billionaires Build" },

  // ── Marc Andreessen — Pmarca Guide to Startups + Startup Essentials ──
  { source: "pmarchive", url: "https://pmarchive.com/guide_to_startups_part1.html", title: "Guide to Startups, Part 1: Why not to do a startup" },
  { source: "pmarchive", url: "https://pmarchive.com/guide_to_startups_part2.html", title: "Guide to Startups, Part 2: When the VCs say no" },
  { source: "pmarchive", url: "https://pmarchive.com/guide_to_startups_part3.html", title: "Guide to Startups, Part 3: 'But I don't know any VCs!'" },
  { source: "pmarchive", url: "https://pmarchive.com/guide_to_startups_part4.html", title: "Guide to Startups, Part 4: The only thing that matters" },
  { source: "pmarchive", url: "https://pmarchive.com/guide_to_startups_part5.html", title: "Guide to Startups, Part 5: The Moby Dick theory of big companies" },
  { source: "pmarchive", url: "https://pmarchive.com/guide_to_startups_part6.html", title: "Guide to Startups, Part 6: How much funding is too little? Too much?" },
  { source: "pmarchive", url: "https://pmarchive.com/guide_to_startups_part7.html", title: "Guide to Startups, Part 7: Why a startup's initial business plan matters" },
  { source: "pmarchive", url: "https://pmarchive.com/guide_to_startups_part8.html", title: "Guide to Startups, Part 8: Hiring, managing, promoting, and firing executives" },
  { source: "pmarchive", url: "https://pmarchive.com/guide_to_startups_part9.html", title: "Guide to Startups, Part 9: How to hire a professional CEO" },
  { source: "pmarchive", url: "https://pmarchive.com/how_to_hire_the_best_people.html", title: "How to Hire the Best People You've Ever Worked With" },
  // big_companies_are_different.html / business_school_part1.html never
  // existed on pmarchive.com — substituted with the closest real pages
  // (2026-06): Guide to Big Companies part 2 and Career Planning part 3.
  { source: "pmarchive", url: "https://pmarchive.com/guide_to_big_companies_part2.html", title: "Guide to Big Companies: Retaining great people" },
  { source: "pmarchive", url: "https://pmarchive.com/age_and_the_entrepreneur.html", title: "Age and the Entrepreneur" },
  { source: "pmarchive", url: "https://pmarchive.com/guide_to_career_planning_part3.html", title: "Guide to Career Planning, Part 3: Where to go and why" },
  { source: "pmarchive", url: "https://pmarchive.com/luck_and_the_entrepreneur.html", title: "Luck and the Entrepreneur" },
  { source: "pmarchive", url: "https://pmarchive.com/guide_to_career_planning_part1.html", title: "Guide to Career Planning, Part 1: Opportunity" },
  { source: "pmarchive", url: "https://pmarchive.com/guide_to_career_planning_part2.html", title: "Guide to Career Planning, Part 2: Skills and education" },

  // ── Sam Altman ──────────────────────────────────────────────────────
  { source: "altman", url: "https://playbook.samaltman.com",                     title: "Startup Playbook" },
  { source: "altman", url: "https://blog.samaltman.com/how-to-be-successful",    title: "How To Be Successful" },
  { source: "altman", url: "https://blog.samaltman.com/productivity",            title: "Productivity" },
  { source: "altman", url: "https://blog.samaltman.com/idea-generation",         title: "Idea Generation" },
  { source: "altman", url: "https://blog.samaltman.com/researchers-and-founders", title: "Researchers and Founders" },
  { source: "altman", url: "https://blog.samaltman.com/hard-startups",           title: "Hard Startups" },
  { source: "altman", url: "https://blog.samaltman.com/how-to-invest-in-startups", title: "How To Invest In Startups" },
  { source: "altman", url: "https://blog.samaltman.com/what-i-wish-someone-had-told-me", title: "What I Wish Someone Had Told Me" },
  { source: "altman", url: "https://blog.samaltman.com/the-days-are-long-but-the-decades-are-short", title: "The Days Are Long But The Decades Are Short" },
  { source: "altman", url: "https://blog.samaltman.com/value-is-created-by-doing", title: "Value Is Created By Doing" },
  { source: "altman", url: "https://blog.samaltman.com/super-successful-companies", title: "Super-Successful Companies" },
  { source: "altman", url: "https://blog.samaltman.com/upside-risk",             title: "Upside Risk" },
  // Playbook additions (2026-05) — back the 4 startup-playbook collections
  { source: "altman", url: "https://blog.samaltman.com/advice-for-ambitious-19-year-olds", title: "Advice for Ambitious 19 Year Olds" },
  { source: "altman", url: "https://blog.samaltman.com/startup-advice-briefly",  title: "Startup Advice, Briefly" },
  { source: "altman", url: "https://blog.samaltman.com/how-to-hire",             title: "How to Hire" },
  { source: "altman", url: "https://blog.samaltman.com/employee-retention",      title: "Employee Retention" },
  { source: "altman", url: "https://blog.samaltman.com/how-things-get-done",     title: "How Things Get Done" },

  // ── Naval (essays only — defer podcast transcription) ────────────────
  { source: "naval", url: "https://nav.al/rich",              title: "How to Get Rich (Without Getting Lucky)" },
  { source: "naval", url: "https://nav.al/specific-knowledge", title: "How to Find Specific Knowledge" },
  // wealth-creation / leverage / almanack never existed on nav.al (no
  // Wayback record either) — substituted with real How to Get Rich episode
  // pages (2026-06).
  { source: "naval", url: "https://nav.al/seek-wealth",       title: "Seek Wealth, Not Money or Status" },
  { source: "naval", url: "https://nav.al/labor-capital",     title: "Labor and Capital Are Old Leverage" },
  { source: "naval", url: "https://nav.al/judgment",          title: "Judgment" },
  { source: "naval", url: "https://nav.al/desire",            title: "Desire Is a Contract You Make With Yourself" },
  { source: "naval", url: "https://nav.al/money-luck",        title: "Making Money Isn't About Luck" },
  { source: "naval", url: "https://nav.al/happiness",         title: "Happiness Is a Skill" },

  // ── Patrick Collison ────────────────────────────────────────────────
  { source: "collison", url: "https://patrickcollison.com/advice",        title: "Advice" },
  { source: "collison", url: "https://patrickcollison.com/questions",     title: "Questions" },
  { source: "collison", url: "https://patrickcollison.com/fast",          title: "Fast" },
  { source: "collison", url: "https://patrickcollison.com/about",         title: "About" },
  { source: "collison", url: "https://patrickcollison.com/svb-stripe",    title: "Notes on Stripe's response to SVB" },

  // ── Brian Chesky (Medium + interview transcripts) ───────────────────
  // Medium blocks direct scraping (403) — these two fetch via the Wayback
  // fallback in fetchers/_shared/http.ts.
  { source: "chesky", url: "https://medium.com/@bchesky/dont-fuck-up-the-culture-597cde9ee9d4", title: "Don't Fuck Up the Culture" },
  { source: "chesky", url: "https://medium.com/@bchesky/7-rejections-7d894cbaa084", title: "7 Rejections" },
  // The three entries below were placeholder URLs that don't exist (no
  // Medium post, no Wayback record). Commented out 2026-06 — restore with
  // real URLs if the pieces are ever located.
  // { source: "chesky", url: "https://medium.com/@bchesky/the-snow-white-deck", title: "The Snow White Deck" },
  // { source: "chesky", url: "https://medium.com/airbnb-tech-blog/handcrafted-design-on-airbnb", title: "On Handcrafted Experiences" },
  // { source: "chesky", url: "https://medium.com/@bchesky/founder-mode-and-the-builder", title: "Founder Mode and the Builder" },

  // ── Jeff Bezos shareholder letters ──────────────────────────────────
  // aboutamazon.com only hosts 2016+ letters (plus a 1997 reprint at its own
  // slug). The 2002/2003/2011/2014 letters live on SEC EDGAR as EX-99.1
  // exhibits to Amazon's April 8-K filings — verified 2026-06.
  { source: "bezos", url: "https://www.aboutamazon.com/news/company-news/amazons-original-1997-letter-to-shareholders", title: "1997 Letter to Shareholders", published: "1998-03-30" },
  { source: "bezos", url: "https://www.sec.gov/Archives/edgar/data/1018724/000089102003001186/v89126exv99w1.htm", title: "2002 Letter to Shareholders", published: "2003-04-11" },
  { source: "bezos", url: "https://www.sec.gov/Archives/edgar/data/1018724/000119312504060718/dex991.htm", title: "2003 Letter to Shareholders", published: "2004-04-13" },
  { source: "bezos", url: "https://www.sec.gov/Archives/edgar/data/1018724/000119312512161812/d329990dex991.htm", title: "2011 Letter to Shareholders", published: "2012-04-13" },
  { source: "bezos", url: "https://www.sec.gov/Archives/edgar/data/1018724/000119312515144741/d895323dex991.htm", title: "2014 Letter to Shareholders", published: "2015-04-24" },
  { source: "bezos", url: "https://www.aboutamazon.com/news/company-news/2016-letter-to-shareholders", title: "2016 Letter to Shareholders — Day 1" },
  { source: "bezos", url: "https://www.aboutamazon.com/news/company-news/2018-letter-to-shareholders", title: "2018 Letter to Shareholders" },
  { source: "bezos", url: "https://www.aboutamazon.com/news/company-news/2020-letter-to-shareholders", title: "2020 Letter to Shareholders — Farewell" },

  // ── Ben Horowitz ────────────────────────────────────────────────────
  { source: "bhorowitz", url: "https://a16z.com/peacetime-ceo-wartime-ceo/", title: "Peacetime CEO / Wartime CEO" },
  { source: "bhorowitz", url: "https://bhorowitz.com/2012/12/16/the-struggle/", title: "The Struggle" },
  { source: "bhorowitz", url: "https://a16z.com/a-good-place-to-work/", title: "A Good Place to Work" },
  { source: "bhorowitz", url: "https://bhorowitz.com/2011/04/27/lead-bullets/", title: "Lead Bullets" },
  { source: "bhorowitz", url: "https://bhorowitz.com/2011/07/13/how-to-minimize-politics-in-your-company/", title: "How to Minimize Politics in Your Company" },
  { source: "bhorowitz", url: "https://bhorowitz.com/2010/03/17/the-case-for-the-fat-startup/", title: "The Case for the Fat Startup" },
  { source: "bhorowitz", url: "https://bhorowitz.com/2010/04/01/why-we-prefer-founding-ceos/", title: "Why We Prefer Founding CEOs" },
  { source: "bhorowitz", url: "https://bhorowitz.com/2012/06/15/why-startups-should-train-their-people/", title: "Why Startups Should Train Their People" },
  { source: "bhorowitz", url: "https://bhorowitz.com/2010/11/02/hiring-executives-if-you-have-never-done-the-job-how-do-you-hire-somebody-good/", title: "Hiring Executives" },
  { source: "bhorowitz", url: "https://a16z.com/whats-the-most-difficult-ceo-skill-managing-your-own-psychology/", title: "Managing Your Own Psychology" },
  // Playbook additions (2026-05) — back the 4 startup-playbook collections.
  // Ben Horowitz's older essays moved from bhorowitz.com to a16z.com; both
  // URLs are kept under the `bhorowitz` source.
  { source: "bhorowitz", url: "https://a16z.com/making-yourself-a-ceo/",         title: "Making Yourself a CEO" },
  { source: "bhorowitz", url: "https://a16z.com/ceos-should-tell-it-like-it-is/", title: "CEOs Should Tell It Like It Is" },

  // ── Startup Archive YouTube ─────────────────────────────────────────
  // Each entry's `url` points at startupArchive.org/p/<slug> — a curated
  // writeup of a clip from the @startuparchive_ YouTube channel. The fetcher
  // pulls the blog body as raw_text and extracts the embedded YouTube URL as
  // the canonical external_url.
  { source: "startup-archive-yt", url: "https://www.startuparchive.org/p/jeff-bezos-s-two-pieces-of-advice-for-aspiring-entrepreneurs" },
  { source: "startup-archive-yt", url: "https://www.startuparchive.org/p/steve-jobs-explains-the-importance-of-both-thinking-and-doing-5a79" },
  { source: "startup-archive-yt", url: "https://www.startuparchive.org/p/marc-andreessen-on-the-5-personality-traits-of-an-innovator-5e06" },
  { source: "startup-archive-yt", url: "https://www.startuparchive.org/p/sam-altman-explains-how-he-decides-to-invest-in-a-startup-after-10-minutes" },
  { source: "startup-archive-yt", url: "https://www.startuparchive.org/p/paul-graham-on-why-starting-with-a-small-intense-fire-is-the-key-to-startup-growth-5a5b" },
  { source: "startup-archive-yt", url: "https://www.startuparchive.org/p/tobi-lutke-explains-what-the-vcs-who-passed-on-shopify-got-wrong-380e" },
  { source: "startup-archive-yt", url: "https://www.startuparchive.org/p/keith-rabois-on-how-to-identify-great-talent-0cd7" },
  { source: "startup-archive-yt", url: "https://www.startuparchive.org/p/mark-zuckerberg-you-can-t-80-20-everything-c9fc" },
  { source: "startup-archive-yt", url: "https://www.startuparchive.org/p/eric-schmidt-on-why-most-companies-get-strategy-wrong" },
  { source: "startup-archive-yt", url: "https://www.startuparchive.org/p/jony-ive-recounts-the-time-steve-jobs-called-him-vain-a68e" },
]
