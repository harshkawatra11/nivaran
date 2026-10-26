import Link from "next/link";
import { SiteHeader } from "./SiteHeader";
import type { ReactNode } from "react";
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="app-main">
        {children}
      </main>
      <footer className="site-footer">
        <span>Nivaran · Built for the follow-through.</span>
        <span>
          Delhi civic services · <Link href="/how">How decisions are made</Link>
        </span>
      </footer>
    </>
  );
}
export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children && <div className="intro-copy">{children}</div>}
    </div>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`notice ${error ? "notice-error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function Status({ value }: { value: string }) {
  return (
    <span
      className={`status ${/overdue|failed|emergency/.test(value) ? "status-red" : /ready|resolved/.test(value) ? "status-green" : ""}`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}
