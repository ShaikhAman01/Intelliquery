"use client";

import { useSession } from "@/lib/use-auth";
import { LandingPage } from "@/components/Landing/landing-page";
import { Header } from "@/components/Layout/Header";
import { Sidebar } from "@/components/Layout/Sidebar";
import { ChatInterface } from "@/components/Chat/ChatInterface";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useStore } from "@/lib/store";
import { getSchema, getHistory, getSnippets, deleteHistory } from "@/lib/api";
import { useToast } from "@/components/ui/toaster";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Database,
  Compass,
  Bookmark,
  Clock,
  Search,
  ChevronRight,
  Play,
  Trash2,
  FileSearch,
  MoreHorizontal,
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
  return <AppShell />;
}

/* ── App Shell ────────────────────────────────────────────── */

type View = "chat" | "schema" | "snippets" | "history";

function AppShell() {
  const [activeView, setActiveView] = useState<View>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-base-0">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        collapsed={!sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header activeView={activeView} onViewChange={setActiveView} />
        <main className="relative flex-1 min-h-0 overflow-hidden">
          {activeView === "chat"     && <ChatInterface />}
          {activeView === "schema"   && <SchemaView />}
          {activeView === "snippets" && <SavedQueriesView />}
          {activeView === "history"  && <HistoryView />}
        </main>
      </div>
    </div>
  );
}

/* ── Schema Explorer ──────────────────────────────────────── */

function SchemaView() {
  const { activeConnectionId } = useStore();
  const { toast } = useToast();
  const [tables, setTables] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!activeConnectionId) return;
    setLoading(true);
    getSchema(activeConnectionId)
      .then((res) => setTables(res.tables || res))
      .catch(() => toast("Failed to load schema.", "error"))
      .finally(() => setLoading(false));
  }, [activeConnectionId, toast]);

  const filtered = useMemo(
    () => Object.keys(tables).filter((t) => !search || t.toLowerCase().includes(search.toLowerCase())),
    [tables, search]
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 border-b border-border px-6 py-4" style={{ background: "var(--ds-base-1)" }}>
        <div className="flex items-center gap-3">
          <Compass className="h-5 w-5 text-content-3" />
          <div>
            <h2 className="text-[14px] font-semibold text-content-1">Schema Explorer</h2>
            <p className="text-[12px] text-content-3 mt-0.5">Browse tables, columns, and relationships.</p>
          </div>
        </div>
      </div>

      {!activeConnectionId ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState icon={Database} title="No database connected" description="Connect a database to explore its schema."
            action={<Link href="/connections/new"><Button size="sm">Add Database</Button></Link>} />
        </div>
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-content-3" />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Table list */}
          <div className="w-56 flex-shrink-0 border-r border-border flex flex-col overflow-hidden" style={{ background: "var(--ds-base-1)" }}>
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-3 pointer-events-none" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter tables…"
                  className="w-full h-8 pl-8 pr-3 rounded-lg text-[12px] text-content-1 placeholder:text-content-3 outline-none"
                  style={{ background: "var(--ds-base-0)", border: "1px solid var(--ds-border-subtle)", boxShadow: "var(--ds-shadow-inset)" }} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              {filtered.length === 0 ? (
                <p className="text-[12px] text-content-3 px-3 py-2">No tables found.</p>
              ) : (
                filtered.map((tbl) => (
                  <button key={tbl} onClick={() => setSelected(tbl)}
                    className={["w-full text-left px-3 py-2 text-[12px] rounded-lg flex items-center justify-between gap-2 transition-colors",
                      selected === tbl ? "bg-brand-subtle text-brand font-medium" : "text-content-2 hover:text-content-1 hover:bg-base-2",
                    ].join(" ")}>
                    <span className="font-mono truncate">{tbl}</span>
                    <ChevronRight className="h-3 w-3 text-content-3 flex-shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Column detail */}
          <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar p-6">
            {selected && tables[selected] ? (
              <div>
                <div className="mb-5">
                  <h3 className="text-[15px] font-semibold text-content-1 font-mono">{selected}</h3>
                  <p className="text-[12px] text-content-3 mt-0.5">{Object.keys(tables[selected]).length} columns</p>
                </div>
                <div className="rounded-xl border border-border overflow-hidden" style={{ boxShadow: "var(--ds-shadow-sm)" }}>
                  <table className="w-full text-left text-[12px] border-collapse">
                    <thead>
                      <tr className="text-content-3 font-semibold select-none"
                        style={{ background: "var(--ds-base-2)", borderBottom: "1px solid var(--ds-border-subtle)" }}>
                        {["Column", "Type", "Constraints", "Nullable"].map((h) => (
                          <th key={h} className="px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--ds-border-subtle)]">
                      {Object.entries(tables[selected]).map(([col, meta]: [string, any]) => (
                        <tr key={col} className="hover:bg-base-1 transition-colors">
                          <td className="px-4 py-2.5 font-mono font-semibold text-content-1">{col}</td>
                          <td className="px-4 py-2.5 font-mono text-content-3">{meta.type || meta}</td>
                          <td className="px-4 py-2.5 space-x-1">
                            {meta.is_pk && <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold"
                              style={{ background: "var(--ds-warning-muted)", color: "var(--ds-warning)", border: "1px solid var(--ds-warning-border)" }}>PK</span>}
                            {meta.fk_target && <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold"
                              style={{ background: "rgba(124,58,237,0.08)", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.18)" }}>FK</span>}
                            {!meta.is_pk && !meta.fk_target && <span className="text-content-3">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-[11px] font-mono text-content-3">
                            {meta.nullable === false ? "NOT NULL" : "NULLABLE"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <EmptyState icon={FileSearch} title="Select a table" description="Click a table on the left to view its columns." />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Saved Queries ────────────────────────────────────────── */

function SavedQueriesView() {
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
      <div className="flex-shrink-0 border-b border-border px-6 py-4" style={{ background: "var(--ds-base-1)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bookmark className="h-5 w-5 text-content-3" />
            <div>
              <h2 className="text-[14px] font-semibold text-content-1">Saved Queries</h2>
              <p className="text-[12px] text-content-3 mt-0.5">Reusable SQL snippets saved from the chat.</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-3 pointer-events-none" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search snippets…"
              className="h-8 pl-8 pr-3 rounded-lg text-[12px] w-48 text-content-1 placeholder:text-content-3 outline-none"
              style={{ background: "var(--ds-base-0)", border: "1px solid var(--ds-border-subtle)", boxShadow: "var(--ds-shadow-inset)" }} />
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 py-5">
        {!activeConnectionId ? (
          <EmptyState icon={Database} title="No database connected" description="Connect a database to view saved queries."
            action={<Link href="/connections/new"><Button size="sm">Add Database</Button></Link>} />
        ) : loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-content-3" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Bookmark} title={search ? "No matching snippets" : "No saved queries yet"}
            description={search ? "Try a different search term." : "Save SQL snippets from chat to build your library."} />
        ) : (
          <div className="grid grid-cols-1 gap-3 max-w-3xl">
            {filtered.map((snippet: any) => (
              <div key={snippet.id}
                className="rounded-xl border border-border bg-base-0 p-4 hover:border-[var(--ds-border-moderate)] transition-[border-color]"
                style={{ boxShadow: "var(--ds-shadow-sm)" }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-2 flex-1">
                    <h3 className="text-[13px] font-semibold text-content-1">{snippet.title}</h3>
                    <pre className="font-mono text-[11px] text-content-3 bg-base-2 px-3 py-2 rounded-lg border border-border overflow-x-auto">
                      {snippet.sql_text}
                    </pre>
                  </div>
                  <Button size="sm" variant="outline" className="flex-shrink-0 h-8 gap-1.5 text-[12px]">
                    <Play className="h-3 w-3" />
                    Run
                  </Button>
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

function HistoryView() {
  const { activeConnectionId } = useStore();
  const { toast } = useToast();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

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
      setOpenMenuId(null);
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
      <div className="flex-shrink-0 border-b border-border px-6 py-4" style={{ background: "var(--ds-base-1)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-content-3" />
            <div>
              <h2 className="text-[14px] font-semibold text-content-1">History</h2>
              <p className="text-[12px] text-content-3 mt-0.5">Your recent queries and their results.</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-3 pointer-events-none" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search history…"
              className="h-8 pl-8 pr-3 rounded-lg text-[12px] w-48 text-content-1 placeholder:text-content-3 outline-none"
              style={{ background: "var(--ds-base-0)", border: "1px solid var(--ds-border-subtle)", boxShadow: "var(--ds-shadow-inset)" }} />
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 py-5">
        {!activeConnectionId ? (
          <EmptyState icon={Database} title="No database connected" description="Connect a database to view query history."
            action={<Link href="/connections/new"><Button size="sm">Add Database</Button></Link>} />
        ) : loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-content-3" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Clock} title={search ? "No matching results" : "No history yet"}
            description={search ? "Try a different search term." : "Your query history will appear here after your first query."} />
        ) : (
          <div className="space-y-2 max-w-3xl">
            {filtered.map((entry: any) => (
              <div key={entry.id}
                className="relative group rounded-xl border border-border bg-base-0 px-4 py-3 hover:border-[var(--ds-border-moderate)] transition-[border-color]"
                style={{ boxShadow: "var(--ds-shadow-sm)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-content-1 truncate">{entry.user_question}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-content-3 font-mono flex-wrap">
                      <span className={entry.execution_status === "success" ? "text-success font-semibold" : "text-error font-semibold"}>
                        {entry.execution_status}
                      </span>
                      {entry.row_count != null && <span>{entry.row_count} rows</span>}
                      {entry.execution_time_ms != null && <span>{entry.execution_time_ms}ms</span>}
                      <span>{new Date(entry.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setOpenMenuId(openMenuId === entry.id ? null : entry.id)}
                    className="opacity-0 group-hover:opacity-100 h-7 w-7 flex items-center justify-center rounded-lg text-content-3 hover:bg-base-2 hover:text-content-1 transition-all flex-shrink-0"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
                {openMenuId === entry.id && (
                  <div className="absolute right-3 top-10 z-30 w-36 rounded-lg p-1 text-[13px]"
                    style={{ background: "var(--ds-base-2)", border: "1px solid var(--ds-border-moderate)", boxShadow: "var(--ds-shadow-md)" }}>
                    <button onClick={() => handleDelete(entry.id)}
                      className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-error hover:bg-[var(--ds-error-muted)] transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
