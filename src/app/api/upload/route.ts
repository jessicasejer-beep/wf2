import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "Aucun fichier" }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Seuls les PDF sont acceptés" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const ext = ".pdf";
  const filename = `${randomUUID()}${ext}`;
  const filepath = path.join(uploadDir, filename);

  const bytes = await file.arrayBuffer();
  await writeFile(filepath, Buffer.from(bytes));

  return NextResponse.json({
    url: `/uploads/${filename}`,
    name: file.name,
    size: file.size,
  });
}
