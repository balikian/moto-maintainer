import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { OPEN_GRAPH, SITE_URL, TEST_SITE_URL } from "@/lib/site";
import SiteAnalytics from "./components/SiteAnalytics";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const isProduction = process.env.VERCEL_ENV === "production";

const description =
  "Track motorcycle maintenance by miles and months, whichever comes first. Log service, get reminders, and keep a clean service history. Free in early access.";

export const metadata: Metadata = {
  // Link previews need full addresses (the Open Graph image is
  // app/opengraph-image.tsx). The test site's own address, so its previews
  // can be checked there; Vercel's default for previews is behind its login.
  metadataBase: new URL(
    isProduction ? SITE_URL : process.env.VERCEL_ENV === "preview" ? TEST_SITE_URL : "http://localhost:3000",
  ),
  title: "SwingArm",
  description,
  // What a shared link shows. A page that sets its own openGraph replaces
  // all of this, so spread OPEN_GRAPH into it.
  openGraph: { ...OPEN_GRAPH, title: "SwingArm: motorcycle maintenance tracker", description },
  twitter: { card: "summary_large_image" },
  // Only swingarm.app goes in search results; the test site and local dev
  // stay out (pages like share links also say noindex on their own).
  ...(!isProduction && { robots: { index: false, follow: false } }),
  // Added to an iPhone's Home Screen, SwingArm opens full screen under this
  // name (the manifest, app/manifest.ts, covers other browsers).
  appleWebApp: {
    capable: true,
    title: "SwingArm",
    statusBarStyle: "default",
  },
};

// viewport-fit=cover lets the bottom bar sit behind the iPhone home indicator
// and pad itself with env(safe-area-inset-bottom). The theme color tints the
// browser bar and the installed app's status bar to match the page.
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ece6dc" },
    { media: "(prefers-color-scheme: dark)", color: "#141619" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Starts dark; the boot script applies the cached theme before the first
    // paint, and the saved one is applied once the user's profile loads.
    <html
      lang="en"
      suppressHydrationWarning
      className={`dark ${manrope.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {children}
        {/* Production only, so the test site and local dev don't skew the numbers. */}
        {process.env.VERCEL_ENV === 'production' && <SiteAnalytics />}
      </body>
    </html>
  );
}
