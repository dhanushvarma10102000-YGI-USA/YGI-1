"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/ds/Nav";
import { AnimatedGradientBg, AnimatedBtn, GlassCard } from "@/components/ds/AnimatedGradient";
import { supabase } from "@/lib/supabase";

// Only same-site paths, so the reset link can't be turned into an open redirect.
function safeNextPath(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/community";
}

function linkError() {
  const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search);
  return params.get("error_description")?.replace(/\+/g, " ") || "";
}

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<"checking" | "ready" | "invalid" | "done">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // The email link signs the user in (supabase-js reads the token from the URL); a session means the link was valid.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION")) setStatus("ready");
    });

    let cancelled = false;
    (async () => {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) await supabase.auth.exchangeCodeForSession(code).catch(() => null);
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) setStatus("ready");
      else {
        setError(linkError() || "This reset link is invalid or has expired.");
        setStatus("invalid");
      }
    })();

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleReset() {
    if (password.length < 8) { setError("Use at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    setError("");
    const { error: e } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (e) { setError(e.message); return; }
    setStatus("done");
    const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
    setTimeout(() => { window.location.href = next; }, 1500);
  }

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm mb-4 focus:outline-none focus:border-[#2f8f86]/40";

  return (
    <div className="min-h-screen bg-[#e9e8e4] font-[Inter,sans-serif]">
      <div className="absolute inset-x-0 top-0 overflow-hidden rounded-b-[48px]" style={{ height: "50vh" }}>
        <AnimatedGradientBg rounded="rounded-b-[48px]" />
        <div className="absolute inset-0 rounded-b-[48px] bg-gradient-to-b from-white/20 via-transparent to-transparent pointer-events-none" />
      </div>
      <div className="relative z-10">
        <Nav />
        <div className="min-h-screen flex items-center justify-center px-4 pt-16">
          <div className="w-full max-w-md">
            <GlassCard className="p-8 sm:p-10">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Set a new password</h1>
              {status === "checking" && <p className="text-sm text-gray-500">Checking your reset link…</p>}
              {status === "invalid" && (
                <>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 my-4">{error}</div>
                  <p className="text-sm text-gray-500">
                    Request a new link from the <Link href="/login" className="text-[#2f8f86] font-medium">sign-in page</Link>.
                  </p>
                </>
              )}
              {status === "done" && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 mt-4">✅ Password updated. Taking you back…</div>
              )}
              {status === "ready" && (
                <>
                  <p className="text-sm text-gray-500 mb-6">Choose a password with at least 8 characters.</p>
                  {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 mb-4">{error}</div>}
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">New password</label>
                  <input className={inputClass} type="password" autoComplete="new-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Confirm password</label>
                  <input className={inputClass} type="password" autoComplete="new-password" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleReset()} />
                  <AnimatedBtn className="w-full py-3 text-sm font-bold" onClick={handleReset}>{loading ? "Saving..." : "Save new password →"}</AnimatedBtn>
                </>
              )}
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
