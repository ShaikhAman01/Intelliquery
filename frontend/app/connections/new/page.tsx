"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createConnection, testConnection } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import {
  Database, ArrowLeft, ArrowRight, Check, Loader2,
  Server, Cloud, Box, Link2, Sliders, Eye, EyeOff,
  AlertTriangle, Sparkles, FileText, Zap, Lock, Copy, Shield,
} from "lucide-react";
import Link from "next/link";

/* ── DB types ─────────────────────────────────────────────── */

const DB_TYPES = [
  { id: "postgres",  label: "PostgreSQL",  color: "#336791", abbr: "PG" },
  { id: "mysql",     label: "MySQL",       color: "#e48e00", abbr: "MY" },
  { id: "sqlite",    label: "SQLite",      color: "#0f80cc", abbr: "SL" },
  { id: "mariadb",   label: "MariaDB",     color: "#c0765a", abbr: "MD" },
  { id: "mssql",     label: "SQL Server",  color: "#cc2927", abbr: "MS" },
  { id: "bigquery",  label: "BigQuery",    color: "#4285f4", abbr: "BQ" },
  { id: "snowflake", label: "Snowflake",   color: "#29b5e8", abbr: "SF" },
  { id: "cockroach", label: "CockroachDB", color: "#6933ff", abbr: "CR" },
] as const;

type DbTypeId   = (typeof DB_TYPES)[number]["id"];
type HostType   = "cloud" | "local" | "docker";
type ConnMethod = "url" | "manual";
type SchemaMode = "direct" | "paste" | "ai";

interface FormState {
  name:          string;
  dbType:        DbTypeId;
  hostType:      HostType;
  connMethod:    ConnMethod;
  url:           string;
  host:          string;
  port:          string;
  username:      string;
  password:      string;
  dbName:        string;
  useSsl:        boolean;
  schemaMode:    SchemaMode;
  pastedSchema:  string;
  aiDescription: string;
}

interface SchemaTable {
  name:     string;
  columns:  { name: string; type: string; isPk: boolean; fkTarget: string | null; sensitive: boolean }[];
  included: boolean;
}

const SENSITIVE_PATTERNS = /^(password|passwd|pwd|secret|token|key|hash|salt|api_key|auth)/i;

const DEFAULT_PORTS: Record<string, string> = {
  postgres: "5432", mysql: "3306", mariadb: "3306", mssql: "1433",
  sqlite: "", bigquery: "", snowflake: "", cockroach: "26257",
};

function extractErrorMessage(err: any, fallback: string): string {
  const detail = err?.response?.data?.detail;
  if (!detail) return err?.message || fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e: any) => e.msg || String(e)).join("; ");
  if (typeof detail === "object") return detail.msg || detail.message || fallback;
  return fallback;
}

function getSchemaScript(dbType: DbTypeId): string {
  switch (dbType) {
    case "postgres":
    case "cockroach":
      return `SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;`;
    case "mysql":
    case "mariadb":
      return `SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name,
       DATA_TYPE AS data_type, IS_NULLABLE AS is_nullable
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME, ORDINAL_POSITION;`;
    case "mssql":
      return `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo'
ORDER BY TABLE_NAME, ORDINAL_POSITION;`;
    case "sqlite":
      return `-- List all tables:
SELECT name FROM sqlite_master WHERE type = 'table';

-- For each table, get its columns:
PRAGMA table_info(<table_name>);`;
    case "bigquery":
      return `SELECT table_name, column_name, data_type
FROM \`your_project.your_dataset\`.INFORMATION_SCHEMA.COLUMNS
ORDER BY table_name, ordinal_position;`;
    case "snowflake":
      return `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = CURRENT_SCHEMA()
ORDER BY TABLE_NAME, ORDINAL_POSITION;`;
    default:
      return `SELECT table_name, column_name, data_type
FROM information_schema.columns
ORDER BY table_name, ordinal_position;`;
  }
}

/* ── Step indicator ───────────────────────────────────────── */

const STEPS = ["Database", "Details", "Access", "Setup", "Review"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center mb-10">
      {STEPS.map((label, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-semibold transition-all duration-200"
                style={{
                  background: done ? "var(--ds-success)" : active ? "var(--ds-accent)" : "var(--ds-base-3)",
                  color: done || active ? "white" : "var(--ds-text-3)",
                  boxShadow: active ? "0 0 0 4px color-mix(in srgb, var(--ds-accent) 20%, transparent)" : undefined,
                }}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
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
                className="flex-1 h-0.5 mx-2 mb-5 transition-colors duration-300"
                style={{ background: done ? "var(--ds-success)" : "var(--ds-border-subtle)" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────── */

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[13px] font-medium text-content-2">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-content-3 leading-relaxed">{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  const isPass = type === "password";
  return (
    <div className="relative">
      <input
        type={isPass && !show ? "password" : "text"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full h-10 px-3 rounded-lg text-[13px] text-content-1 placeholder:text-content-3 outline-none transition-[border-color] focus:border-[var(--ds-accent)] disabled:opacity-50"
        style={{ background: "var(--ds-base-0)", border: "1px solid var(--ds-border-subtle)", boxShadow: "var(--ds-shadow-inset)" }}
      />
      {isPass && (
        <button type="button" onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-content-3 hover:text-content-1 transition-colors">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" onClick={onChange}
      className="flex items-center gap-3 text-[13px] text-content-2 hover:text-content-1 transition-colors">
      <div
        className="h-4 w-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
        style={checked
          ? { background: "var(--ds-accent)", border: "1.5px solid var(--ds-accent)" }
          : { background: "var(--ds-base-0)", border: "1.5px solid var(--ds-border-moderate)" }
        }
      >
        {checked && <Check className="h-3 w-3 text-white" />}
      </div>
      {label}
    </button>
  );
}

/* ── Page ─────────────────────────────────────────────────── */

export default function NewConnectionPage() {
  const router = useRouter();
  const { addConnection } = useStore();

  const [step, setStep]       = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [done, setDone]       = useState(false);
  const [copied, setCopied]   = useState(false);

  const [form, setForm] = useState<FormState>({
    name: "", dbType: "postgres", hostType: "cloud", connMethod: "url",
    url: "", host: "localhost", port: "5432", username: "", password: "",
    dbName: "", useSsl: false, schemaMode: "direct", pastedSchema: "", aiDescription: "",
  });

  const [schemaTables,  setSchemaTables]  = useState<SchemaTable[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaError,   setSchemaError]   = useState("");

  const set = (patch: Partial<FormState>) => setForm(f => ({ ...f, ...patch }));

  const handleUrlChange = (url: string) => {
    set({ url });
    try {
      if (url.includes("://")) {
        const p = new URL(url);
        let scheme = p.protocol.replace(":", "");
        if (scheme === "postgresql") scheme = "postgres";
        if (["postgres", "mysql", "mariadb", "mssql"].includes(scheme)) {
          set({ url, dbType: scheme as DbTypeId, host: p.hostname || form.host,
            port: p.port || DEFAULT_PORTS[scheme], username: p.username || form.username,
            password: p.password || form.password, dbName: p.pathname.replace("/", "") || form.dbName,
            useSsl: p.searchParams.get("sslmode") === "require" || form.useSsl });
        }
      }
    } catch {}
  };

  /* Build payload — always uses parsed individual fields.
     URL mode auto-populates host/port/user/pass/dbName via handleUrlChange. */
  const buildPayload = () => ({
    name:     form.name || `My ${DB_TYPES.find(d => d.id === form.dbType)?.label}`,
    db_type:  form.dbType,
    host:     form.host,
    port:     form.port,
    username: form.username,
    password: form.password,
    db_name:  form.dbName,
    use_ssl:  form.useSsl,
  });

  /* Test connection and fetch schema — /test now returns {status, schema} */
  const loadSchema = async (): Promise<boolean> => {
    setSchemaLoading(true);
    setSchemaError("");
    try {
      const result = await testConnection({
        db_type:  form.dbType,
        host:     form.host,
        port:     form.port,
        username: form.username,
        password: form.password,
        db_name:  form.dbName,
        use_ssl:  form.useSsl,
      });
      const raw: Record<string, any> = result.schema || {};
      setSchemaTables(Object.entries(raw).map(([tbl, cols]: [string, any]) => ({
        name:     tbl,
        included: true,
        columns:  Object.entries(cols || {}).map(([col, meta]: [string, any]) => ({
          name:      col,
          type:      typeof meta === "object" ? meta.type || "" : String(meta),
          isPk:      typeof meta === "object" ? !!meta.is_pk : false,
          fkTarget:  typeof meta === "object" ? meta.fk_target || null : null,
          sensitive: SENSITIVE_PATTERNS.test(col),
        })),
      })));
      return true;
    } catch (err: any) {
      setSchemaError(extractErrorMessage(err, "Failed to connect. Check your credentials."));
      return false;
    } finally {
      setSchemaLoading(false);
    }
  };

  const canContinue = (): boolean => {
    if (step === 0) return true;
    if (step === 1) return form.name.trim() !== "";
    if (step === 2) return true;
    if (step === 3) {
      if (form.schemaMode === "direct") {
        /* URL mode populates individual fields via handleUrlChange — validate those */
        if (form.connMethod === "url") return form.url.trim() !== "" && form.host.trim() !== "" && form.username.trim() !== "";
        return form.host.trim() !== "" && form.username.trim() !== "" && form.dbName.trim() !== "";
      }
      if (form.schemaMode === "paste") return form.pastedSchema.trim() !== "";
      if (form.schemaMode === "ai")    return form.aiDescription.trim() !== "";
    }
    if (step === 4) return !schemaError;
    return true;
  };

  const goNext = async () => {
    setError("");
    if (step === 3 && form.schemaMode === "direct") {
      const ok = await loadSchema();
      if (ok) setStep(4);
      return;
    }
    if (step === 4) {
      setLoading(true);
      try {
        const excludedTables = schemaTables.filter(t => !t.included).map(t => t.name);
        const excludedColumns: Record<string, string[]> = {};
        for (const t of schemaTables) {
          if (!t.included) continue;
          const hidden = t.columns.filter(c => c.sensitive).map(c => c.name);
          if (hidden.length) excludedColumns[t.name] = hidden;
        }
        const conn = await createConnection({
          ...buildPayload(),
          schema_mode:      form.schemaMode,
          pasted_schema:    form.pastedSchema,
          ai_description:   form.aiDescription,
          excluded_tables:  excludedTables,
          excluded_columns: excludedColumns,
        });
        addConnection(conn);
        setDone(true);
      } catch (err: any) {
        setError(extractErrorMessage(err, "Failed to save connection."));
      } finally {
        setLoading(false);
      }
      return;
    }
    setStep(s => s + 1);
  };

  const copyScript = () => {
    navigator.clipboard.writeText(getSchemaScript(form.dbType));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── Success ── */
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ds-base-0)" }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-sm px-4">
          <div className="mx-auto mb-6 h-20 w-20 rounded-full flex items-center justify-center"
            style={{ background: "var(--ds-success-muted)", border: "2px solid var(--ds-success-border)" }}>
            <Check className="h-10 w-10 text-success" />
          </div>
          <h1 className="text-[24px] font-bold text-content-1">Connected!</h1>
          <p className="mt-2 text-[14px] text-content-3">Your database is ready. Start exploring with natural language queries.</p>
          <Button className="mt-8 w-full gap-2" onClick={() => router.push("/")}>
            <Sparkles className="h-4 w-4" />Start Querying
          </Button>
        </motion.div>
      </div>
    );
  }

  const selectedDb = DB_TYPES.find(d => d.id === form.dbType);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--ds-base-0)" }}>

      {/* Top bar — stable h-14 */}
      <header className="h-14 flex-shrink-0 flex items-center px-6 border-b border-border" style={{ background: "var(--ds-base-1)" }}>
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-brand flex items-center justify-center">
            <Database className="h-4 w-4 text-white" />
          </div>
          <span className="text-[14px] font-semibold text-content-1">Intelliquery</span>
        </Link>
        <div className="flex-1 flex justify-center">
          <span className="text-[14px] font-semibold text-content-2">Add Database</span>
        </div>
        <div className="w-32" />
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-2xl mx-auto px-6 py-10">

          <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-content-3 hover:text-content-1 transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" />Back to dashboard
          </Link>

          <StepIndicator current={step} />

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
              className="space-y-7"
            >

              {/* ── Step 0: Database type ── */}
              {step === 0 && (
                <>
                  <div>
                    <h2 className="text-[20px] font-bold text-content-1">Choose your database</h2>
                    <p className="text-[13px] text-content-3 mt-1">Select the database engine you want to connect.</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {DB_TYPES.map(db => {
                      const isSel = form.dbType === db.id;
                      return (
                        <button key={db.id} type="button"
                          onClick={() => set({ dbType: db.id, port: DEFAULT_PORTS[db.id] })}
                          className="relative flex flex-col items-center gap-3 py-6 px-3 rounded-xl border transition-all duration-[100ms]"
                          style={isSel
                            ? { background: `${db.color}0e`, borderColor: db.color, boxShadow: `0 0 0 2px ${db.color}35` }
                            : { background: "var(--ds-base-0)", borderColor: "var(--ds-border-subtle)" }
                          }
                        >
                          <div className="h-11 w-11 rounded-xl flex items-center justify-center text-[14px] font-bold text-white"
                            style={{ background: db.color }}>
                            {db.abbr}
                          </div>
                          <span className="text-[12px] font-medium text-content-1">{db.label}</span>
                          {isSel && (
                            <div className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full flex items-center justify-center"
                              style={{ background: db.color }}>
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* ── Step 1: Details ── */}
              {step === 1 && (
                <>
                  <div>
                    <h2 className="text-[20px] font-bold text-content-1">Connection details</h2>
                    <p className="text-[13px] text-content-3 mt-1">Give your connection a name and tell us where your database lives.</p>
                  </div>
                  <div className="space-y-5">
                    <Field label="Connection name">
                      <TextInput value={form.name} onChange={v => set({ name: v })}
                        placeholder={`My ${selectedDb?.label ?? "database"}`} />
                    </Field>
                    <Field label="Where is it hosted?">
                      <div className="grid grid-cols-3 gap-3">
                        {([
                          { id: "cloud",  label: "Cloud",  desc: "AWS, GCP, Azure…", Icon: Cloud  },
                          { id: "local",  label: "Local",  desc: "Your machine",       Icon: Server },
                          { id: "docker", label: "Docker", desc: "Container",          Icon: Box    },
                        ] as const).map(({ id, label, desc, Icon }) => {
                          const isAct = form.hostType === id;
                          return (
                            <button key={id} type="button" onClick={() => set({ hostType: id })}
                              className="flex flex-col items-center gap-1.5 py-4 rounded-xl border text-center transition-all"
                              style={isAct
                                ? { background: "var(--ds-brand-subtle)", borderColor: "var(--ds-accent)", boxShadow: "0 0 0 1px var(--ds-accent)" }
                                : { background: "var(--ds-base-0)", borderColor: "var(--ds-border-subtle)" }
                              }
                            >
                              <Icon className={["h-5 w-5", isAct ? "text-brand" : "text-content-3"].join(" ")} />
                              <span className={["text-[13px] font-semibold", isAct ? "text-brand" : "text-content-1"].join(" ")}>{label}</span>
                              <span className="text-[11px] text-content-3">{desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </Field>
                  </div>
                </>
              )}

              {/* ── Step 2: Access method ── */}
              {step === 2 && (
                <>
                  <div>
                    <h2 className="text-[20px] font-bold text-content-1">How should we read your schema?</h2>
                    <p className="text-[13px] text-content-3 mt-1">
                      The AI uses your schema to generate accurate SQL. Choose how to provide it.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {([
                      {
                        id:    "direct" as SchemaMode,
                        Icon:  Zap,
                        label: "Connect directly",
                        tag:   "Recommended",
                        desc:  "We connect to your database and read the schema in real-time. Most accurate — the AI always has an up-to-date view of your tables and columns.",
                        hex:   "#2563eb",
                      },
                      {
                        id:    "paste" as SchemaMode,
                        Icon:  FileText,
                        label: "Paste schema",
                        tag:   null,
                        desc:  "We give you a SQL script to run on your database. Paste the output here — no direct access needed. Great for restricted or air-gapped environments.",
                        hex:   "#16a34a",
                      },
                      {
                        id:    "ai" as SchemaMode,
                        Icon:  Sparkles,
                        label: "AI schema parsing",
                        tag:   null,
                        desc:  "Describe your tables in plain English and the AI will infer the structure. Good for prototyping — accuracy is lower since it works from your description, not the real schema.",
                        hex:   "#8b5cf6",
                      },
                    ]).map(({ id, Icon, label, tag, desc, hex }) => {
                      const isSel = form.schemaMode === id;
                      return (
                        <button key={id} type="button" onClick={() => set({ schemaMode: id })}
                          className="w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-all duration-[100ms]"
                          style={isSel
                            ? { background: `${hex}0d`, borderColor: hex, boxShadow: `0 0 0 1px ${hex}` }
                            : { background: "var(--ds-base-0)", borderColor: "var(--ds-border-subtle)" }
                          }
                        >
                          <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ background: `${hex}1a` }}>
                            <Icon className="h-5 w-5" style={{ color: hex }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[14px] font-semibold text-content-1">{label}</p>
                              {tag && (
                                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full text-white"
                                  style={{ background: hex }}>
                                  {tag}
                                </span>
                              )}
                            </div>
                            <p className="text-[12px] text-content-3 mt-1 leading-relaxed">{desc}</p>
                          </div>
                          <div className="h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-all"
                            style={isSel
                              ? { background: hex, borderColor: hex }
                              : { background: "var(--ds-base-0)", borderColor: "var(--ds-border-moderate)" }
                            }
                          >
                            {isSel && <Check className="h-3 w-3 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* ── Step 3: Setup (varies by schema mode) ── */}
              {step === 3 && (
                <>
                  {/* Direct: credentials */}
                  {form.schemaMode === "direct" && (
                    <>
                      <div>
                        <h2 className="text-[20px] font-bold text-content-1">Database credentials</h2>
                        <p className="text-[13px] text-content-3 mt-1">
                          Enter your connection details. We'll connect and read your schema.
                        </p>
                      </div>
                      <div className="flex items-start gap-3 rounded-xl px-4 py-3.5"
                        style={{ background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.15)" }}>
                        <Lock className="h-4 w-4 flex-shrink-0 mt-0.5 text-brand" />
                        <p className="text-[12px] text-content-3 leading-relaxed">
                          Your credentials are <strong className="text-content-2">AES-256 encrypted</strong> at rest and never logged or shared.
                          We recommend using a <strong className="text-content-2">read-only database user</strong> for Intelliquery.
                        </p>
                      </div>

                      {/* URL / Manual toggle */}
                      <div className="flex rounded-xl overflow-hidden border border-border">
                        {([
                          { id: "url",    label: "Connection URL", Icon: Link2   },
                          { id: "manual", label: "Manual config",  Icon: Sliders },
                        ] as const).map(({ id, label, Icon }) => {
                          const isAct = form.connMethod === id;
                          return (
                            <button key={id} type="button" onClick={() => set({ connMethod: id })}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] font-medium transition-colors"
                              style={isAct
                                ? { background: "var(--ds-accent)", color: "white" }
                                : { background: "var(--ds-base-1)", color: "var(--ds-text-3)" }
                              }
                            >
                              <Icon className="h-4 w-4" />{label}
                            </button>
                          );
                        })}
                      </div>

                      {form.connMethod === "url" ? (
                        <Field label="Connection URL" hint="Paste your full connection string — host, port, and credentials are parsed automatically.">
                          <TextInput value={form.url} onChange={handleUrlChange}
                            placeholder={`${form.dbType === "postgres" ? "postgresql" : form.dbType}://user:password@host:port/dbname`} />
                        </Field>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                              <Field label="Host">
                                <TextInput value={form.host} onChange={v => set({ host: v })} placeholder="db.example.com" />
                              </Field>
                            </div>
                            <Field label="Port">
                              <TextInput value={form.port} onChange={v => set({ port: v })} placeholder="5432" />
                            </Field>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <Field label="Username">
                              <TextInput value={form.username} onChange={v => set({ username: v })} placeholder="postgres" />
                            </Field>
                            <Field label="Password">
                              <TextInput value={form.password} onChange={v => set({ password: v })} type="password" />
                            </Field>
                          </div>
                          <Field label="Database name">
                            <TextInput value={form.dbName} onChange={v => set({ dbName: v })} placeholder="my_database" />
                          </Field>
                        </div>
                      )}

                      <Checkbox checked={form.useSsl} onChange={() => set({ useSsl: !form.useSsl })}
                        label="Use SSL / TLS (required for most cloud databases)" />

                      {schemaError && (
                        <div className="flex items-start gap-3 rounded-xl px-4 py-3 text-[13px]"
                          style={{ background: "var(--ds-error-muted)", border: "1px solid var(--ds-error-border)", color: "var(--ds-error)" }}>
                          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold">Connection failed</p>
                            <p className="mt-0.5 opacity-80">{schemaError}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Paste schema */}
                  {form.schemaMode === "paste" && (
                    <>
                      <div>
                        <h2 className="text-[20px] font-bold text-content-1">Paste your schema</h2>
                        <p className="text-[13px] text-content-3 mt-1">
                          Run the SQL script below in your database client and paste the output here.
                        </p>
                      </div>
                      <div className="rounded-xl border border-border overflow-hidden" style={{ boxShadow: "var(--ds-shadow-sm)" }}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border"
                          style={{ background: "var(--ds-base-1)" }}>
                          <div>
                            <p className="text-[13px] font-semibold text-content-1">Run this in your database client</p>
                            <p className="text-[11px] text-content-3 mt-0.5">Works with psql, DBeaver, TablePlus, DataGrip, etc.</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={copyScript} className="h-7 gap-1.5 px-2.5 text-[11px]">
                            {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                            {copied ? "Copied!" : "Copy"}
                          </Button>
                        </div>
                        <pre className="px-4 py-3 font-mono text-[11px] text-content-2 overflow-x-auto custom-scrollbar leading-relaxed"
                          style={{ background: "var(--ds-base-2)" }}>
                          {getSchemaScript(form.dbType)}
                        </pre>
                      </div>
                      <Field label="Paste the output here"
                        hint="Copy the full result from your database client and paste it below. SQL DDL (CREATE TABLE statements) also works.">
                        <textarea
                          value={form.pastedSchema}
                          onChange={e => set({ pastedSchema: e.target.value })}
                          placeholder={"table_name | column_name | data_type | is_nullable\nusers      | id         | integer   | NO\nusers      | email      | text      | NO\n..."}
                          rows={8}
                          className="w-full px-3 py-2.5 rounded-lg font-mono text-[12px] text-content-1 placeholder:text-content-3 outline-none resize-y focus:border-[var(--ds-accent)] transition-[border-color]"
                          style={{ background: "var(--ds-base-0)", border: "1px solid var(--ds-border-subtle)", boxShadow: "var(--ds-shadow-inset)" }}
                        />
                      </Field>
                    </>
                  )}

                  {/* AI parsing */}
                  {form.schemaMode === "ai" && (
                    <>
                      <div>
                        <h2 className="text-[20px] font-bold text-content-1">Describe your database</h2>
                        <p className="text-[13px] text-content-3 mt-1">
                          Tell us about your tables in plain English — the AI will infer the structure.
                        </p>
                      </div>
                      <div className="flex items-start gap-3 rounded-xl px-4 py-4"
                        style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.18)" }}>
                        <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#8b5cf6" }} />
                        <div>
                          <p className="text-[13px] font-semibold text-content-1">How AI schema parsing works</p>
                          <p className="text-[12px] text-content-3 mt-1 leading-relaxed">
                            Our AI reads your description and builds a schema map — table names, column names, types, and relationships.
                            No credentials needed. For best results, mention all your tables, key columns, and foreign key relationships.
                            Query accuracy may be lower than a live-connected schema.
                          </p>
                        </div>
                      </div>
                      <Field label="Database description"
                        hint='Tip: include table names, key columns, and relationships. E.g. "orders has user_id (→ users.id), total_amount, status (pending/paid/shipped)"'>
                        <textarea
                          value={form.aiDescription}
                          onChange={e => set({ aiDescription: e.target.value })}
                          placeholder={"Example:\n\nWe have a SaaS platform with:\n- users: id, email, name, created_at, plan (free/pro)\n- organizations: id, name, owner_id (→ users.id)\n- projects: id, org_id (→ organizations.id), name, status (active/archived)\n- tasks: id, project_id (→ projects.id), title, assignee_id (→ users.id), due_date, done"}
                          rows={9}
                          className="w-full px-3 py-2.5 rounded-lg text-[13px] text-content-1 placeholder:text-content-3 outline-none resize-y focus:border-[var(--ds-accent)] transition-[border-color]"
                          style={{ background: "var(--ds-base-0)", border: "1px solid var(--ds-border-subtle)", boxShadow: "var(--ds-shadow-inset)" }}
                        />
                      </Field>
                    </>
                  )}
                </>
              )}

              {/* ── Step 4: Review ── */}
              {step === 4 && (
                <>
                  <div>
                    <h2 className="text-[20px] font-bold text-content-1">Review your schema</h2>
                    <p className="text-[13px] text-content-3 mt-1">
                      Uncheck tables or columns you want to hide from the AI — e.g. PII, passwords, internal fields.
                    </p>
                  </div>

                  {form.schemaMode === "direct" && (
                    <>
                      {schemaLoading && (
                        <div className="flex flex-col items-center gap-3 py-16 text-content-3">
                          <Loader2 className="h-6 w-6 animate-spin" />
                          <span className="text-[13px]">Reading schema…</span>
                        </div>
                      )}
                      {schemaError && (
                        <div className="flex items-start gap-3 rounded-xl px-4 py-3 text-[13px]"
                          style={{ background: "var(--ds-error-muted)", border: "1px solid var(--ds-error-border)", color: "var(--ds-error)" }}>
                          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold">Schema unavailable</p>
                            <p className="mt-0.5 opacity-80">{schemaError}</p>
                          </div>
                        </div>
                      )}
                      {!schemaLoading && !schemaError && schemaTables.length === 0 && (
                        <p className="py-12 text-center text-[13px] text-content-3">No tables found in this database.</p>
                      )}
                      {!schemaLoading && schemaTables.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-[12px] text-content-3">
                            <strong className="text-content-1 font-semibold">{schemaTables.filter(t => t.included).length}</strong> of{" "}
                            <strong className="text-content-1 font-semibold">{schemaTables.length}</strong> tables included
                            <span className="ml-2">·</span>
                            <span className="ml-2">Click a table to include/exclude it, click a column to hide it from the AI</span>
                          </p>
                          <div className="space-y-2 max-h-[460px] overflow-y-auto custom-scrollbar pr-1">
                            {schemaTables.map((table, ti) => (
                              <div key={table.name} className="rounded-xl border border-border overflow-hidden transition-opacity"
                                style={{ background: "var(--ds-base-0)", boxShadow: "var(--ds-shadow-sm)", opacity: table.included ? 1 : 0.45 }}>
                                {/* Table header — toggle include */}
                                <button type="button"
                                  onClick={() => {
                                    const u = [...schemaTables];
                                    u[ti] = { ...u[ti], included: !u[ti].included };
                                    setSchemaTables(u);
                                  }}
                                  className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-base-2 transition-colors"
                                  style={{ borderBottom: table.included ? "1px solid var(--ds-border-subtle)" : undefined, background: "var(--ds-base-1)" }}>
                                  <div className="h-4 w-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                                    style={table.included
                                      ? { background: "var(--ds-accent)", border: "1.5px solid var(--ds-accent)" }
                                      : { background: "var(--ds-base-0)", border: "1.5px solid var(--ds-border-moderate)" }
                                    }>
                                    {table.included && <Check className="h-3 w-3 text-white" />}
                                  </div>
                                  <span className="font-mono text-[13px] font-semibold text-content-1 flex-1">{table.name}</span>
                                  <span className="text-[11px] text-content-3 flex-shrink-0">{table.columns.length} columns</span>
                                </button>
                                {/* Columns — toggle hidden */}
                                {table.included && (
                                  <div className="divide-y divide-[var(--ds-border-subtle)]">
                                    {table.columns.map((col, ci) => (
                                      <button key={col.name} type="button"
                                        onClick={() => {
                                          const u = [...schemaTables];
                                          const cols = [...u[ti].columns];
                                          cols[ci] = { ...cols[ci], sensitive: !cols[ci].sensitive };
                                          u[ti] = { ...u[ti], columns: cols };
                                          setSchemaTables(u);
                                        }}
                                        className="flex items-center gap-2.5 w-full px-4 py-2 text-left hover:bg-base-1 transition-colors">
                                        <div className="h-3.5 w-3.5 rounded flex items-center justify-center flex-shrink-0 transition-all"
                                          style={!col.sensitive
                                            ? { background: "var(--ds-success)", border: "1.5px solid var(--ds-success)" }
                                            : { background: "var(--ds-base-0)", border: "1.5px solid var(--ds-border-moderate)" }
                                          }>
                                          {!col.sensitive && <Check className="h-2.5 w-2.5 text-white" />}
                                        </div>
                                        <span className="font-mono text-[12px] text-content-1 flex-1">{col.name}</span>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                          {col.isPk && (
                                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                              style={{ background: "rgba(37,99,235,0.1)", color: "var(--ds-accent)" }}>PK</span>
                                          )}
                                          {col.fkTarget && (
                                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                              style={{ background: "rgba(139,92,246,0.1)", color: "#8b5cf6" }}
                                              title={`→ ${col.fkTarget}`}>FK</span>
                                          )}
                                          <span className="font-mono text-[10px] text-content-3">{col.type}</span>
                                          {col.sensitive && (
                                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                              style={{ background: "var(--ds-warning-muted)", color: "var(--ds-warning)" }}>hidden</span>
                                          )}
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {form.schemaMode !== "direct" && (
                    <div className="flex items-center gap-3 rounded-xl px-4 py-4"
                      style={{ background: "var(--ds-success-muted)", border: "1px solid var(--ds-success-border)" }}>
                      <Check className="h-5 w-5 text-success flex-shrink-0" />
                      <div>
                        <p className="text-[13px] font-semibold text-content-1">Schema provided</p>
                        <p className="text-[12px] text-content-3 mt-0.5">
                          {form.schemaMode === "paste"
                            ? "Your pasted schema will be used to generate SQL queries."
                            : "AI will use your description to infer the schema structure."}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

            </motion.div>
          </AnimatePresence>

          {/* Global error */}
          {error && (
            <div className="mt-5 flex items-start gap-3 rounded-xl px-4 py-3 text-[13px]"
              style={{ background: "var(--ds-error-muted)", border: "1px solid var(--ds-error-border)", color: "var(--ds-error)" }}>
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <Button variant="outline"
              onClick={step === 0 ? () => router.push("/") : () => setStep(s => Math.max(0, s - 1))}
              className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {step === 0 ? "Cancel" : "Back"}
            </Button>

            <Button onClick={goNext} disabled={!canContinue() || loading || schemaLoading} className="gap-2">
              {loading || schemaLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" />
                  {schemaLoading ? "Testing connection…" : "Saving…"}</>
              ) : step === 4 ? (
                <><Shield className="h-4 w-4" />Save & Connect</>
              ) : step === 3 && form.schemaMode === "direct" ? (
                <>Test & Continue<ArrowRight className="h-4 w-4" /></>
              ) : (
                <>Continue<ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
