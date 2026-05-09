import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

async function checkAccess(siteId: string, session: Session | null) {
  if (!session) return false;
  const user = session.user as { role: string; publisherId?: string };
  if (user.role === "SUPER_ADMIN") return true;
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  return site?.publisherId === user.publisherId;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!await checkAccess(id, session)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json();
  const { title, subtitle, discipline, ean, cover, description, status } = body;

  const site = await prisma.site.update({
    where: { id },
    data: { title, subtitle, discipline, ean, cover, description, status },
  });

  return NextResponse.json(site);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!await checkAccess(id, session)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  await prisma.site.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
