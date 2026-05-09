import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardNav from "@/components/ui/DashboardNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");

  const user = session.user as { role: string; publisherId?: string };
  if (user.role === "SUPER_ADMIN") redirect("/admin");

  const publisher = user.publisherId
    ? await prisma.publisher.findUnique({ where: { id: user.publisherId } })
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav
        userName={session.user?.name ?? "Éditeur"}
        publisherName={publisher?.name ?? "Éditeur"}
        publisherColor={publisher?.color ?? "#00647D"}
      />
      <main className="p-6 max-w-7xl mx-auto">{children}</main>
    </div>
  );
}
