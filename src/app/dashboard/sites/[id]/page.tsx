import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, FileText, Layers, Settings, Globe } from "lucide-react";
import SiteStatusToggle from "./SiteStatusToggle";

export const dynamic = "force-dynamic";

export default async function SiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const site = await prisma.site.findUnique({
    where: { id },
    include: {
      publisher: true,
      cahiers: {
        include: {
          periodes: {
            include: {
              lecons: {
                include: { _count: { select: { resources: true } } },
              },
            },
          },
          _count: { select: { periodes: true } },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!site) notFound();

  const totalLecons = site.cahiers.reduce((a, c) => a + c.periodes.reduce((b, p) => b + p.lecons.length, 0), 0);
  const totalResources = site.cahiers.reduce((a, c) =>
    a + c.periodes.reduce((b, p) =>
      b + p.lecons.reduce((d, l) => d + l._count.resources, 0), 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Link href="/dashboard/sites" className="text-gray-400 hover:text-gray-700 transition mt-1">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-extrabold text-gray-900">{site.title}</h1>
            <SiteStatusToggle siteId={site.id} currentStatus={site.status} />
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            {site.discipline && (
              <span className="text-[10px] font-600 bg-[#e0f2f0] text-[#005a70] px-2 py-0.5 rounded-full">
                {site.discipline}
              </span>
            )}
            {site.ean && <span className="font-mono text-xs text-gray-400">{site.ean}</span>}
            <Link href={`/s/${site.slug}`} target="_blank" className="flex items-center gap-1 text-[#00647D] hover:underline text-xs">
              /s/{site.slug} <ExternalLink size={11} />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Cahiers", value: site.cahiers.length, icon: "📚" },
          { label: "Périodes", value: site.cahiers.reduce((a, c) => a + c._count.periodes, 0), icon: "📅" },
          { label: "Leçons", value: totalLecons, icon: "📖" },
          { label: "Ressources", value: totalResources, icon: "📄" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-xl font-extrabold text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href={`/dashboard/sites/${site.id}/structure`}
          className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-[#00647D]/40 transition group"
        >
          <div className="w-10 h-10 bg-[#e0f2f0] rounded-lg flex items-center justify-center mb-3 group-hover:bg-[#00647D] transition">
            <Layers size={20} className="text-[#00647D] group-hover:text-white transition" />
          </div>
          <h3 className="font-700 text-gray-900 mb-1">Structure du site</h3>
          <p className="text-xs text-gray-500">Gérer les cahiers, périodes et leçons. Ajouter et organiser les ressources PDF.</p>
        </Link>

        <Link
          href={`/dashboard/sites/${site.id}/settings`}
          className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-[#00647D]/40 transition group"
        >
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-600 transition">
            <Settings size={20} className="text-blue-600 group-hover:text-white transition" />
          </div>
          <h3 className="font-700 text-gray-900 mb-1">Paramètres</h3>
          <p className="text-xs text-gray-500">Modifier le titre, la description, la couverture et les métadonnées du site.</p>
        </Link>

        <Link
          href={`/s/${site.slug}`}
          target="_blank"
          className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-[#00647D]/40 transition group"
        >
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-600 transition">
            <Globe size={20} className="text-green-600 group-hover:text-white transition" />
          </div>
          <h3 className="font-700 text-gray-900 mb-1">Voir le site</h3>
          <p className="text-xs text-gray-500">Ouvrir le site compagnon tel que les utilisateurs le voient.</p>
        </Link>
      </div>

      {/* Cahiers preview */}
      {site.cahiers.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-700 text-gray-900">Structure</h2>
            <Link href={`/dashboard/sites/${site.id}/structure`} className="text-xs text-[#00647D] font-600 hover:underline">
              Modifier →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {site.cahiers.map((cahier) => (
              <div key={cahier.id} className="px-5 py-3">
                <div className="font-600 text-sm text-gray-900 mb-1 flex items-center gap-2">
                  <FileText size={14} className="text-[#00647D]" />
                  {cahier.title}
                </div>
                <div className="text-xs text-gray-400">
                  {cahier._count.periodes} période{cahier._count.periodes > 1 ? "s" : ""} ·{" "}
                  {cahier.periodes.reduce((a, p) => a + p.lecons.length, 0)} leçon{cahier.periodes.reduce((a, p) => a + p.lecons.length, 0) > 1 ? "s" : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
