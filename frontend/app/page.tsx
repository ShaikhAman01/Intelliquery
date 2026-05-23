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
import { useStore } from "@/lib/store";
import { api, getSchema, getSnippets } from "@/lib/api";
import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  BarChart3,
  Sparkles,
  Clock,
  Database,
  Plus,
  Loader2,
  Zap,
  AlertTriangle,
  Send,
  TrendingUp,
  Calendar,
  Compass,
  Bookmark,
  ChevronRight,
  MessageSquarePlus,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { AnimatePresence, motion } from "motion/react";

export default function Dashboard() {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="flex h-[100dvh] w-screen items-center justify-center bg-[#09090b]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Initializing Workspace</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LandingPage />;
  }

  return <DashboardContent />;
}

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

  useEffect(() => {
    if (activeView === 'snippets' && activeConnectionId) {
      setSnippetsLoading(true);
      getSnippets(activeConnectionId)
        .then((res) => {
          setSnippets(res || []);
        })
        .catch(() => toast("Failed to pull saved snippets dataset.", "error"))
        .finally(() => setSnippetsLoading(false));
    }
  }, [activeView, activeConnectionId, toast]);

  const [chartRec, setChartRec] = useState<
    | {
        chart_type: "bar" | "line" | "pie" | "kpi" | "area" | "table";
        reason?: string;
      }
    | undefined
  >();

  const activeConnection = useMemo(() => connections.find((conn) => conn.id === activeConnectionId), [connections, activeConnectionId]);
  const queryRef = useRef<HTMLDivElement>(null);
  const sqlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeView === 'schema' && activeConnectionId) {
      setSchemaLoading(true);
      getSchema(activeConnectionId)
        .then((res) => { setTables(res.tables || res); })
        .catch(() => toast("Failed to resolve schema map structures.", "error"))
        .finally(() => setSchemaLoading(false));
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

      toast(`Query processing cycle complete within ${duration}ms`, "success");
      setActiveTab(res.data.data?.length > 0 ? "chart" : "results");
    } catch (err: unknown) {
      let detail = "Unknown compilation execution error.";
      if (err instanceof Error) {
        detail = err.message;
      } else if (typeof err === "object" && err !== null) {
        const errObj = err as Record<string, unknown>;
        if (
          errObj.response &&
          typeof errObj.response === "object" &&
          "data" in (errObj.response as Record<string, unknown>)
        ) {
          const resData = (errObj.response as Record<string, unknown>).data;
          if (
            resData &&
            typeof resData === "object" &&
            "detail" in (resData as Record<string, unknown>)
          ) {
            const detailVal = (resData as Record<string, unknown>).detail;
            if (typeof detailVal === "string") {
              detail = detailVal;
            }
          }
        }
      }
      setError(detail);
      toast(`Pipeline Error: ${detail}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateClick = (template: string) => {
    setInput(template);
  };

  const handleSaveSnippet = async () => {
    if (!sql || !snippetTitle.trim() || !activeConnectionId) return;
    try {
      await api.post("/snippets/", { connection_id: activeConnectionId, title: snippetTitle.trim(), sql_text: sql });
      toast("Query segment cataloged cleanly inside team repository.", "success");
      setSnippetTitle("");
    } catch { toast("Failed to archive query block.", "error"); }
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

            if (res.data.data?.length > 0) {
              setActiveTab("chart");
            } else {
              setActiveTab("results");
            }
          })
          .catch((err: any) => {
            const detail = err.response?.data?.detail || err.message || "Historical execution step failed.";
            setError(detail);
          })
          .finally(() => {
            setLoading(false);
          });
      }
    },
    [activeConnectionId, setLoading, chartRec]
  );

  const handleFollowUp = () => {
    if (!input.trim()) return;
    setInput((prev) => `Refining investigation: "${prev}". Isolate variance loops where performance boundaries leak thresholds.`);
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
    if (!data || data.length === 0) return { title: "Query Analytics Console", primaryMetric: "—", dimensions: 0 };
    const columns = Object.keys(data[0]);
    const matchedNumber = columns.find(c => typeof data[0][c] === "number");
    const matchedString = columns.find(c => typeof data[0][c] === "string") || columns[0];
    return {
      title: matchedNumber && matchedString ? `Evaluation of ${matchedNumber} relative to ${matchedString}` : "Active Dataframe Grid Frame",
      primaryMetric: matchedNumber ? matchedNumber.replace(/_/g, " ") : "Row Metric Volume",
      dimensions: columns.length
    };
  }, [data]);

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-[#09090b] text-[#e5e1e4] antialiased">
      <Sidebar activeView={activeView} onViewChange={setActiveView} onReplay={handleReplay} collapsed={!sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-[#0d0e10]">
        <Header onReplay={handleReplay} onSectionSelect={handleSectionSelect} activeSection={activeSection}>
          <div ref={queryRef} className="w-full max-w-4xl mx-auto px-6 py-4">
            <QueryInput value={input} onChange={setInput} onSubmit={handleSubmit} onTemplateClick={handleTemplateClick} isLoading={isLoading} disabled={!activeConnectionId || activeConnection?.is_active === false} showSuggestions={false} />
          </div>
        </Header>

        <main className="flex-1 overflow-y-auto border-t border-white/[0.06] custom-scrollbar">
          <div className="w-full max-w-[1600px] mx-auto p-6">
            
            {/* QUERY CONSOLE VIEW BUTTON PANEL SPLIT SYSTEM */}
            {activeView === 'query' && (
              <div className="space-y-6">
                
                {/* SUGGESTION CHIPS MODULE (PRESERVED EXPLICITLY) */}
                <div className="flex flex-wrap items-center justify-start gap-2">
                  {[
                    { label: "Isolate abnormal transaction spikes", icon: AlertTriangle, color: "text-amber-400" },
                    { label: "Evaluate recurring customer metric shifts", icon: TrendingUp, color: "text-[#4edea3]" },
                    { label: "Identify anomaly patterns inside metrics", icon: Zap, color: "text-[#d0bcff]" },
                  ].map(({ label, icon: Icon, color }) => (
                    <button
                      key={label}
                      onClick={() => handleTemplateClick(label)}
                      disabled={isLoading || !activeConnectionId}
                      className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-[#111214] px-4 py-1.5 text-xs text-slate-400 hover:border-white/[0.12] hover:bg-[#16171a] hover:text-white transition-all disabled:opacity-40"
                    >
                      <Icon className={`h-3.5 w-3.5 ${color}`} />
                      <span>{label}</span>
                    </button>
                  ))}

                  {data.length > 0 && (
                    <button
                      onClick={handleFollowUp}
                      className="flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-white hover:bg-white/[0.08] transition-all"
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5 text-slate-300" />
                      <span>Refine Set Conditions</span>
                    </button>
                  )}
                </div>

                <AnimatePresence>{error && (<motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-start justify-between p-4 rounded-xl border border-red-500/20 bg-[#09090b] text-red-400 text-sm shadow-sm"><div className="flex gap-2.5 items-start"><AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /><span className="font-medium">{error}</span></div><button onClick={() => setError("")} className="text-red-400/50 hover:text-red-400 ml-4 font-bold transition-colors">✕</button></motion.div>)}</AnimatePresence>
                
                <div className="border border-white/[0.06] bg-[#111214] rounded-2xl overflow-hidden shadow-2xl">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] bg-[#0d0e10] px-6 py-2">
                      <TabsList className="h-auto bg-transparent p-0 gap-6 flex items-center">
                        <TabsTrigger value="chart" className="group relative -mb-[9px] bg-transparent rounded-none px-0 pb-3 pt-1 text-sm font-medium text-slate-400 data-[state=active]:text-white shadow-none">Visualization<div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#d9e2ff] opacity-0 group-data-[state=active]:opacity-100" /></TabsTrigger>
                        <TabsTrigger value="results" className="group relative -mb-[9px] bg-transparent rounded-none px-0 pb-3 pt-1 text-sm font-medium text-slate-400 data-[state=active]:text-white shadow-none">Data Grid<div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#d9e2ff] opacity-0 group-data-[state=active]:opacity-100" /></TabsTrigger>
                        <TabsTrigger value="insights" className="group relative -mb-[9px] bg-transparent rounded-none px-0 pb-3 pt-1 text-sm font-medium text-slate-400 data-[state=active]:text-white shadow-none">AI Insights<div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#d9e2ff] opacity-0 group-data-[state=active]:opacity-100" /></TabsTrigger>
                      </TabsList>
                      {sql && (
                        <div className="flex items-center gap-2">
                          <input placeholder="Add snippet title..." value={snippetTitle} onChange={(e) => setSnippetTitle(e.target.value)} className="bg-[#09090b] border border-white/[0.06] rounded-xl px-3 py-1.5 text-xs outline-none text-white focus:border-slate-400 w-44" />
                          <Button onClick={handleSaveSnippet} disabled={!snippetTitle.trim()} className="h-8 text-xs bg-white text-zinc-950 px-4 rounded-xl font-semibold"><Plus className="h-3.5 w-3.5 mr-1" /> Bookmark Code</Button>
                        </div>
                      )}
                    </div>
                    <div className="p-6 bg-transparent">
                      <div className="grid min-h-[480px] grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_320px]">
                        <div className="min-w-0 space-y-6">
                          <TabsContent value="chart" className="m-0 h-[380px] outline-none"><div><h3 className="text-sm font-bold text-white tracking-tight mb-4">{dataMetadata.title}</h3><div className="h-[320px]"><ChartPanel data={data} /></div></div></TabsContent>
                          <TabsContent value="results" className="m-0 h-[380px] outline-none"><ResultsPanel data={data} /></TabsContent>
                          <TabsContent value="insights" className="m-0 h-[380px] outline-none"><InsightsPanel data={data} explanation={explanation} insights={insights} /></TabsContent>
                          <div className="border border-white/[0.06] rounded-2xl overflow-hidden bg-[#070708] h-[320px]"><SQLDisplay sql={sql} /></div>
                        </div>
                        <aside className="flex flex-col gap-4 border-l border-white/[0.06] pl-6 lg:h-[720px]">
                          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Pipeline Performance</h3><span className="text-xs font-mono bg-[#09090b] px-2 py-0.5 rounded border border-white/[0.06] text-slate-300 font-semibold">{executionTime}ms</span></div>
                          <div className="font-mono text-xs bg-[#09090b] p-4 rounded-xl border border-white/[0.06] space-y-2.5 text-slate-400"><div className="flex justify-between"><span>Rowset Length:</span><span className="text-white font-bold">{data.length} records</span></div><div className="flex justify-between"><span>Dimensions:</span><span className="text-white font-bold">{dataMetadata.dimensions} fields</span></div></div>
                          <div className="bg-[#09090b] p-4 rounded-xl border border-white/[0.06] flex-1 text-sm leading-relaxed text-slate-300 overflow-y-auto custom-scrollbar"><p className="text-xs leading-relaxed text-slate-400">{explanation || "Awaiting incoming compilation execution streams..."}</p></div>
                        </aside>
                      </div>
                    </div>
                  </Tabs>
                </div>
              </div>
            )}

           {/* ── MODULE 2: DATA SNAPSHOT SCHEMA CATALOG EXPLORER ────────────── */}
            {activeView === 'schema' && (
              <div className="border border-white/[0.06] bg-[#111214] rounded-2xl p-6 min-h-[540px]">
                <div className="border-b border-white/[0.06] pb-4 mb-6">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Compass className="h-4 w-4 text-slate-400" /> 
                    Enterprise Data Catalog Snapshot
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Analyze table topology structures, system keys, directional reference foreign constraints, and metadata inline.
                  </p>
                </div>

                {schemaLoading ? (
                  <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
                    
                    {/* Left Sidebar Table Directory Selector */}
                    <div className="space-y-0.5 border-r border-white/[0.06] pr-4 max-h-[440px] overflow-y-auto custom-scrollbar">
                      {Object.keys(tables).length === 0 ? (
                        <p className="text-xs text-slate-500 italic p-2">No active tables discovered.</p>
                      ) : (
                        Object.keys(tables).map((tableName) => (
                          <button 
                            key={tableName} 
                            onClick={() => setSelectedTable(tableName)} 
                            className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center justify-between transition-colors ${
                              selectedTable === tableName 
                                ? 'bg-[#09090b] text-white font-medium border border-white/[0.06]' 
                                : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
                            }`}
                          >
                            <span className="truncate">{tableName}</span>
                            <ChevronRight className="h-3 w-3 text-slate-600 shrink-0" />
                          </button>
                        ))
                      )}
                    </div>

                    {/* Right Dynamic Deep-Inspection Schema Data Grid */}
                    <div className="min-w-0">
                      {selectedTable && tables[selectedTable] ? (
                        <div className="space-y-4 animate-fadeIn">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white font-mono">Table Context Parameters: {selectedTable}</h3>
                            <span className="text-[10px] font-mono bg-white/[0.02] border border-white/[0.06] text-slate-400 px-2 py-0.5 rounded-lg">
                              {Object.keys(tables[selectedTable]).length} Columns mapped
                            </span>
                          </div>

                          <div className="border border-white/[0.06] rounded-xl overflow-hidden bg-[#09090b]">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-white/[0.06] bg-[#0d0e10] text-slate-400 font-semibold select-none">
                                  <th className="p-3">Field Column</th>
                                  <th className="p-3">Type</th>
                                  <th className="p-3">Key Metrics Attributes</th>
                                  <th className="p-3">Nullability</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/[0.04] text-slate-300 font-mono text-[11px]">
                                {Object.entries(tables[selectedTable]).map(([colName, colMeta]: [string, any]) => (
                                  <tr key={colName} className="hover:bg-white/[0.01] transition-colors">
                                    {/* Name Field column */}
                                    <td className="p-3 text-white font-semibold tracking-tight">{colName}</td>
                                    
                                    {/* String Type output column */}
                                    <td className="p-3 text-slate-400">{colMeta.type || colMeta}</td>
                                    
                                    {/* Relational Key Tracker Attributes column */}
                                    <td className="p-3 space-x-1">
                                      {colMeta.is_pk && (
                                        <span className="bg-amber-500/10 text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-amber-500/20 shadow-sm">
                                          PK
                                        </span>
                                      )}
                                      {colMeta.fk_target && (
                                        <span 
                                          className="bg-purple-500/10 text-purple-400 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-purple-500/20 shadow-sm cursor-help"
                                          title={`References target location: ${colMeta.fk_target}`}
                                        >
                                          FK → {colMeta.fk_target.split('.')[0]}
                                        </span>
                                      )}
                                      {!colMeta.is_pk && !colMeta.fk_target && (
                                        <span className="text-slate-600">—</span>
                                      )}
                                    </td>

                                    {/* Nullable Check layout cell */}
                                    <td className="p-3">
                                      {colMeta.nullable === false ? (
                                        <span className="text-slate-500 text-[10px]">NOT NULL</span>
                                      ) : (
                                        <span className="text-slate-600 text-[10px]">NULLABLE</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-24 border border-dashed border-white/[0.06] rounded-xl text-slate-500 italic text-xs">
                          Select an environment database structure table framework node from the index data directory catalog.
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            )}

                        {/* TEAM REGISTRY LIBRARY VIEW */}
                        {activeView === 'snippets' && (
                          <div className="border border-white/[0.06] bg-[#111214] rounded-2xl p-6 min-h-[540px]">
                            <div className="border-b border-white/[0.06] pb-4 mb-6">
                              <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <Bookmark className="h-4 w-4 text-slate-400" /> 
                                Team Query Shared Library Matrix
                              </h2>
                              <p className="text-xs text-slate-400 mt-1">
                                Re-run, analyze, and deploy archived query blueprints bookmarked by organization team engineers.
                              </p>
                            </div>
            
                            {snippetsLoading ? (
                              <div className="flex justify-center py-24">
                                <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
                              </div>
                            ) : snippets.length === 0 ? (
                              <div className="text-center py-24 border border-dashed border-white/[0.06] rounded-xl text-slate-500 italic text-xs">
                                No saved query code block fragments pinned inside this organization registry channel yet. 
                                Generate an operational query block inside the Query Console to seed snippets.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 gap-4">
                                {snippets.map((snippet: any) => (
                                  <div 
                                    key={snippet.id} 
                                    className="p-5 rounded-xl border border-white/[0.06] bg-[#09090b] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group hover:border-white/[0.12] transition-colors"
                                  >
                                    <div className="min-w-0 space-y-1">
                                      <h3 className="text-sm font-bold text-white font-mono">{snippet.title}</h3>
                                      <p className="text-xs font-mono text-slate-500 truncate max-w-2xl bg-[#111214] px-3 py-1.5 rounded-lg border border-white/[0.04]">
                                        {snippet.sql_text}
                                      </p>
                                    </div>
            
                                    <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                                      <Button
                                        onClick={() => {
                                          // Re-inject snippet SQL code directly back into query editor frame playground
                                          setInput(`Running saved blueprint "${snippet.title}":`);
                                          setSql(snippet.sql_text);
                                          setActiveView('query');
                                          setActiveTab('results');
                                          
                                          // Trigger automatic database query execution pipeline call
                                          setTimeout(() => handleSubmit(), 50);
                                        }}
                                        className="h-8 text-xs bg-white text-zinc-950 px-4 rounded-xl font-semibold hover:bg-slate-200"
                                      >
                                        Run Snippet
                                      </Button>
                                    </div>
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