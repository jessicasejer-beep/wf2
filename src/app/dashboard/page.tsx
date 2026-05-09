import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Globe, FileText, Plus, ArrowRight, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PublisherDashboard() {
  const session = await getServerSession(authOptions);
  const user = session!.user as { publisherId?: string; name?: string };

  const publisher = user.publisherId
    ? await prisma.publisher.findUnique({
        where: { id: user.publisherId },
        include: {
          sites: {
            include: {
              _count: { select: { cahiers: true } },
              cahiers: { include: { periodes: { include: { lecons: { include: { _count: { select: { resources: true } } } } } } } },
            },
            orderBy: { updatedAt: "desc" },
          },
        },
      })
    : null;

  const sites = publisher?.sites ?? [];
  const totalResources = sites.reduce((acc, site) =>
    acc + site.cahiers.reduce((a2, c) =>
      a2 + c.periodes.reduce((a3, p) =>
        a3 + p.lecons.reduce((a4, l) => a4 + l._count.resources, 0), 0), 0), 0);

  const publishedSites = sites.filter((s) => s.status === "PUBLISHED").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Bonjour, {user.name?.split(" ")[0]} 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {publisher?.name} · Tableau de bord
          </p>
        </div>
        <Link
          href="/dashboard/sites/new"
          className="flex items-center gap-2 bg-[#00647D] text-white px-4 py-2 rounded-lg text-sm font-600 hover:bg-[#005a70] transition"
        >
          <Plus size={16} />
          Nouveau site
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Sites compagnons", value: sites.length, icon: Globe, color: "bg-[#e0f2f0] text-[#00647D]" },
          { label: "Sites publiés", value: publishedSites, icon: TrendingUp, color: "bg-green-50 text-green-600" },
          { label: "Ressources totales", value: totalResources, icon: FileText, color: "bg-purple-50 text-purple-600" },
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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-700 text-gray-900">Mes sites compagnons</h2>
          <Link href="/dashboard/sites" className="text-sm text-[#00647D] font-600 flex items-center gap-1 hover:underline">
            Voir tous <ArrowRight size={14} />
          </Link>
        </div>
        {sites.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Globe size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Aucun site créé.</p>
            <Link href="/dashboard/sites/new" className="mt-3 inline-block text-sm text-[#00647D] font-600 hover:underline">
              Créer mon premier site compagnon
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {sites.slice(0, 5).map((site) => {
              const resources = site.cahiers.reduce((a, c) =>
                a + c.periodes.reduce((b, p) =>
                  b + p.lecons.reduce((d, l) => d + l._count.resources, 0), 0), 0);
              return (
                <div key={site.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition">
                  <div className="flex-1 min-w-0">
                    <div className="font-600 text-gray-900 text-sm truncate">{site.title}</div>
                    <div className="text-xs text-gray-500">{site._count.cahiers} cahier{site._count.cahiers > 1 ? "s" : ""} · {resources} ressource{resources > 1 ? "s" : ""}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-500 ${
                    site.status === "PUBLISHED" ? "bg-green-50 text-green-700"
                    : site.status === "ARCHIVED" ? "bg-gray-100 text-gray-500"
                    : "bg-yellow-50 text-yellow-700"
                  }`}>
                    {site.status === "PUBLISHED" ? "Publié" : site.status === "ARCHIVED" ? "Archivé" : "Brouillon"}
                  </span>
                  <Link
                    href={`/dashboard/sites/${site.id}`}
                    className="text-xs text-[#00647D] font-600 hover:underline"
                  >
                    Gérer →
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
