"use client";

import { Header } from "@/components/Layout/Header";
import { Sidebar } from "@/components/Layout/Sidebar";
import { QueryInput } from "@/components/Query/QueryInput";
import { SQLDisplay } from "@/components/Query/SQLDisplay";
import { ResultsPanel } from "@/components/Results/ResultsPanel";
import { InsightsPanel } from "@/components/Results/InsightsPanel";
import { ChartPanel } from "@/components/Chat/Visualizer";
import { HistoryPanel } from "@/components/History/HistoryPanel";
import { AddConnectionDialog } from "@/components/Shared/AddConnectionDialog";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { useState, useCallback } from "react";
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
  Code2,
  MoreHorizontal,
  AlertTriangle,
  Send,
  TrendingUp,
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
  const [showHistory, setShowHistory] = useState(false);
  const [querySource, setQuerySource] = useState("");
  const [executionTime, setExecutionTime] = useState(0);
  const [error, setError] = useState("");

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
      setQuerySource(res.data.query_source || "");
      setExecutionTime(res.data.execution_time_ms || 0);
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
      setShowHistory(false);

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
            setQuerySource(res.data.query_source || "");
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
    const prefix = data.length > 0 ? "Based on the previous results, " : "";
    setInput(prefix);
  };

  const activeConnection = connections.find((conn) => conn.id === activeConnectionId);

  return (
    <div className="relative flex h-[100dvh] overflow-hidden bg-[#0d0d0f] text-[#e5e1e4]">
      <Sidebar className="hidden w-[280px] lg:flex" />

      <div className="flex h-full min-w-0 flex-1 flex-col">
        <Header
          onExecute={handleSubmit}
          onHistory={() => setShowHistory(!showHistory)}
          isExecuting={isLoading}
          canExecute={Boolean(activeConnectionId && input.trim())}
        />

        {connections.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex items-center justify-center p-6 h-full overflow-y-auto"
          >
            <div className="max-w-2xl w-full p-12 rounded-3xl border-2 border-dashed border-border/60 bg-card/20 backdrop-blur-sm text-center space-y-8 flex flex-col items-center">
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
          <main className="custom-scrollbar relative flex-1 overflow-y-auto px-4 py-8 md:px-10 md:py-12">
            <div className="pointer-events-none absolute left-1/2 top-0 h-[440px] w-[820px] -translate-x-1/2 rounded-full bg-[#571bc1]/10 blur-[120px]" />

            <div className="relative mx-auto max-w-[1170px] space-y-8 pb-12">
              <motion.div
                layout
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
              >
                <QueryInput
                  value={input}
                  onChange={setInput}
                  onSubmit={handleSubmit}
                  onTemplateClick={handleTemplateClick}
                  isLoading={isLoading}
                  disabled={!activeConnectionId}
                />
              </motion.div>

              <motion.div layout className="mx-auto flex max-w-[960px] flex-wrap items-center justify-center gap-2 px-1">
                {data.length > 0 && (
                  <button
                    onClick={handleFollowUp}
                    className="flex items-center gap-1.5 rounded-full border border-[#afc6ff]/15 bg-[#afc6ff]/10 px-3 py-1.5 text-xs font-semibold text-[#afc6ff] transition-all hover:bg-[#afc6ff]/15"
                  >
                    <MessageSquarePlus className="h-3.5 w-3.5" />
                    Follow-up
                  </button>
                )}

                {querySource && (
                  <span
                    className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-sm ${
                      querySource === "DYNAMIC"
                        ? "border border-[#4edea3]/20 bg-[#4edea3]/10 text-[#4edea3]"
                        : "border border-[#d0bcff]/20 bg-[#d0bcff]/10 text-[#d0bcff]"
                    }`}
                  >
                    {querySource === "DYNAMIC" ? <Zap className="w-3 h-3"/> : <Sparkles className="w-3 h-3"/>}
                    {querySource}
                    {executionTime > 0 && <span className="opacity-70 font-medium ml-1">· {executionTime}ms</span>}
                  </span>
                )}

                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all ${
                    showHistory
                      ? "border-[#afc6ff] bg-[#afc6ff] text-[#002760] shadow-md"
                      : "border-white/10 bg-[#353437]/50 text-[#c2c6d7] hover:bg-white/[0.06] hover:text-[#e5e1e4]"
                  }`}
                >
                  <Clock className={`h-3.5 w-3.5 ${showHistory ? "animate-pulse" : ""}`} />
                  History
                </button>
              </motion.div>

              {/* History panel (expandable) */}
              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="mx-auto min-h-[300px] w-full max-w-[960px] overflow-hidden rounded-3xl border border-white/10 bg-[#1c1b1d]/80 shadow-2xl"
                  >
                    <div className="h-full p-4 overflow-hidden flex flex-col">
                      <HistoryPanel
                        connectionId={activeConnectionId}
                        onReplay={handleReplay}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

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
                className="glass-panel overflow-hidden rounded-[24px] shadow-[0_30px_90px_rgba(0,0,0,0.32)]"
              >
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="flex min-h-[620px] flex-col"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-[#0e0e10]/55 px-6 py-4">
                    <TabsList className="h-auto gap-6 bg-transparent p-0">
                      <TabsTrigger
                        value="chart"
                        className="gap-2 rounded-none border-b-2 border-transparent bg-transparent px-0 pb-2 pt-0 text-sm font-semibold text-[#c2c6d7] shadow-none transition-all data-[state=active]:border-[#afc6ff] data-[state=active]:bg-transparent data-[state=active]:text-[#afc6ff] data-[state=active]:shadow-none"
                      >
                        <BarChart3 className="h-4 w-4" />
                        Visualization
                      </TabsTrigger>
                      <TabsTrigger
                        value="results"
                        className="gap-2 rounded-none border-b-2 border-transparent bg-transparent px-0 pb-2 pt-0 text-sm font-semibold text-[#c2c6d7] shadow-none transition-all data-[state=active]:border-[#afc6ff] data-[state=active]:bg-transparent data-[state=active]:text-[#afc6ff] data-[state=active]:shadow-none"
                      >
                        <Table className="h-4 w-4" />
                        Data Grid
                      </TabsTrigger>
                      <TabsTrigger
                        value="insights"
                        className="gap-2 rounded-none border-b-2 border-transparent bg-transparent px-0 pb-2 pt-0 text-sm font-semibold text-[#c2c6d7] shadow-none transition-all data-[state=active]:border-[#afc6ff] data-[state=active]:bg-transparent data-[state=active]:text-[#afc6ff] data-[state=active]:shadow-none"
                      >
                        <Sparkles className="h-4 w-4" />
                        AI Insights
                      </TabsTrigger>
                    </TabsList>
                    <div className="flex items-center gap-3">
                      {(executionTime > 0 || querySource) && (
                        <span className="rounded-md bg-[#353437]/45 px-3 py-1 font-mono text-xs text-[#8c90a0]">
                          {executionTime > 0 ? `Took ${(executionTime / 1000).toFixed(1)}s` : querySource}
                        </span>
                      )}
                      <button className="text-[#c2c6d7] transition-colors hover:text-[#e5e1e4]">
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 bg-[#1c1b1d]/30 p-5 md:p-6">
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
                      <div className="grid min-h-[540px] grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
                        <div className="min-w-0 space-y-6">
                          <TabsContent value="chart" className="m-0 h-[340px] outline-none">
                            <div className="h-full rounded-2xl border border-white/[0.06] bg-[#0e0e10]/80 p-5">
                              <div className="mb-4 flex items-start justify-between">
                                <div>
                                  <h3 className="text-lg font-semibold tracking-tight text-[#e5e1e4]">
                                    Monthly Revenue vs. Churn Rate
                                  </h3>
                                  <p className="mt-1 text-sm font-medium tracking-wide text-[#c2c6d7]">
                                    {activeConnection ? `Aggregated from ${activeConnection.name}.` : 'Run a query to generate a visualization.'}
                                  </p>
                                </div>
                              </div>
                              <div className="h-[250px]">
                                <ChartPanel
                                  data={data}
                                  chartRecommendation={chartRec}
                                />
                              </div>
                            </div>
                          </TabsContent>
                          <TabsContent value="results" className="m-0 h-[340px] outline-none">
                            <div className="h-full rounded-2xl border border-white/[0.06] bg-[#0e0e10]/80 p-5">
                              <ResultsPanel data={data} />
                            </div>
                          </TabsContent>
                          <TabsContent value="insights" className="m-0 h-[340px] outline-none">
                            <div className="h-full rounded-2xl border border-white/[0.06] bg-[#0e0e10]/80 p-5">
                              <InsightsPanel
                                data={data}
                                explanation={explanation}
                                insights={insights}
                              />
                            </div>
                          </TabsContent>

                          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0e0e10]/80">
                            <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#353437]/60 px-4 py-3">
                              <div className="flex items-center gap-2 font-mono text-xs font-medium tracking-widest text-[#e5e1e4]">
                                <Code2 className="h-4 w-4" />
                                Generated SQL
                              </div>
                            </div>
                            <div className="h-[260px] p-4">
                              <SQLDisplay sql={sql} />
                            </div>
                          </div>
                        </div>

                        <aside className="flex min-h-0 flex-col gap-5">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#571bc1] to-[#d0bcff] shadow-[0_0_22px_rgba(87,27,193,0.42)]">
                              <Sparkles className="h-5 w-5 text-[#002d6d]" fill="currentColor" />
                            </div>
                            <p className="text-sm leading-relaxed text-[#e5e1e4]">
                              {explanation || `I will analyze the results from ${activeConnection?.name || 'your active database'} and surface key patterns here.`}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e10]/55 p-5">
                            <div className="mb-3 flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-[#4edea3]" />
                              <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-[#e5e1e4]">Growth Spike</h4>
                            </div>
                            <p className="text-sm leading-relaxed text-[#c2c6d7]">
                              {data.length > 0
                                ? `${data.length} rows returned. Use the chart controls to compare measures and spot momentum.`
                                : 'Run a query to populate trend and growth summaries.'}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-[#ffb4ab]/25 bg-[#93000a]/12 p-5">
                            <div className="mb-3 flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-[#ffb4ab]" />
                              <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-[#ffb4ab]">Churn Anomaly</h4>
                            </div>
                            <p className="text-sm leading-relaxed text-[#c2c6d7]">
                              {error || 'Anomaly notes will appear when the AI detects unusual movements in your result set.'}
                            </p>
                            <button
                              onClick={handleFollowUp}
                              className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#afc6ff] transition-colors hover:text-[#d9e2ff]"
                            >
                              Run deeper cohort analysis <Send className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="mt-auto border-t border-white/[0.06] pt-5">
                            <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-[#8c90a0]">
                              Suggested Follow-up
                            </p>
                            <button
                              onClick={() => setInput('Compare this year vs last year')}
                              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#353437]/75 p-4 text-left text-sm text-[#e5e1e4] transition-colors hover:bg-[#424754]/80"
                            >
                              <span className="truncate">Compare this year vs last year</span>
                              <Send className="h-4 w-4 text-[#8c90a0]" />
                            </button>
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

      {/* Connection Status Banner */}
      <AnimatePresence>
        {!activeConnectionId && connections.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 bg-amber-500/10 border border-amber-500/30 rounded-full px-5 py-2.5 z-50 shadow-lg backdrop-blur-md flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <p className="text-amber-600 dark:text-amber-400 text-sm font-semibold tracking-wide">
              Select a database from the sidebar to begin
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
