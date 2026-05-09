import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role: string }).role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { name, slug, description, color, adminName, adminEmail, adminPassword } = await req.json();

  if (!name || !slug || !adminName || !adminEmail || !adminPassword) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  const existing = await prisma.publisher.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "Ce slug est déjà utilisé." }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existingUser) {
    return NextResponse.json({ error: "Cet email est déjà utilisé." }, { status: 400 });
  }

  const hashed = await bcrypt.hash(adminPassword, 12);

  const publisher = await prisma.publisher.create({
    data: {
      name,
      slug,
      description,
      color: color ?? "#00647D",
      users: {
        create: {
          name: adminName,
          email: adminEmail,
          password: hashed,
          role: "PUBLISHER",
        },
      },
    },
  });

  return NextResponse.json(publisher, { status: 201 });
}
