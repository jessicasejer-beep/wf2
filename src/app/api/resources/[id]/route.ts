import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await params;
  const resource = await prisma.resource.findUnique({ where: { id } });

  if (resource?.fileUrl) {
    try {
      const filePath = path.join(process.cwd(), "public", resource.fileUrl);
      await unlink(filePath);
    } catch {
      // File may not exist on disk, ignore
    }
  }

  await prisma.resource.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
