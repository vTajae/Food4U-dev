import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "~/components/ui/sonner";

export const metadata: Metadata = {
  title: { default: "Food4U", template: "%s · Food4U" },
  description: "Meal ideas for people with dietary restrictions. Food4U saves your conditions, allergies, diet and budget; automatic safety checks are in development.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6f2" },
    { media: "(prefers-color-scheme: dark)", color: "#17151b" },
  ],
};

// Applies a remembered theme choice before first paint so there is no flash.
// localStorage is a per-viewer convenience only; without it the OS setting wins.
const themeScript = `try{var t=localStorage.getItem("food4u-theme");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* Typefaces from DESIGN.md */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Mono:wght@400;600&family=Atkinson+Hyperlegible+Next:wght@400;700&family=Young+Serif&display=swap"
        />
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
