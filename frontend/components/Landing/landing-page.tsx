'use client';

import { motion } from 'motion/react';
import {
  Database,
  Sparkles,
  ArrowRight,
  BarChart3,
  MessageSquare,
  ShieldCheck,
  Play,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

const FEATURES = [
  {
    Icon: MessageSquare,
    title: 'Natural language queries',
    description: 'Ask questions like "show me revenue by region last quarter" and get production-ready SQL instantly.',
  },
  {
    Icon: BarChart3,
    title: 'Instant charts & insights',
    description: 'Every query generates AI-powered analysis, trend detection, and visualisations — no BI tool needed.',
  },
  {
    Icon: ShieldCheck,
    title: 'Safe by default',
    description: 'Read-only query execution, schema review controls, and sensitive column auto-hiding out of the box.',
  },
];

const DB_TYPES = ['PostgreSQL', 'MySQL', 'SQLite', 'BigQuery', 'Snowflake', 'SQL Server', 'MariaDB', 'CockroachDB'];

export function LandingPage() {
  return (
    <div
      className="relative min-h-screen antialiased"
      style={{ background: 'var(--ds-base-0)', color: 'var(--ds-text-1)' }}
    >
      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      {/* Accent glow at top */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[400px]"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.08) 0%, transparent 70%)' }}
      />

      {/* ── Nav ── */}
      <header className="relative z-50 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: 'var(--ds-accent)' }}
          >
            <Database className="h-4 w-4 text-white" />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-content-1">Intelliquery</span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="text-[13px] font-medium text-content-3 hover:text-content-1 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--ds-accent)' }}
          >
            Get started free
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-16 pb-24">
        <div className="flex flex-col items-center text-center">

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-1.5 text-[12px] font-medium text-content-3"
            style={{ background: 'var(--ds-base-1)' }}
          >
            <Sparkles className="h-3 w-3 text-brand" />
            AI-powered SQL analytics
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-3xl text-[44px] font-bold leading-[1.15] tracking-tight text-content-1 md:text-[60px]"
          >
            Query your data
            <br />
            <span style={{ color: 'var(--ds-accent)' }}>in plain English</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="mt-5 max-w-lg text-[16px] leading-relaxed text-content-3"
          >
            Connect any database, ask questions naturally, and get instant SQL results with AI-powered insights — no SQL expertise required.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <Link
              href="/sign-up"
              className="group inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-[14px] font-semibold text-white transition-all shadow-md hover:shadow-lg hover:opacity-90"
              style={{ background: 'var(--ds-accent)' }}
            >
              Start for free
              <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center rounded-xl border border-border px-6 py-3 text-[14px] font-semibold text-content-2 transition-colors hover:bg-base-2 hover:text-content-1"
              style={{ background: 'var(--ds-base-1)' }}
            >
              Sign in to your account
            </Link>
          </motion.div>

          {/* DB compatibility strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-2"
          >
            <span className="text-[11px] text-content-3 mr-1">Works with:</span>
            {DB_TYPES.map(db => (
              <span
                key={db}
                className="rounded-md border border-border px-2.5 py-0.5 text-[11px] font-mono text-content-3"
                style={{ background: 'var(--ds-base-1)' }}
              >
                {db}
              </span>
            ))}
          </motion.div>
        </div>

        {/* ── Product preview ── */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.18 }}
          className="mt-16 overflow-hidden rounded-2xl border border-border shadow-2xl"
          style={{ background: 'var(--ds-base-0)', boxShadow: '0 25px 50px rgba(0,0,0,0.12)' }}
        >
          {/* Browser chrome */}
          <div
            className="flex items-center justify-between border-b border-border px-4 py-3"
            style={{ background: 'var(--ds-base-1)' }}
          >
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full" style={{ background: 'var(--ds-base-4)' }} />
              <span className="h-3 w-3 rounded-full" style={{ background: 'var(--ds-base-4)' }} />
              <span className="h-3 w-3 rounded-full" style={{ background: 'var(--ds-base-4)' }} />
            </div>
            <div
              className="rounded-md border border-border px-3 py-1 text-[11px] font-mono text-content-3"
              style={{ background: 'var(--ds-base-0)' }}
            >
              app.intelliquery.com
            </div>
            <div className="w-14" />
          </div>

          {/* App shell */}
          <div className="flex h-[480px] overflow-hidden text-left">

            {/* Sidebar */}
            <div
              className="hidden md:flex w-[72px] flex-col items-center gap-1 border-r border-border py-4 flex-shrink-0"
              style={{ background: 'var(--ds-base-1)' }}
            >
              <div className="h-8 w-8 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--ds-accent)' }}>
                <Database className="h-4 w-4 text-white" />
              </div>
              {[MessageSquare, BarChart3, ShieldCheck].map((Icon, i) => (
                <div
                  key={i}
                  className="h-9 w-9 rounded-md flex items-center justify-center"
                  style={{
                    background: i === 0 ? 'rgba(37,99,235,0.12)' : 'transparent',
                    color: i === 0 ? 'var(--ds-accent)' : 'var(--ds-text-3)',
                  }}
                >
                  <Icon className="h-4 w-4" />
                </div>
              ))}
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <div
                className="h-12 flex-shrink-0 flex items-center border-b border-border px-4"
                style={{ background: 'var(--ds-base-1)' }}
              >
                <span className="text-[13px] font-semibold text-content-1">Chat</span>
                <div className="ml-auto flex items-center gap-2">
                  <div
                    className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[12px] text-content-3"
                    style={{ background: 'var(--ds-base-0)' }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    production_db
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-hidden p-5 space-y-5">
                {/* User message */}
                <div className="flex justify-end">
                  <div
                    className="max-w-[70%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-[13px] text-white leading-relaxed"
                    style={{ background: 'var(--ds-accent)' }}
                  >
                    Show me total revenue by product category for last quarter
                  </div>
                </div>

                {/* AI response */}
                <div className="flex gap-3 items-start">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--ds-accent)', opacity: 0.15 }}
                  >
                    <Sparkles className="h-4 w-4" style={{ color: 'var(--ds-accent)' }} />
                  </div>
                  <div className="flex-1 space-y-3 min-w-0">
                    <p className="text-[13px] text-content-2 leading-relaxed">
                      Here&apos;s the SQL to get total revenue by product category for Q1 2025:
                    </p>
                    {/* SQL block */}
                    <div
                      className="rounded-xl border border-border overflow-hidden text-[12px] font-mono"
                      style={{ background: 'var(--ds-base-1)' }}
                    >
                      <div
                        className="flex items-center justify-between px-3 py-2 border-b border-border"
                        style={{ background: 'var(--ds-base-2)' }}
                      >
                        <span className="text-[11px] text-content-3 font-sans">Generated SQL</span>
                        <Copy className="h-3 w-3 text-content-3" />
                      </div>
                      <div className="px-4 py-3 leading-relaxed text-content-2 select-none">
                        <span style={{ color: 'var(--ds-accent)' }}>SELECT</span>{' '}
                        category,{' '}
                        <span style={{ color: 'var(--ds-accent)' }}>SUM</span>(revenue){' '}
                        <span style={{ color: 'var(--ds-accent)' }}>AS</span>{' '}total_revenue
                        <br />
                        <span style={{ color: 'var(--ds-accent)' }}>FROM</span> orders
                        <br />
                        <span style={{ color: 'var(--ds-accent)' }}>WHERE</span>{' '}
                        order_date {'>='} &apos;2025-01-01&apos;
                        <br />
                        <span style={{ color: 'var(--ds-accent)' }}>GROUP BY</span> category
                        <br />
                        <span style={{ color: 'var(--ds-accent)' }}>ORDER BY</span> total_revenue{' '}
                        <span style={{ color: 'var(--ds-accent)' }}>DESC</span>;
                      </div>
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      <div
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-white"
                        style={{ background: 'var(--ds-accent)' }}
                      >
                        <Play className="h-3 w-3" />
                        Run
                      </div>
                      <div
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-content-2"
                        style={{ background: 'var(--ds-base-1)' }}
                      >
                        <Sparkles className="h-3 w-3" />
                        Create Insights
                      </div>
                      <div
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-content-2"
                        style={{ background: 'var(--ds-base-1)' }}
                      >
                        <Copy className="h-3 w-3" />
                        Copy SQL
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Input area */}
              <div className="flex-shrink-0 border-t border-border px-4 py-3">
                <div
                  className="flex items-center gap-3 rounded-xl border border-border px-4 py-2.5"
                  style={{ background: 'var(--ds-base-1)' }}
                >
                  <span className="flex-1 text-[13px] text-content-3 select-none">Ask anything about your data…</span>
                  <div
                    className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--ds-accent)' }}
                  >
                    <ArrowRight className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Features ── */}
        <section className="mt-24 grid grid-cols-1 gap-4 md:grid-cols-3">
          {FEATURES.map(({ Icon, title, description }, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              className="rounded-2xl border border-border p-6 transition-colors duration-150 hover:bg-base-1"
              style={{ background: 'var(--ds-base-0)', boxShadow: 'var(--ds-shadow-sm)' }}
            >
              <div
                className="mb-4 h-10 w-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(37,99,235,0.10)' }}
              >
                <Icon className="h-5 w-5 text-brand" />
              </div>
              <h3 className="text-[15px] font-semibold text-content-1">{title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-content-3">{description}</p>
            </motion.div>
          ))}
        </section>

        {/* ── CTA banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mt-20 rounded-2xl border border-border p-10 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(37,99,235,0.02) 100%)',
            borderColor: 'rgba(37,99,235,0.15)',
          }}
        >
          <h2 className="text-[28px] font-bold tracking-tight text-content-1">
            Ready to talk to your data?
          </h2>
          <p className="mt-3 text-[15px] text-content-3">
            Connect your database and run your first query in under 2 minutes.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 items-center justify-center">
            <Link
              href="/sign-up"
              className="group inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[14px] font-semibold text-white transition-all shadow-md hover:opacity-90"
              style={{ background: 'var(--ds-accent)' }}
            >
              Get started free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <p className="mt-4 text-[12px] text-content-3 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            No credit card required
          </p>
        </motion.div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border" style={{ background: 'var(--ds-base-1)' }}>
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-6 text-[12px] text-content-3 sm:flex-row">
          <div className="flex items-center gap-2">
            <div
              className="h-5 w-5 rounded-md flex items-center justify-center"
              style={{ background: 'var(--ds-accent)' }}
            >
              <Database className="h-3 w-3 text-white" />
            </div>
            <span className="font-semibold text-content-2">Intelliquery</span>
            <span className="text-content-3">· © 2025 All rights reserved</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-content-1 transition-colors">Privacy</a>
            <a href="#" className="hover:text-content-1 transition-colors">Terms</a>
            <a href="#" className="hover:text-content-1 transition-colors">Documentation</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
