"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { SearchCommand } from "@/components/search-command"
import { ThemeToggle } from "@/components/theme-toggle"

const links = [
  { href: "/", label: "Database" },
  { href: "/highlights", label: "Highlights" },
  { href: "https://startupwisdom.beehiiv.com/", label: "Newsletter" },
]

export function Nav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 w-full bg-surface-1/95 supports-backdrop-filter:bg-surface-1/80 supports-backdrop-filter:backdrop-blur-md">
      <div className="mx-auto grid h-16 w-full max-w-[90rem] grid-cols-[auto_1fr_auto] items-center gap-8 px-5 sm:px-8">
        <Link
          href="/"
          aria-label="Startup Wisdom — home"
          className="group flex items-center justify-self-start"
        >
          <span className="font-serif text-xl font-semibold tracking-tight text-brand transition-opacity group-hover:opacity-80 sm:text-2xl">
            Startup Wisdom
          </span>
        </Link>

        <div className="hidden justify-self-center md:flex">
          <SearchCommand />
        </div>

        <div className="flex items-center gap-5 justify-self-end md:gap-7">
          <nav className="hidden items-center gap-5 md:flex lg:gap-7">
            {links.map((link) => {
              const active =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href))
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative py-1 text-sm transition-colors",
                    active
                      ? "font-medium text-ink"
                      : "text-ink-muted hover:text-ink"
                  )}
                >
                  {link.label}
                  {active && (
                    <span
                      aria-hidden
                      className="absolute -bottom-[21px] left-0 right-0 h-[2px] bg-brand"
                    />
                  )}
                </Link>
              )
            })}
          </nav>
          <div className="flex items-center gap-1 md:hidden">
            <SearchCommand />
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
