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
      icon: <TerminalSquare className="h-4 w-4 text-slate-300" />,
      title: 'Natural language queries',
      description:
        'Ask questions in plain English and generate production-ready SQL instantly.',
    },
    {
      icon: <BarChart3 className="h-4 w-4 text-slate-300" />,
      title: 'Interactive analytics',
      description:
        'With inline visualizations, compare metrics and explore datasets seamlessly.',
    },
    {
      icon: <ShieldCheck className="h-4 w-4 text-slate-300" />,
      title: 'Safe by default',
      description:
        'Built with read-only execution pipelines, secure connections and guardrails.',
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#09090b] text-[#e5e1e4] antialiased">
      {/* Restored Ambient background to monochromatic professional tones */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.03),transparent_70%)]" />

      {/* Navigation */}
      <header className="relative z-50 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3 select-none">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-[#111214]">
            <Database className="h-4 w-4 text-slate-200" />
          </div>
          <span className="text-sm font-bold tracking-tight text-white">
            Intelliquery
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="text-xs font-medium text-slate-400 transition-colors hover:text-white"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-zinc-950 transition-all duration-200 hover:bg-slate-200"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Content */}
      <main className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 pt-20 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-[#111214] px-3 py-1 text-[11px] text-slate-400 font-medium select-none"
        >
          <Sparkles className="h-3 w-3 text-slate-300" />
          AI-powered analytical compilation layers
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-4xl text-4xl font-bold leading-[1.1] tracking-tight text-white md:text-6xl lg:text-7xl"
        >
          Talk to your data,
          <br />
          <span className="text-slate-500">skip the SQL syntax loop.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="mt-6 max-w-xl text-sm leading-relaxed text-slate-400 md:text-base"
        >
          Connect your warehouse frameworks, ask questions in clean English, and 
          stream data intelligence maps back instantly inside a unified platform workspace.
        </motion.p>

        {/* CTA Button Matrix */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-8 flex flex-col gap-3 sm:flex-row w-full sm:w-auto px-4"
        >
          <Link
            href="/sign-up"
            className="group flex h-10 items-center justify-center gap-1.5 rounded-xl bg-white px-5 text-xs font-semibold text-zinc-950 transition-all duration-200 hover:bg-slate-200"
          >
            Start free workspace
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/sign-in"
            className="flex h-10 items-center justify-center rounded-xl border border-white/[0.06] bg-[#111214] px-5 text-xs font-semibold text-slate-300 transition-all duration-200 hover:bg-[#16171a] hover:text-white"
          >
            Explore sandbox demo
          </Link>
        </motion.div>

        {/* Unified Application Architecture Preview */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative mt-20 w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111214] p-2 shadow-2xl shadow-black/80"
        >
          {/* Top Window Chrome */}
          <div className="flex items-center justify-between border-b border-white/[0.04] bg-[#0d0e10] px-4 py-2.5 rounded-t-xl select-none">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-white/[0.06]" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/[0.06]" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/[0.06]" />
            </div>
            <div className="rounded-lg border border-white/[0.04] bg-[#09090b] px-4 py-0.5 text-[10px] font-mono text-slate-500 tracking-tight">
              analytics.intelliquery.app
            </div>
            <div className="w-10" />
          </div>

          {/* Interactive Preview Canvas Dashboard Layout Sync */}
          <div className="grid h-[440px] grid-cols-12 overflow-hidden bg-[#0d0e10] text-left text-xs">
            
            {/* Sidebar View Mapping */}
            <div className="hidden border-r border-white/[0.05] bg-[#09090b] p-4 md:col-span-3 md:flex flex-col justify-between">
              <div className="space-y-1">
                <div className="rounded-xl border border-white/[0.04] bg-[#111214] px-3 py-2 font-medium text-white shadow-sm">
                  Query Playground
                </div>
                <div className="rounded-xl px-3 py-2 text-slate-500 font-medium">
                  Data Catalog Snapshot
                </div>
                <div className="rounded-xl px-3 py-2 text-slate-500 font-medium">
                  Shared Team Library
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.04] bg-[#111214] p-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#09090b] border border-white/[0.06]">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">HYD NextGen Hub</p>
                    <p className="text-[10px] text-slate-500 font-mono">12 active nodes</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Core Application Preview Console */}
            <div className="col-span-12 flex flex-col bg-[#0d0e10] md:col-span-9 overflow-hidden">
              
              {/* Dynamic Query Prompt Input Field Mock */}
              <div className="border-b border-white/[0.04] p-4 bg-[#0d0e10]">
                <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-[#09090b] px-4 py-2.5">
                  <Sparkles className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-300 truncate">
                    Isolate abnormal transaction spikes over recurring customer variance thresholds
                  </span>
                </div>
              </div>

              {/* Dynamic Executed SQL Element Display Block */}
              <div className="border-b border-white/[0.04] p-4 bg-[#0d0e10]">
                <div className="rounded-xl border border-white/[0.04] bg-[#070708] p-4 font-mono text-[11px] leading-relaxed text-slate-300">
                  <span className="text-slate-400 font-bold">SELECT</span> date_trunc('day', timestamp) <span className="text-slate-400 font-bold">AS</span> process_cycle, count(*)
                  <br />
                  <span className="text-slate-400 font-bold">FROM</span> telemetry_pipeline_logs
                  <br />
                  <span className="text-slate-400 font-bold">GROUP BY</span> 1 <span className="text-slate-400 font-bold">HAVING</span> count(*) &gt; 2500;
                </div>
              </div>

              {/* Lower Section Tab Split Preview Panels */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 overflow-hidden">
                <div className="rounded-xl border border-white/[0.06] bg-[#111214] p-4 lg:col-span-2 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-white">Metrics Delta Sequence</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">Evaluation frame volume</p>
                    </div>
                    <LineChart className="h-3.5 w-3.5 text-slate-500" />
                  </div>
                  {/* Realigned Chart Bar Modules to match Dashboard Neutral Monochromes */}
                  <div className="flex h-24 items-end gap-1.5 pt-4">
                    {[35, 60, 42, 80, 55, 95, 100, 75, 110, 130].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-md bg-white/[0.08] group-hover:bg-white/20 transition-colors"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3 flex flex-col">
                  <div className="rounded-xl border border-white/[0.06] bg-[#111214] p-3 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AI Context Analysis</p>
                    <p className="mt-1.5 text-[11px] leading-normal text-slate-400">
                      Variance patterns indicate a critical execution boundary leak threshold near transaction intervals.
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-[#111214] p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-300 text-[11px]">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Pipeline execution cycle</span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold bg-[#09090b] px-1.5 py-0.5 rounded border border-white/[0.04] text-slate-400">
                      240ms
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </motion.div>

        {/* Feature Grid System */}
        <section className="mt-24 grid w-full grid-cols-1 gap-4 md:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
              className="rounded-2xl border border-white/[0.06] bg-[#111214] p-5 text-left transition-colors duration-200 hover:bg-white/[0.01]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-[#09090b]">
                {feature.icon}
              </div>
              <h3 className="mt-4 text-sm font-semibold tracking-tight text-white">
                {feature.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </section>
      </main>

      {/* Footer Layout Framework */}
      <footer className="border-t border-white/[0.05] bg-[#0d0e10]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-6 text-xs text-slate-500 sm:flex-row">
          <p>Built for product engineering teams requiring rapid infrastructure data views.</p>
          <div className="flex items-center gap-5">
            <a href="#" className="transition-colors hover:text-slate-300">Privacy Map</a>
            <a href="#" className="transition-colors hover:text-slate-300">Security Guardrails</a>
            <a href="#" className="transition-colors hover:text-slate-300">Data Engineering API</a>
          </div>
        </div>
      </footer>
    </div>
  );
}