"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { DISCIPLINES } from "@/lib/utils";

interface Site {
  id: string;
  title: string;
  subtitle: string | null;
  discipline: string | null;
  ean: string | null;
  cover: string | null;
  description: string | null;
}

export default function SiteSettingsForm({ site }: { site: Site }) {
  const router = useRouter();
  const [title, setTitle] = useState(site.title);
  const [subtitle, setSubtitle] = useState(site.subtitle ?? "");
  const [discipline, setDiscipline] = useState(site.discipline ?? "");
  const [ean, setEan] = useState(site.ean ?? "");
  const [description, setDescription] = useState(site.description ?? "");
  const [cover, setCover] = useState(site.cover ?? "");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      setCover(data.url);
    }
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    await fetch(`/api/sites/${site.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, subtitle, discipline, ean, description, cover }),
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
        <h2 className="font-700 text-gray-900">Informations du manuel</h2>

        {/* Cover image */}
        <div>
          <label className="block text-sm font-600 text-gray-700 mb-2">Image de couverture</label>
          <div className="flex items-start gap-4">
            <div className="w-20 h-28 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center shrink-0">
              {cover ? (
                <img src={cover} alt="Couverture" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-300 text-xs text-center px-2">Aucune image</span>
              )}
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer bg-[#e0f2f0] text-[#00647D] px-3 py-2 rounded-lg text-sm font-600 hover:bg-[#b3e0d9] transition w-fit">
                {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                {uploading ? "Envoi…" : "Téléverser une image"}
                <input type="file" className="hidden" accept="image/*" onChange={handleCoverUpload} />
              </label>
              {cover && (
                <button type="button" onClick={() => setCover("")} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
                  <Trash2 size={12} /> Supprimer
                </button>
              )}
              <p className="text-xs text-gray-400">PNG, JPG, WebP — Ratio portrait recommandé</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-600 text-gray-700 mb-1.5">Titre *</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#00647D] focus:ring-2 focus:ring-[#00647D]/20"
          />
        </div>

        <div>
          <label className="block text-sm font-600 text-gray-700 mb-1.5">Sous-titre</label>
          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#00647D] focus:ring-2 focus:ring-[#00647D]/20"
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
              {DISCIPLINES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-600 text-gray-700 mb-1.5">EAN / ISBN</label>
            <input
              value={ean}
              onChange={(e) => setEan(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#00647D] focus:ring-2 focus:ring-[#00647D]/20 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-600 text-gray-700 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#00647D] focus:ring-2 focus:ring-[#00647D]/20 resize-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-600 transition ${
          saved ? "bg-green-600 text-white" : "bg-[#00647D] text-white hover:bg-[#005a70]"
        } disabled:opacity-60`}
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {saved ? "✓ Enregistré !" : "Enregistrer les modifications"}
      </button>
    </form>
  );
}
