"use client";

import { useTransition, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function SignUp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const { error } = await authClient.signUp.email({ email, password, name });
      if (error) {
        setError(error.message || "Something went wrong");
      } else {
        router.push(redirectTo);
      }
    });
  };

  const handleGoogleSignIn = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: redirectTo,
    });
  };

  return (
    <Card className="w-full border-transparent bg-transparent shadow-none">
      <CardHeader className="p-0 pb-6">
        <CardTitle className="text-xl font-bold tracking-tight text-white">
          Create Account
        </CardTitle>
        <CardDescription className="text-xs text-slate-400 mt-1">
          Join Intelliquery to provision your query execution node
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0 space-y-5">
        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-medium text-slate-300">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Aman Shaikh"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-[#09090b] border-white/[0.06] rounded-xl focus:border-slate-400 h-10 transition-all placeholder:text-slate-600 text-sm outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium text-slate-300">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-[#09090b] border-white/[0.06] rounded-xl focus:border-slate-400 h-10 transition-all placeholder:text-slate-600 text-sm outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium text-slate-300">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-[#09090b] border-white/[0.06] rounded-xl focus:border-slate-400 h-10 transition-all text-sm outline-none pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl border text-red-400 bg-[#09090b] border-red-500/20 text-xs font-medium animate-fadeIn">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-10 bg-white hover:bg-slate-200 text-zinc-950 font-semibold rounded-xl text-sm transition-colors mt-2"
            disabled={isPending}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Provision Workspace Account
          </Button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/[0.06]" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-semibold">
            <span className="bg-[#111214] px-3 text-slate-500 select-none">
              Or identity broker SSO
            </span>
          </div>
        </div>

        <Button
          variant="ghost"
          type="button"
          className="w-full h-10 border border-white/[0.06] bg-[#09090b] hover:bg-[#16171a] rounded-xl text-sm text-slate-300 hover:text-white transition-all font-medium"
          onClick={handleGoogleSignIn}
        >
          <svg className="mr-2 h-4 w-4" aria-hidden="true" viewBox="0 0 488 512">
            <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
          </svg>
          Register with Google
        </Button>
      </CardContent>

      <CardFooter className="justify-center p-0 pt-5 border-t border-white/[0.04] mt-5">
        <p className="text-xs text-slate-400">
          Already have an account?{" "}
          <Link
            href={redirectTo !== "/" ? `/sign-in?redirect=${encodeURIComponent(redirectTo)}` : "/sign-in"}
            className="text-white font-semibold hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}