"use client";
import { useSession } from "@/lib/use-auth";
import { LandingPage } from "@/components/Landing/landing-page";
import { Header } from "@/components/Layout/Header";
import { Sidebar } from "@/components/Layout/Sidebar";
import { QueryInput } from "@/components/Query/QueryInput";
import { SQLDisplay } from "@/components/Query/SQLDisplay";
import { ResultsPanel } from "@/components/Results/ResultsPanel";
import { InsightsPanel } from "@/components/Results/InsightsPanel";
import { ChartPanel } from "@/components/Chat/Visualizer";
import { AddConnectionDialog } from "@/components/Shared/AddConnectionDialog";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { useStore } from "@/lib/store";
import { api, getSchema, getSnippets } from "@/lib/api";
import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { AnimatePresence, motion } from "motion/react";
import {
  Table,
  BarChart3,
  Sparkles,
  Database,
  Plus,
  Loader2,
  Zap,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Compass,
  Bookmark,
  ChevronRight,
  MessageSquarePlus,
  X,
  FileSearch,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────
   Root — handles session loading and routing
   ──────────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="flex h-[100dvh] w-screen items-center justify-center bg-base-0">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-content-3" />
          <p className="text-[11px] font-medium text-content-3 uppercase tracking-widest">
            Initializing Workspace
          </p>
        </div>
      </div>
    );
  }

  if (!session) return <LandingPage />;
  return <DashboardContent />;
}

/* ─────────────────────────────────────────────────────────────────
   Dashboard Content
   ──────────────────────────────────────────────────────────────── */
function DashboardContent() {
  const { connections, activeConnectionId, isLoading, setLoading } = useStore();
  const { toast } = useToast();

  const [activeView, setActiveView] = useState<'query' | 'schema' | 'snippets'>('query');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState("");
  const [sql, setSql] = useState("");
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [explanation, setExplanation] = useState("");
  const [insights, setInsights] = useState<unknown>(null);
  const [executionTime, setExecutionTime] = useState(0);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("chart");
  const [activeSection, setActiveSection] = useState<"chart" | "results" | "insights" | "explainer">("chart");

  const [tables, setTables] = useState<Record<string, any>>({});
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [snippets, setSnippets] = useState<any[]>([]);
  const [snippetsLoading, setSnippetsLoading] = useState(false);
  const [snippetTitle, setSnippetTitle] = useState("");

  const [chartRec, setChartRec] = useState<
    | { chart_type: "bar" | "line" | "pie" | "kpi" | "area" | "table"; reason?: string }
    | undefined
  >();

  const activeConnection = useMemo(
    () => connections.find((c) => c.id === activeConnectionId),
    [connections, activeConnectionId]
  );
  const queryRef = useRef<HTMLDivElement>(null);
  const sqlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeView === 'schema' && activeConnectionId) {
      setSchemaLoading(true);
      getSchema(activeConnectionId)
        .then((res) => { setTables(res.tables || res); })
        .catch(() => toast("Failed to load schema.", "error"))
        .finally(() => setSchemaLoading(false));
    }
  }, [activeView, activeConnectionId, toast]);

  useEffect(() => {
    if (activeView === 'snippets' && activeConnectionId) {
      setSnippetsLoading(true);
      getSnippets(activeConnectionId)
        .then((res) => { setSnippets(res || []); })
        .catch(() => toast("Failed to load saved queries.", "error"))
        .finally(() => setSnippetsLoading(false));
    }
  }, [activeView, activeConnectionId, toast]);

  const handleSubmit = async () => {
    if (!input.trim() || !activeConnectionId) return;

    setLoading(true);
    setSql("");
    setData([]);
    setExecutionTime(0);
    setError("");

    try {
      const startTime = performance.now();
      const res = await api.post("/query/generate", null, {
        params: { user_query: input, connection_id: activeConnectionId },
      });
      const duration = Math.round(performance.now() - startTime);

      setSql(res.data.sql || "");
      setData(res.data.data || []);
      setExplanation(res.data.explanation || "");
      setChartRec((res.data.chart_recommendation as typeof chartRec) || undefined);
      setExecutionTime(res.data.execution_time_ms || duration);
      setInsights(res.data.visualization || null);

      toast(`Query executed in ${duration}ms`, "success");
      setActiveTab(res.data.data?.length > 0 ? "chart" : "results");
    } catch (err: unknown) {
      let detail = "Something went wrong. Please try again.";
      if (err instanceof Error) {
        detail = err.message;
      } else if (typeof err === "object" && err !== null) {
        const errObj = err as Record<string, unknown>;
        if (errObj.response && typeof errObj.response === "object" && "data" in (errObj.response as Record<string, unknown>)) {
          const resData = (errObj.response as Record<string, unknown>).data;
          if (resData && typeof resData === "object" && "detail" in (resData as Record<string, unknown>)) {
            const detailVal = (resData as Record<string, unknown>).detail;
            if (typeof detailVal === "string") detail = detailVal;
          }
        }
      }
      setError(detail);
      toast(detail, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateClick = (template: string) => setInput(template);

  const handleSaveSnippet = async () => {
    if (!sql || !snippetTitle.trim() || !activeConnectionId) return;
    try {
      await api.post("/snippets/", {
        connection_id: activeConnectionId,
        title: snippetTitle.trim(),
        sql_text: sql,
      });
      toast("Query saved to your library.", "success");
      setSnippetTitle("");
    } catch {
      toast("Failed to save query.", "error");
    }
  };

  const handleReplay = useCallback(
    (question: string, historySql: string) => {
      setInput(question);
      setSql(historySql);

      if (activeConnectionId) {
        setLoading(true);
        setData([]);
        setChartRec(undefined);
        setError("");

        api
          .post("/query/generate", null, {
            params: { user_query: question, connection_id: activeConnectionId },
          })
          .then((res) => {
            setSql(res.data.sql || "");
            setData(res.data.data || []);
            setExplanation(res.data.explanation || "");
            setChartRec((res.data.chart_recommendation as typeof chartRec) || undefined);
            setExecutionTime(res.data.execution_time_ms || 0);
            setInsights(res.data.visualization || null);
            setActiveTab(res.data.data?.length > 0 ? "chart" : "results");
          })
          .catch((err: any) => {
            const detail = err.response?.data?.detail || err.message || "Query failed.";
            setError(detail);
          })
          .finally(() => setLoading(false));
      }
    },
    [activeConnectionId, setLoading, chartRec]
  );

  const handleFollowUp = () => {
    if (!input.trim()) return;
    setInput(`Follow up on: ${input.trim()}`);
  };

  const handleSectionSelect = (
    section: "chart" | "results" | "insights" | "explainer" | "query"
  ) => {
    if (section === "query") {
      queryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setActiveSection(section);
    if (section === "explainer") {
      sqlRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setActiveTab(section);
  };

  const dataMetadata = useMemo(() => {
    if (!data || data.length === 0) return { title: "Query Results", primaryMetric: "—", dimensions: 0 };
    const columns = Object.keys(data[0]);
    const matchedNumber = columns.find(c => typeof data[0][c] === "number");
    const matchedString = columns.find(c => typeof data[0][c] === "string");
    return {
      title: matchedNumber && matchedString && matchedNumber !== matchedString
        ? `${matchedNumber.replace(/_/g, " ")} by ${matchedString.replace(/_/g, " ")}`
        : matchedNumber
          ? matchedNumber.replace(/_/g, " ")
          : "Query Results",
      primaryMetric: matchedNumber ? matchedNumber.replace(/_/g, " ") : "count",
      dimensions: columns.length,
    };
  }, [data]);

  const connectionDisabled = !activeConnectionId || activeConnection?.is_active === false;

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-base-0">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        onReplay={handleReplay}
        collapsed={!sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-base-0">
        <Header
          onReplay={handleReplay}
          onSectionSelect={handleSectionSelect}
          activeSection={activeSection}
          activeView={activeView}
        >
          <div ref={queryRef} className="px-4 py-3">
            <QueryInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              onTemplateClick={handleTemplateClick}
              isLoading={isLoading}
              disabled={connectionDisabled}
              showSuggestions={false}
            />
          </div>
        </Header>

        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="w-full max-w-[1600px] mx-auto px-5 py-5 space-y-5">

            {/* ── Query Console ──────────────────────────────── */}
            {activeView === 'query' && (
              <div className="space-y-4">

                {/* Suggestion chips */}
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { label: "Show unusual transaction spikes", icon: AlertTriangle, color: "text-[var(--ds-warning)]" },
                    { label: "Compare customer retention by cohort", icon: TrendingUp, color: "text-success" },
                    { label: "Find anomalies in the data", icon: Zap, color: "text-[var(--ds-info)]" },
                  ].map(({ label, icon: Icon, color }) => (
                    <button
                      key={label}
                      onClick={() => handleTemplateClick(label)}
                      disabled={isLoading || connectionDisabled}
                      className="flex items-center gap-2 rounded-full border border-border bg-base-2 px-3.5 py-1.5 text-[12px] text-content-2 hover:border-[var(--ds-border-moderate)] hover:bg-base-3 hover:text-content-1 transition-[background-color,border-color,color] duration-[100ms] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Icon className={`h-3.5 w-3.5 ${color}`} />
                      <span>{label}</span>
                    </button>
                  ))}

                  {data.length > 0 && (
                    <button
                      onClick={handleFollowUp}
                      className="flex items-center gap-1.5 rounded-full border border-[var(--ds-border-moderate)] bg-base-3 px-3.5 py-1.5 text-[12px] font-medium text-content-1 hover:bg-base-4 transition-colors duration-[100ms]"
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5" />
                      Refine Conditions
                    </button>
                  )}
                </div>

                {/* Dismissable error banner */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.16, ease: [0, 0, 0.2, 1] }}
                    >
                      <div
                        className="flex items-start justify-between gap-3 rounded-lg px-4 py-3 text-[13px] text-error"
                        style={{ background: 'var(--ds-error-muted)', border: '1px solid var(--ds-error-border)' }}
                      >
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <span>{error}</span>
                        </div>
                        <button
                          onClick={() => setError("")}
                          className="text-error/50 hover:text-error transition-colors flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* No connection empty state */}
                {!activeConnectionId && (
                  <div
                    className="rounded-lg border border-border bg-base-1 flex flex-col items-center justify-center min-h-[480px]"
                    style={{ boxShadow: 'var(--ds-shadow-sm)' }}
                  >
                    <EmptyState
                      icon={Database}
                      title="No database connected"
                      description="Add a connection from the sidebar to start querying your data."
                      size="md"
                      action={<AddConnectionDialog />}
                    />
                  </div>
                )}

                {/* Main results panel */}
                {activeConnectionId && (
                  <div
                    className="rounded-lg border border-border bg-base-1 overflow-hidden"
                    style={{ boxShadow: 'var(--ds-shadow-sm)' }}
                  >
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-0">

                      {/* Tab bar */}
                      <div className="flex flex-wrap items-center justify-between gap-4 px-5 border-b border-border bg-base-2">
                        <TabsList className="-mb-px gap-5 h-12">
                          <TabsTrigger value="chart" className="flex items-center gap-1.5">
                            <BarChart3 className="h-3.5 w-3.5" />
                            Visualization
                          </TabsTrigger>
                          <TabsTrigger value="results" className="flex items-center gap-1.5">
                            <Table className="h-3.5 w-3.5" />
                            Data Grid
                          </TabsTrigger>
                          <TabsTrigger value="insights" className="flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5" />
                            AI Insights
                          </TabsTrigger>
                        </TabsList>

                        {/* Save snippet controls */}
                        {sql && (
                          <div className="flex items-center gap-2 py-2">
                            <Input
                              placeholder="Name this snippet…"
                              value={snippetTitle}
                              onChange={(e) => setSnippetTitle(e.target.value)}
                              className="w-44 h-7 text-[12px]"
                            />
                            <Button
                              onClick={handleSaveSnippet}
                              disabled={!snippetTitle.trim()}
                              size="sm"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Save
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        {isLoading ? (
                          /* Loading skeleton */
                          <div className="min-h-[480px] flex items-center justify-center">
                            <div className="flex flex-col items-center gap-3">
                              <Loader2 className="h-6 w-6 animate-spin text-content-3" />
                              <p className="text-[12px] text-content-3">Generating SQL and executing query…</p>
                            </div>
                          </div>
                        ) : !sql && data.length === 0 ? (
                          /* First-run empty state */
                          <EmptyState
                            icon={Calendar}
                            title="Run your first query"
                            description="Type a question above and press Generate, or click a suggestion to get started."
                            size="md"
                          />
                        ) : (
                          /* Results grid */
                          <div className="grid min-h-[480px] grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_272px]">

                            {/* Main panel: tabs + SQL */}
                            <div className="min-w-0 space-y-5">
                              <TabsContent value="chart" className="m-0 h-[360px]">
                                <div>
                                  <h3 className="text-[13px] font-semibold text-content-1 mb-4">
                                    {dataMetadata.title}
                                  </h3>
                                  <div className="h-[316px]">
                                    <ChartPanel data={data} />
                                  </div>
                                </div>
                              </TabsContent>
                              <TabsContent value="results" className="m-0 h-[360px]">
                                <ResultsPanel data={data} />
                              </TabsContent>
                              <TabsContent value="insights" className="m-0 h-[360px]">
                                <InsightsPanel data={data} explanation={explanation} insights={insights} />
                              </TabsContent>

                              {/* SQL Display */}
                              <div
                                ref={sqlRef}
                                className="rounded-md border border-border overflow-hidden bg-base-0"
                                style={{ boxShadow: 'var(--ds-shadow-inset)' }}
                              >
                                <SQLDisplay sql={sql} />
                              </div>
                            </div>

                            {/* Stats sidebar */}
                            <aside className="flex flex-col gap-4 border-l border-border pl-5">
                              {/* Performance header */}
                              <div className="flex items-center justify-between pb-3 border-b border-border">
                                <span className="text-[11px] font-medium uppercase tracking-wider text-content-3">
                                  Performance
                                </span>
                                <span className="text-[12px] font-mono bg-base-0 px-2 py-0.5 rounded border border-border text-content-2 font-semibold">
                                  {executionTime}ms
                                </span>
                              </div>

                              {/* Metrics */}
                              <div
                                className="bg-base-0 rounded-md border border-border p-4 font-mono text-[12px] space-y-2"
                                style={{ boxShadow: 'var(--ds-shadow-inset)' }}
                              >
                                <div className="flex justify-between">
                                  <span className="text-content-3">Rows</span>
                                  <span className="text-content-1 font-semibold">{data.length.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-content-3">Columns</span>
                                  <span className="text-content-1 font-semibold">{dataMetadata.dimensions}</span>
                                </div>
                              </div>

                              {/* AI explanation */}
                              <div
                                className="bg-base-0 rounded-md border border-border p-4 flex-1 overflow-y-auto custom-scrollbar"
                                style={{ boxShadow: 'var(--ds-shadow-inset)' }}
                              >
                                <p className="text-[12px] leading-relaxed text-content-3">
                                  {explanation || "Run a query to see an AI explanation here."}
                                </p>
                              </div>
                            </aside>
                          </div>
                        )}
                      </div>
                    </Tabs>
                  </div>
                )}
              </div>
            )}

            {/* ── Schema Explorer ────────────────────────────── */}
            {activeView === 'schema' && (
              <div
                className="rounded-lg border border-border bg-base-1 p-5 min-h-[540px]"
                style={{ boxShadow: 'var(--ds-shadow-sm)' }}
              >
                <div className="border-b border-border pb-4 mb-5">
                  <h2 className="text-[14px] font-semibold text-content-1 flex items-center gap-2">
                    <Compass className="h-4 w-4 text-content-3" />
                    Schema Explorer
                  </h2>
                  <p className="text-[12px] text-content-3 mt-1">
                    Browse tables, columns, keys and relationships in your connected database.
                  </p>
                </div>

                {!activeConnectionId ? (
                  <EmptyState
                    icon={Database}
                    title="No database connected"
                    description="Connect a database to browse its schema."
                    size="md"
                  />
                ) : schemaLoading ? (
                  <div className="flex justify-center py-24">
                    <Loader2 className="h-5 w-5 animate-spin text-content-3" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-5">

                    {/* Table list */}
                    <div className="space-y-0.5 border-r border-border pr-4 max-h-[440px] overflow-y-auto custom-scrollbar">
                      {Object.keys(tables).length === 0 ? (
                        <p className="text-[12px] text-content-3 p-2">No tables found.</p>
                      ) : (
                        Object.keys(tables).map((tableName) => (
                          <button
                            key={tableName}
                            onClick={() => setSelectedTable(tableName)}
                            className={[
                              'w-full text-left px-3 py-2 text-[12px] rounded-md flex items-center justify-between',
                              'transition-colors duration-[100ms]',
                              selectedTable === tableName
                                ? 'bg-base-0 text-content-1 font-medium border border-border'
                                : 'text-content-3 hover:text-content-1 hover:bg-base-3',
                            ].join(' ')}
                          >
                            <span className="truncate font-mono">{tableName}</span>
                            <ChevronRight className="h-3 w-3 text-content-3 flex-shrink-0" />
                          </button>
                        ))
                      )}
                    </div>

                    {/* Column detail grid */}
                    <div className="min-w-0">
                      {selectedTable && tables[selectedTable] ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-[13px] font-semibold text-content-1 font-mono">{selectedTable}</h3>
                            <span className="text-[11px] font-mono bg-base-0 border border-border text-content-3 px-2 py-0.5 rounded-md">
                              {Object.keys(tables[selectedTable]).length} columns
                            </span>
                          </div>

                          <div
                            className="rounded-md border border-border overflow-hidden bg-base-0"
                            style={{ boxShadow: 'var(--ds-shadow-inset)' }}
                          >
                            <table className="w-full text-left text-[12px] border-collapse">
                              <thead>
                                <tr className="border-b border-border bg-base-2 text-content-3 font-medium select-none">
                                  <th className="px-3 py-2.5">Column</th>
                                  <th className="px-3 py-2.5">Type</th>
                                  <th className="px-3 py-2.5">Constraints</th>
                                  <th className="px-3 py-2.5">Nullability</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[var(--ds-border-subtle)] font-mono text-[11px]">
                                {Object.entries(tables[selectedTable]).map(([colName, colMeta]: [string, any]) => (
                                  <tr key={colName} className="hover:bg-base-2 transition-colors duration-[100ms]">
                                    <td className="px-3 py-2 text-content-1 font-semibold">{colName}</td>
                                    <td className="px-3 py-2 text-content-3">{colMeta.type || colMeta}</td>
                                    <td className="px-3 py-2 space-x-1">
                                      {colMeta.is_pk && (
                                        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold"
                                          style={{ background: 'rgba(245,158,11,0.10)', color: 'var(--ds-warning)', border: '1px solid rgba(245,158,11,0.20)' }}>
                                          PK
                                        </span>
                                      )}
                                      {colMeta.fk_target && (
                                        <span
                                          className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold cursor-help"
                                          style={{ background: 'rgba(168,85,247,0.10)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.20)' }}
                                          title={`References: ${colMeta.fk_target}`}
                                        >
                                          FK → {colMeta.fk_target.split('.')[0]}
                                        </span>
                                      )}
                                      {!colMeta.is_pk && !colMeta.fk_target && (
                                        <span className="text-content-3">—</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2">
                                      {colMeta.nullable === false ? (
                                        <span className="text-content-3 text-[10px]">NOT NULL</span>
                                      ) : (
                                        <span className="text-content-3/60 text-[10px]">NULLABLE</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <EmptyState
                          icon={FileSearch}
                          title="Select a table"
                          description="Click a table on the left to inspect its columns and structure."
                          size="md"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Saved Queries (Snippets) ───────────────────── */}
            {activeView === 'snippets' && (
              <div
                className="rounded-lg border border-border bg-base-1 p-5 min-h-[540px]"
                style={{ boxShadow: 'var(--ds-shadow-sm)' }}
              >
                <div className="border-b border-border pb-4 mb-5">
                  <h2 className="text-[14px] font-semibold text-content-1 flex items-center gap-2">
                    <Bookmark className="h-4 w-4 text-content-3" />
                    Saved Queries
                  </h2>
                  <p className="text-[12px] text-content-3 mt-1">
                    Reuse queries saved by you and your team.
                  </p>
                </div>

                {!activeConnectionId ? (
                  <EmptyState
                    icon={Database}
                    title="No database connected"
                    description="Connect a database to access saved queries."
                    size="md"
                  />
                ) : snippetsLoading ? (
                  <div className="flex justify-center py-24">
                    <Loader2 className="h-5 w-5 animate-spin text-content-3" />
                  </div>
                ) : snippets.length === 0 ? (
                  <EmptyState
                    icon={Bookmark}
                    title="No saved queries yet"
                    description="Generate a query in the Query Console and save it to build your library."
                    size="md"
                    action={
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveView('query')}
                      >
                        Go to Query Console
                      </Button>
                    }
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {snippets.map((snippet: any) => (
                      <div
                        key={snippet.id}
                        className="group flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-md border border-border bg-base-0 p-4 hover:border-[var(--ds-border-moderate)] transition-[border-color] duration-[100ms]"
                        style={{ boxShadow: 'var(--ds-shadow-inset)' }}
                      >
                        <div className="min-w-0 space-y-1.5">
                          <h3 className="text-[13px] font-semibold text-content-1">{snippet.title}</h3>
                          <p className="text-[11px] font-mono text-content-3 truncate max-w-2xl bg-base-2 px-3 py-1.5 rounded border border-border">
                            {snippet.sql_text}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-shrink-0 w-full md:w-auto"
                          onClick={() => {
                            setInput(snippet.title);
                            setSql(snippet.sql_text);
                            setActiveView('query');
                            setActiveTab('results');
                            setTimeout(() => handleSubmit(), 50);
                          }}
                        >
                          Run Snippet
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
