"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      setErr("Please fill in all fields.");
      return;
    }
    setErr(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setErr("Invalid email or password.");
      return;
    }

    router.push(next);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="flex w-full max-w-3xl rounded-2xl overflow-hidden shadow-sm border border-gray-100">

        {/* Left panel */}
        <div className="hidden md:flex flex-col justify-between bg-[#0f1a2e] p-10 w-80 flex-shrink-0 relative overflow-hidden">
          <div className="absolute inset-0"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)",
              backgroundSize: "32px 32px"
            }}
          />
          <div className="relative flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#639922] rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 fill-white" viewBox="0 0 20 20">
                <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 2a6 6 0 110 12A6 6 0 0110 4zm-1 3v4l3.5 2-.7 1.2L8 12.5V7h1z"/>
              </svg>
            </div>
            <span className="font-serif text-white text-lg tracking-tight">Study Buddy</span>
          </div>
          <div className="relative">
            <p className="font-serif italic text-white text-2xl leading-snug mb-3">
              "Learning is a journey, not a destination."
            </p>
            <p className="text-white/40 text-sm font-light">
              Join thousands of students studying smarter every day.
            </p>
          </div>
          <div className="flex gap-1.5 relative">
            <div className="h-1.5 w-5 rounded bg-[#639922]" />
            <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
            <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 bg-white p-10 flex flex-col justify-center">
          <div className="mb-8">
            <h1 className="text-2xl font-serif text-gray-900 tracking-tight mb-1">Welcome back</h1>
            <p className="text-sm text-gray-500 font-light">Sign in to continue your learning journey</p>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-green-100 placeholder:text-gray-400 transition"
            />
          </div>

          <div className="mb-1">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="w-full h-10 pl-3 pr-10 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-green-100 placeholder:text-gray-400 transition"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition"
              >
                {showPassword
                  ? <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3l14 14M10 4c5 0 8 6 8 6s-.8 1.4-2.2 2.8M6.8 6.8A6.4 6.4 0 002 10s3 6 8 6c1.8 0 3.4-.6 4.7-1.6"/><circle cx="10" cy="10" r="2.5"/></svg>
                  : <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"/><circle cx="10" cy="10" r="2.5"/></svg>
                }
              </button>
            </div>
          </div>

          <div className="text-right mb-5">
            <a href="#" className="text-xs text-[#639922] hover:underline">Forgot password?</a>
          </div>

          {err && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
              {err}
            </p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-10 rounded-lg bg-[#0f1a2e] hover:bg-[#1a2d4a] text-white text-sm font-medium transition disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <div className="flex items-center gap-2.5 my-5">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 font-light">demo credentials</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
            <span className="text-[10px] font-medium bg-[#97C459] text-[#173404] px-2 py-0.5 rounded uppercase tracking-wider whitespace-nowrap">
              Demo
            </span>
            <span className="text-xs text-gray-500 font-mono">
              demo@studybuddy.com / demo123
            </span>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Don&apos;t have an account?{" "}
            <a href="/signup" className="text-[#639922] hover:underline">Create one free</a>
          </p>
        </div>
      </div>
    </div>
  );
}