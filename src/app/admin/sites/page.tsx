import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Globe, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AllSitesPage() {
  const sites = await prisma.site.findMany({
    include: {
      publisher: { select: { name: true, color: true } },
      _count: { select: { cahiers: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Tous les sites compagnons</h1>
        <p className="text-sm text-gray-500 mt-0.5">{sites.length} site{sites.length > 1 ? "s" : ""} au total</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {sites.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Globe size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucun site créé pour l&apos;instant.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-600 text-gray-500 text-xs uppercase tracking-wide">Site</th>
                <th className="text-left px-5 py-3 font-600 text-gray-500 text-xs uppercase tracking-wide">Éditeur</th>
                <th className="text-left px-5 py-3 font-600 text-gray-500 text-xs uppercase tracking-wide">Discipline</th>
                <th className="text-left px-5 py-3 font-600 text-gray-500 text-xs uppercase tracking-wide">Statut</th>
                <th className="text-left px-5 py-3 font-600 text-gray-500 text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sites.map((site) => (
                <tr key={site.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3">
                    <div className="font-600 text-gray-900">{site.title}</div>
                    <div className="text-xs text-gray-400 font-mono">/s/{site.slug}</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-800"
                        style={{ backgroundColor: site.publisher.color }}
                      >
                        {site.publisher.name.charAt(0)}
                      </div>
                      <span className="text-gray-700">{site.publisher.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{site.discipline ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-500 ${
                      site.status === "PUBLISHED" ? "bg-green-50 text-green-700"
                      : site.status === "ARCHIVED" ? "bg-gray-100 text-gray-500"
                      : "bg-yellow-50 text-yellow-700"
                    }`}>
                      {site.status === "PUBLISHED" ? "Publié" : site.status === "ARCHIVED" ? "Archivé" : "Brouillon"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/s/${site.slug}`} target="_blank" className="inline-flex items-center gap-1 text-[#00647D] hover:underline text-xs font-600">
                      Voir <ExternalLink size={11} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
