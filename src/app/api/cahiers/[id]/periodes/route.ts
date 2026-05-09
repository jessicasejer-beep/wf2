import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id: cahierId } = await params;
  const { title } = await req.json();

  const count = await prisma.periode.count({ where: { cahierId } });

  const periode = await prisma.periode.create({
    data: { title, order: count, cahierId },
  });

  return NextResponse.json(periode, { status: 201 });
}
