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
};

// viewport-fit=cover lets the bottom bar sit behind the iPhone home indicator
// and pad itself with env(safe-area-inset-bottom).
export const viewport: Viewport = {
  viewportFit: "cover",
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
