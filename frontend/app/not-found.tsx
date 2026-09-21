import type { Metadata } from "next";
import Link from "next/link";
import { Database, ArrowLeft, BookOpen, Bug } from "lucide-react";
import { BUG_REPORT_URL } from "@/lib/links";

export const metadata: Metadata = {
  title: "Page not found · Intelliquery",
  description: "That page does not exist.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--ds-base-0)" }}
    >
      <header
        className="h-14 flex-shrink-0 flex items-center px-6 border-b border-border"
        style={{ background: "var(--ds-base-1)" }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center"
            style={{ background: "var(--ds-accent)" }}
          >
            <Database className="h-4 w-4 text-white" />
          </div>
          <span className="text-[14px] font-semibold text-content-1">
            Intelliquery
          </span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[520px] text-center">
          <p className="text-[13px] font-mono font-medium tracking-wide text-content-3">
            404
          </p>

          <h1 className="mt-3 text-[28px] font-bold tracking-tight text-content-1">
            No rows returned
          </h1>

          <p className="mt-3 text-[14px] leading-relaxed text-content-2">
            That page does not exist. It may have been moved, or the link that
            brought you here may be out of date.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto"
              style={{ background: "var(--ds-accent)" }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>

            <Link
              href="/docs"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-[13px] font-semibold text-content-1 transition-colors hover:bg-[var(--ds-base-1)] sm:w-auto"
            >
              <BookOpen className="h-4 w-4" />
              Read the docs
            </Link>
          </div>

          <p className="mt-10 text-[13px] text-content-3">
            Landed here from a link inside the app?{" "}
            <a
              href={BUG_REPORT_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-content-2 underline underline-offset-4 transition-colors hover:text-content-1"
            >
              <Bug className="h-3.5 w-3.5" />
              Report it
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
