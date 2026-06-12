// One-shot: apply manually-authored extraction outputs for the 9 resources
// whose API extraction failed (4 schema-validation errors + 5 credit-balance
// errors on 2026-06-11). Outputs follow EXTRACTION_SYSTEM_PROMPT rules and
// are validated against ExtractionOutputSchema before writing. DB writes
// mirror scripts/extract.ts exactly.
//
// Run with:  npx tsx --env-file=.env.local scripts/_apply-manual-extractions.ts

import { ExtractionOutputSchema, type ExtractionOutput } from "../src/lib/extraction-schema"
import { createSupabaseAdminClient } from "../src/lib/supabase/admin"

const EXTRACTIONS: Record<string, ExtractionOutput> = {
  "1997-letter-to-shareholders": {
    key_highlight: {
      body: "But this is Day 1 for the Internet and, if we execute well, for Amazon.com.",
      context:
        "The line that became Amazon's defining mantra — Bezos reattached this 1997 letter to every annual letter for the next two decades.",
    },
    highlights: [
      {
        body: "When forced to choose between optimizing the appearance of our GAAP accounting and maximizing the present value of future cash flows, we'll take the cash flows.",
        context: null,
      },
      {
        body: "We will make bold rather than timid investment decisions where we see a sufficient probability of gaining market leadership advantages. Some of these investments will pay off, others will not, and we will have learned another valuable lesson in either case.",
        context: null,
      },
      {
        body: "Setting the bar high in our approach to hiring has been, and will continue to be, the single most important element of Amazon.com's success. When I interview people I tell them, \"You can work long, hard, or smart, but at Amazon.com you can't choose two out of three.\"",
        context: null,
      },
      {
        body: "We first measure ourselves in terms of the metrics most indicative of our market leadership: customer and revenue growth, the degree to which our customers continue to purchase from us on a repeat basis, and the strength of our brand.",
        context: "Bezos rejects short-term profitability and Wall Street reactions as the scoreboard.",
      },
      {
        body: "Word of mouth remains the most powerful customer acquisition tool we have. Repeat purchases and word of mouth have combined to make Amazon.com the market leader in online bookselling.",
        context: null,
      },
      {
        body: "We are working to build something important, something that matters to our customers, something that we can all tell our grandchildren about. Such things aren't meant to be easy.",
        context: null,
      },
    ],
    topics: ["strategy", "growth", "hiring", "mission", "decision-making"],
  },

  "2002-letter-to-shareholders": {
    key_highlight: {
      body: "We transform much of customer experience — such as unmatched selection, extensive product information, personalized recommendations, and other new software features — into largely a fixed expense. With customer experience costs largely fixed (more like a publishing model than a retailing model), our costs as a percentage of sales can shrink rapidly as we grow.",
      context:
        "Bezos's answer to why Amazon's dual goal of best experience AND lowest prices isn't the paradox traditional retail thinks it is.",
    },
    highlights: [
      {
        body: "Traditional stores face a time-tested tradeoff between offering high-touch customer experience on the one hand and the lowest possible prices on the other. How can Amazon.com be trying to do both?",
        context: null,
      },
      {
        body: "Our pricing objective is not to discount a small number of products for a limited period of time, but to offer low prices everyday and apply them broadly across our entire product range.",
        context: null,
      },
      {
        body: "To prove its pricing claim, Amazon priced a rival book chain's own list of its 100 bestsellers — it took six hours across four superstores to find them all. The books cost $1,561 at the chain's stores and $1,195 at Amazon, a 23% savings; only 15 of the 100 were discounted in-store versus 76 at Amazon.",
        context: null,
      },
      {
        body: "We display customer reviews critical of our products. We share our prime real estate — our product detail pages — with third parties, and, if they can offer better value, we let them.",
        context: "From Bezos's list of ways Amazon is \"not a normal store.\"",
      },
      {
        body: "In short, what's good for customers is good for shareholders.",
        context: null,
      },
    ],
    topics: ["strategy", "pricing", "competition", "growth"],
  },

  "2003-letter-to-shareholders": {
    key_highlight: {
      body: "Long-term thinking is both a requirement and an outcome of true ownership. Owners are different from tenants. I know of a couple who rented out their house, and the family who moved in nailed their Christmas tree to the hardwood floors instead of using a tree stand. Many investors are effectively short-term tenants, turning their portfolios so quickly they are really just renting the stocks that they temporarily \"own.\"",
      context: null,
    },
    highlights: [
      {
        body: "When Amazon let customers post negative reviews, vendors complained: \"You make money when you sell things — why would you allow negative reviews on your website?\" Though negative reviews cost some sales in the short term, helping customers make better purchase decisions ultimately pays off for the company.",
        context: null,
      },
      {
        body: "When we launched Instant Order Update — which reminds you that you've already bought a particular item — we were able to measure with statistical significance that the feature slightly reduced sales. Good for customers? Definitely. Good for shareowners? Yes, in the long run.",
        context: null,
      },
      {
        body: "Eliminating defects, improving productivity, and passing the resulting cost savings back to customers in the form of lower prices is a long-term decision. Price reductions almost always hurt current results, but relentlessly driving the \"price-cost structure loop\" leaves a stronger, more valuable business.",
        context: null,
      },
      {
        body: "Our pricing strategy does not attempt to maximize margin percentages, but instead seeks to drive maximum value for customers and thereby create a much larger bottom line — in the long term.",
        context: "Amazon deliberately targeted jewelry margins substantially below industry norms, betting that \"customers figure these things out.\"",
      },
      {
        body: "Engineering a feature like Instant Order Update for use by 40 million customers costs nowhere near 40 times what it would cost to do the same for 1 million customers.",
        context: "Why software-driven customer experience behaves like a fixed cost that scale keeps shrinking.",
      },
    ],
    topics: ["strategy", "decision-making", "pricing", "mental-models"],
  },

  "2011-letter-to-shareholders": {
    key_highlight: {
      body: "Even well-meaning gatekeepers slow innovation. When a platform is self-service, even the improbable ideas can get tried, because there's no expert gatekeeper ready to say \"that will never work!\" And guess what — many of those improbable ideas do work, and society is the beneficiary of that diversity.",
      context: null,
    },
    highlights: [
      {
        body: "The most radical and transformative of inventions are often those that empower others to unleash their creativity — to pursue their dreams. That's a big part of what's going on with Amazon Web Services, Fulfillment by Amazon, and Kindle Direct Publishing.",
        context: null,
      },
      {
        body: "These innovative, large-scale platforms are not zero-sum — they create win-win situations and create significant value for developers, entrepreneurs, customers, authors, and readers.",
        context: null,
      },
      {
        body: "KDP authors get paid royalties of 70% while the largest traditional publishers pay 17.5% on ebooks. At a reader-friendly $2.99, authors get approximately $2 — with the legacy royalty, the selling price would have to be $11.43 to yield the same $2 per unit. Authors sell many, many more copies at $2.99 than they would at $11.43.",
        context: null,
      },
      {
        body: "AWS is self-service: you don't need to negotiate a contract or engage with a salesperson — you can just read the online documentation and get started. All AWS services are pay-as-you-go and radically transform capital expense into a variable cost.",
        context: null,
      },
      {
        body: "Take a look at the Kindle best-seller list, and compare it to the New York Times best-seller list — which is more diverse? The Kindle list is chock-full of books from small presses and self-published authors, while the New York Times list is dominated by successful and established authors.",
        context: null,
      },
    ],
    topics: ["strategy", "distribution", "leverage", "growth"],
  },

  "2014-letter-to-shareholders": {
    key_highlight: {
      body: "A dreamy business offering has at least four characteristics. Customers love it, it can grow to very large size, it has strong returns on capital, and it's durable in time — with the potential to endure for decades. When you find one of these, don't just swipe right, get married.",
      context: "Bezos's test for a franchise business — Marketplace, Prime, and AWS each passed it.",
    },
    highlights: [
      {
        body: "Marketplace's early days were not easy. First, we launched Amazon Auctions. I think seven people came, if you count my parents and siblings. Auctions transformed into zShops — again, no customers. But then we morphed zShops into Marketplace; today more than 40% of Amazon's units are sold by third-party sellers.",
        context: null,
      },
      {
        body: "When Prime launched, we were told repeatedly that it was a risky move — we gave up many millions of dollars in shipping revenue, and there was no simple math to show that it would be worth it. The decision was built on an intuition that customers would quickly grasp they were being offered the best deal in the history of shopping.",
        context: null,
      },
      {
        body: "FBA completes the circle: Marketplace pumps energy into Prime, and Prime pumps energy into Marketplace. Thanks to FBA, Marketplace and Prime are no longer two things — their economics and customer experiences are now happily and deeply intertwined.",
        context: null,
      },
      {
        body: "Maintaining a firm grasp of the obvious is more difficult than one would think it should be. But it's useful to try. If you ask, what do sellers want? The correct (and obvious) answer is: they want more sales.",
        context: null,
      },
      {
        body: "What customers really want in this arena is \"better and faster,\" and if \"better and faster\" can come with a side dish of cost savings, terrific. But the cost savings is the gravy, not the steak.",
        context: "Why enterprises adopt AWS — \"I can save you money and my service is almost as good\" wins no customers.",
      },
      {
        body: "I'm pretty sure we're the first company to have figured out how to make winning a Golden Globe pay off in increased sales of power tools and baby wipes!",
        context: "On Prime original content as a flywheel input rather than a standalone business.",
      },
    ],
    topics: ["strategy", "growth", "risk", "product-market-fit", "distribution"],
  },

  "managing-your-own-psychology": {
    key_highlight: {
      body: "By far the most difficult skill for me to learn as CEO was the ability to manage my own psychology. It's like the fight club of management: The first rule of the CEO psychological meltdown is don't talk about the psychological meltdown.",
      context: null,
    },
    highlights: [
      {
        body: "If CEOs were graded on a curve, the mean on the test would be 22 out of 100. This kind of mean can be psychologically challenging for a straight A student. It is particularly challenging, because nobody tells you that the mean is 22.",
        context: null,
      },
      {
        body: "Everybody learns to be a CEO by being a CEO. No training as a manager, general manager or any other job actually prepares you to run a company.",
        context: null,
      },
      {
        body: "Under stress, CEOs make one of two mistakes: they take things too personally, or they don't take things personally enough. Ideally, the CEO will be urgent yet not insane — moving aggressively and decisively without feeling emotionally culpable.",
        context: null,
      },
      {
        body: "It's so common that there is an acronym for it: WFIO, which stands for We're F#%ked, It's Over (pronounced whiff-ee-yo). Every company goes through at least two and up to five of these episodes. In all cases, WFIOs feel much worse than they are — especially for the CEO.",
        context: null,
      },
      {
        body: "When they train racecar drivers, one of the first lessons is when you are going around a curve at 200 MPH, do not focus on the wall; focus on the road. Running a company is like that. Focus on where you are going rather than on what you hope to avoid.",
        context: null,
      },
      {
        body: "Whenever I meet a successful CEO, I ask them how they did it. Mediocre CEOs point to their brilliant strategic moves or their intuitive business sense. The great CEOs tend to be remarkably consistent in their answers. They all say: \"I didn't quit.\"",
        context: null,
      },
    ],
    topics: ["leadership", "resilience", "founder-mode", "decision-making"],
  },

  "ceos-should-tell-it-like-it-is": {
    key_highlight: {
      body: "In any human interaction, the required amount of communication is inversely proportional to the level of trust. If the employees fundamentally trust the CEO, communication will be vastly more efficient than if they don't. Telling things as they are is a critical part of building this trust.",
      context: null,
    },
    highlights: [
      {
        body: "My single biggest personal improvement as CEO occurred on the day when I stopped being too positive.",
        context: null,
      },
      {
        body: "Horowitz realized his error when his brother-in-law, an AT&T pole repairman, described a visiting senior executive: \"Yeah, I know Fred. He comes by about once a quarter to blow a little sunshine up my ass.\" At that moment he knew he'd been screwing up his company by being too positive.",
        context: null,
      },
      {
        body: "A brain, no matter how big, cannot solve a problem that it doesn't know about. It's a total waste to have lots of big brains but not let them work on your biggest problems.",
        context: null,
      },
      {
        body: "A good culture is like the old RIP routing protocol: bad news travels fast, good news travels slow. If you investigate companies which have failed, you will find many employees who knew about the fatal issues long before those issues killed the company.",
        context: null,
      },
      {
        body: "Beware of management maxims that stop information from flowing freely, like \"don't bring me a problem without bringing me a solution.\" What if the employee cannot solve an important problem — do you really want him to bury that information?",
        context: null,
      },
      {
        body: "Nobody took bad news harder than me. Engineers easily brushed off things that kept me awake all night. If things went horribly wrong, they could walk away, but I could not.",
        context: "Why the young-CEO instinct to absorb all the worry and project sunshine gets it exactly backwards.",
      },
    ],
    topics: ["leadership", "culture", "founder-mode", "resilience"],
  },

  "making-money-isnt-about-luck": {
    key_highlight: {
      body: "In 1,000 parallel universes, you want to be wealthy in 999 of them. You don't want to be wealthy in the 50 of them where you got lucky. We want to factor luck out of it.",
      context: null,
    },
    highlights: [
      {
        body: "Making money is not about luck. It's about becoming the kind of person that makes money. If I lost all my money and you drop me on a random street in any English-speaking country, within 5, 10 years I'd be wealthy again — because it's a skill set that I've developed and anyone can develop.",
        context: null,
      },
      {
        body: "There are four kinds of luck: blind luck; luck from hustling (you stir up enough dust that luck finds you); luck from preparation (you're skilled enough to spot a lucky break others miss); and luck from your unique character — where you build a brand and mindset so distinctive that luck comes looking for you.",
        context: "The framework traces back to a blog post by Marc Andreessen.",
      },
      {
        body: "If you're the best deep sea diver in the world and somebody finds a sunken treasure ship they can't reach, their luck just became your luck. You created your own luck by putting yourself in a position to capitalize on it.",
        context: null,
      },
      {
        body: "Wealth stacks up one chip at a time, not all at once. I haven't made money in my life in one giant payout. It's always been a whole bunch of small things piling up — more options, more businesses, more investments.",
        context: "Naval lost his first fortune in the stock market and was cheated out of his second by business partners; only the third time was a charm.",
      },
      {
        body: "We're talking about enough wealth to get to freedom. Not retire in the sense that you don't do anything — but in the sense that you don't have to be any place you don't want to be, you don't have to do anything you don't want to do, and you don't have a boss.",
        context: null,
      },
    ],
    topics: ["wealth", "mental-models", "career", "risk"],
  },

  "paul-graham-on-why-starting-with-a-small-intense-fire-is-the-key-to-startup-grow": {
    key_highlight: {
      body: "You've got to find people who want what you're making A LOT. And that's necessarily going to be a small number at first. But that's ok. That's how these giant things get started… You don't have to do any better than Apple and Facebook.",
      context: "Apple started by selling just 500 Apple I computers; today it's the largest company in the world.",
    },
    highlights: [
      {
        body: "You have to know who those first users are and how you're going to get them. Then you're going to sit down and just have a party with those first few users and focus entirely on them and making them super super happy.",
        context: null,
      },
      {
        body: "One YC startup building a mobile email client had a beta group of exactly one user: Sam Altman. Sam uses email constantly and knows every client option, so he's sufficiently demanding — if the product makes Sam happy, odds are it will make lots of other people happy too.",
        context: null,
      },
      {
        body: "One of the things we tell startups in these extreme cases where they can make just one user happy is to act like a consultant. Act like Sam has hired you to make an email app just for him — it can say 'Sam Altman' at the top of the screen. That's ok! Just so long as Sam would feel bummed if you stopped working on it. That's the test.",
        context: null,
      },
      {
        body: "Intensity beats breadth at the start: a small group that loves you is worth more than a large group that's lukewarm, because the small, intense fire is what spreads.",
        context: null,
      },
    ],
    topics: ["product-market-fit", "growth", "idea-generation"],
  },
}

async function main() {
  const supabase = createSupabaseAdminClient()

  let ok = 0
  let failed = 0

  for (const [slug, raw] of Object.entries(EXTRACTIONS)) {
    try {
      const result = ExtractionOutputSchema.parse(raw)

      const { data: resource, error: rErr } = await supabase
        .from("resources")
        .select("id, title")
        .eq("slug", slug)
        .single()
      if (rErr || !resource) throw rErr ?? new Error(`resource not found: ${slug}`)

      const { data: topics } = await supabase.from("topics").select("id, slug")
      const topicBySlug = new Map(topics?.map((t) => [t.slug, t.id]) ?? [])

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
        .update({
          extraction_status: "done",
          extracted_at: new Date().toISOString(),
          status: "published",
          extraction_error: null,
        })
        .eq("id", resource.id)
      if (updErr) throw updErr

      console.log(`  ✓ ${resource.title} (${highlightRows.length} highlights, ${topicRows.length} topics)`)
      ok++
    } catch (err) {
      console.error(`  ✗ ${slug}:`, err instanceof Error ? err.message : err)
      failed++
    }
  }

  console.log(`\nDone. ok=${ok} failed=${failed}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
