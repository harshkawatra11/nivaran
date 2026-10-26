import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-rule bg-paper/90 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link href="/" className="font-display text-lg font-semibold tracking-tight">
          Nivaran <span className="font-deva text-muted text-sm align-middle">निवारण</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-5 text-sm text-ink-2 font-mono">
          <Link href="/report" className="hover:text-ink">
            Report
          </Link>
          <Link href="/cases" className="hover:text-ink">
            My cases
          </Link>
          <Link href="/board" className="hover:text-ink">
            Ward board
          </Link>
          <Link href="/how" className="hover:text-ink">
            How it works
          </Link>
        </nav>
        <Link href="/report" className="sm:hidden text-sm font-mono text-verdigris">
          Report &rarr;
        </Link>
      </div>
    </header>
  );
}
