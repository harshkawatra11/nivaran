import type { Metadata } from "next";
import {
  Fraunces,
  Inter_Tight,
  JetBrains_Mono,
  Tiro_Devanagari_Hindi,
} from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const devanagari = Tiro_Devanagari_Hindi({
  variable: "--font-hindi",
  subsets: ["devanagari"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Nivaran · निवारण",
  description:
    "Turn a civic problem into a clear complaint, find the responsible office, and keep the follow-up moving. Delhi civic services in Hindi and English.",
  metadataBase: new URL("https://nivaran-indol.vercel.app"),
  openGraph: {
    title: "Nivaran · A way forward",
    description:
      "A complaint. A paper trail. A way forward. Civic accountability for Delhi.",
    images: ["/brand/nivaran-logo.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      data-scroll-behavior="smooth"
      lang="en"
      className={`${fraunces.variable} ${interTight.variable} ${jetbrainsMono.variable} ${devanagari.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">
        {children}
      </body>
    </html>
  );
}
