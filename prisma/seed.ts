import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database…");

  // Super admin
  const superAdminPwd = await bcrypt.hash("admin1234", 12);
  await prisma.user.upsert({
    where: { email: "admin@wf2.fr" },
    update: {},
    create: {
      email: "admin@wf2.fr",
      password: superAdminPwd,
      name: "Super Admin",
      role: "SUPER_ADMIN",
    },
  });

  // Demo publisher
  const publisherPwd = await bcrypt.hash("editeur1234", 12);
  const publisher = await prisma.publisher.upsert({
    where: { slug: "editions-demo" },
    update: {},
    create: {
      name: "Éditions Démo",
      slug: "editions-demo",
      description: "Éditeur de démonstration",
      color: "#00647D",
      users: {
        create: {
          email: "editeur@wf2.fr",
          password: publisherPwd,
          name: "Marie Dupont",
          role: "PUBLISHER",
        },
      },
    },
  });

  // Demo site
  const existingSite = await prisma.site.findUnique({ where: { slug: "maths-leonie-ce2" } });
  if (!existingSite) {
    const site = await prisma.site.create({
      data: {
        title: "Les maths avec Léonie – CE2",
        subtitle: "Collection Magellan",
        slug: "maths-leonie-ce2",
        discipline: "Mathématiques",
        ean: "9782047384169",
        description: "Site compagnon du manuel de mathématiques CE2 avec Léonie. Accédez à toutes les ressources du manuel : jeux, fiches d'entraînement, corrigés et activités à la maison.",
        status: "PUBLISHED",
        publisherId: publisher.id,
      },
    });

    // Cahier 1
    const cahier1 = await prisma.cahier.create({
      data: { title: "Cahier 1", order: 0, siteId: site.id },
    });

    const periode1 = await prisma.periode.create({
      data: { title: "Période 1", order: 0, cahierId: cahier1.id },
    });

    const lecon1 = await prisma.lecon.create({
      data: { title: "Leçon 1 – Nombres jusqu'à 69", order: 0, periodeId: periode1.id },
    });

    await prisma.resource.createMany({
      data: [
        { title: "Jeu 1 – Cartes dizaines", type: "SUPPORT", accessLevel: "LIBRE", fileSize: 217088, leconId: lecon1.id },
        { title: "Jeu 1 – Cartes unités", type: "SUPPORT", accessLevel: "LIBRE", fileSize: 224256, leconId: lecon1.id },
        { title: "Règles du jeu 1", type: "JEU", accessLevel: "ENSEIGNANT", fileSize: 512000, leconId: lecon1.id },
        { title: "Fiche d'entraînement", type: "FICHE", accessLevel: "ENSEIGNANT", fileSize: 2202010, leconId: lecon1.id },
        { title: "Calcul mental", type: "CALCUL_MENTAL", accessLevel: "ENSEIGNANT", fileSize: 645120, leconId: lecon1.id },
        { title: "Corrigés des exercices", type: "CORRIGE", accessLevel: "PRESCRIPTEUR", fileSize: 1053696, leconId: lecon1.id },
        { title: "À la maison", type: "A_LA_MAISON", accessLevel: "ENSEIGNANT", fileSize: 498688, leconId: lecon1.id },
      ],
    });

    const lecon2 = await prisma.lecon.create({
      data: { title: "Leçon 2 – Nombres jusqu'à 99", order: 1, periodeId: periode1.id },
    });

    await prisma.resource.createMany({
      data: [
        { title: "Jeu 2 – Cartes dizaines", type: "SUPPORT", accessLevel: "LIBRE", fileSize: 217088, leconId: lecon2.id },
        { title: "Règles du jeu 2", type: "JEU", accessLevel: "ENSEIGNANT", fileSize: 512000, leconId: lecon2.id },
        { title: "Fiche d'entraînement", type: "FICHE", accessLevel: "ENSEIGNANT", fileSize: 1800000, leconId: lecon2.id },
        { title: "Corrigés des exercices", type: "CORRIGE", accessLevel: "PRESCRIPTEUR", fileSize: 980000, leconId: lecon2.id },
      ],
    });

    await prisma.periode.createMany({
      data: [
        { title: "Période 2", order: 1, cahierId: cahier1.id },
        { title: "Période 3", order: 2, cahierId: cahier1.id },
        { title: "Période 4", order: 3, cahierId: cahier1.id },
        { title: "Période 5", order: 4, cahierId: cahier1.id },
      ],
    });

    await prisma.cahier.create({
      data: { title: "Cahier 2", order: 1, siteId: site.id },
    });
  }

  console.log("✅ Seed completed!");
  console.log("\n📋 Comptes de connexion:");
  console.log("  Super Admin : admin@wf2.fr / admin1234");
  console.log("  Éditeur     : editeur@wf2.fr / editeur1234");
  console.log("\n🌐 Site compagnon démo : /s/maths-leonie-ce2");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
