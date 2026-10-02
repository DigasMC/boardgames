import Image from "next/image";
import Link from "next/link";

const BGG_POWERED_BY_SRC =
  "https://cf.geekdo-images.com/HZy35cmzmmyV9BarSuk6ug__imagepage/img/FOGhR5OgYhcg-1jdqT5i5W8Xfbg=/fit-in/900x600/filters:no_upscale():strip_icc()/pic7779581.png";

type SiteFooterProps = {
  /** Extra classes on the outer footer (e.g. margin for app shell). */
  className?: string;
  /** Hide the BGG badge (e.g. compact app footer). */
  showBggBadge?: boolean;
};

export function SiteFooter({
  className = "",
  showBggBadge = true,
}: SiteFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={`border-t border-outline-variant/20 bg-surface-container-low px-4 py-10 sm:px-12 ${className}`}
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 sm:flex-row sm:justify-between">
        <div className="text-center sm:text-left">
          <p className="font-[family-name:var(--font-brand)] text-lg text-primary">
            Tablist
          </p>
          <p className="mt-1 max-w-sm text-sm text-on-surface-variant">
            Crafted for tabletop hosts and the nights worth remembering.
          </p>
          <nav
            className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm sm:justify-start"
            aria-label="Legal"
          >
            <Link
              href="/privacy"
              className="font-semibold text-on-surface-variant transition-colors hover:text-primary"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="font-semibold text-on-surface-variant transition-colors hover:text-primary"
            >
              Terms of Service
            </Link>
            <a
              href="mailto:digasmc@gmail.com"
              className="font-semibold text-on-surface-variant transition-colors hover:text-primary"
            >
              Contact
            </a>
            <a
              href="https://www.instagram.com/tablist.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-on-surface-variant transition-colors hover:text-primary"
            >
              Instagram
            </a>
          </nav>
          <p className="mt-3 text-xs text-on-surface-variant/80">
            © {year} <a href="https://diogocarlos.pt" target="_blank" rel="noopener noreferrer">Diogo Carlos</a>
          </p>
        </div>
        {showBggBadge ? (
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
        ) : (
          <Link
            href="/"
            className="inline-flex items-center gap-2 opacity-80 transition-opacity hover:opacity-100"
          >
            <Image
              src="/tablist.png"
              alt=""
              width={40}
              height={40}
              className="size-10 object-contain"
            />
          </Link>
        )}
      </div>
    </footer>
  );
}
