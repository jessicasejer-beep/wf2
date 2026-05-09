"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Building2 } from "lucide-react";

const COLORS = [
  "#00647D", "#1e40af", "#7c3aed", "#9d174d",
  "#065f46", "#92400e", "#1e3a5f", "#374151",
];

function slugify(str: string) {
  return str.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function NewPublisherPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const slug = slugify(name);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/publishers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, description, color, adminName, adminEmail, adminPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Une erreur est survenue.");
        return;
      }

      const pub = await res.json();
      router.push(`/admin/publishers/${pub.id}`);
    } catch {
      setError("Impossible de créer l'éditeur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/publishers" className="text-gray-400 hover:text-gray-700 transition">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Nouvel éditeur</h1>
          <p className="text-sm text-gray-500">Créer un éditeur et son compte administrateur</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Publisher info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="font-700 text-gray-900 flex items-center gap-2">
            <Building2 size={18} className="text-[#00647D]" />
            Informations de l&apos;éditeur
          </h2>

          <div>
            <label className="block text-sm font-600 text-gray-700 mb-1.5">Nom de l&apos;éditeur *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#00647D] focus:ring-2 focus:ring-[#00647D]/20"
              placeholder="Ex : Éditions Bordas"
            />
            {name && (
              <p className="text-xs text-gray-400 mt-1 font-mono">slug : {slug}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-600 text-gray-700 mb-1.5">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#00647D] focus:ring-2 focus:ring-[#00647D]/20 resize-none"
              placeholder="Brève description de l'éditeur…"
            />
          </div>

          <div>
            <label className="block text-sm font-600 text-gray-700 mb-2">Couleur principale</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg transition border-2 ${color === c ? "border-gray-900 scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Admin account */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="font-700 text-gray-900">Compte administrateur éditeur</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-600 text-gray-700 mb-1.5">Nom complet *</label>
              <input
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#00647D] focus:ring-2 focus:ring-[#00647D]/20"
                placeholder="Prénom Nom"
              />
            </div>
            <div>
              <label className="block text-sm font-600 text-gray-700 mb-1.5">Email *</label>
              <input
                required
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#00647D] focus:ring-2 focus:ring-[#00647D]/20"
                placeholder="admin@editeur.fr"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-600 text-gray-700 mb-1.5">Mot de passe provisoire *</label>
            <input
              required
              type="text"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#00647D] focus:ring-2 focus:ring-[#00647D]/20 font-mono"
              placeholder="Au moins 8 caractères"
              minLength={8}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link
            href="/admin/publishers"
            className="flex-1 text-center border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-600 hover:bg-gray-50 transition"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-[#00647D] text-white rounded-lg py-2.5 text-sm font-600 hover:bg-[#005a70] disabled:opacity-60 transition"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Créer l&apos;éditeur
          </button>
        </div>
      </form>
    </div>
  );
}
