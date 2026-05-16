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

  return (
    <div className="flex relative h-[100dvh] bg-[#fcfcfc] dark:bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <Sidebar className="hidden lg:flex w-72 border-r border-border/50 bg-card/30 backdrop-blur-xl" />

      <div className="flex-1 flex flex-col h-full min-w-0">
        <Header />

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
          <main className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden p-4 lg:p-6 gap-4 lg:gap-6 bg-muted/10">
            {/* Left Panel - Query Input + History toggle */}
            <motion.div
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="w-full lg:w-[420px] flex-shrink-0 flex flex-col gap-4 h-fit lg:h-full"
            >
              {/* Query Input card */}
              <motion.div
                layout
                className={`bg-card rounded-2xl p-5 lg:p-6 border border-border/60 shadow-sm transition-all ${showHistory ? "flex-shrink-0" : "flex-1 lg:max-h-full"}`}
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

              {/* Context indicator + History toggle */}
              <motion.div layout className="flex items-center gap-2 flex-wrap px-1">
                {data.length > 0 && (
                  <button
                    onClick={handleFollowUp}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-all border border-primary/10"
                  >
                    <MessageSquarePlus className="h-3.5 w-3.5" />
                    Follow-up
                  </button>
                )}

                {querySource && (
                  <span
                    className={`flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full font-semibold shadow-sm ${
                      querySource === "DYNAMIC"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20"
                    }`}
                  >
                    {querySource === "DYNAMIC" ? <Zap className="w-3 h-3"/> : <Sparkles className="w-3 h-3"/>}
                    {querySource}
                    {executionTime > 0 && <span className="opacity-70 font-medium ml-1">· {executionTime}ms</span>}
                  </span>
                )}

                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`ml-auto flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full transition-all border ${
                    showHistory
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted"
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
                    className="flex-shrink-0 lg:flex-1 min-h-[300px] bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden"
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
            </motion.div>

            {/* Right Panel - SQL & Results */}
            <motion.div
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="flex-1 flex flex-col gap-4 lg:gap-6 min-w-0 min-h-[600px] lg:min-h-0"
            >
              {/* SQL Display */}
              <div className="h-[280px] flex-shrink-0 bg-card rounded-2xl p-6 border border-border/60 shadow-sm">
                {isLoading ? (
                  <div className="flex flex-col gap-4 h-full pt-2 animate-pulse">
                    <div className="flex items-center gap-3 mb-2">
                      <Skeleton className="h-6 w-6 rounded-md bg-muted-foreground/20" />
                      <Skeleton className="h-5 w-40 bg-muted-foreground/10" />
                    </div>
                    <div className="space-y-3 mt-4">
                      <Skeleton className="h-4 w-1/2 bg-muted-foreground/10" />
                      <Skeleton className="h-4 w-3/4 bg-muted-foreground/10" />
                      <Skeleton className="h-4 w-2/3 bg-muted-foreground/10" />
                      <Skeleton className="h-4 w-1/3 bg-muted-foreground/10" />
                    </div>
                  </div>
                ) : (
                  <SQLDisplay sql={sql} />
                )}
              </div>

              {/* Error Banner */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-xl px-5 py-4 shadow-sm"
                  >
                    <span className="text-destructive font-medium text-sm flex-1">{error}</span>
                    <button
                      onClick={() => setError("")}
                      className="text-destructive/60 hover:text-destructive transition-colors text-sm font-bold bg-destructive/10 rounded-full w-6 h-6 flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Results / Chart / Insights Tabs */}
              <div className="flex-1 bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden flex flex-col">
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="h-full flex flex-col"
                >
                  <div className="px-6 pt-4 border-b border-border/50 bg-muted/20">
                    <TabsList className="bg-transparent h-12 p-0 gap-6">
                      <TabsTrigger
                        value="chart"
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-2 py-3 gap-2 font-semibold text-muted-foreground transition-all"
                      >
                        <BarChart3 className="h-4 w-4" />
                        Chart
                      </TabsTrigger>
                      <TabsTrigger
                        value="results"
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-2 py-3 gap-2 font-semibold text-muted-foreground transition-all"
                      >
                        <Table className="h-4 w-4" />
                        Data Grid
                      </TabsTrigger>
                      <TabsTrigger
                        value="insights"
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-2 py-3 gap-2 font-semibold text-muted-foreground transition-all"
                      >
                        <Sparkles className="h-4 w-4" />
                        AI Insights
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="flex-1 p-6 overflow-hidden bg-card">
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
                      <>
                        <TabsContent value="chart" className="h-full m-0 outline-none">
                          <ChartPanel
                            data={data}
                            chartRecommendation={chartRec}
                          />
                        </TabsContent>
                        <TabsContent value="results" className="h-full m-0 outline-none">
                          <ResultsPanel data={data} />
                        </TabsContent>
                        <TabsContent value="insights" className="h-full m-0 outline-none">
                          <InsightsPanel
                            data={data}
                            explanation={explanation}
                            insights={insights}
                          />
                        </TabsContent>
                      </>
                    )}
                  </div>
                </Tabs>
              </div>
            </motion.div>
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