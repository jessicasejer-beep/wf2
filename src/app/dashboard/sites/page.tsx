import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Globe, ExternalLink, Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SitesPage() {
  const session = await getServerSession(authOptions);
  const user = session!.user as { publisherId?: string };

  const sites = user.publisherId
    ? await prisma.site.findMany({
        where: { publisherId: user.publisherId },
        include: { _count: { select: { cahiers: true } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Mes sites compagnons</h1>
          <p className="text-sm text-gray-500 mt-0.5">{sites.length} site{sites.length > 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/dashboard/sites/new"
          className="flex items-center gap-2 bg-[#00647D] text-white px-4 py-2 rounded-lg text-sm font-600 hover:bg-[#005a70] transition"
        >
          <Plus size={16} />
          Nouveau site
        </Link>
      </div>

      {sites.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400 shadow-sm">
          <Globe size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-500">Aucun site compagnon pour l&apos;instant</p>
          <Link href="/dashboard/sites/new" className="mt-4 inline-block text-sm text-[#00647D] font-600 hover:underline">
            Créer mon premier site
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((site) => (
            <div key={site.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition">
              <div className="h-1.5 bg-[#00647D]" />
              <div className="p-5">
                {site.cover && (
                  <div className="w-16 h-20 rounded-lg border border-gray-100 overflow-hidden mb-3 bg-gray-50">
                    <img src={site.cover} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex items-start gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-700 text-gray-900 text-sm truncate">{site.title}</h3>
                    {site.subtitle && <p className="text-xs text-gray-500 truncate">{site.subtitle}</p>}
                    {site.discipline && (
                      <span className="inline-block mt-1 text-[10px] font-600 bg-[#e0f2f0] text-[#005a70] px-2 py-0.5 rounded-full">
                        {site.discipline}
                      </span>
                    )}
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-500 ${
                    site.status === "PUBLISHED" ? "bg-green-50 text-green-700"
                    : site.status === "ARCHIVED" ? "bg-gray-100 text-gray-500"
                    : "bg-yellow-50 text-yellow-700"
                  }`}>
                    {site.status === "PUBLISHED" ? "Publié" : site.status === "ARCHIVED" ? "Archivé" : "Brouillon"}
                  </span>
                </div>

                <div className="text-xs text-gray-400 mb-4">
                  {site._count.cahiers} cahier{site._count.cahiers > 1 ? "s" : ""} · /s/{site.slug}
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/sites/${site.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 border border-[#00647D] text-[#00647D] rounded-lg py-2 text-xs font-600 hover:bg-[#00647D] hover:text-white transition"
                  >
                    <Pencil size={12} /> Gérer
                  </Link>
                  <Link
                    href={`/s/${site.slug}`}
                    target="_blank"
                    className="flex items-center justify-center gap-1.5 border border-gray-200 text-gray-500 rounded-lg px-3 py-2 text-xs font-600 hover:bg-gray-50 transition"
                  >
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
