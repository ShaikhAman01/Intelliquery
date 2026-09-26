import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/Providers/ThemeProvider";
import { ToastProvider } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { VerifyEmailBanner } from "@/components/Layout/VerifyEmailBanner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://intelliquery.shaikhaman.in"),
  title: "Intelliquery – AI-Powered SQL Generation",
  description: "Transform natural language into SQL queries with AI. Connect your database and ask questions in plain English.",
  openGraph: {
    title: "Intelliquery – AI-Powered SQL Generation",
    description: "Transform natural language into SQL queries with AI. Connect your database and ask questions in plain English.",
    type: "website",
    siteName: "Intelliquery",
  },
  twitter: {
    card: "summary_large_image",
    title: "Intelliquery – AI-Powered SQL Generation",
    description: "Transform natural language into SQL queries with AI. Connect your database and ask questions in plain English.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <a
          href="#main-content"
          className="sr-only text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:px-4 focus:py-2 focus:text-[13px] focus:font-semibold"
          style={{ background: 'var(--ds-accent)' }}
        >
          Skip to content
        </a>
        <ThemeProvider defaultTheme="light" storageKey="intelliquery-theme">
          <TooltipProvider delayDuration={400}>
            <ToastProvider>
              <div className="flex h-[100dvh] flex-col">
                <VerifyEmailBanner />
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {children}
                </div>
              </div>
            </ToastProvider>
          </TooltipProvider>
        </ThemeProvider>

        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}