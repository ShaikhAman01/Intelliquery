// components/landing/landing-page.tsx
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
      icon: <TerminalSquare className="h-5 w-5 text-slate-200" />,
      title: 'Natural language queries',
      description:
        'Ask questions in plain English and generate production-ready SQL instantly.',
    },
    {
      icon: <BarChart3 className="h-5 w-5 text-slate-200" />,
      title: 'Interactive analytics',
      description:
        'Visualize trends, compare metrics and explore datasets without writing complex queries.',
    },
    {
      icon: <ShieldCheck className="h-5 w-5 text-slate-200" />,
      title: 'Safe by default',
      description:
        'Built with read-only execution, secure connections and production guardrails.',
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#09090b] text-slate-200">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.10),transparent_45%)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-[120px]" />

      {/* Navigation */}
      <header className="relative z-50 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
            <Database className="h-4 w-4 text-white" />
          </div>

          <span className="text-[15px] font-semibold tracking-tight text-white">
            Intelliquery
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="text-sm text-slate-400 transition-colors hover:text-white"
          >
            Sign In
          </Link>

          <Link
            href="/sign-up"
            className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition-all duration-200 hover:bg-slate-200"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 pt-16 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-slate-400"
        >
          <Sparkles className="h-3.5 w-3.5 text-violet-300" />
          AI-powered analytics workspace
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="max-w-5xl text-5xl font-semibold leading-[1.05] tracking-tight text-white md:text-7xl"
        >
          Talk to your data,
          <br />
          <span className="text-slate-400">
            skip the SQL setup.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="mt-6 max-w-2xl text-base leading-8 text-slate-400 md:text-lg"
        >
          Connect your database, ask questions in natural language and
          explore insights through a fast, modern analytics interface.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="mt-10 flex flex-col gap-4 sm:flex-row"
        >
          <Link
            href="/sign-up"
            className="group flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-medium text-black transition-all duration-200 hover:bg-slate-200"
          >
            Start for free

            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>

          <Link
            href="/sign-in"
            className="flex h-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-6 text-sm font-medium text-slate-300 transition-all duration-200 hover:bg-white/[0.05]"
          >
            Explore demo
          </Link>
        </motion.div>

        {/* Product preview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.7,
            delay: 0.3,
          }}
          className="relative mt-20 w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-[#101012] p-3 shadow-2xl shadow-black/40"
        >
          {/* Window bar */}
          <div className="flex items-center justify-between border-b border-white/[0.05] px-3 pb-3">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-zinc-700" />
              <span className="h-3 w-3 rounded-full bg-zinc-700" />
              <span className="h-3 w-3 rounded-full bg-zinc-700" />
            </div>

            <div className="rounded-md border border-white/[0.04] bg-[#0b0b0c] px-3 py-1 text-[11px] text-slate-500">
              analytics.intelliquery.app
            </div>

            <div className="w-10" />
          </div>

          {/* Dashboard preview */}
          <div className="grid h-[420px] grid-cols-12 overflow-hidden rounded-2xl pt-3 text-left">
            
            {/* Sidebar */}
            <div className="hidden border-r border-white/[0.05] bg-[#0d0e10] p-4 md:col-span-3 md:block">
              <div className="space-y-2">
                <div className="rounded-xl bg-white/[0.05] px-3 py-2 text-sm text-white">
                  Dashboard
                </div>

                <div className="rounded-xl px-3 py-2 text-sm text-slate-500">
                  Queries
                </div>

                <div className="rounded-xl px-3 py-2 text-sm text-slate-500">
                  Analytics
                </div>

                <div className="rounded-xl px-3 py-2 text-sm text-slate-500">
                  Connections
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                    <Users className="h-4 w-4 text-violet-300" />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-white">
                      Team Workspace
                    </p>

                    <p className="text-xs text-slate-500">
                      12 active members
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main */}
            <div className="col-span-12 flex flex-col bg-[#111214] md:col-span-9">
              
              {/* Query bar */}
              <div className="border-b border-white/[0.05] p-5">
                <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#0c0d0f] px-4 py-3">
                  <Sparkles className="h-4 w-4 text-violet-300" />

                  <span className="text-sm text-slate-400">
                    Show monthly revenue trends for enterprise users
                  </span>
                </div>
              </div>

              {/* SQL */}
              <div className="border-b border-white/[0.05] p-5">
                <div className="rounded-2xl border border-white/[0.06] bg-[#0b0b0c] p-4 font-mono text-[13px] leading-7 text-slate-300">
                  <span className="text-violet-300">SELECT</span> month,
                  revenue
                  <br />
                  <span className="text-violet-300">FROM</span> enterprise_metrics
                  <br />
                  <span className="text-violet-300">WHERE</span> type ={' '}
                  <span className="text-emerald-300">'enterprise'</span>
                  <br />
                  <span className="text-violet-300">ORDER BY</span> month ASC;
                </div>
              </div>

              {/* Analytics */}
              <div className="flex-1 p-5">
                <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-3">
                  
                  {/* Chart */}
                  <div className="rounded-2xl border border-white/[0.06] bg-[#0d0e10] p-5 lg:col-span-2">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">
                          Revenue growth
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Last 12 months
                        </p>
                      </div>

                      <LineChart className="h-4 w-4 text-slate-500" />
                    </div>

                    <div className="flex h-[220px] items-end gap-3">
                      {[40, 55, 48, 72, 64, 90, 110, 95, 120, 140].map(
                        (h, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-t-xl bg-gradient-to-t from-violet-500/20 to-violet-400"
                            style={{ height: `${h}%` }}
                          />
                        )
                      )}
                    </div>
                  </div>

                  {/* Insights */}
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-white/[0.06] bg-[#0d0e10] p-5">
                      <p className="text-sm font-medium text-white">
                        AI Summary
                      </p>

                      <p className="mt-3 text-sm leading-7 text-slate-400">
                        Revenue increased steadily over the last quarter,
                        driven primarily by enterprise upgrades and higher
                        customer retention.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/[0.06] bg-[#0d0e10] p-5">
                      <div className="flex items-center gap-2 text-sm text-emerald-300">
                        <CheckCircle2 className="h-4 w-4" />
                        Query executed successfully
                      </div>

                      <p className="mt-3 text-xs text-slate-500">
                        Runtime: 0.24s
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Features */}
        <section className="mt-28 grid w-full grid-cols-1 gap-5 md:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.45,
                delay: index * 0.08,
              }}
              className="rounded-3xl border border-white/[0.06] bg-[#101012] p-6 transition-all duration-200 hover:bg-white/[0.02]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
                {feature.icon}
              </div>

              <h3 className="mt-5 text-lg font-semibold tracking-tight text-white">
                {feature.title}
              </h3>

              <p className="mt-3 text-sm leading-7 text-slate-400">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] bg-[#0b0b0c]/80">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-slate-500 sm:flex-row">
          <p>
            Built for teams that want faster access to data insights.
          </p>

          <div className="flex items-center gap-6">
            <a
              href="#"
              className="transition-colors hover:text-slate-300"
            >
              Privacy
            </a>

            <a
              href="#"
              className="transition-colors hover:text-slate-300"
            >
              Security
            </a>

            <a
              href="#"
              className="transition-colors hover:text-slate-300"
            >
              Documentation
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}