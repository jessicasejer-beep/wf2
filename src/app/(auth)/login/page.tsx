"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BookOpen, Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e0f2f0] to-[#f5f6f8] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#00647D] rounded-2xl mb-4 shadow-lg">
            <BookOpen className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-extrabold text-[#1a1a2e]">
            WF<span className="text-[#00647D]">2.0</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Administration éditeurs scolaires</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Connexion</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-600 text-gray-700 mb-1.5">
                Adresse email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#00647D] focus:ring-2 focus:ring-[#00647D]/20 transition"
                placeholder="vous@editeur.fr"
              />
            </div>

            <div>
              <label className="block text-sm font-600 text-gray-700 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm pr-10 focus:outline-none focus:border-[#00647D] focus:ring-2 focus:ring-[#00647D]/20 transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00647D] text-white font-600 rounded-lg py-2.5 text-sm flex items-center justify-center gap-2 hover:bg-[#005a70] disabled:opacity-60 transition"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Se connecter
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Accès réservé aux éditeurs partenaires WF2.0
        </p>
      </div>
    </div>
  );
}
