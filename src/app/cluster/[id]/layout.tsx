import { Suspense } from "react";
export default function ClusterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <main className="app-main">
          <div className="skeleton" aria-label="Loading cluster" />
        </main>
      }
    >
      {children}
    </Suspense>
  );
}
