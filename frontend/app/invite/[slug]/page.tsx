"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/use-auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Loader2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

interface InvitePageProps {
  params: Promise<{ slug: string }>;
}

export default function InviteLandingPage({ params }: InvitePageProps) {
  const { slug } = use(params);
  const router = useRouter();
  const { session, isLoading: authLoading } = useSession();
  
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !session) {
      router.push(`/sign-up?redirect=/invite/${slug}`);
    }
  }, [session, authLoading, slug, router]);

  const handleJoinWorkspace = async () => {
    setJoining(true);
    setError(null);
    try {
      await api.post(`/settings/team/join-via-slug/${slug}`);
      setSuccess(true);
      
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err: any) {
      const detail = err.response?.data?.detail || "An unexpected error occurred while joining the workspace.";
      setError(detail);
    } finally {
      setJoining(false);
    }
  };

  if (authLoading || (!session && !error)) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#e5e1e4] flex items-center justify-center p-6 relative">
      <div className="pointer-events-none absolute inset-x-0 top-[-160px] h-[520px] bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.04),transparent_64%)]" />

      <Card className="max-w-md w-full border-white/[0.06] bg-[#111214] rounded-2xl overflow-hidden shadow-2xl relative z-10">
        <CardHeader className="border-b border-white/[0.06] bg-[#0d0e10] py-6 px-6 text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-[#09090b] border border-white/[0.06] flex items-center justify-center mb-4">
            <Database className="h-5 w-5 text-slate-300" />
          </div>
          <CardTitle className="text-lg font-bold tracking-tight text-[#e5e1e4]">Workspace Invitation</CardTitle>
          <CardDescription className="text-sm text-slate-400 mt-1.5">
            You have been invited to collaborate on organization{" "}
            <span className="text-white font-semibold font-mono text-xs bg-[#09090b] px-1.5 py-0.5 rounded border border-white/[0.04]">
              {slug}
            </span>
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6 space-y-5 text-sm">
          {error && (
            <div className="flex items-start gap-2.5 p-4 rounded-xl border text-[#ffb4ab] bg-[#09090b] border-[#ffb4ab]/20">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed font-medium text-sm">{error}</p>
            </div>
          )}

          {success ? (
            <div className="flex flex-col items-center justify-center text-center py-6 space-y-3">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-200">Invitation Accepted</p>
                <p className="text-xs text-slate-500">Syncing workspace environment pools now...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-5 pt-1">
              <p className="text-slate-400 text-center text-sm leading-relaxed">
                Accepting this invitation will securely link your user profile to this workspace container. You will be granted instant access to shared metrics datasets, dynamic dashboards, and team query histories.
              </p>
              
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button 
                  variant="ghost" 
                  className="h-10 text-sm font-semibold rounded-xl border border-white/[0.06] bg-[#0d0e10] text-slate-300 hover:text-white transition-colors"
                  onClick={() => router.push("/")}
                  disabled={joining}
                >
                  Cancel
                </Button>
                <Button 
                  className="h-10 text-sm bg-white hover:bg-slate-200 text-zinc-950 font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  onClick={handleJoinWorkspace}
                  disabled={joining}
                >
                  {joining ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Join Team 
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}