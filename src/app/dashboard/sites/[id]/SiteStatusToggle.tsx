"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Brouillon", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  PUBLISHED: { label: "Publié", cls: "bg-green-50 text-green-700 border-green-200" },
  ARCHIVED: { label: "Archivé", cls: "bg-gray-100 text-gray-500 border-gray-200" },
};

const NEXT_STATUS: Record<string, string> = {
  DRAFT: "PUBLISHED",
  PUBLISHED: "ARCHIVED",
  ARCHIVED: "DRAFT",
};

export default function SiteStatusToggle({ siteId, currentStatus }: { siteId: string; currentStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  const cfg = STATUS_LABELS[status] ?? STATUS_LABELS.DRAFT;

  async function cycle() {
    setLoading(true);
    const next = NEXT_STATUS[status];
    await fetch(`/api/sites/${siteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setStatus(next);
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={cycle}
      disabled={loading}
      className={`text-xs px-2.5 py-1 rounded-full font-600 border cursor-pointer disabled:opacity-60 transition hover:opacity-80 ${cfg.cls}`}
      title="Cliquer pour changer le statut"
    >
      {cfg.label}
    </button>
  );
}
