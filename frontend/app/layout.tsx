import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://spec-flow.dev"),
  title: {
    default: "specflow — Universal AI Workflow Bootstrap",
    template: "%s | specflow",
  },
  description:
    "One command. Any stack. Any agent. Bootstrap your AI coding agent with persistent context. Powered by OpenSpec, Skills.sh, and Obsidian.",
  keywords: [
    "AI coding agent",
    "persistent context",
    "workflow automation",
    "OpenSpec",
    "Obsidian",
    "AI developer tools",
    "coding assistant",
    "Claude Code",
    "Cursor",
    "Windsurf",
    "GitHub Copilot",
  ],
  authors: [{ name: "specflow" }],
  creator: "specflow",
  publisher: "specflow",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  twitter: {
    card: "summary_large_image",
    title: "specflow — Universal AI Workflow Bootstrap",
    description: "One command. Any stack. Any agent. Bootstrap your AI coding agent with persistent context.",
    creator: "@kousthubha",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "specflow - Universal AI Workflow Bootstrap",
      },
    ],
  },
  openGraph: {
    type: "website",
    url: "https://spec-flow.dev",
    siteName: "specflow",
    title: "specflow — Universal AI Workflow Bootstrap",
    description: "One command. Any stack. Any agent. Bootstrap your AI coding agent with persistent context.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "specflow - Universal AI Workflow Bootstrap",
      },
    ],
    locale: "en_US",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  verification: {
    google: "google-site-verification-code",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0D0D0D" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={jetbrainsMono.className}>{children}</body>
    </html>
  );
}
