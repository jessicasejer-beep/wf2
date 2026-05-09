import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getResourceType, getAccessLevel, formatFileSize } from "@/lib/utils";
import CompanionSite from "./CompanionSite";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await prisma.site.findUnique({ where: { slug } });
  return { title: site ? `${site.title} | WF2.0` : "Site introuvable" };
}

export default async function CompanionSitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const site = await prisma.site.findUnique({
    where: { slug },
    include: {
      publisher: true,
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

  if (!site || site.status === "ARCHIVED") notFound();

  const totalResources = site.cahiers.reduce((a, c) =>
    a + c.periodes.reduce((b, p) =>
      b + p.lecons.reduce((d, l) => d + l.resources.length, 0), 0), 0);

  const totalLecons = site.cahiers.reduce((a, c) =>
    a + c.periodes.reduce((b, p) => b + p.lecons.length, 0), 0);

  return <CompanionSite site={site} totalResources={totalResources} totalLecons={totalLecons} />;
}
