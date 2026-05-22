"use client";

import { Header } from "@/components/Layout/Header";
import { Sidebar } from "@/components/Layout/Sidebar";
import { QueryInput } from "@/components/Query/QueryInput";
import { SQLDisplay } from "@/components/Query/SQLDisplay";
import { ResultsPanel } from "@/components/Results/ResultsPanel";
import { InsightsPanel } from "@/components/Results/InsightsPanel";
import { ChartPanel } from "@/components/Chat/Visualizer";
import { AddConnectionDialog } from "@/components/Shared/AddConnectionDialog";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { useState, useCallback, useRef, useMemo, useTransition } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  BarChart3,
  Sparkles,
  Clock,
  MessageSquarePlus,
  Database,
  Plus,
  Loader2,
  Zap,
  AlertTriangle,
  Send,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { useSession } from "@/lib/use-auth";
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
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Initializing Pipeline
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LandingPage />;
  }

  return <DashboardContent />;
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-[#e5e1e4] flex flex-col relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/5 via-transparent to-transparent pointer-events-none" />
      <div className="relative z-10 flex-1 flex items-center justify-center p-6 text-center">
        <div className="max-w-2xl space-y-6">
          <div className="mx-auto w-12 h-12 bg-[#111214] border border-white/[0.08] rounded-xl flex items-center justify-center shadow-lg">
            <Database className="w-5 h-5 text-slate-300" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Intelliquery Analytics</h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Translate natural language queries into production-grade optimized SQL execution plans instantly.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button className="h-10 bg-white hover:bg-slate-200 text-zinc-950 font-semibold rounded-xl px-5" onClick={() => (window.location.href = "/sign-up")}>
              Get Started Free
            </Button>
            <Button variant="ghost" className="h-10 border border-white/[0.06] bg-[#111214] text-slate-300 rounded-xl px-5 hover:bg-[#16171a]" onClick={() => (window.location.href = "/sign-in")}>
              Sign In
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardContent() {
  const { connections, activeConnectionId, isLoading, setLoading } = useStore();
  const { toast } = useToast();

  // Unified Monolithic State Controls
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState("");
  const [sql, setSql] = useState("");
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [explanation, setExplanation] = useState("");
  const [insights, setInsights] = useState<unknown>(null);
  const [querySource, setQuerySource] = useState("");
  const [executionTime, setExecutionTime] = useState(0);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("chart");
  const [activeSection, setActiveSection] = useState<"chart" | "results" | "insights" | "explainer">("chart");

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

  // Introspect dataset arrays to extract structural labels/metrics dynamically
  const dataMetadata = useMemo(() => {
    if (!data || data.length === 0) return { title: "Analytical Workspace Sandbox", primaryMetric: "—", dimensions: 0 };
    const columns = Object.keys(data[0]);
    const matchedNumber = columns.find(c => typeof data[0][c] === "number");
    const matchedString = columns.find(c => typeof data[0][c] === "string") || columns[0];

    return {
      title: matchedNumber && matchedString ? `Evaluation of ${matchedNumber} relative to ${matchedString}` : "Active Frame Operational Set",
      primaryMetric: matchedNumber ? matchedNumber.replace(/_/g, " ") : "Records Volume",
      dimensions: columns.length
    };
  }, [data]);

  // Complete, Non-Truncated Async Query Processing Pipeline Interceptor
  const handleSubmit = async () => {
    if (!input.trim() || !activeConnectionId) return;

    setLoading(true);
    setSql("");
    setData([]);
    setChartRec(undefined);
    setQuerySource("");
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
      setQuerySource(res.data.query_source || "ENGINE");
      setExecutionTime(res.data.execution_time_ms || duration);
      setInsights(res.data.visualization || null);

      toast(`Query compiled completely within ${duration}ms`, "success");

      if (res.data.data?.length > 0) {
        setActiveTab("chart");
      } else {
        setActiveTab("results");
      }
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
            setQuerySource(res.data.query_source || "ENGINE");
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
    setInput((prev) => `Refining investigation: "${prev}". Isolate metric shifts where conditions fall behind variance thresholds.`);
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

return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-[#09090b] text-[#e5e1e4] antialiased">
      
      <Sidebar
        onNavigate={handleSectionSelect}
        onReplay={handleReplay}
        collapsed={!sidebarOpen}
        onToggle={() => setSidebarOpen((prev) => !prev)}
      />

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-[#0d0e10]">
        <Header onReplay={handleReplay} onSectionSelect={handleSectionSelect} activeSection={activeSection}>
          <div ref={queryRef} className="w-full max-w-4xl mx-auto px-6 py-4">
            <QueryInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              onTemplateClick={handleTemplateClick}
              isLoading={isLoading}
              disabled={!activeConnectionId || activeConnection?.is_active === false}
              showSuggestions={false}
            />
          </div>
        </Header>

        {connections.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md w-full p-8 border border-white/[0.06] bg-[#111214] text-center space-y-4 rounded-2xl shadow-xl">
              <Database className="w-8 h-8 text-slate-500 mx-auto" />
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-white">Initialize Environment Connection</h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Provision your primary target database cluster metadata coordinates to begin running AI analytics queries.
                </p>
              </div>
              <div className="pt-2">
                <AddConnectionDialog
                  trigger={
                    <Button className="h-10 bg-white hover:bg-slate-200 text-zinc-950 font-semibold rounded-xl px-4 flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      <span>Add Connection String</span>
                    </Button>
                  }
                />
              </div>
            </div>
          </div>
        ) : (
          <main className="custom-scrollbar flex-1 overflow-y-auto border-t border-white/[0.06]">
            <div className="w-full max-w-[1600px] mx-auto p-6 space-y-6">
              
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

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-start justify-between p-4 rounded-xl border border-red-500/20 bg-[#09090b] text-red-400 text-sm shadow-sm"
                  >
                    <div className="flex gap-2.5 items-start">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span className="font-medium">{error}</span>
                    </div>
                    <button onClick={() => setError("")} className="text-red-400/50 hover:text-red-400 ml-4 font-bold transition-colors">✕</button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="border border-white/[0.06] bg-[#111214] rounded-2xl overflow-hidden shadow-2xl">
                <Tabs
                  value={activeTab}
                  onValueChange={(val) => {
                    setActiveTab(val);
                    if (val === "chart" || val === "results" || val === "insights") {
                      setActiveSection(val);
                    }
                  }}
                  className="flex flex-col"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] bg-[#0d0e10] px-6 py-2">
                    <TabsList className="h-auto bg-transparent p-0 gap-6 flex items-center">
                      {[
                        { value: "chart", label: "Visualization", icon: BarChart3 },
                        { value: "results", label: "Data Grid", icon: Table },
                        { value: "insights", label: "AI Insights", icon: Sparkles },
                      ].map((item) => (
                        <TabsTrigger
                          key={item.value}
                          value={item.value}
                          className="group relative -mb-[9px] flex items-center gap-2 rounded-none bg-transparent px-0 pb-3 pt-1 text-sm font-medium text-slate-400 shadow-none transition-all hover:text-slate-200 data-[state=active]:bg-transparent data-[state=active]:text-white"
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#d9e2ff] opacity-0 transition-opacity duration-200 group-data-[state=active]:opacity-100" />
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-[#09090b] px-3 py-1.5 font-sans text-slate-300">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        <span>Dynamic Runtime Horizon</span>
                      </div>
                    </div>
                  </div>

                  {/* Core Interactive Body Canvas */}
                  <div className="p-6 bg-transparent">
                    {isLoading ? (
                      <div className="h-[480px] flex flex-col gap-5 animate-pulse">
                        <div className="flex gap-3">
                          <Skeleton className="h-9 w-24 bg-white/[0.02] rounded-xl" />
                          <Skeleton className="h-9 w-24 bg-white/[0.02] rounded-xl" />
                        </div>
                        <Skeleton className="flex-1 w-full bg-white/[0.02] rounded-2xl border border-white/[0.04]" />
                      </div>
                    ) : (
                      <div className="grid min-h-[480px] grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_320px]">
                        
                        {/* Primary Functional Panel Canvas Frame Column */}
                        <div className="min-w-0 space-y-6">
                          
                          <TabsContent value="chart" className="m-0 h-[410px] outline-none">
                            <div className="h-full flex flex-col justify-between">
                              <div className="mb-2">
                                <h3 className="text-sm font-bold text-white tracking-tight">{dataMetadata.title}</h3>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                  {activeConnection ? `Context target stream location: postgres://${activeConnection.name}` : 'Execute workspace instruction.'}
                                </p>
                              </div>
                              <div className="flex-1 h-[340px] min-h-0">
                                <ChartPanel data={data} chartRecommendation={chartRec} />
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="results" className="m-0 h-[410px] outline-none">
                            <div className="h-full overflow-hidden">
                              <ResultsPanel data={data} />
                            </div>
                          </TabsContent>

                          <TabsContent value="insights" className="m-0 h-[410px] outline-none">
                            <div className="h-full overflow-hidden">
                              <InsightsPanel data={data} explanation={explanation} insights={insights} />
                            </div>
                          </TabsContent>

                          <div ref={sqlRef} className="border border-white/[0.06] rounded-2xl overflow-hidden bg-[#070708]">
                            <div className="h-[320px]">
                              <SQLDisplay sql={sql} />
                            </div>
                          </div>

                        </div>

                        <aside className="flex flex-col gap-4 border-l border-white/[0.06] pl-6 lg:h-[760px] overflow-y-auto custom-scrollbar">
                          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                              <Clock className="h-4 w-4 text-slate-500" /> Pipeline Logs
                            </h3>
                            <span className="text-xs font-mono bg-[#09090b] px-2.5 py-0.5 rounded border border-white/[0.06] text-slate-300 font-semibold">
                              {executionTime > 0 ? `${executionTime}ms` : "0ms"}
                            </span>
                          </div>

                          <div className="font-mono text-xs bg-[#09090b] p-4 rounded-xl border border-white/[0.06] space-y-2.5 text-slate-400">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Record Volume:</span>
                              <span className="text-slate-200 font-bold">{data.length} records</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Field Metrics:</span>
                              <span className="text-slate-200 font-bold">{dataMetadata.dimensions} columns</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Primary Aggregation:</span>
                              <span className="text-slate-100 font-bold truncate max-w-[120px]">{dataMetadata.primaryMetric}</span>
                            </div>
                          </div>

                          <div className="bg-[#09090b] p-4 rounded-xl border border-white/[0.06] flex-1 flex flex-col justify-between min-h-[240px]">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
                                <Sparkles className="h-4 w-4 text-slate-500" />
                                <span>Agent Evaluation Model</span>
                              </div>
                              <p className="text-sm leading-relaxed text-slate-300 overflow-y-auto max-h-[280px] custom-scrollbar">
                                {explanation || "Awaiting core pipeline compilation stream sequence parameters to compute model insights parameters."}
                              </p>
                            </div>

                            {data.length > 0 && (
                              <div className="pt-3 border-t border-white/[0.06] mt-3">
                                <button
                                  onClick={handleFollowUp}
                                  className="w-full flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#111214] p-3 text-left text-xs text-slate-300 hover:bg-[#16171a] transition-colors"
                                >
                                  <span className="truncate text-slate-400">Isolate deviation coordinates</span>
                                  <Send className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                </button>
                              </div>
                            )}
                          </div>
                        </aside>

                      </div>
                    )}
                  </div>
                </Tabs>
              </div>

            </div>
          </main>
        )}
      </div>
    </div>
  );
}