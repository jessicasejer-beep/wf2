import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const user = session.user as { role: string; publisherId?: string };
  const body = await req.json();
  const { title, subtitle, slug, discipline, ean, cover, description, publisherId } = body;

  const targetPublisherId = user.role === "SUPER_ADMIN" ? publisherId : user.publisherId;
  if (!targetPublisherId) return NextResponse.json({ error: "Éditeur introuvable" }, { status: 400 });

  const existing = await prisma.site.findUnique({ where: { slug } });
  if (existing) return NextResponse.json({ error: "Ce slug est déjà utilisé." }, { status: 400 });

  const site = await prisma.site.create({
    data: { title, subtitle, slug, discipline, ean, cover, description, publisherId: targetPublisherId },
  });

  return NextResponse.json(site, { status: 201 });
}
