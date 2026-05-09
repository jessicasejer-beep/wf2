"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

export default function DeletePublisherButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Supprimer l'éditeur "${name}" et toutes ses données ?`)) return;
    setLoading(true);

    await fetch(`/api/publishers/${id}`, { method: "DELETE" });
    router.push("/admin/publishers");
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition disabled:opacity-60"
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
      Supprimer
    </button>
  );
}
