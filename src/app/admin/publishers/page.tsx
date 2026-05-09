import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Building2, Plus, Globe, Users, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PublishersPage() {
  const publishers = await prisma.publisher.findMany({
    include: {
      _count: { select: { sites: true, users: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Éditeurs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{publishers.length} éditeur{publishers.length > 1 ? "s" : ""} enregistré{publishers.length > 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/admin/publishers/new"
          className="flex items-center gap-2 bg-[#00647D] text-white px-4 py-2 rounded-lg text-sm font-600 hover:bg-[#005a70] transition"
        >
          <Plus size={16} />
          Nouvel éditeur
        </Link>
      </div>

      {publishers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400 shadow-sm">
          <Building2 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-500">Aucun éditeur pour l&apos;instant</p>
          <Link href="/admin/publishers/new" className="mt-4 inline-block text-sm text-[#00647D] font-600 hover:underline">
            Créer le premier éditeur
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {publishers.map((pub) => (
            <div key={pub.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition">
              <div className="h-2" style={{ backgroundColor: pub.color }} />
              <div className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg font-800 shrink-0"
                    style={{ backgroundColor: pub.color }}
                  >
                    {pub.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-700 text-gray-900 truncate">{pub.name}</h3>
                    <p className="text-xs text-gray-400 font-mono">{pub.slug}</p>
                  </div>
                </div>

                {pub.description && (
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{pub.description}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Globe size={12} />
                    {pub._count.sites} site{pub._count.sites > 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {pub._count.users} utilisateur{pub._count.users > 1 ? "s" : ""}
                  </span>
                </div>

                <Link
                  href={`/admin/publishers/${pub.id}`}
                  className="flex items-center justify-center gap-2 w-full border border-[#00647D] text-[#00647D] rounded-lg py-2 text-sm font-600 hover:bg-[#00647D] hover:text-white transition"
                >
                  Gérer <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
