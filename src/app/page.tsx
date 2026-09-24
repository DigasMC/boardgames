import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  Dices,
  Library,
  Shuffle,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const BGG_POWERED_BY_SRC =
  "https://cf.geekdo-images.com/HZy35cmzmmyV9BarSuk6ug__imagepage/img/FOGhR5OgYhcg-1jdqT5i5W8Xfbg=/fit-in/900x600/filters:no_upscale():strip_icc()/pic7779581.png";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <header className="sticky top-0 z-50 border-b border-outline-variant/10 bg-background/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-[family-name:var(--font-brand)] text-xl tracking-tight text-primary transition-transform active:scale-95 sm:gap-2.5 sm:text-2xl"
          >
            <Image
              src="/tablist.png"
              alt=""
              width={48}
              height={48}
              className="aspect-square size-11 shrink-0 object-contain sm:size-12"
              priority
            />
            Tablist
          </Link>
          <nav className="hidden items-center gap-8 md:flex" aria-label="Page">
            <a
              href="#features"
              className="text-sm font-semibold tracking-wide text-on-surface-variant transition-colors hover:text-primary"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-semibold tracking-wide text-on-surface-variant transition-colors hover:text-primary"
            >
              How it works
            </a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <Link
                href="/collection"
                className="landing-cta-btn inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-sm sm:px-5"
              >
                Start
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:text-primary sm:inline-block"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="landing-cta-btn inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-sm sm:px-5"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden pb-16 pt-12 sm:pb-28 sm:pt-20">
          <div
            className="pointer-events-none absolute left-1/2 top-12 -z-10 h-[350px] w-[700px] -translate-x-1/2 rounded-full bg-secondary-fixed/30 blur-3xl"
            aria-hidden
          />
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-12">
            <p className="landing-hero-brand font-[family-name:var(--font-brand)] text-4xl tracking-tight text-primary sm:text-5xl md:text-6xl">
              Tablist
            </p>
            <h1 className="landing-hero-headline mx-auto mt-5 max-w-3xl font-[family-name:var(--font-headline)] text-2xl font-semibold leading-snug tracking-tight text-primary sm:text-3xl md:text-4xl">
              The calm place for your shelf and your scorepad.
            </h1>
            <p className="landing-hero-copy mx-auto mt-5 max-w-2xl text-base leading-relaxed text-on-surface-variant sm:text-lg">
              Import your BoardGameGeek collection, filter what fits tonight&apos;s
              table, and keep a lasting record of every game night—without the
              paper chaos.
            </p>
            <div className="landing-hero-cta mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              {user ? (
                <Link
                  href="/collection"
                  className="landing-cta-btn inline-flex w-full items-center justify-center rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-on-primary shadow-md sm:w-auto"
                >
                  Start
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="landing-cta-btn inline-flex w-full items-center justify-center rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-on-primary shadow-md sm:w-auto"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="landing-cta-btn inline-flex w-full items-center justify-center rounded-xl border border-secondary/30 bg-surface-container-lowest px-7 py-3.5 text-sm font-semibold text-secondary sm:w-auto"
                  >
                    Create a free account
                  </Link>
                </>
              )}
            </div>

            {/* Mobile: phone-ratio frame, capped at 80vh */}
            <div className="landing-hero-visual relative mx-auto mt-14 w-[min(100%,calc(80vh*486/931))] sm:hidden">
              <div className="rounded-xl border border-secondary/20 bg-surface-container-high p-1.5 shadow-xl">
                <div className="overflow-hidden rounded-lg border border-outline-variant/30 bg-surface">
                  <div className="relative aspect-[486/931] bg-surface-bright">
                    <Image
                      src="/landing/screenshot_mobile.png"
                      alt="Tablist collection view on mobile"
                      fill
                      priority
                      className="object-cover"
                      sizes="(max-width: 640px) min(100vw, calc(80vh * 486 / 931)), 384px"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop: browser chrome frame */}
            <div className="landing-hero-visual relative mx-auto mt-16 hidden max-w-5xl sm:block">
              <div className="rounded-xl border border-secondary/20 bg-surface-container-high p-2 shadow-xl">
                <div className="overflow-hidden rounded-lg border border-outline-variant/30 bg-surface text-left">
                  <div className="flex items-center gap-2 border-b border-outline-variant/20 bg-surface-container-low px-3 py-2.5">
                    <span className="size-3 rounded-full bg-error/70" aria-hidden />
                    <span
                      className="size-3 rounded-full bg-secondary-container"
                      aria-hidden
                    />
                    <span
                      className="size-3 rounded-full bg-primary-fixed-dim"
                      aria-hidden
                    />
                    <span className="ml-2 text-xs font-medium text-on-surface-variant/70">
                      My Collection — Tablist
                    </span>
                  </div>
                  <div className="bg-surface-bright leading-none">
                    <Image
                      src="/landing/screenshot.png"
                      alt="Tablist collection view with game covers, filters, and ratings"
                      width={1904}
                      height={1080}
                      priority
                      className="h-auto w-full"
                      sizes="(max-width: 1024px) 100vw, 1024px"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="landing-purpose border-y border-outline-variant/20 bg-surface-container-low py-20 sm:py-28"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-12">
            <div className="mx-auto mb-14 max-w-2xl text-center sm:mb-16">
              <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-secondary">
                Designed for the physical table
              </span>
              <h2 className="font-[family-name:var(--font-headline)] text-3xl font-bold tracking-tight text-primary sm:text-4xl">
                Built for hosts who want less fuss, more play.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-on-surface-variant sm:text-lg">
                Tablist stays out of the way—quick to open, clear to
                scan, and honest about what&apos;s on your shelf when the group
                arrives.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
              <article className="tactile-card flex flex-col justify-between rounded-2xl bg-surface-bright p-8 md:col-span-7">
                <div>
                  <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-primary-fixed text-primary">
                    <Library className="size-6" aria-hidden />
                  </div>
                  <h3 className="mb-3 font-[family-name:var(--font-headline)] text-2xl font-semibold text-primary">
                    A shelf you can actually search
                  </h3>
                  <p className="mb-6 leading-relaxed text-on-surface-variant">
                    Pull in owned games from BoardGameGeek, keep covers and
                    ratings close at hand, and stop guessing whether that
                    midweight classic still fits four players.
                  </p>
                </div>
                <div className="space-y-3 rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md border border-secondary/20 bg-surface-container-high px-3 py-1 text-xs font-semibold text-secondary">
                      <Users className="size-3.5" aria-hidden /> 4 players
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-secondary/20 bg-surface-container-high px-3 py-1 text-xs font-semibold text-secondary">
                      Under 90 min
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-secondary/20 bg-surface-container-high px-3 py-1 text-xs font-semibold text-secondary">
                      Medium weight
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-semibold text-on-primary shadow-sm">
                      <Shuffle className="size-3.5" aria-hidden /> Random game
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    Narrow the shelf to what tonight can actually finish—or let
                    chance break the deadlock.
                  </p>
                </div>
              </article>

              <article className="tactile-card flex flex-col justify-between rounded-2xl bg-surface-bright p-8 md:col-span-5">
                <div>
                  <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-secondary-fixed text-tertiary">
                    <CalendarDays className="size-6" aria-hidden />
                  </div>
                  <h3 className="mb-3 font-[family-name:var(--font-headline)] text-2xl font-semibold text-primary">
                    Sessions that stick around
                  </h3>
                  <p className="mb-6 leading-relaxed text-on-surface-variant">
                    Log who sat down, capture scores as you play, and keep a
                    tidy history of nights you&apos;d rather remember than
                    reconstruct from a crumpled pad.
                  </p>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-outline-variant/30 bg-surface-container-high p-4">
                  <div>
                    <p className="text-sm font-semibold text-primary">
                      Friday game night
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      Scores saved · ready for next week
                    </p>
                  </div>
                  <Dices className="size-5 text-primary" aria-hidden />
                </div>
              </article>

              <article className="tactile-card rounded-2xl bg-surface-bright p-8 md:col-span-12">
                <div className="grid gap-8 md:grid-cols-2 md:items-center">
                  <div>
                    <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-primary-fixed-dim text-primary">
                      <Dices className="size-6" aria-hidden />
                    </div>
                    <h3 className="mb-3 font-[family-name:var(--font-headline)] text-2xl font-semibold text-primary">
                      From BGG data to the table
                    </h3>
                    <p className="leading-relaxed text-on-surface-variant">
                      Game metadata comes from BoardGameGeek so player counts,
                      play times, and ratings stay familiar. You focus on
                      hosting; we keep the catalog grounded in the source
                      tabletop players already trust.
                    </p>
                  </div>
                  <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-6">
                    <p className="font-[family-name:var(--font-headline)] text-lg font-semibold text-primary">
                      Import once. Host often.
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                      Connect your BGG username, merge owned titles into your
                      collection, then filter and play—no spreadsheet required.
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="bg-surface py-20 sm:py-28"
        >
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-12">
            <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-secondary">
              How it works
            </span>
            <h2 className="font-[family-name:var(--font-headline)] text-3xl font-bold tracking-tight text-primary sm:text-4xl">
              Three steps to a quieter game night.
            </h2>
            <ol className="mt-12 space-y-8 text-left">
              <li className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-[family-name:var(--font-headline)] text-sm font-bold text-on-primary">
                  1
                </span>
                <div>
                  <h3 className="font-[family-name:var(--font-headline)] text-xl font-semibold text-primary">
                    Create your account
                  </h3>
                  <p className="mt-1 text-on-surface-variant">
                    Sign up in a minute—email or Google—and land in a collection
                    ready to fill.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-[family-name:var(--font-headline)] text-sm font-bold text-on-primary">
                  2
                </span>
                <div>
                  <h3 className="font-[family-name:var(--font-headline)] text-xl font-semibold text-primary">
                    Bring in your shelf
                  </h3>
                  <p className="mt-1 text-on-surface-variant">
                    Import from BoardGameGeek or add titles one by one. Ratings,
                    times, and player counts come along for the ride.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-[family-name:var(--font-headline)] text-sm font-bold text-on-primary">
                  3
                </span>
                <div>
                  <h3 className="font-[family-name:var(--font-headline)] text-xl font-semibold text-primary">
                    Host and record
                  </h3>
                  <p className="mt-1 text-on-surface-variant">
                    Filter for tonight, pick a game, start a session, and keep
                    the scores where you can find them next week.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section className="bg-primary-container px-4 py-20 text-center sm:px-12 sm:py-24">
          <div className="mx-auto max-w-2xl">
            <h2 className="font-[family-name:var(--font-headline)] text-3xl font-bold tracking-tight text-surface-bright sm:text-4xl">
              Ready for the next game night?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-primary-fixed sm:text-lg">
              Set up your collection, invite the table, and leave the crumpled
              score sheets in the past.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {user ? (
                <Link
                  href="/collection"
                  className="landing-cta-btn inline-flex items-center justify-center rounded-xl bg-accent px-7 py-3.5 text-sm font-bold text-on-tertiary shadow-md"
                >
                  Start
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/signup"
                    className="landing-cta-btn inline-flex items-center justify-center rounded-xl bg-accent px-7 py-3.5 text-sm font-bold text-on-tertiary shadow-md"
                  >
                    Get started free
                  </Link>
                  <Link
                    href="/login"
                    className="landing-cta-btn inline-flex items-center justify-center rounded-xl border border-primary-fixed/40 px-7 py-3.5 text-sm font-semibold text-surface-bright"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-outline-variant/20 bg-surface-container-low px-4 py-12 sm:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="font-[family-name:var(--font-brand)] text-lg text-primary">
              Tablist
            </p>
            <p className="mt-1 max-w-sm text-sm text-on-surface-variant">
              Crafted for tabletop hosts and the nights worth remembering.
            </p>
          </div>
          <a
            href="https://boardgamegeek.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full max-w-[11rem] opacity-80 transition-opacity hover:opacity-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BGG_POWERED_BY_SRC}
              alt="Powered by BGG"
              className="h-auto w-full"
            />
          </a>
        </div>
      </footer>
    </div>
  );
}
