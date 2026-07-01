"use client";

import { useSession } from "@/lib/use-auth";
import { LandingPage } from "@/components/Landing/landing-page";
import { Header } from "@/components/Layout/Header";
import { Sidebar } from "@/components/Layout/Sidebar";
import { ChatInterface } from "@/components/Chat/ChatInterface";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useStore } from "@/lib/store";
import { getSchema, getHistory, getSnippets, deleteHistory, refreshSchema } from "@/lib/api";
import { type Session, getSessions, getSession, upsertSession, createSessionId } from "@/lib/sessions";
import { useToast } from "@/components/ui/toaster";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Database,
  Bookmark,
  Clock,
  Search,
  Play,
  Trash2,
  FileSearch,
  Copy,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";

/* ── Session gate ─────────────────────────────────────────── */

export default function Dashboard() {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="flex h-[100dvh] w-screen items-center justify-center bg-base-0">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-content-3" />
          <p className="text-[11px] font-medium text-content-3 uppercase tracking-widest">
            Loading
          </p>
        </div>
      </div>
    );
  }

  if (!session) return <LandingPage />;
  return <AppShell userId={(session as any).user?.id ?? ''} />;
}

/* ── App Shell ────────────────────────────────────────────── */

type View = "chat" | "schema" | "snippets" | "history";

function AppShell({ userId }: { userId: string }) {
  const [activeView, setActiveView] = useState<View>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pendingReplay, setPendingReplay] = useState<string | null>(null);
  const [pendingReplayCached, setPendingReplayCached] = useState<{ question: string; sql: string } | null>(null);
  const [chatKey, setChatKey] = useState(0);
  const [recentsKey, setRecentsKey] = useState(0);
  const { toast } = useToast();

  /* ── Session management ──────────────────────────────────── */
  const [currentSessionId, setCurrentSessionId] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pendingRestore, setPendingRestore] = useState<Session | null>(null);

  useEffect(() => {
    setCurrentSessionId(createSessionId());
    setSessions(getSessions(userId));
    if (sessionStorage.getItem('iq_new_connection')) {
      sessionStorage.removeItem('iq_new_connection');
      toast('Database connected — ask your first question below!', 'success');
    }
  }, [toast, userId]);

  const refreshSessions = useCallback(() => setSessions(getSessions(userId)), [userId]);

  const handleQueryComplete = useCallback((question: string, sql: string, connectionId: number) => {
    if (!currentSessionId) return;
    const existing = getSession(userId, currentSessionId);
    const updated: Session = existing
      ? { ...existing, queries: [...existing.queries, { question, sql, timestamp: Date.now() }], updatedAt: Date.now() }
      : { id: currentSessionId, title: question, connectionId, queries: [{ question, sql, timestamp: Date.now() }], updatedAt: Date.now() };
    upsertSession(userId, updated);
    refreshSessions();
  }, [userId, currentSessionId, refreshSessions]);

  const handleRestoreSession = useCallback((sessionId: string) => {
    const session = getSession(userId, sessionId);
    if (!session) return;
    setCurrentSessionId(session.id);
    setPendingRestore(session);
    setChatKey((k) => k + 1);
    setPendingReplay(null);
    setPendingReplayCached(null);
    setActiveView("chat");
  }, []);

  const handleReplay = (question: string) => {
    setPendingReplay(question);
    setActiveView("chat");
  };

  const handleReplayCached = (question: string, sql: string) => {
    setPendingReplayCached({ question, sql });
    setActiveView("chat");
  };

  const handleNewChat = () => {
    setCurrentSessionId(createSessionId());
    setPendingRestore(null);
    setChatKey((k) => k + 1);
    setPendingReplay(null);
    setPendingReplayCached(null);
    setActiveView("chat");
    setRecentsKey((k) => k + 1);
  };

  const handleQueryTable = useCallback((tableName: string) => {
    setPendingReplay(`Show me the top 20 records from "${tableName}"`);
    setActiveView("chat");
  }, []);

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-base-0">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        collapsed={!sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
        onNewChat={handleNewChat}
        sessions={sessions}
        onRestoreSession={handleRestoreSession}
        activeSessionId={currentSessionId}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header activeView={activeView} onViewChange={setActiveView} />
        <main className="relative flex-1 min-h-0 overflow-hidden">
          {activeView === "chat"     && (
            <ChatInterface
              key={chatKey}
              pendingReplay={pendingReplay}
              onReplayConsumed={() => setPendingReplay(null)}
              pendingReplayCached={pendingReplayCached}
              onReplayCachedConsumed={() => setPendingReplayCached(null)}
              pendingRestore={pendingRestore}
              onRestoreConsumed={() => setPendingRestore(null)}
              onQueryComplete={handleQueryComplete}
            />
          )}
          {activeView === "schema"   && <SchemaView onQueryTable={handleQueryTable} />}
          {activeView === "snippets" && <SavedQueriesView onReplay={handleReplay} />}
          {activeView === "history"  && <HistoryView onReplay={handleReplay} />}
        </main>
      </div>
    </div>
  );
}

/* ── Schema Explorer ──────────────────────────────────────── */

function schemaTypeStyle(type: string) {
  const t = (type || "").toLowerCase();
  if (/int|numeric|float|decimal|double|real|serial|bigint|smallint|number/.test(t))
    return { background: "rgba(37,99,235,0.08)", color: "#2563eb", border: "1px solid rgba(37,99,235,0.2)" };
  if (/char|text|varchar|string|uuid|json|xml/.test(t))
    return { background: "rgba(124,58,237,0.08)", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.2)" };
  if (/date|time|timestamp/.test(t))
    return { background: "rgba(5,150,105,0.08)", color: "#059669", border: "1px solid rgba(5,150,105,0.2)" };
  if (/bool/.test(t))
    return { background: "rgba(217,119,6,0.08)", color: "#d97706", border: "1px solid rgba(217,119,6,0.2)" };
  return { background: "var(--ds-base-3)", color: "var(--ds-text-3)", border: "1px solid var(--ds-border-subtle)" };
}

function SchemaView({ onQueryTable }: { onQueryTable?: (tableName: string) => void }) {
  const { activeConnectionId } = useStore();
  const { toast } = useToast();
  const [tables, setTables] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState("");
  const [colSearch, setColSearch] = useState("");

  const loadSchema = useCallback(() => {
    if (!activeConnectionId) return;
    setLoading(true);
    setSelected(null);
    setColSearch("");
    getSchema(activeConnectionId)
      .then((res) => setTables(res.tables || res))
      .catch(() => toast("Failed to load schema.", "error"))
      .finally(() => setLoading(false));
  }, [activeConnectionId, toast]);

  useEffect(() => { loadSchema(); }, [loadSchema]);

  const handleRefresh = async () => {
    if (!activeConnectionId || refreshing) return;
    setRefreshing(true);
    try {
      await refreshSchema(activeConnectionId);
      await loadSchema();
      toast("Schema refreshed.", "success");
    } catch {
      toast("Failed to refresh schema.", "error");
    } finally {
      setRefreshing(false);
    }
  };

  const tableNames = useMemo(() => Object.keys(tables), [tables]);
  const filteredTables = useMemo(
    () => tableNames.filter((t) => !tableSearch || t.toLowerCase().includes(tableSearch.toLowerCase())),
    [tableNames, tableSearch]
  );

  const selectedCols = useMemo(() => {
    if (!selected || !tables[selected]) return [];
    const entries = Object.entries(tables[selected]) as [string, any][];
    if (!colSearch) return entries;
    return entries.filter(([col]) => col.toLowerCase().includes(colSearch.toLowerCase()));
  }, [selected, tables, colSearch]);

  const hasSamples = useMemo(() => {
    if (!selected || !tables[selected]) return false;
    return Object.values(tables[selected]).some((m: any) => m?.samples?.length > 0);
  }, [selected, tables]);

  const copyDDL = () => {
    if (!selected || !tables[selected]) return;
    const cols = Object.entries(tables[selected]).map(([col, meta]: [string, any]) => {
      const type = typeof meta === "string" ? meta : (meta.type || "text");
      const notNull = meta.nullable === false ? " NOT NULL" : "";
      const pk = meta.is_pk ? " PRIMARY KEY" : "";
      return `  ${col} ${type.toUpperCase()}${pk}${notNull}`;
    });
    navigator.clipboard.writeText(`CREATE TABLE "${selected}" (\n${cols.join(",\n")}\n);`);
    toast("CREATE TABLE copied", "success");
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: table list ── */}
      <div className="w-64 flex-shrink-0 border-r border-border flex flex-col overflow-hidden" style={{ background: "var(--ds-base-1)" }}>
        <div className="flex-shrink-0 px-4 py-3.5 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-content-3">Tables</span>
            <div className="flex items-center gap-2">
              {tableNames.length > 0 && (
                <span className="text-[11px] text-content-3">{filteredTables.length} / {tableNames.length}</span>
              )}
              {activeConnectionId && (
                <button
                  onClick={handleRefresh}
                  disabled={refreshing || loading}
                  title="Refresh schema"
                  className="h-5 w-5 flex items-center justify-center rounded text-content-3 hover:text-content-1 hover:bg-base-3 transition-colors disabled:opacity-40"
                >
                  <RotateCcw className={["h-3 w-3", refreshing ? "animate-spin" : ""].join(" ")} />
                </button>
              )}
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-3 pointer-events-none" />
            <input
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Filter tables…"
              className="w-full h-8 pl-8 pr-3 rounded-lg text-[12px] text-content-1 placeholder:text-content-3 outline-none"
              style={{ background: "var(--ds-base-0)", border: "1px solid var(--ds-border-subtle)", boxShadow: "var(--ds-shadow-inset)" }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-content-3" />
            </div>
          ) : !activeConnectionId ? (
            <p className="text-[12px] text-content-3 px-3 py-3">No database connected.</p>
          ) : filteredTables.length === 0 ? (
            <p className="text-[12px] text-content-3 px-3 py-3">{tableSearch ? "No matching tables." : "No tables found."}</p>
          ) : (
            filteredTables.map((tbl) => {
              const colCount = Object.keys(tables[tbl] || {}).length;
              const isActive = selected === tbl;
              return (
                <button
                  key={tbl}
                  onClick={() => { setSelected(tbl); setColSearch(""); }}
                  className={[
                    "w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-2 transition-colors",
                    isActive ? "bg-brand-subtle" : "hover:bg-base-2",
                  ].join(" ")}
                >
                  <span className={["font-mono text-[12px] truncate", isActive ? "text-brand font-semibold" : "text-content-1"].join(" ")}>
                    {tbl}
                  </span>
                  <span
                    className="flex-shrink-0 text-[10px] font-medium tabular-nums px-1.5 py-0.5 rounded"
                    style={{ background: isActive ? "var(--ds-base-0)" : "var(--ds-base-3)", color: "var(--ds-text-3)" }}
                  >
                    {colCount}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right: column detail ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {!activeConnectionId ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState icon={Database} title="No database connected" description="Connect a database to explore its schema."
              action={<Link href="/connections/new"><Button size="sm">Add Database</Button></Link>} />
          </div>
        ) : selected && tables[selected] ? (
          <>
            {/* Detail header */}
            <div
              className="flex-shrink-0 flex items-center justify-between px-6 py-3.5 border-b border-border gap-4"
              style={{ background: "var(--ds-base-1)" }}
            >
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold font-mono text-content-1 truncate">{selected}</h3>
                <p className="text-[12px] text-content-3 mt-0.5">
                  {Object.keys(tables[selected]).length} columns
                  {colSearch && selectedCols.length !== Object.keys(tables[selected]).length && (
                    <span className="ml-1">· {selectedCols.length} shown</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                {/* Column search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-content-3 pointer-events-none" />
                  <input
                    value={colSearch}
                    onChange={(e) => setColSearch(e.target.value)}
                    placeholder="Filter columns…"
                    className="h-7 pl-6 pr-2.5 rounded-lg text-[12px] w-36 text-content-1 placeholder:text-content-3 outline-none transition-colors"
                    style={{ background: "var(--ds-base-0)", border: "1px solid var(--ds-border-subtle)" }}
                  />
                </div>
                <Button
                  variant="outline" size="sm"
                  onClick={() => { navigator.clipboard.writeText(selected); toast("Copied table name", "success"); }}
                  className="h-7 gap-1.5 px-2.5 text-[11px]"
                >
                  <Copy className="h-3 w-3" />
                  Copy name
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={copyDDL}
                  className="h-7 gap-1.5 px-2.5 text-[11px]"
                >
                  <Copy className="h-3 w-3" />
                  DDL
                </Button>
                {onQueryTable && (
                  <Button
                    size="sm"
                    onClick={() => onQueryTable(selected)}
                    className="h-7 gap-1.5 px-2.5 text-[11px]"
                  >
                    <Play className="h-3 w-3" />
                    Query table
                  </Button>
                )}
              </div>
            </div>

            {/* Column table */}
            <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
              {selectedCols.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-[13px] text-content-3">No columns match "{colSearch}"</p>
                </div>
              ) : (
                <table className="w-full text-left text-[12px] border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr style={{ background: "var(--ds-base-2)", borderBottom: "1px solid var(--ds-border-subtle)" }}>
                      {["Column", "Type", "Key / Reference", "Nullable", ...(hasSamples ? ["Sample Values"] : [])].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-[11px] font-semibold text-content-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCols.map(([col, meta]) => {
                      const typeStr = typeof meta === "string" ? meta : (meta.type || "");
                      const typeStyle = schemaTypeStyle(typeStr);
                      const isPk = meta.is_pk;
                      const fkTarget = meta.fk_target;
                      const isNotNull = meta.nullable === false;
                      const samples: string[] = meta.samples || [];
                      return (
                        <tr key={col} className="hover:bg-base-1 transition-colors border-b border-[var(--ds-border-subtle)]">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[12px] font-semibold text-content-1">{col}</span>
                              {isPk && (
                                <span className="text-[9px] font-bold px-1 py-0.5 rounded"
                                  style={{ background: "var(--ds-warning-muted)", color: "var(--ds-warning)", border: "1px solid var(--ds-warning-border)" }}>
                                  PK
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center font-mono text-[11px] font-medium px-2 py-0.5 rounded-md" style={typeStyle}>
                              {typeStr || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {fkTarget ? (
                              <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium px-2 py-0.5 rounded-md"
                                style={{ background: "rgba(124,58,237,0.08)", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.18)" }}>
                                → {fkTarget}
                              </span>
                            ) : (
                              <span className="text-content-3 text-[12px]">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isNotNull ? (
                              <span className="text-[11px] font-mono font-medium text-content-3">NOT NULL</span>
                            ) : (
                              <span className="text-[11px] italic text-content-3">nullable</span>
                            )}
                          </td>
                          {hasSamples && (
                            <td className="px-4 py-3">
                              {samples.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {samples.slice(0, 5).map((v) => (
                                    <span
                                      key={v}
                                      className="inline-block font-mono text-[10px] px-1.5 py-0.5 rounded max-w-[120px] truncate"
                                      style={{ background: "var(--ds-base-3)", color: "var(--ds-text-2)", border: "1px solid var(--ds-border-subtle)" }}
                                      title={v}
                                    >
                                      {v}
                                    </span>
                                  ))}
                                  {samples.length > 5 && (
                                    <span className="text-[10px] text-content-3 self-center">+{samples.length - 5}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-content-3 text-[12px]">—</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={FileSearch}
              title={loading ? "Loading schema…" : "Select a table"}
              description={loading ? "" : "Choose a table from the sidebar to view its columns and types."}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Saved Queries ────────────────────────────────────────── */

function SavedQueriesView({ onReplay }: { onReplay: (q: string) => void }) {
  const { activeConnectionId } = useStore();
  const { toast } = useToast();
  const [snippets, setSnippets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!activeConnectionId) return;
    setLoading(true);
    getSnippets(activeConnectionId)
      .then((res) => setSnippets(res || []))
      .catch(() => toast("Failed to load saved queries.", "error"))
      .finally(() => setLoading(false));
  }, [activeConnectionId, toast]);

  const filtered = snippets.filter((s) =>
    !search || s.title?.toLowerCase().includes(search.toLowerCase()) || s.sql_text?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center gap-4 px-6 py-3.5 border-b border-border"
        style={{ background: "var(--ds-base-1)" }}
      >
        <div className="flex items-center gap-2.5">
          <Bookmark className="h-4 w-4 text-content-3" />
          <h2 className="text-[14px] font-semibold text-content-1">Saved Queries</h2>
          {snippets.length > 0 && (
            <span className="text-[12px] text-content-3">{snippets.length} saved</span>
          )}
        </div>
        <div className="ml-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-3 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search queries…"
            className="h-8 pl-8 pr-3 rounded-lg text-[12px] w-52 text-content-1 placeholder:text-content-3 outline-none"
            style={{ background: "var(--ds-base-0)", border: "1px solid var(--ds-border-subtle)", boxShadow: "var(--ds-shadow-inset)" }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 py-4">
        {!activeConnectionId ? (
          <EmptyState icon={Database} title="No database connected" description="Connect a database to view saved queries."
            action={<Link href="/connections/new"><Button size="sm">Add Database</Button></Link>} />
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-content-3" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title={search ? "No matching queries" : "No saved queries yet"}
            description={search ? "Try a different search term." : "Save SQL snippets from the chat to build your library."}
          />
        ) : (
          <div className="space-y-2.5">
            {filtered.map((snippet: any) => (
              <div
                key={snippet.id}
                className="rounded-xl border border-border overflow-hidden bg-base-0 transition-[border-color] hover:border-[var(--ds-border-moderate)]"
                style={{ boxShadow: "var(--ds-shadow-sm)" }}
              >
                {/* Card header */}
                <div
                  className="flex items-center justify-between px-4 py-3 border-b border-border"
                  style={{ background: "var(--ds-base-1)" }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Bookmark className="h-3.5 w-3.5 text-brand flex-shrink-0" />
                    <h3 className="text-[13px] font-semibold text-content-1 truncate">{snippet.title}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => { navigator.clipboard.writeText(snippet.sql_text); toast("Copied SQL", "success"); }}
                      className="h-7 gap-1.5 px-2.5 text-[11px]"
                    >
                      <Copy className="h-3 w-3" />
                      Copy SQL
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => onReplay(snippet.title)}
                      className="h-7 gap-1.5 px-2.5 text-[11px]"
                    >
                      <Play className="h-3 w-3" />
                      Run
                    </Button>
                  </div>
                </div>
                {/* SQL block — wrapper div owns the scroll so overflow-hidden on the card doesn't fight it */}
                <div className="overflow-x-auto custom-scrollbar" style={{ background: "var(--ds-base-0)" }}>
                  <pre className="px-4 py-3 font-mono text-[11px] text-content-2 leading-relaxed whitespace-pre min-w-max">
                    {snippet.sql_text}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── History ──────────────────────────────────────────────── */

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

function HistoryView({ onReplay }: { onReplay: (q: string) => void }) {
  const { activeConnectionId } = useStore();
  const { toast } = useToast();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!activeConnectionId) return;
    setLoading(true);
    try {
      const res = await getHistory(activeConnectionId, 50, 0);
      setEntries(res.items || []);
    } catch {
      toast("Failed to load history.", "error");
    } finally {
      setLoading(false);
    }
  }, [activeConnectionId, toast]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleDelete = async (id: number) => {
    try {
      await deleteHistory(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch {
      toast("Failed to delete entry.", "error");
    }
  };

  const filtered = entries.filter((e) =>
    !search ||
    e.user_question?.toLowerCase().includes(search.toLowerCase()) ||
    e.generated_sql?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center gap-4 px-6 py-3.5 border-b border-border"
        style={{ background: "var(--ds-base-1)" }}
      >
        <div className="flex items-center gap-2.5">
          <Clock className="h-4 w-4 text-content-3" />
          <h2 className="text-[14px] font-semibold text-content-1">History</h2>
          {entries.length > 0 && (
            <span className="text-[12px] text-content-3">{entries.length} queries</span>
          )}
        </div>
        <div className="ml-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-3 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search history…"
            className="h-8 pl-8 pr-3 rounded-lg text-[12px] w-52 text-content-1 placeholder:text-content-3 outline-none"
            style={{ background: "var(--ds-base-0)", border: "1px solid var(--ds-border-subtle)", boxShadow: "var(--ds-shadow-inset)" }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 py-4">
        {!activeConnectionId ? (
          <EmptyState icon={Database} title="No database connected" description="Connect a database to view query history."
            action={<Link href="/connections/new"><Button size="sm">Add Database</Button></Link>} />
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-content-3" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Clock}
            title={search ? "No matching results" : "No history yet"}
            description={search ? "Try a different search term." : "Your query history will appear here after your first query."}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((entry: any) => {
              const isSuccess = entry.execution_status?.toUpperCase() === "SUCCESS";
              const isExpanded = expandedId === entry.id;
              return (
                <div
                  key={entry.id}
                  className="rounded-xl border border-border bg-base-0 overflow-hidden transition-[border-color] hover:border-[var(--ds-border-moderate)]"
                  style={{ boxShadow: "var(--ds-shadow-sm)" }}
                >
                  {/* Clickable summary row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className="w-full text-left px-4 py-3 flex items-start gap-3"
                  >
                    {/* Status dot */}
                    <div
                      className="mt-[5px] h-2 w-2 rounded-full flex-shrink-0"
                      style={{ background: isSuccess ? "var(--ds-success)" : "var(--ds-error)" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-content-1 leading-snug line-clamp-2">
                        {entry.user_question}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-content-3 flex-wrap">
                        <span
                          className="font-semibold"
                          style={{ color: isSuccess ? "var(--ds-success)" : "var(--ds-error)" }}
                        >
                          {isSuccess ? "success" : "error"}
                        </span>
                        {entry.row_count != null && (
                          <span>{entry.row_count.toLocaleString()} rows</span>
                        )}
                        {entry.execution_time_ms != null && (
                          <span>{entry.execution_time_ms}ms</span>
                        )}
                        <span>{relativeTime(entry.timestamp)}</span>
                      </div>
                    </div>
                    <ChevronDown
                      className={[
                        "h-4 w-4 text-content-3 flex-shrink-0 mt-0.5 transition-transform duration-150",
                        isExpanded ? "rotate-180" : "",
                      ].join(" ")}
                    />
                  </button>

                  {/* Expanded: SQL + actions */}
                  {isExpanded && (
                    <div className="border-t border-border">
                      {entry.generated_sql ? (
                        <pre
                          className="px-4 py-3 font-mono text-[11px] text-content-2 overflow-x-auto custom-scrollbar leading-relaxed"
                          style={{ background: "var(--ds-base-2)" }}
                        >
                          {entry.generated_sql}
                        </pre>
                      ) : (
                        <p className="px-4 py-3 text-[12px] text-content-3 italic" style={{ background: "var(--ds-base-2)" }}>
                          No SQL generated.
                        </p>
                      )}
                      <div
                        className="flex items-center gap-2 px-4 py-2.5 border-t border-border"
                        style={{ background: "var(--ds-base-1)" }}
                      >
                        {entry.generated_sql && (
                          <Button
                            variant="outline" size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(entry.generated_sql);
                              toast("Copied SQL", "success");
                            }}
                            className="h-7 gap-1.5 px-2.5 text-[11px]"
                          >
                            <Copy className="h-3 w-3" />
                            Copy SQL
                          </Button>
                        )}
                        {entry.user_question && (
                          <Button
                            variant="outline" size="sm"
                            onClick={(e) => { e.stopPropagation(); onReplay(entry.user_question); }}
                            className="h-7 gap-1.5 px-2.5 text-[11px]"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Replay
                          </Button>
                        )}
                        <Button
                          variant="ghost" size="sm"
                          onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                          className="h-7 gap-1.5 px-2.5 text-[11px] ml-auto text-error hover:bg-[var(--ds-error-muted)] hover:text-error"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
