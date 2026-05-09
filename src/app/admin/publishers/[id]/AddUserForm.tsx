"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";

export default function AddUserForm({ publisherId }: { publisherId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/publishers/" + publisherId + "/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Erreur");
      setLoading(false);
      return;
    }

    setName(""); setEmail(""); setPassword("");
    setOpen(false);
    router.refresh();
    setLoading(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-[#00647D] font-600 hover:underline"
      >
        <Plus size={14} /> Ajouter un utilisateur
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom complet"
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00647D]"
      />
      <input
        required
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00647D]"
      />
      <input
        required
        type="text"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mot de passe (min 8 car.)"
        minLength={8}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#00647D]"
      />
      {error && <p className="text-red-600 text-xs">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 text-sm text-gray-500 border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-1 text-sm bg-[#00647D] text-white rounded-lg py-1.5 hover:bg-[#005a70] disabled:opacity-60"
        >
          {loading && <Loader2 size={13} className="animate-spin" />}
          Ajouter
        </button>
      </div>
    </form>
  );
}
