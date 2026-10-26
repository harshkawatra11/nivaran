"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
export function SiteHeader() {
  const path = usePathname();
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="wordmark" aria-label="Nivaran home">
            <Image
              src="/brand/nivaran-logo.png"
              alt=""
              width={38}
              height={38}
              className="rounded-lg"
            />
            <span>
              Nivaran<small lang="hi">निवारण</small>
            </span>
          </Link>
          <nav aria-label="Main navigation">
            {[
              ["/report", "Report"],
              ["/cases", "My cases"],
              ["/board", "Ward board"],
              ["/how", "How it works"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                aria-current={path === href ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          <Link className="header-cta" href="/report">
            Start a report <ArrowUpRight size={15} />
          </Link>
        </div>
      </header>
    </>
  );
}
