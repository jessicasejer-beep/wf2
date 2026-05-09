import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SiteSettingsForm from "./SiteSettingsForm";

export const dynamic = "force-dynamic";

export default async function SiteSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = await prisma.site.findUnique({ where: { id } });
  if (!site) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/sites/${id}`} className="text-gray-400 hover:text-gray-700 transition">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Paramètres du site</h1>
          <p className="text-sm text-gray-500">{site.title}</p>
        </div>
      </div>
      <SiteSettingsForm site={site} />
    </div>
  );
}
