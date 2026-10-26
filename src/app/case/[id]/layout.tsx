import { Suspense } from "react";
export default function CaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <main className="app-main">
          <div className="skeleton" aria-label="Loading case" />
        </main>
      }
    >
      {children}
    </Suspense>
  );
}
