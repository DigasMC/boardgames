import type { Metadata, Viewport } from "next";
import { Lobster, Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

const lobster = Lobster({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-lobster",
  display: "swap",
});

const APP_DESCRIPTION =
  "Import your BoardGameGeek collection, filter what fits tonight's table, and keep a lasting record of every game night.";

export const metadata: Metadata = {
  title: "Tablist",
  applicationName: "Tablist",
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tablist",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon/favicon.ico" },
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/favicon/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#012d1d",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${lobster.variable}`}
      suppressHydrationWarning
    >
      <body
        className={`${montserrat.className} min-h-screen antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
