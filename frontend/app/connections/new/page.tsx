"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createConnection, testConnection } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import {
  Database,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Server,
  Cloud,
  Box,
  Link2,
  Sliders,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  AlertTriangle,
  Sparkles,
  FileText,
  Zap,
} from "lucide-react";
import Link from "next/link";

/* ── DB types ─────────────────────────────────────────────── */

const DB_TYPES = [
  { id: "postgres",   label: "PostgreSQL",   color: "#336791", abbr: "PG"  },
  { id: "mysql",      label: "MySQL",        color: "#e48e00", abbr: "MY"  },
  { id: "sqlite",     label: "SQLite",       color: "#0f80cc", abbr: "SL"  },
  { id: "mariadb",    label: "MariaDB",      color: "#c0765a", abbr: "MD"  },
  { id: "mssql",      label: "SQL Server",   color: "#cc2927", abbr: "MS"  },
  { id: "bigquery",   label: "BigQuery",     color: "#4285f4", abbr: "BQ"  },
  { id: "snowflake",  label: "Snowflake",    color: "#29b5e8", abbr: "SF"  },
  { id: "cockroach",  label: "CockroachDB",  color: "#6933ff", abbr: "CR"  },
] as const;

type DbTypeId = (typeof DB_TYPES)[number]["id"];

type HostType    = "cloud" | "local" | "docker";
type ConnMethod  = "url" | "manual";
type SchemaMode  = "direct" | "paste" | "ai";

interface FormState {
  name:        string;
  dbType:      DbTypeId;
  hostType:    HostType;
  connMethod:  ConnMethod;
  url:         string;
  host:        string;
  port:        string;
  username:    string;
  password:    string;
  dbName:      string;
  useSsl:      boolean;
  schemaMode:  SchemaMode;
  pastedSchema: string;
  aiDescription: string;
}

interface SchemaTable {
  name:    string;
  columns: { name: string; type: string; sensitive: boolean }[];
  included: boolean;
}

const DEFAULT_PORTS: Record<string, string> = {
  postgres: "5432", mysql: "3306", mariadb: "3306", mssql: "1433",
  sqlite: "", bigquery: "", snowflake: "", cockroach: "26257",
};

const SENSITIVE_PATTERNS = /^(password|passwd|pwd|secret|token|key|hash|salt|api_key|auth)/i;

/* ── Step indicator ───────────────────────────────────────── */

const STEPS = ["Database", "Connection", "Schema access", "Review"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-10">
      {STEPS.map((label, i) => {
        const done    = i < current;
        const active  = i === current;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={[
                  "h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-semibold transition-colors duration-200",
                  done   ? "text-white"   : "",
                  active ? "text-white ring-4 ring-[var(--ds-accent)]/20" : "",
                  !done && !active ? "text-content-3" : "",
                ].join(" ")}
                style={{
                  background: done
                    ? "var(--ds-success)"
                    : active
                      ? "var(--ds-accent)"
                      : "var(--ds-base-3)",
                }}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <p className={[
                "mt-1.5 text-[11px] font-medium whitespace-nowrap hidden sm:block",
                active ? "text-content-1" : "text-content-3",
              ].join(" ")}>
                {label}
              </p>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="w-14 h-0.5 mx-1 mb-5 transition-colors duration-300"
                style={{ background: done ? "var(--ds-success)" : "var(--ds-border-subtle)" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Field ────────────────────────────────────────────────── */

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-semibold text-content-2">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-content-3">{hint}</p>}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  const [showPass, setShowPass] = useState(false);
  const isPass = type === "password";

  return (
    <div className="relative">
      <input
        type={isPass && !showPass ? "password" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full h-10 px-3 rounded-lg text-[13px] text-content-1 placeholder:text-content-3 outline-none transition-[border-color] focus:border-[var(--ds-border-accent)] disabled:opacity-50"
        style={{
          background: "var(--ds-base-0)",
          border: "1px solid var(--ds-border-subtle)",
          boxShadow: "var(--ds-shadow-inset)",
        }}
      />
      {isPass && (
        <button
          type="button"
          onClick={() => setShowPass(!showPass)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-content-3 hover:text-content-1 transition-colors"
        >
          {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────── */

export default function NewConnectionPage() {
  const router = useRouter();
  const { addConnection } = useStore();

  const [step, setStep]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [done, setDone]     = useState(false);

  const [form, setForm] = useState<FormState>({
    name:          "",
    dbType:        "postgres",
    hostType:      "cloud",
    connMethod:    "url",
    url:           "",
    host:          "localhost",
    port:          "5432",
    username:      "",
    password:      "",
    dbName:        "",
    useSsl:        false,
    schemaMode:    "direct",
    pastedSchema:  "",
    aiDescription: "",
  });

  /* Schema review state */
  const [schemaTables, setSchemaTables] = useState<SchemaTable[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaError, setSchemaError] = useState("");

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  /* URL auto-parse */
  const handleUrlChange = (url: string) => {
    set({ url });
    try {
      if (url.includes("://")) {
        const parsed = new URL(url);
        let scheme = parsed.protocol.replace(":", "");
        if (scheme === "postgresql") scheme = "postgres";
        if (["postgres", "mysql", "mariadb", "mssql"].includes(scheme)) {
          set({
            url,
            dbType:   scheme as DbTypeId,
            host:     parsed.hostname || form.host,
            port:     parsed.port || DEFAULT_PORTS[scheme],
            username: parsed.username || form.username,
            password: parsed.password || form.password,
            dbName:   parsed.pathname.replace("/", "") || form.dbName,
            useSsl:   parsed.searchParams.get("sslmode") === "require" || form.useSsl,
          });
        }
      }
    } catch {}
  };

  /* Build connection payload */
  const buildPayload = () => ({
    name:       form.name || `${form.dbType} database`,
    db_type:    form.dbType,
    host:       form.connMethod === "url" ? undefined : form.host,
    port:       form.connMethod === "url" ? undefined : parseInt(form.port),
    username:   form.connMethod === "url" ? undefined : form.username,
    password:   form.connMethod === "url" ? undefined : form.password,
    db_name:    form.connMethod === "url" ? undefined : form.dbName,
    connection_string: form.connMethod === "url" ? form.url : undefined,
    use_ssl:    form.useSsl,
  });

  /* Step 3 → test connection and fetch schema */
  const loadSchema = async () => {
    setSchemaLoading(true);
    setSchemaError("");
    try {
      const result = await testConnection(buildPayload());
      const rawTables: Record<string, any> = result.tables || result.schema || {};
      const tables: SchemaTable[] = Object.entries(rawTables).map(([tbl, cols]: [string, any]) => ({
        name:     tbl,
        included: true,
        columns:  Object.entries(cols || {}).map(([col, meta]: [string, any]) => ({
          name:      col,
          type:      typeof meta === "object" ? meta.type || "" : String(meta),
          sensitive: SENSITIVE_PATTERNS.test(col),
        })),
      }));
      setSchemaTables(tables);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || "Failed to connect. Check your credentials.";
      setSchemaError(detail);
    } finally {
      setSchemaLoading(false);
    }
  };

  const goNext = async () => {
    setError("");
    if (step === 2 && form.schemaMode === "direct") {
      await loadSchema();
      if (!schemaError) setStep(3);
      return;
    }
    if (step < 3) { setStep((s) => s + 1); return; }
    // Final save
    setLoading(true);
    try {
      const conn = await createConnection({
        ...buildPayload(),
        schema_mode:   form.schemaMode,
        pasted_schema: form.pastedSchema,
        ai_description: form.aiDescription,
      });
      addConnection(conn);
      setDone(true);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to save connection.");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => setStep((s) => Math.max(0, s - 1));

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-0 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="mx-auto mb-6 h-20 w-20 rounded-full flex items-center justify-center"
            style={{ background: "var(--ds-success-muted)", border: "2px solid var(--ds-success-border)" }}>
            <Check className="h-10 w-10 text-success" />
          </div>
          <h1 className="text-[24px] font-bold text-content-1">Connected!</h1>
          <p className="mt-2 text-[14px] text-content-3">
            Your database is ready. Start exploring with natural language queries.
          </p>
          <Button
            className="mt-8 w-full gap-2"
            onClick={() => router.push("/")}
          >
            <Sparkles className="h-4 w-4" />
            Start Querying
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-0 flex flex-col">
      {/* Top bar */}
      <header
        className="flex items-center h-12 px-6 border-b border-border flex-shrink-0"
        style={{ background: "var(--ds-base-1)" }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-6 w-6 rounded-md bg-brand flex items-center justify-center">
            <Database className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-content-1">Intelliquery</span>
        </Link>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-4 py-12 overflow-y-auto">
        <div className="w-full max-w-xl">

          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] text-content-3 hover:text-content-1 transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>

          <div className="mb-8">
            <h1 className="text-[22px] font-bold text-content-1">Add a database</h1>
            <p className="text-[14px] text-content-3 mt-1">Connect your database to start querying with natural language.</p>
          </div>

          <StepIndicator current={step} />

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
            >

              {/* ── Step 0: Choose DB ── */}
              {step === 0 && (
                <div className="space-y-6">
                  <h2 className="text-[16px] font-semibold text-content-1">Choose your database</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {DB_TYPES.map((db) => (
                      <button
                        key={db.id}
                        type="button"
                        onClick={() => set({ dbType: db.id, port: DEFAULT_PORTS[db.id] })}
                        className={[
                          "flex flex-col items-center gap-3 p-4 rounded-xl border transition-all duration-[100ms]",
                          form.dbType === db.id
                            ? "border-[var(--ds-accent)] shadow-[0_0_0_2px_var(--ds-accent)]/20"
                            : "border-border hover:border-[var(--ds-border-moderate)] hover:bg-base-1",
                        ].join(" ")}
                        style={form.dbType === db.id ? { background: `${db.color}0a` } : {}}
                      >
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center text-[13px] font-bold text-white"
                          style={{ background: db.color }}
                        >
                          {db.abbr}
                        </div>
                        <span className="text-[12px] font-medium text-content-1 text-center">{db.label}</span>
                        {form.dbType === db.id && (
                          <Check className="h-3.5 w-3.5 text-[var(--ds-accent)]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Step 1: Connection details ── */}
              {step === 1 && (
                <div className="space-y-6">
                  <h2 className="text-[16px] font-semibold text-content-1">Connection details</h2>

                  <Field label="Connection name">
                    <TextInput
                      value={form.name}
                      onChange={(v) => set({ name: v })}
                      placeholder={`My ${DB_TYPES.find((d) => d.id === form.dbType)?.label} database`}
                    />
                  </Field>

                  {/* Host type */}
                  <Field label="Where is it hosted?">
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { id: "cloud",  label: "Cloud",  Icon: Cloud  },
                        { id: "local",  label: "Local",  Icon: Server },
                        { id: "docker", label: "Docker", Icon: Box    },
                      ] as const).map(({ id, label, Icon }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => set({ hostType: id })}
                          className={[
                            "flex flex-col items-center gap-2 p-3 rounded-xl border text-[12px] font-medium transition-all",
                            form.hostType === id
                              ? "border-[var(--ds-accent)] text-brand"
                              : "border-border text-content-2 hover:border-[var(--ds-border-moderate)] hover:bg-base-1",
                          ].join(" ")}
                          style={form.hostType === id ? { background: "var(--ds-brand-subtle)" } : {}}
                        >
                          <Icon className="h-5 w-5" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </Field>

                  {/* Connection method tabs */}
                  <Field label="How would you like to connect?">
                    <div className="flex gap-2 mb-4">
                      {([
                        { id: "url",    label: "Connection URL", Icon: Link2   },
                        { id: "manual", label: "Manual config",  Icon: Sliders },
                      ] as const).map(({ id, label, Icon }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => set({ connMethod: id })}
                          className={[
                            "flex items-center gap-2 px-4 py-2.5 rounded-lg border text-[13px] font-medium transition-all flex-1",
                            form.connMethod === id
                              ? "border-[var(--ds-accent)] text-brand"
                              : "border-border text-content-2 hover:border-[var(--ds-border-moderate)]",
                          ].join(" ")}
                          style={form.connMethod === id ? { background: "var(--ds-brand-subtle)" } : {}}
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                        </button>
                      ))}
                    </div>

                    {form.connMethod === "url" ? (
                      <TextInput
                        value={form.url}
                        onChange={handleUrlChange}
                        placeholder={`${form.dbType === "postgres" ? "postgresql" : form.dbType}://user:pass@host:5432/dbname`}
                      />
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <Field label="Host">
                              <TextInput value={form.host} onChange={(v) => set({ host: v })} placeholder="localhost" />
                            </Field>
                          </div>
                          <Field label="Port">
                            <TextInput value={form.port} onChange={(v) => set({ port: v })} placeholder="5432" />
                          </Field>
                        </div>
                        <Field label="Username">
                          <TextInput value={form.username} onChange={(v) => set({ username: v })} placeholder="postgres" />
                        </Field>
                        <Field label="Password">
                          <TextInput value={form.password} onChange={(v) => set({ password: v })} type="password" />
                        </Field>
                        <Field label="Database name">
                          <TextInput value={form.dbName} onChange={(v) => set({ dbName: v })} placeholder="my_database" />
                        </Field>
                      </div>
                    )}
                  </Field>

                  {/* SSL */}
                  <button
                    type="button"
                    onClick={() => set({ useSsl: !form.useSsl })}
                    className="flex items-center gap-3 text-[13px] text-content-2 hover:text-content-1 transition-colors"
                  >
                    <div
                      className={[
                        "h-4 w-4 rounded border flex items-center justify-center transition-colors",
                        form.useSsl ? "border-[var(--ds-accent)]" : "border-border",
                      ].join(" ")}
                      style={form.useSsl ? { background: "var(--ds-accent)" } : {}}
                    >
                      {form.useSsl && <Check className="h-3 w-3 text-white" />}
                    </div>
                    Use SSL / TLS
                  </button>
                </div>
              )}

              {/* ── Step 2: Schema access ── */}
              {step === 2 && (
                <div className="space-y-6">
                  <h2 className="text-[16px] font-semibold text-content-1">How should we access your schema?</h2>
                  <p className="text-[13px] text-content-3 -mt-2">
                    The AI uses your schema to generate accurate SQL. Choose how to provide it.
                  </p>

                  <div className="space-y-3">
                    {([
                      {
                        id:    "direct" as SchemaMode,
                        Icon:  Zap,
                        label: "Connect directly",
                        desc:  "Real-time schema access. Best accuracy. Recommended.",
                        color: "var(--ds-accent)",
                      },
                      {
                        id:    "paste" as SchemaMode,
                        Icon:  FileText,
                        label: "Paste schema",
                        desc:  "Paste your DDL or CREATE TABLE statements.",
                        color: "var(--ds-success)",
                      },
                      {
                        id:    "ai" as SchemaMode,
                        Icon:  Sparkles,
                        label: "AI schema parsing",
                        desc:  "Describe your tables in plain English. AI will infer the structure.",
                        color: "#8b5cf6",
                      },
                    ]).map(({ id, Icon, label, desc, color }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => set({ schemaMode: id })}
                        className={[
                          "w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-all duration-[100ms]",
                          form.schemaMode === id
                            ? "border-[var(--ds-accent)] shadow-[0_0_0_1px_var(--ds-accent)]"
                            : "border-border hover:border-[var(--ds-border-moderate)] hover:bg-base-1",
                        ].join(" ")}
                        style={form.schemaMode === id ? { background: `${color}0a` } : {}}
                      >
                        <div
                          className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: `${color}18` }}
                        >
                          <Icon className="h-5 w-5" style={{ color }} />
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-content-1">{label}</p>
                          <p className="text-[12px] text-content-3 mt-0.5">{desc}</p>
                        </div>
                        {form.schemaMode === id && (
                          <Check className="h-4 w-4 ml-auto flex-shrink-0 mt-1" style={{ color: "var(--ds-accent)" }} />
                        )}
                      </button>
                    ))}
                  </div>

                  {form.schemaMode === "paste" && (
                    <Field label="Paste DDL / CREATE TABLE statements">
                      <textarea
                        value={form.pastedSchema}
                        onChange={(e) => set({ pastedSchema: e.target.value })}
                        placeholder={"CREATE TABLE users (\n  id SERIAL PRIMARY KEY,\n  name TEXT NOT NULL,\n  email TEXT UNIQUE\n);"}
                        rows={8}
                        className="w-full px-3 py-2.5 rounded-lg font-mono text-[12px] text-content-1 placeholder:text-content-3 outline-none resize-y"
                        style={{
                          background: "var(--ds-base-0)",
                          border: "1px solid var(--ds-border-subtle)",
                          boxShadow: "var(--ds-shadow-inset)",
                        }}
                      />
                    </Field>
                  )}

                  {form.schemaMode === "ai" && (
                    <Field label="Describe your database" hint="E.g. 'A multi-tenant SaaS with users, organizations, subscriptions, and audit logs'">
                      <textarea
                        value={form.aiDescription}
                        onChange={(e) => set({ aiDescription: e.target.value })}
                        placeholder="Describe your tables and what they store..."
                        rows={5}
                        className="w-full px-3 py-2.5 rounded-lg text-[13px] text-content-1 placeholder:text-content-3 outline-none resize-y"
                        style={{
                          background: "var(--ds-base-0)",
                          border: "1px solid var(--ds-border-subtle)",
                          boxShadow: "var(--ds-shadow-inset)",
                        }}
                      />
                    </Field>
                  )}
                </div>
              )}

              {/* ── Step 3: Schema review ── */}
              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-[16px] font-semibold text-content-1">Review your schema</h2>
                    <p className="text-[13px] text-content-3 mt-1">
                      Uncheck tables or columns you want to hide from the AI (e.g. passwords, PII).
                    </p>
                  </div>

                  {schemaLoading && (
                    <div className="flex items-center gap-3 py-8 justify-center text-content-3">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-[13px]">Connecting and reading schema…</span>
                    </div>
                  )}

                  {schemaError && (
                    <div
                      className="flex items-start gap-3 rounded-xl px-4 py-3 text-[13px] text-error"
                      style={{ background: "var(--ds-error-muted)", border: "1px solid var(--ds-error-border)" }}
                    >
                      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Connection failed</p>
                        <p className="mt-0.5 text-error/80">{schemaError}</p>
                      </div>
                    </div>
                  )}

                  {!schemaLoading && !schemaError && schemaTables.length === 0 && (
                    <div className="text-[13px] text-content-3 text-center py-8">
                      No tables found in the connected database.
                    </div>
                  )}

                  {!schemaLoading && schemaTables.length > 0 && (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                      {schemaTables.map((table, ti) => (
                        <div
                          key={table.name}
                          className="rounded-xl border border-border overflow-hidden"
                          style={{ background: "var(--ds-base-0)", boxShadow: "var(--ds-shadow-sm)" }}
                        >
                          {/* Table header */}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...schemaTables];
                              updated[ti] = { ...updated[ti], included: !updated[ti].included };
                              setSchemaTables(updated);
                            }}
                            className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-base-1 transition-colors"
                            style={{ borderBottom: "1px solid var(--ds-border-subtle)", background: "var(--ds-base-1)" }}
                          >
                            {table.included
                              ? <CheckSquare className="h-4 w-4 text-brand flex-shrink-0" />
                              : <Square className="h-4 w-4 text-content-3 flex-shrink-0" />
                            }
                            <span className="font-mono text-[13px] font-semibold text-content-1">{table.name}</span>
                            <span className="ml-auto text-[11px] text-content-3">{table.columns.length} cols</span>
                          </button>

                          {/* Columns */}
                          {table.included && (
                            <div className="divide-y divide-[var(--ds-border-subtle)]">
                              {table.columns.map((col, ci) => (
                                <button
                                  key={col.name}
                                  type="button"
                                  onClick={() => {
                                    const updated = [...schemaTables];
                                    const cols = [...updated[ti].columns];
                                    cols[ci] = { ...cols[ci], sensitive: !cols[ci].sensitive };
                                    updated[ti] = { ...updated[ti], columns: cols };
                                    setSchemaTables(updated);
                                  }}
                                  className="flex items-center gap-3 w-full px-4 py-2 text-left hover:bg-base-1 transition-colors"
                                >
                                  {!col.sensitive
                                    ? <CheckSquare className="h-3.5 w-3.5 text-success flex-shrink-0" />
                                    : <Square className="h-3.5 w-3.5 text-content-3 flex-shrink-0" />
                                  }
                                  <span className="font-mono text-[12px] text-content-1 flex-1">{col.name}</span>
                                  <span className="font-mono text-[10px] text-content-3">{col.type}</span>
                                  {col.sensitive && (
                                    <span
                                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded ml-2"
                                      style={{ background: "var(--ds-warning-muted)", color: "var(--ds-warning)" }}
                                    >
                                      hidden
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Non-direct schema modes: skip review */}
                  {form.schemaMode !== "direct" && (
                    <div
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] text-content-2"
                      style={{ background: "var(--ds-base-2)", border: "1px solid var(--ds-border-subtle)" }}
                    >
                      <Check className="h-4 w-4 text-success flex-shrink-0" />
                      Schema provided — ready to save.
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          </AnimatePresence>

          {/* Error */}
          {error && (
            <div
              className="mt-4 flex items-start gap-3 rounded-xl px-4 py-3 text-[13px] text-error"
              style={{ background: "var(--ds-error-muted)", border: "1px solid var(--ds-error-border)" }}
            >
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <Button
              variant="outline"
              onClick={step === 0 ? () => router.push("/") : goBack}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {step === 0 ? "Cancel" : "Back"}
            </Button>

            <Button
              onClick={goNext}
              disabled={loading || schemaLoading || (step === 3 && !!schemaError)}
              className="gap-2"
            >
              {loading || schemaLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : step === 3 ? (
                <>
                  <Check className="h-4 w-4" />
                  Save & Finish
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
