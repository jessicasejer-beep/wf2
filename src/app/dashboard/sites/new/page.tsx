"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Info, BookOpen } from "lucide-react";
import { DISCIPLINES } from "@/lib/utils";

function slugify(str: string) {
  return str.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function NewSitePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [ean, setEan] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const slug = slugify(title);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, subtitle, slug, discipline, ean, description }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Une erreur est survenue.");
        return;
      }

      const site = await res.json();
      router.push(`/dashboard/sites/${site.id}/structure`);
    } catch {
      setError("Impossible de créer le site.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Wizard progress */}
      <div className="flex items-center gap-0">
        {["Informations", "Structure", "Ressources", "Publication"].map((step, i) => (
          <div key={step} className="flex items-center">
            {i > 0 && <div className={`h-0.5 w-12 ${i === 0 ? "bg-[#00647D]" : "bg-gray-200"}`} />}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-600 ${
              i === 0 ? "bg-[#00647D] text-white" : "bg-gray-100 text-gray-400"
            }`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-800 ${
                i === 0 ? "bg-white text-[#00647D]" : "bg-gray-300 text-white"
              }`}>{i + 1}</span>
              {step}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Link href="/dashboard/sites" className="text-gray-400 hover:text-gray-700 transition">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Nouveau site compagnon</h1>
          <p className="text-sm text-gray-500">Étape 1 sur 4 — Informations du manuel</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
          <h2 className="font-700 text-gray-900 flex items-center gap-2">
            <BookOpen size={18} className="text-[#00647D]" />
            Informations du manuel
          </h2>

          <div>
            <label className="block text-sm font-600 text-gray-700 mb-1.5">Titre du site *</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#00647D] focus:ring-2 focus:ring-[#00647D]/20"
              placeholder="Ex : Les maths avec Léonie – CE2"
            />
            {title && (
              <p className="text-xs text-gray-400 mt-1 font-mono">URL : /s/{slug}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-600 text-gray-700 mb-1.5">Sous-titre / collection</label>
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#00647D] focus:ring-2 focus:ring-[#00647D]/20"
              placeholder="Ex : Collection Magellan"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-600 text-gray-700 mb-1.5">Discipline</label>
              <select
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#00647D] bg-white"
              >
                <option value="">Sélectionner…</option>
                {DISCIPLINES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-600 text-gray-700 mb-1.5">EAN / ISBN</label>
              <input
                value={ean}
                onChange={(e) => setEan(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#00647D] focus:ring-2 focus:ring-[#00647D]/20 font-mono"
                placeholder="9782047…"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-600 text-gray-700 mb-1.5">Description courte</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#00647D] focus:ring-2 focus:ring-[#00647D]/20 resize-none"
              placeholder="Description affichée sur le site compagnon…"
            />
          </div>
        </div>

        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
          <Info size={16} className="shrink-0 mt-0.5" />
          <span>Vous pourrez ajouter la couverture du manuel à l&apos;étape suivante, après avoir créé la structure.</span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
        )}

        <div className="flex gap-3">
          <Link href="/dashboard/sites" className="flex-1 text-center border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-600 hover:bg-gray-50 transition">
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-[#00647D] text-white rounded-lg py-2.5 text-sm font-600 hover:bg-[#005a70] disabled:opacity-60 transition"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Créer et définir la structure →
          </button>
        </div>
      </form>
    </div>
  );
}
