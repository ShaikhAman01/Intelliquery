import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/Providers/ThemeProvider";
import { ToastProvider } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
        <ThemeProvider defaultTheme="light" storageKey="intelliquery-theme">
          <TooltipProvider delayDuration={400}>
            <ToastProvider>
              {children}
            </ToastProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}