import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id: leconId } = await params;
  const { title, type, accessLevel, fileUrl, fileName, fileSize, filePages } = await req.json();

  const resource = await prisma.resource.create({
    data: { title, type, accessLevel, fileUrl, fileName, fileSize, filePages, leconId },
  });

  return NextResponse.json(resource, { status: 201 });
}
