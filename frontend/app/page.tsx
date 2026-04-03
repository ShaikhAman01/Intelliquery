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
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading Intelliquery...
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
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />

      {/* Hero Section */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center glow-cyan mx-auto shadow-xl border border-primary/20">
              <Database className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground">
              Welcome to <span className="text-primary">Intelliquery</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Transform natural language into powerful SQL queries. Connect your
              databases and start exploring data with AI-powered intelligence.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              size="lg"
              className="w-full sm:w-auto gap-2 text-base h-12 px-8 gradient-btn text-white transition-all shadow-lg hover:scale-105 active:scale-95"
              onClick={() => (window.location.href = "/sign-up")}
            >
              Get Started Free
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto gap-2 text-base h-12 px-8 border-primary/20 hover:bg-primary/5 transition-all"
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
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16"
          >
            <div className="p-6 rounded-xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-emerald-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">AI Powered</h3>
              <p className="text-muted-foreground">
                State-of-the-art AI models translate your natural language
                queries into accurate, optimized SQL instantly.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-blue-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Smart Visualizer</h3>
              <p className="text-muted-foreground">
                Automatically visualize your query results with beautiful,
                interactive charts and exportable graphics.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-purple-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Table className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Multi-Database</h3>
              <p className="text-muted-foreground">
                Connect to PostgreSQL, MySQL, SQLite, and more. Query across
                databases with unified intelligence.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-8 text-center">
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

      const duration = Math.round(performance.now() - startTime); // ✅ FIXED

      setSql(res.data.sql || "");
      setData(res.data.data || []);
      setExplanation(res.data.explanation || "");
      setChartRec(
        (res.data.chart_recommendation as typeof chartRec) || undefined,
      );
      setQuerySource(res.data.query_source || "");
      setExecutionTime(res.data.execution_time_ms || 0);

      setInsights(res.data.visualization || null); // ✅ FIXED

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

            setInsights(res.data.visualization || null); // ✅ FIXED

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
    <div className="flex relative h-[100dvh] bg-background text-foreground overflow-hidden">
      {/* Sidebar for database connections */}
      <Sidebar className="hidden lg:flex w-64" />

      <div className="flex-1 flex flex-col h-full min-w-0">
        <Header />

        {connections.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex items-center justify-center p-6 h-full overflow-y-auto"
          >
            <div className="max-w-md text-center space-y-6 flex flex-col items-center">
              <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center glow-cyan mb-4 shadow-xl border border-primary/20">
                <Database className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Welcome to Intelliquery
              </h2>
              <p className="text-muted-foreground text-base px-4">
                Connect your first database to start generating intelligent SQL
                queries instantly using plain English.
              </p>
              <div className="pt-4">
                <AddConnectionDialog
                  trigger={
                    <Button
                      size="lg"
                      className="w-full sm:w-auto gap-2 text-base h-12 px-8 gradient-btn text-white transition-all shadow-lg hover:scale-105 active:scale-95"
                    >
                      <Plus className="h-5 w-5" />
                      Connect Database
                    </Button>
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4 w-full mt-12 text-left">
                <div className="p-4 rounded-xl bg-card border border-border shadow-sm">
                  <div className="bg-emerald-500/10 w-8 h-8 rounded-lg flex items-center justify-center mb-3">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">AI Powered</h3>
                  <p className="text-xs text-muted-foreground">
                    State-of-the-art models translate user intent into accurate
                    generic SQL.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border shadow-sm">
                  <div className="bg-blue-500/10 w-8 h-8 rounded-lg flex items-center justify-center mb-3">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">Visualizer</h3>
                  <p className="text-xs text-muted-foreground">
                    Instantly map your SQL results to beautiful, exportable
                    charts.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <main className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden p-4 lg:p-6 gap-4 lg:gap-6">
            {/* Left Panel - Query Input + History toggle */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="w-full lg:w-[400px] flex-shrink-0 flex flex-col gap-4 h-fit lg:h-full"
            >
              {/* Query Input card */}
              <div
                className={`bg-card rounded-xl p-4 lg:p-6 border border-border glow-border ${showHistory ? "flex-shrink-0" : "flex-1 lg:max-h-full"}`}
              >
                <QueryInput
                  value={input}
                  onChange={setInput}
                  onSubmit={handleSubmit}
                  onTemplateClick={handleTemplateClick}
                  isLoading={isLoading}
                  disabled={!activeConnectionId}
                />
              </div>

              {/* Context indicator + History toggle */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Follow-up button */}
                {data.length > 0 && (
                  <button
                    onClick={handleFollowUp}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg
                             bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <MessageSquarePlus className="h-3.5 w-3.5" />
                    Ask follow-up
                  </button>
                )}

                {/* Execution badge */}
                {querySource && (
                  <span
                    className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                      querySource === "DYNAMIC"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                    }`}
                  >
                    {querySource === "DYNAMIC" ? "⚡" : "🤖"} {querySource}
                    {executionTime > 0 && ` · ${executionTime}ms`}
                  </span>
                )}

                {/* History toggle */}
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    showHistory
                      ? "bg-primary/20 text-primary"
                      : "bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  History
                </button>
              </div>

              {/* History panel (expandable) */}
              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 0 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="flex-shrink-0 lg:flex-1 min-h-[300px] bg-card rounded-xl border border-border overflow-hidden"
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
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="flex-1 flex flex-col gap-4 lg:gap-6 min-w-0 min-h-[600px] lg:min-h-0"
            >
              {/* SQL Display */}
              <div className="h-[280px] flex-shrink-0 bg-card rounded-xl p-6 border border-border">
                {isLoading ? (
                  <div className="flex flex-col gap-4 h-full pt-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Skeleton className="h-5 w-5 rounded-md" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-3/4 delay-75" />
                    <Skeleton className="h-4 w-2/3 delay-150" />
                    <Skeleton className="h-4 w-1/3 delay-200" />
                    <div className="mt-auto flex justify-end">
                      <Skeleton className="h-8 w-24 rounded-lg" />
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
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3"
                  >
                    <span className="text-red-400 text-sm flex-1">{error}</span>
                    <button
                      onClick={() => setError("")}
                      className="text-red-400/60 hover:text-red-400 text-xs"
                    >
                      ✕
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Results / Chart / Insights Tabs */}
              <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden">
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="h-full flex flex-col"
                >
                  <div className="px-6 pt-4 border-b border-border">
                    <TabsList className="bg-muted/50">
                      <TabsTrigger
                        value="chart"
                        className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2"
                      >
                        <BarChart3 className="h-4 w-4" />
                        Chart
                      </TabsTrigger>
                      <TabsTrigger
                        value="results"
                        className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2"
                      >
                        <Table className="h-4 w-4" />
                        Results
                      </TabsTrigger>
                      <TabsTrigger
                        value="insights"
                        className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2"
                      >
                        <Sparkles className="h-4 w-4" />
                        Insights
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="flex-1 p-6 overflow-hidden">
                    {isLoading ? (
                      <div className="h-full flex flex-col gap-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Skeleton className="h-8 w-8 rounded-md" />
                          <Skeleton className="h-8 w-8 rounded-md" />
                          <Skeleton className="h-8 w-8 rounded-md" />
                          <div className="ml-auto flex gap-2">
                            <Skeleton className="h-8 w-24 rounded-md" />
                            <Skeleton className="h-8 w-20 rounded-md" />
                          </div>
                        </div>
                        <Skeleton className="flex-1 w-full rounded-xl" />
                      </div>
                    ) : (
                      <>
                        <TabsContent value="chart" className="h-full m-0">
                          <ChartPanel
                            data={data}
                            chartRecommendation={chartRec}
                          />
                        </TabsContent>
                        <TabsContent value="results" className="h-full m-0">
                          <ResultsPanel data={data} />
                        </TabsContent>
                        <TabsContent value="insights" className="h-full m-0">
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

      {/* Connection Status - subtle banner instead of blocking overlay */}
      <AnimatePresence>
        {!activeConnectionId && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2 z-50 shadow-lg backdrop-blur-sm"
          >
            <p className="text-amber-500 dark:text-amber-400 text-sm font-medium">
              💡 Connect a database from the sidebar to start generating queries
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
