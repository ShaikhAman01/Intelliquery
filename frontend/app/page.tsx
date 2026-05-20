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
import { useState, useCallback, useRef, useMemo } from "react";
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
  Users,
  Calendar,
} from "lucide-react";
import { useSession } from "@/lib/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";

import { motion, AnimatePresence } from "motion/react";

export default function Dashboard() {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="flex h-[100dvh] w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <Loader2 className="h-10 w-10 animate-spin text-primary relative z-10" />
          </div>
          <p className="text-sm font-medium text-muted-foreground animate-pulse tracking-wide uppercase">
            Initializing Intelliquery
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
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Sophisticated Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay" />

      {/* Hero Section */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="max-w-5xl w-full text-center space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="space-y-6"
          >
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/5 rounded-[2rem] flex items-center justify-center shadow-[0_0_40px_rgba(var(--primary),0.15)] border border-primary/20 backdrop-blur-xl">
              <Database className="w-12 h-12 text-primary drop-shadow-md" />
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-foreground">
              Welcome to <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">Intelliquery</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Transform natural language into powerful SQL queries. Connect your
              databases and start exploring data with AI-powered intelligence.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button
              size="lg"
              className="w-full sm:w-auto gap-2 text-base h-14 px-10 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] transition-all duration-300 hover:-translate-y-1 rounded-full font-semibold"
              onClick={() => (window.location.href = "/sign-up")}
            >
              Get Started Free
              <Sparkles className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto gap-2 text-base h-14 px-10 border-border hover:bg-muted/50 transition-all duration-300 rounded-full font-medium"
              onClick={() => (window.location.href = "/sign-in")}
            >
              Sign In
            </Button>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20"
          >
            <div className="group p-8 rounded-3xl bg-card/40 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl hover:border-primary/30 transition-all duration-300">
              <div className="bg-emerald-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-7 h-7 text-emerald-500" />
              </div>
              <h3 className="font-bold text-xl mb-3">AI Powered</h3>
              <p className="text-muted-foreground leading-relaxed">
                State-of-the-art AI models translate your natural language
                queries into accurate, optimized SQL instantly.
              </p>
            </div>
            <div className="group p-8 rounded-3xl bg-card/40 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl hover:border-primary/30 transition-all duration-300">
              <div className="bg-blue-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="w-7 h-7 text-blue-500" />
              </div>
              <h3 className="font-bold text-xl mb-3">Smart Visualizer</h3>
              <p className="text-muted-foreground leading-relaxed">
                Automatically visualize your query results with beautiful,
                interactive charts and exportable graphics.
              </p>
            </div>
            <div className="group p-8 rounded-3xl bg-card/40 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl hover:border-primary/30 transition-all duration-300">
              <div className="bg-purple-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Table className="w-7 h-7 text-purple-500" />
              </div>
              <h3 className="font-bold text-xl mb-3">Multi-Database</h3>
              <p className="text-muted-foreground leading-relaxed">
                Connect to PostgreSQL, MySQL, SQLite, and more. Query across
                databases with unified intelligence.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 border-t border-border/40 bg-background/50 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 py-8 text-center flex justify-between items-center">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Database className="w-5 h-5 text-primary" /> Intelliquery
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 Intelliquery. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

function DashboardContent() {
  const { connections, activeConnectionId, isLoading, setLoading } = useStore();
  const { toast } = useToast();

  const [input, setInput] = useState("");
  const [sql, setSql] = useState("");
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [explanation, setExplanation] = useState("");
  const [insights, setInsights] = useState<unknown>(null);

  const [chartRec, setChartRec] = useState<
    | {
        chart_type: "bar" | "line" | "pie" | "kpi" | "area" | "table";
        reason?: string;
      }
    | undefined
  >();

  const [activeTab, setActiveTab] = useState("chart");
  const [activeSection, setActiveSection] = useState<
    "chart" | "results" | "insights" | "explainer"
  >("chart");
  const [querySource, setQuerySource] = useState("");
  const [executionTime, setExecutionTime] = useState(0);
  const [error, setError] = useState("");

  const activeConnection = useMemo(() => connections.find((conn) => conn.id === activeConnectionId), [connections, activeConnectionId]);
  const queryRef = useRef<HTMLDivElement>(null);
  const sqlRef = useRef<HTMLDivElement>(null);

  const dataMetadata = useMemo(() => {
    if (!data || data.length === 0) return { title: "Analytical Workspace View", primaryMetric: "—", dimensions: 0 };
    const columns = Object.keys(data[0]);
    const matchedNumber = columns.find(c => typeof data[0][c] === "number");
    const matchedString = columns.find(c => typeof data[0][c] === "string") || columns[0];

    return {
      title: matchedNumber && matchedString ? `Evaluation of ${matchedNumber.toUpperCase()} relative to ${matchedString.toUpperCase()}` : "Dynamic Target Analytics Matrix",
      primaryMetric: matchedNumber ? matchedNumber.replace(/_/g, " ") : "Row Metric Count",
      dimensions: columns.length
    };
  }, [data]);

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
      setChartRec(
        (res.data.chart_recommendation as typeof chartRec) || undefined,
      );
      setQuerySource(res.data.query_source || "ENGINE");
      setExecutionTime(res.data.execution_time_ms || duration);
      setInsights(res.data.visualization || null);

      toast(`Query executed successfully in ${duration}ms`, "success");

      if (res.data.data?.length > 0) {
        setActiveTab("chart");
      } else {
        setActiveTab("results");
      }
    } catch (err: unknown) {
      let detail = "Unknown error";
      if (err instanceof Error) {
        detail = err.message;
      } else if (typeof err === "object" && err !== null) {
        const errObj = err as Record<string, unknown>;
        if (
          errObj.response &&
          typeof errObj.response === "object" &&
          "data" in (errObj.response as Record<string, unknown>)
        ) {
          const data = (errObj.response as Record<string, unknown>).data;
          if (
            data &&
            typeof data === "object" &&
            "detail" in (data as Record<string, unknown>)
          ) {
            const detailVal = (data as Record<string, unknown>).detail;
            if (typeof detailVal === "string") {
              detail = detailVal;
            }
          }
        }
      }
      setError(detail);
      toast(`Error: ${detail}`, "error");
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

        api
          .post("/query/generate", null, {
            params: { user_query: question, connection_id: activeConnectionId },
          })
          .then((res) => {
            setSql(res.data.sql || "");
            setData(res.data.data || []);
            setExplanation(res.data.explanation || "");
            setChartRec(
              (res.data.chart_recommendation as typeof chartRec) || undefined,
            );
            setQuerySource(res.data.query_source || "ENGINE");
            setExecutionTime(res.data.execution_time_ms || 0);
            setInsights(res.data.visualization || null);

            if (res.data.data?.length > 0) setActiveTab("chart");
          })
          .catch((err) => {
            console.error("Replay failed:", err);
          })
          .finally(() => {
            setLoading(false);
          });
      }
    },
    [activeConnectionId, setLoading],
  );

  const handleFollowUp = () => {
    if (!input.trim()) return;
    setInput((prev) => `Refining investigation path: "${prev}". Isolate variance shifts inside trailing rows.`);
  };

  const handleSectionSelect = (
    section: "chart" | "results" | "insights" | "explainer" | "query",
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
    <div className="relative flex h-[100dvh] overflow-hidden bg-[#0b0b0c] text-[#e5e1e4]">
      <Sidebar className="hidden w-[260px] lg:flex" onNavigate={handleSectionSelect} onReplay={handleReplay} />

      <div className="flex h-full min-w-0 flex-1 flex-col">
        <Header
          onReplay={handleReplay}
          onSectionSelect={handleSectionSelect}
          activeSection={activeSection}
        >
          <div ref={queryRef}>
            <QueryInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              onTemplateClick={handleTemplateClick}
              isLoading={isLoading}
              disabled={!activeConnectionId}
              showSuggestions={false}
            />
          </div>
        </Header>

        {connections.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex items-center justify-center p-6 h-full overflow-y-auto"
          >
            <div className="max-w-2xl w-full p-12 rounded-3xl border border-dashed border-white/10 bg-card/20 backdrop-blur-sm text-center space-y-8 flex flex-col items-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                <div className="w-24 h-24 bg-card rounded-3xl flex items-center justify-center shadow-xl border border-border relative z-10">
                  <Database className="w-10 h-10 text-primary" />
                </div>
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-extrabold tracking-tight">
                  Connect Your Workspace
                </h2>
                <p className="text-muted-foreground text-lg px-4 max-w-lg mx-auto">
                  Add your first database connection to start generating intelligent SQL
                  queries instantly.
                </p>
              </div>
              
              <div className="pt-2">
                <AddConnectionDialog
                  trigger={
                    <Button
                      size="lg"
                      className="gap-3 h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.2)] hover:shadow-[0_0_30px_rgba(var(--primary),0.4)] transition-all rounded-full font-semibold text-base"
                    >
                      <Plus className="h-5 w-5" />
                      Add Connection
                    </Button>
                  }
                />
              </div>
            </div>
          </motion.div>
        ) : (
          <main className="custom-scrollbar relative flex-1 overflow-y-auto px-4 pb-6 md:px-6">
            <div className="pointer-events-none absolute inset-x-0 top-[-160px] h-[520px] bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.05),transparent_64%)]" />

            <div className="relative mx-auto max-w-[1550px] space-y-6 pt-2 pb-6">
              <motion.div
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 }}
                className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-2 px-1"
              >
                {[
  {
    label: "Find unusual spikes in activity",
    icon: AlertTriangle,
    color: "text-[#ffb4ab]"
  },
  {
    label: "Compare weekly growth trends",
    icon: TrendingUp,
    color: "text-[#4edea3]"
  },
  {
    label: "Detect anomalies in recent records",
    icon: Zap,
    color: "text-[#d0bcff]"
  },
].map(({ label, icon: Icon, color }) => (
                  <button
                    key={label}
                    onClick={() => handleTemplateClick(label)}
                    disabled={isLoading || !activeConnectionId}
                    className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-[#121214] px-3.5 py-1.5 text-[12px] font-medium text-slate-400 shadow-sm transition-all duration-300 hover:border-white/10 hover:bg-[#1a1a1c] hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
                    {label}
                  </button>
                ))}
              </motion.div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="mx-auto flex max-w-[960px] items-start gap-3 rounded-2xl border border-[#ffb4ab]/20 bg-[#93000a]/20 px-5 py-4 shadow-sm"
                  >
                    <span className="flex-1 text-sm font-medium text-[#ffb4ab]">{error}</span>
                    <button
                      onClick={() => setError("")}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ffb4ab]/10 text-sm font-bold text-[#ffb4ab]/60 transition-colors hover:text-[#ffb4ab]"
                    >
                      ✕
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                layout
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.42, delay: 0.16 }}
                className="glass-panel overflow-hidden rounded-2xl border border-white/[0.06]"
              >
                <Tabs
                  value={activeTab}
                  onValueChange={(value) => {
                    setActiveTab(value);
                    if (value === "chart" || value === "results" || value === "insights") {
                      setActiveSection(value);
                    }
                  }}
                  className="flex min-h-[640px] flex-col"
                >
  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.05] bg-[#121214]/70 px-6 py-2.5 backdrop-blur-xl">
<TabsList className="h-auto gap-8 bg-transparent p-0">
  <TabsTrigger
    value="chart"
    className="-mb-px flex items-center gap-2 rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 pb-3 pt-0 text-[13px] font-medium text-slate-500 outline-none ring-0 shadow-none transition-all duration-200 hover:bg-transparent hover:text-slate-300 focus-visible:ring-0 focus-visible:outline-none data-[state=active]:border-[#d9e2ff] data-[state=active]:bg-transparent data-[state=active]:text-[#eef2ff] data-[state=active]:shadow-none"
  >
    <BarChart3 className="h-4 w-4" />
    Visualization
  </TabsTrigger>

  <TabsTrigger
    value="results"
    className="-mb-px flex items-center gap-2 rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 pb-3 pt-0 text-[13px] font-medium text-slate-500 outline-none ring-0 shadow-none transition-all duration-200 hover:bg-transparent hover:text-slate-300 focus-visible:ring-0 focus-visible:outline-none data-[state=active]:border-[#d9e2ff] data-[state=active]:bg-transparent data-[state=active]:text-[#eef2ff] data-[state=active]:shadow-none"
  >
    <Table className="h-4 w-4" />
    Data Grid
  </TabsTrigger>

  <TabsTrigger
    value="insights"
    className="-mb-px flex items-center gap-2 rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 pb-3 pt-0 text-[13px] font-medium text-slate-500 outline-none ring-0 shadow-none transition-all duration-200 hover:bg-transparent hover:text-slate-300 focus-visible:ring-0 focus-visible:outline-none data-[state=active]:border-[#d9e2ff] data-[state=active]:bg-transparent data-[state=active]:text-[#eef2ff] data-[state=active]:shadow-none"
  >
    <Sparkles className="h-4 w-4" />
    AI Insights
  </TabsTrigger>
</TabsList>

  <div className="flex items-center gap-2 text-xs text-slate-400">
    <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 font-mono text-[11px] text-slate-300 transition-colors duration-200 hover:border-white/[0.08] hover:bg-white/[0.04]">
      <Calendar className="h-3.5 w-3.5 text-slate-500" />
      <span>Dynamic Runtime Timeframe</span>
    </div>
  </div>
</div>

                  <div className="flex-1 bg-transparent p-5 md:p-6">
                    {isLoading ? (
                      <div className="h-full flex flex-col gap-6 animate-pulse">
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-10 w-10 rounded-xl bg-muted-foreground/10" />
                          <Skeleton className="h-10 w-10 rounded-xl bg-muted-foreground/10" />
                          <Skeleton className="h-10 w-10 rounded-xl bg-muted-foreground/10" />
                          <div className="ml-auto flex gap-3">
                            <Skeleton className="h-10 w-28 rounded-xl bg-muted-foreground/10" />
                          </div>
                        </div>
                        <Skeleton className="flex-1 w-full rounded-2xl bg-muted-foreground/5 border border-border/50" />
                      </div>
                    ) : (
                      <div className="grid min-h-[560px] grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
                        <div className="min-w-0 space-y-6">
                          <TabsContent value="chart" className="m-0 h-[410px] outline-none">
                            <div className="premium-card h-full rounded-xl p-5 border border-white/[0.04] bg-[#121214]/40">
                              <div className="mb-4">
                                <h3 className="text-sm font-semibold tracking-tight text-[#e5e1e4] font-mono">
                                  {dataMetadata.title}
                                </h3>
                                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                                  {activeConnection ? `Operational Instance Path: postgres://${activeConnection.name}` : 'Run a context workspace query.'}
                                </p>
                              </div>
                              <div className="h-[320px]">
                                <ChartPanel
                                  data={data}
                                  chartRecommendation={chartRec}
                                />
                              </div>
                            </div>
                          </TabsContent>
                          <TabsContent value="results" className="m-0 h-[410px] outline-none">
                            <div className="premium-card h-full rounded-xl border border-white/[0.04] bg-[#121214]/40 p-5">
                              <ResultsPanel data={data} />
                            </div>
                          </TabsContent>
                          <TabsContent value="insights" className="m-0 h-[410px] outline-none">
                            <div className="premium-card h-full rounded-xl border border-white/[0.04] bg-[#121214]/40 p-5">
                              <InsightsPanel
                                data={data}
                                explanation={explanation}
                                insights={insights}
                              />
                            </div>
                          </TabsContent>

                          <div ref={sqlRef} className="overflow-hidden bg-[#070708]">
                            <div className="h-[340px] py-4">
                              <SQLDisplay sql={sql} />
                            </div>
                          </div>
                        </div>

                        <aside className="flex min-h-0 flex-col gap-4 rounded-xl border border-white/[0.04] bg-[#0d0d0f] p-4">
                          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                            <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                              <Clock className="h-3.5 w-3.5 text-primary" /> Architecture Metrics
                            </h3>
                            <span className="text-[10px] font-mono bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                              {executionTime > 0 ? `${executionTime}ms` : "0ms"}
                            </span>
                          </div>
                          
                          <div className="font-mono text-[11px] bg-[#070708] p-3 rounded-lg border border-white/[0.04] space-y-2">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Row Matrix Volume:</span>
                              <span className="text-slate-200 font-bold">{data.length} entries</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Data Dimensions:</span>
                              <span className="text-slate-200 font-bold">{dataMetadata.dimensions} columns</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Primary Key Track:</span>
                              <span className="text-primary font-bold truncate max-w-[150px]">{dataMetadata.primaryMetric}</span>
                            </div>
                          </div>

                          <div className="bg-[#121214]/50 p-4 rounded-xl border border-white/[0.04] flex-1 flex flex-col justify-between min-h-[220px]">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                                <span>AI Agent Analysis Trace</span>
                              </div>
                              <p className="text-xs leading-relaxed text-slate-300 custom-scrollbar overflow-y-auto max-h-[160px]">
                                {explanation || `Awaiting structural execution stream to evaluate parameters from your data grid layers.`}
                              </p>
                            </div>

                            {data.length > 0 && (
                              <div className="pt-3 border-t border-white/[0.04] mt-2">
                                <button
                                  onClick={handleFollowUp}
                                  className="w-full flex items-center justify-between rounded-lg border border-white/10 bg-[#161618] p-3 text-left text-xs text-[#e5e1e4] transition hover:bg-[#1e1e21]"
                                >
                                  <span className="truncate font-mono text-[11px] text-slate-400">Drill down into structural telemetry variants</span>
                                  <Send className="h-3 w-3 text-slate-500" />
                                </button>
                              </div>
                            )}
                          </div>
                        </aside>
                      </div>
                    )}
                  </div>
                </Tabs>
              </motion.div>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}