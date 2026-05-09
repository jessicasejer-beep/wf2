"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BookOpen,
  LayoutDashboard,
  Building2,
  Globe,
  LogOut,
  ChevronDown,
} from "lucide-react";

interface AdminNavProps {
  userName: string;
  role: string;
}

const adminLinks = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/admin/publishers", label: "Éditeurs", icon: Building2, exact: false },
  { href: "/admin/sites", label: "Tous les sites", icon: Globe, exact: false },
];

export default function AdminNav({ userName, role }: AdminNavProps) {
  const pathname = usePathname();

  return (
    <nav className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-6 sticky top-0 z-50 shadow-sm">
      <Link href="/admin" className="flex items-center gap-2 mr-4 shrink-0">
        <div className="w-8 h-8 bg-[#00647D] rounded-lg flex items-center justify-center">
          <BookOpen size={16} className="text-white" />
        </div>
        <span className="font-extrabold text-[15px] text-[#1a1a2e]">
          WF<span className="text-[#00647D]">2.0</span>
        </span>
        <span className="text-[10px] font-700 bg-[#00647D]/10 text-[#00647D] px-2 py-0.5 rounded-full ml-1">
          SUPER ADMIN
        </span>
      </Link>

      <div className="flex items-center gap-1">
        {adminLinks.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-500 transition ${
                active
                  ? "bg-[#00647D]/10 text-[#00647D]"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <link.icon size={15} />
              {link.label}
            </Link>
          );
        })}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-8 h-8 rounded-full bg-[#00647D] flex items-center justify-center text-white text-xs font-700">
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="font-500 text-gray-700 hidden sm:block">{userName}</span>
          <ChevronDown size={14} className="text-gray-400" />
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition px-2 py-1.5 rounded-lg hover:bg-red-50"
        >
          <LogOut size={15} />
          <span className="hidden sm:block">Déconnexion</span>
        </button>
      </div>
    </nav>
  );
}
