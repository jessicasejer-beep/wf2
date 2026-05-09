import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Globe, Users, ExternalLink, Plus } from "lucide-react";
import DeletePublisherButton from "./DeletePublisherButton";
import AddUserForm from "./AddUserForm";

export const dynamic = "force-dynamic";

export default async function PublisherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const publisher = await prisma.publisher.findUnique({
    where: { id },
    include: {
      users: { orderBy: { createdAt: "asc" } },
      sites: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!publisher) notFound();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start gap-3">
        <Link href="/admin/publishers" className="text-gray-400 hover:text-gray-700 transition mt-1">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-800 text-lg"
              style={{ backgroundColor: publisher.color }}
            >
              {publisher.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">{publisher.name}</h1>
              <p className="text-xs text-gray-400 font-mono">{publisher.slug}</p>
            </div>
          </div>
        </div>
        <DeletePublisherButton id={publisher.id} name={publisher.name} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sites */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-700 text-gray-900 flex items-center gap-2">
              <Globe size={16} className="text-[#00647D]" />
              Sites compagnons ({publisher.sites.length})
            </h2>
          </div>
          {publisher.sites.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">Aucun site pour l&apos;instant</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {publisher.sites.map((site) => (
                <div key={site.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-600 text-sm text-gray-900 truncate">{site.title}</div>
                    <div className="text-xs text-gray-400">/s/{site.slug}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-500 ${
                    site.status === "PUBLISHED" ? "bg-green-50 text-green-700"
                    : site.status === "ARCHIVED" ? "bg-gray-100 text-gray-500"
                    : "bg-yellow-50 text-yellow-700"
                  }`}>
                    {site.status === "PUBLISHED" ? "Publié" : site.status === "ARCHIVED" ? "Archivé" : "Brouillon"}
                  </span>
                  <Link href={`/s/${site.slug}`} target="_blank" className="text-gray-400 hover:text-[#00647D]">
                    <ExternalLink size={14} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Users */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-700 text-gray-900 flex items-center gap-2">
              <Users size={16} className="text-[#00647D]" />
              Utilisateurs ({publisher.users.length})
            </h2>
          </div>

          {publisher.users.length > 0 && (
            <div className="divide-y divide-gray-50">
              {publisher.users.map((user) => (
                <div key={user.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-[#00647D] flex items-center justify-center text-white text-xs font-700 shrink-0">
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-600 text-sm text-gray-900 truncate">{user.name}</div>
                    <div className="text-xs text-gray-400 truncate">{user.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-5 border-t border-gray-100">
            <AddUserForm publisherId={publisher.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
