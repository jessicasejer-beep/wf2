import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Building2, Globe, FileText, TrendingUp, ArrowRight, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [publisherCount, siteCount, resourceCount, publishers] = await Promise.all([
    prisma.publisher.count(),
    prisma.site.count(),
    prisma.resource.count(),
    prisma.publisher.findMany({
      include: {
        _count: { select: { sites: true, users: true } },
        sites: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const publishedCount = await prisma.site.count({ where: { status: "PUBLISHED" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Tableau de bord</h1>
          <p className="text-sm text-gray-500 mt-0.5">Vue globale de la plateforme WF2.0</p>
        </div>
        <Link
          href="/admin/publishers/new"
          className="flex items-center gap-2 bg-[#00647D] text-white px-4 py-2 rounded-lg text-sm font-600 hover:bg-[#005a70] transition"
        >
          <Plus size={16} />
          Nouvel éditeur
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Éditeurs", value: publisherCount, icon: Building2, color: "bg-[#e0f2f0] text-[#00647D]" },
          { label: "Sites compagnons", value: siteCount, icon: Globe, color: "bg-blue-50 text-blue-600" },
          { label: "Sites publiés", value: publishedCount, icon: TrendingUp, color: "bg-green-50 text-green-600" },
          { label: "Ressources", value: resourceCount, icon: FileText, color: "bg-purple-50 text-purple-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 shadow-sm">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Publishers list */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-700 text-gray-900">Éditeurs récents</h2>
          <Link href="/admin/publishers" className="text-sm text-[#00647D] font-600 flex items-center gap-1 hover:underline">
            Voir tous <ArrowRight size={14} />
          </Link>
        </div>

        {publishers.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Building2 size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Aucun éditeur créé pour l&apos;instant.</p>
            <Link href="/admin/publishers/new" className="mt-3 inline-block text-sm text-[#00647D] font-600 hover:underline">
              Créer le premier éditeur
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {publishers.map((pub) => (
              <div key={pub.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-700 shrink-0"
                  style={{ backgroundColor: pub.color }}
                >
                  {pub.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-600 text-gray-900 text-sm truncate">{pub.name}</div>
                  <div className="text-xs text-gray-500">
                    {pub._count.users} utilisateur{pub._count.users > 1 ? "s" : ""} · {pub._count.sites} site{pub._count.sites > 1 ? "s" : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {pub.sites.filter((s) => s.status === "PUBLISHED").length > 0 && (
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-500">
                      {pub.sites.filter((s) => s.status === "PUBLISHED").length} publié{pub.sites.filter((s) => s.status === "PUBLISHED").length > 1 ? "s" : ""}
                    </span>
                  )}
                  <Link
                    href={`/admin/publishers/${pub.id}`}
                    className="text-xs text-[#00647D] font-600 hover:underline"
                  >
                    Gérer →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
