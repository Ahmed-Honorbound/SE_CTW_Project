"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

function getStrength(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

const strengthMeta = [
  { label: "Weak",   color: "#E24B4A" },
  { label: "Fair",   color: "#EF9F27" },
  { label: "Good",   color: "#97C459" },
  { label: "Strong", color: "#639922" },
];

export default function SignUpPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [err,       setErr]       = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);

  const strength = password ? getStrength(password) : 0;

  async function handleSignUp() {
    setErr(null);
    if (!firstName || !lastName || !email || !password) {
      setErr("Please fill in all fields."); return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setErr("Please enter a valid email address."); return;
    }
    if (strength < 2) {
      setErr("Please choose a stronger password (8+ chars, uppercase, number)."); return;
    }

    setLoading(true);
    
    setLoading(false);
    const { error } = await supabase.auth.signUp({ email, password,
    options: { data: { first_name: firstName, last_name: lastName } }
    });

    if (error) { setErr(error.message); return; }
    router.push("/dashboard");
    if (!res.ok) {
      setErr("Something went wrong. Please try again."); return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="flex w-full max-w-3xl rounded-2xl overflow-hidden shadow-sm border border-gray-100">

        {/* Left panel */}
        <div className="hidden md:flex flex-col justify-between bg-[#0f1a2e] p-10 w-80 flex-shrink-0 relative overflow-hidden">
          <div className="absolute inset-0"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)",
              backgroundSize: "32px 32px",
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
              "The expert in anything was once a beginner."
            </p>
            <p className="text-white/40 text-sm font-light">
              Start your learning journey today — it's free.
            </p>
          </div>

          <div className="flex gap-1.5 relative">
            <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
            <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
            <div className="h-1.5 w-5 rounded bg-[#639922]" />
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 bg-white p-10 flex flex-col justify-center">
          <div className="mb-7">
            <h1 className="text-2xl font-serif text-gray-900 tracking-tight mb-1">Create your account</h1>
            <p className="text-sm text-gray-500 font-light">Join thousands of students already studying smarter</p>
          </div>

          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">First name</label>
              <input type="text" placeholder="Jane" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-green-100 placeholder:text-gray-400 transition"/>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Last name</label>
              <input type="text" placeholder="Smith" value={lastName} onChange={(e) => setLastName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-green-100 placeholder:text-gray-400 transition"/>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
            <input type="email" placeholder="jane@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-green-100 placeholder:text-gray-400 transition"/>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} placeholder="Create a strong password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSignUp()}
                className="w-full h-10 pl-3 pr-10 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-green-100 placeholder:text-gray-400 transition"/>
              <button onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition">
                {showPw
                ? <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3l14 14M10 4c5 0 8 6 8 6s-.8 1.4-2.2 2.8M6.8 6.8A6.4 6.4 0 002 10s3 6 8 6c1.8 0 3.4-.6 4.7-1.6"/><circle cx="10" cy="10" r="2.5"/></svg>
                : <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"/><circle cx="10" cy="10" r="2.5"/></svg>
                }
              </button>
            </div>
            {password && (
              <>
                <div className="flex gap-1 mt-2">
                  {[0,1,2,3].map((i) => (
                    <div key={i} className="flex-1 h-0.5 rounded-full transition-all duration-200"
                      style={{ background: i < strength ? strengthMeta[strength - 1].color : "#e5e7eb" }}/>
                  ))}
                </div>
                <p className="text-xs mt-1 font-light" style={{ color: strengthMeta[strength - 1]?.color ?? "#9ca3af" }}>
                  {strengthMeta[strength - 1]?.label ?? ""}
                </p>
              </>
            )}
          </div>

          <p className="text-xs text-gray-400 mb-4 leading-relaxed font-light">
            By creating an account, you agree to our{" "}
            <a href="#" className="text-[#639922] hover:underline">Terms of Service</a> and{" "}
            <a href="#" className="text-[#639922] hover:underline">Privacy Policy</a>.
          </p>

          {err && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{err}</p>
          )}

          <button onClick={handleSignUp} disabled={loading}
            className="w-full h-10 rounded-lg bg-[#0f1a2e] hover:bg-[#1a2d4a] text-white text-sm font-medium transition disabled:opacity-60">
            {loading ? "Creating account…" : "Create account"}
          </button>

          <p className="text-center text-xs text-gray-400 mt-5">
            Already have an account?{" "}
            <a href="/login" className="text-[#639922] hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}