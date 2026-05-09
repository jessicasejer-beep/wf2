import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import StructureEditor from "./StructureEditor";

export const dynamic = "force-dynamic";

export default async function StructurePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const site = await prisma.site.findUnique({
    where: { id },
    include: {
      cahiers: {
        orderBy: { order: "asc" },
        include: {
          periodes: {
            orderBy: { order: "asc" },
            include: {
              lecons: {
                orderBy: { order: "asc" },
                include: {
                  resources: { orderBy: { createdAt: "asc" } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!site) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/sites/${id}`} className="text-gray-400 hover:text-gray-700 transition">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold text-gray-900">Structure du site</h1>
          <p className="text-sm text-gray-500">{site.title}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/s/${site.slug}`}
            target="_blank"
            className="text-sm border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition"
          >
            Voir le site →
          </Link>
          <Link
            href={`/dashboard/sites/${id}`}
            className="text-sm bg-[#00647D] text-white px-3 py-2 rounded-lg hover:bg-[#005a70] transition"
          >
            Tableau de bord
          </Link>
        </div>
      </div>

      <StructureEditor siteId={id} initialCahiers={site.cahiers} />
    </div>
  );
}
