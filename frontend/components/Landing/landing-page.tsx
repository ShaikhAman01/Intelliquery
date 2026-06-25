'use client';

import { motion } from 'framer-motion';
import {
  Database,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  TerminalSquare,
  Users,
  LineChart,
} from 'lucide-react';
import Link from 'next/link';

export function LandingPage() {
  const features = [
    {
      icon: <TerminalSquare className="h-4 w-4 text-muted-foreground" />,
      title: 'Natural language queries',
      description:
        'Ask questions in plain English and generate production-ready SQL instantly.',
    },
    {
      icon: <BarChart3 className="h-4 w-4 text-muted-foreground" />,
      title: 'Interactive analytics',
      description:
        'With inline visualizations, compare metrics and explore datasets seamlessly.',
    },
    {
      icon: <ShieldCheck className="h-4 w-4 text-muted-foreground" />,
      title: 'Safe by default',
      description:
        'Built with read-only execution pipelines, secure connections and guardrails.',
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground antialiased selection:bg-foreground select-none">
      {/* Structural Adaptive Layout Grids */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(var(--foreground-rgb),0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(var(--foreground-rgb),0.015)_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-[radial-gradient(circle_at_50%_0%,rgba(var(--foreground-rgb),0.03),transparent_70%)]" />

      {/* Navigation Header */}
      <header className="relative z-50 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-muted/50 shadow-sm">
            <Database className="h-4 w-4 text-foreground/80" />
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground">
            Intelliquery
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="rounded-xl bg-foreground px-4 py-2 text-xs font-semibold text-background transition-all hover:opacity-90 shadow-sm"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Canvas Area */}
      <main className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 pt-20 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-[11px] text-muted-foreground font-medium shadow-sm"
        >
          <Sparkles className="h-3 w-3 text-foreground/60" />
          AI-powered analytical compilation layers
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-4xl text-4xl font-bold leading-[1.15] tracking-tight text-foreground md:text-6xl lg:text-7xl"
        >
          Talk to your data,
          <br />
          <span className="text-muted-foreground/60">skip the SQL syntax loop.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="mt-6 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base"
        >
          Connect your warehouse frameworks, ask questions in clean English, and 
          stream data intelligence maps back instantly inside a unified platform workspace.
        </motion.p>

        {/* Call to Actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-8 flex flex-col gap-3 sm:flex-row w-full sm:w-auto px-4"
        >
          <Link
            href="/sign-up"
            className="group flex h-10 items-center justify-center gap-1.5 rounded-xl bg-foreground px-5 text-xs font-semibold text-background transition-all shadow-md"
          >
            Start free workspace
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/sign-in"
            className="flex h-10 items-center justify-center rounded-xl border border-border bg-muted/40 px-5 text-xs font-semibold text-muted-foreground transition-all hover:bg-muted hover:text-foreground shadow-sm"
          >
            Explore sandbox demo
          </Link>
        </motion.div>

        {/* Dynamic Sandbox Workspace Preview */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative mt-20 w-full overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-2xl"
        >
          {/* Browser Control Bar */}
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/50 px-4 py-2.5 rounded-t-xl">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
              <span className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
              <span className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
            </div>
            <div className="rounded-lg border border-border/40 bg-background px-4 py-0.5 text-[10px] font-mono text-muted-foreground tracking-tight shadow-inner">
              analytics.intelliquery.app
            </div>
            <div className="w-10" />
          </div>

          {/* Interactive Interface Window Frame */}
          <div className="grid h-[440px] grid-cols-12 overflow-hidden bg-background text-left text-xs">
            
            {/* Sidebar Shell */}
            <div className="hidden border-r border-border/60 bg-muted/20 p-4 md:col-span-3 md:flex flex-col justify-between">
              <div className="space-y-1">
                <div className="rounded-xl border border-border/40 bg-card px-3 py-2 font-medium text-foreground shadow-sm">
                  Query Playground
                </div>
                <div className="rounded-xl px-3 py-2 text-muted-foreground/70 font-medium">
                  Data Catalog Snapshot
                </div>
                <div className="rounded-xl px-3 py-2 text-muted-foreground/70 font-medium">
                  Shared Team Library
                </div>
              </div>

              <div className="rounded-xl border border-border/40 bg-card p-3 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background border border-border">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">HYD NextGen Hub</p>
                    <p className="text-[10px] text-muted-foreground font-mono">12 active nodes</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Application Console Workspaces */}
            <div className="col-span-12 flex flex-col bg-background md:col-span-9 overflow-hidden">
              <div className="border-b border-border/40 p-4">
                <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/30 px-4 py-2.5 shadow-inner">
                  <Sparkles className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-foreground/80 truncate">
                    Isolate abnormal transaction spikes over recurring customer variance thresholds
                  </span>
                </div>
              </div>

              <div className="border-b border-border/40 p-4">
                <div className="rounded-xl border border-border/40 bg-muted/50 p-4 font-mono text-[11px] leading-relaxed text-foreground/90 shadow-sm">
                  <span className="text-muted-foreground font-bold">SELECT</span> date_trunc('day', timestamp) <span className="text-muted-foreground font-bold">AS</span> process_cycle, count(*)
                  <br />
                  <span className="text-muted-foreground font-bold">FROM</span> telemetry_pipeline_logs
                  <br />
                  <span className="text-muted-foreground font-bold">GROUP BY</span> 1 <span className="text-muted-foreground font-bold">HAVING</span> count(*) &gt; 2500;
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 overflow-hidden">
                <div className="rounded-xl border border-border bg-muted/20 p-4 lg:col-span-2 flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-foreground">Metrics Delta Sequence</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Evaluation frame volume</p>
                    </div>
                    <LineChart className="h-3.5 w-3.5 text-muted-foreground/60" />
                  </div>
                  <div className="flex h-24 items-end gap-1.5 pt-4">
                    {[35, 60, 42, 80, 55, 95, 100, 75, 110, 130].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-md bg-foreground/[0.08] transition-colors"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3 flex flex-col">
                  <div className="rounded-xl border border-border bg-muted/20 p-3 flex-1 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">AI Context Analysis</p>
                    <p className="mt-1.5 text-[11px] leading-normal text-muted-foreground">
                      Variance patterns indicate a critical execution boundary leak threshold near transaction intervals.
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/20 p-3 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2 text-foreground/80 text-[11px]">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Pipeline execution cycle</span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold bg-background px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                      240ms
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature Matrix Grid */}
        <section className="mt-24 grid w-full grid-cols-1 gap-4 md:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
              className="rounded-2xl border border-border bg-card p-5 text-left transition-colors duration-200 hover:bg-muted/40 shadow-sm"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background shadow-inner">
                {feature.icon}
              </div>
              <h3 className="mt-4 text-sm font-semibold tracking-tight text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </section>
      </main>

      {/* Footer System */}
      <footer className="border-t border-border bg-muted/30">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-6 text-xs text-muted-foreground sm:flex-row">
          <p>Built for product engineering teams requiring rapid infrastructure data views.</p>
          <div className="flex items-center gap-5">
            <a href="#" className="transition-colors hover:text-foreground">Privacy Map</a>
            <a href="#" className="transition-colors hover:text-foreground">Security Guardrails</a>
            <a href="#" className="transition-colors hover:text-foreground">Data Engineering API</a>
          </div>
        </div>
      </footer>
    </div>
  );
}