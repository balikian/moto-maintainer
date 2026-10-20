import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SwingArm",
  description: "Your digital garage: track motorcycle maintenance by mileage and time.",
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
      </body>
    </html>
  );
}
