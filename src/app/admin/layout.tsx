import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AdminNav from "@/components/ui/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");

  const role = (session.user as { role: string }).role;
  if (role !== "SUPER_ADMIN") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav
        userName={session.user?.name ?? "Admin"}
        role={role}
      />
      <main className="p-6 max-w-7xl mx-auto">{children}</main>
    </div>
  );
}
