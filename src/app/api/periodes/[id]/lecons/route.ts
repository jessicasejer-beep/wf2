import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id: periodeId } = await params;
  const { title } = await req.json();

  const count = await prisma.lecon.count({ where: { periodeId } });

  const lecon = await prisma.lecon.create({
    data: { title, order: count, periodeId },
  });

  return NextResponse.json(lecon, { status: 201 });
}
