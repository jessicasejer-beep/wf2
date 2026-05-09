import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id: siteId } = await params;
  const { title } = await req.json();

  const count = await prisma.cahier.count({ where: { siteId } });

  const cahier = await prisma.cahier.create({
    data: { title, order: count, siteId },
  });

  return NextResponse.json(cahier, { status: 201 });
}
