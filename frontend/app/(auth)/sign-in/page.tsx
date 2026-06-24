import { Suspense } from "react";
import SignIn from "@/components/auth/sign-in";
import { Loader2, Database } from "lucide-react";

export default function SignInPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[#09090b] p-4 relative antialiased">
            {/* Minimalist Professional Grid Overlay instead of random blur circles */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-[300px] bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.03),transparent_70%)] pointer-events-none" />

            <div className="z-10 w-full max-w-[420px] space-y-6">
                {/* Visual Anchor: Standardize your brand logo entry points */}
                <div className="flex flex-col items-center gap-2 text-center select-none">
                    <div className="h-10 w-10 rounded-xl bg-[#111214] border border-white/[0.08] flex items-center justify-center shadow-sm">
                        <Database className="h-5 w-5 text-slate-200" />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-white">Welcome back</h1>
                    <p className="text-xs text-slate-400">Enter your credentials to access your workspace</p>
                </div>

                <Suspense fallback={
                    <div className="flex flex-col items-center justify-center space-y-3 text-slate-400 bg-[#111214] border border-white/[0.06] rounded-2xl p-8 h-[340px]">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Loading secure gateway</p>
                    </div>
                }>
                    <div className="bg-[#111214] border border-white/[0.06] rounded-2xl p-6 shadow-2xl">
                        <SignIn />
                    </div>
                </Suspense>
            </div>
        </div>
    );
}