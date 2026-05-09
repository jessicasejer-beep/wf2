"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen, Search, Download, Eye, Lock, Unlock, User,
  ChevronDown, ChevronRight, FileText, Home
} from "lucide-react";
import { getResourceType, getAccessLevel, formatFileSize } from "@/lib/utils";

interface Resource { id: string; title: string; type: string; accessLevel: string; fileUrl: string | null; fileName: string | null; fileSize: number | null; filePages: number | null; }
interface Lecon { id: string; title: string; order: number; resources: Resource[]; }
interface Periode { id: string; title: string; order: number; lecons: Lecon[]; }
interface Cahier { id: string; title: string; order: number; periodes: Periode[]; }
interface Site {
  id: string; title: string; subtitle: string | null; slug: string; discipline: string | null;
  ean: string | null; cover: string | null; description: string | null; status: string;
  publisher: { name: string; color: string; slug: string };
  cahiers: Cahier[];
}

function ResourceItem({ resource }: { resource: Resource }) {
  const [expanded, setExpanded] = useState(false);
  const rt = getResourceType(resource.type);
  const al = getAccessLevel(resource.accessLevel);
  const isLocked = resource.accessLevel !== "LIBRE";

  return (
    <div className={`border-b border-gray-100 last:border-0 ${expanded ? "bg-[#f0faf8]" : ""}`}>
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#f8fffe] transition"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: rt.bg, color: rt.color }}>
          <FileText size={13} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-700 text-[#0f172a] truncate">{resource.title}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded font-500" style={{ backgroundColor: rt.bg, color: rt.color }}>{rt.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {resource.fileUrl && (
            <span className="text-[9px] font-700 text-red-600 bg-red-50 px-1.5 py-0.5 rounded">PDF</span>
          )}
          {resource.fileSize && <span className="text-[11px] text-gray-400">{formatFileSize(resource.fileSize)}</span>}
          <div className="flex items-center gap-1.5 pl-3 border-l border-gray-200 min-w-[120px]">
            <span className="text-[9px] font-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide"
              style={{ color: al.color, backgroundColor: al.bg }}>
              {al.label}
            </span>
            <span className="text-[11px] font-700 flex items-center gap-1"
              style={{ color: isLocked ? "#1a1a2e" : "#00647D" }}>
              {isLocked ? <Lock size={11} /> : (
                <>
                  {expanded ? "Fermer" : "Ouvrir"}
                  <ChevronDown size={11} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {expanded && !isLocked && resource.fileUrl && (
        <div className="px-4 pb-4 border-t border-[#e8f5f3]">
          <div className="flex gap-4 items-start mt-3">
            <div className="w-16 h-20 bg-red-50 rounded-lg border border-red-100 flex flex-col items-center justify-center gap-1 shrink-0">
              <FileText size={24} className="text-red-600" strokeWidth={1.8} />
              <span className="text-[9px] font-800 text-red-600 tracking-wide">PDF</span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-700 text-[#0f172a] mb-1">{resource.title}</div>
              {resource.fileSize && (
                <div className="text-xs text-gray-400 mb-3">{formatFileSize(resource.fileSize)}</div>
              )}
              <div className="flex gap-2 flex-wrap">
                <a
                  href={resource.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 border-[1.5px] border-[#00647D] text-[#00647D] rounded-lg px-3 py-1.5 text-xs font-700 hover:bg-[#00647D] hover:text-white transition"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Eye size={13} /> Afficher
                </a>
                <a
                  href={resource.fileUrl}
                  download
                  className="flex items-center gap-1.5 bg-[#00647D] text-white rounded-lg px-3 py-1.5 text-xs font-700 hover:bg-[#005a70] transition"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download size={13} /> Télécharger
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {expanded && isLocked && (
        <div className="px-4 pb-4 border-t border-yellow-100 bg-yellow-50">
          <div className="flex items-center gap-2 mt-3 text-sm text-yellow-700">
            <Lock size={15} />
            <span>Ressource réservée aux {al.label.toLowerCase()}s — Connectez-vous pour y accéder.</span>
          </div>
        </div>
      )}
    </div>
  );
}

function LeconSection({ lecon, isActive, onClick }: { lecon: Lecon; isActive: boolean; onClick: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <div
        className="flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition"
        onClick={() => { setOpen(!open); onClick(); }}
      >
        <ChevronRight size={12} className={`text-[#00647D] shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
        <FileText size={12} className="text-[#00647D] shrink-0" />
        <span className={`text-xs flex-1 ${isActive ? "text-[#00647D] font-700" : "text-gray-700 font-500"}`}>{lecon.title}</span>
        <span className="text-[10px] text-gray-400">{lecon.resources.length}</span>
      </div>
      {open && lecon.resources.map((item) => (
        <a
          key={item.id}
          className={`block px-6 py-1.5 text-xs text-gray-500 hover:text-[#00647D] hover:bg-gray-50 border-l-[3px] border-transparent hover:border-[#00647D] transition cursor-pointer`}
        >
          {item.title}
        </a>
      ))}
    </div>
  );
}

export default function CompanionSite({ site, totalResources, totalLecons }: {
  site: Site; totalResources: number; totalLecons: number;
}) {
  const [activeCahier, setActiveCahier] = useState(0);
  const [activeLeconId, setActiveLeconId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("ALL");
  const [filterAccess, setFilterAccess] = useState("ALL");
  const [search, setSearch] = useState("");

  const currentCahier = site.cahiers[activeCahier];

  const allResources = activeLeconId
    ? currentCahier?.periodes.flatMap((p) => p.lecons).find((l) => l.id === activeLeconId)?.resources ?? []
    : currentCahier?.periodes.flatMap((p) => p.lecons.flatMap((l) => l.resources)) ?? [];

  const filteredResources = allResources.filter((r) => {
    if (filterType !== "ALL" && r.type !== filterType) return false;
    if (filterAccess !== "ALL" && r.accessLevel !== filterAccess) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const resourcesByType = ["SUPPORT", "JEU", "FICHE", "CALCUL_MENTAL", "CORRIGE", "A_LA_MAISON", "AUTRE"]
    .map((t) => ({ type: t, count: allResources.filter((r) => r.type === t).length }))
    .filter((x) => x.count > 0);

  const color = site.publisher.color || "#00647D";

  return (
    <div className="min-h-screen bg-[#f5f6f8] flex flex-col font-sans">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 h-14 flex items-center px-6 sticky top-0 z-50 shadow-sm">
        <div className="font-extrabold text-base mr-8 shrink-0">
          <span style={{ color }}>WF</span><span className="text-[#1a1a2e]">2.0</span>
        </div>
        <nav className="flex items-center gap-0 text-sm overflow-x-auto">
          {["Accueil", "Ressources", "Informations"].map((item, i) => (
            <span key={item} className={`px-4 h-14 flex items-center border-b-2 cursor-pointer whitespace-nowrap transition ${
              i === 1 ? "border-[#00647D] text-[#00647D] font-500" : "border-transparent text-gray-500 hover:text-gray-900"
            }`} style={i === 1 ? { borderBottomColor: color } : {}}>
              {item}
            </span>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center bg-gray-100 border border-gray-200 rounded-lg px-3 h-8 gap-2 w-48">
            <Search size={13} className="text-gray-400 shrink-0" />
            <input
              className="bg-transparent border-none outline-none text-xs text-gray-600 w-full placeholder:text-gray-400"
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Link href="/login" className="text-xs bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-200 transition">
            Connexion
          </Link>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-52 shrink-0 flex flex-col py-4 min-h-[calc(100vh-56px)] sticky top-14" style={{ backgroundColor: color }}>
          <div className="text-[10px] font-600 px-4 pb-3 mb-2 border-b border-white/10" style={{ color: "rgba(255,255,255,0.5)" }}>
            {site.status === "DRAFT" && (
              <span className="inline-block bg-yellow-400 text-yellow-900 text-[9px] font-700 px-1.5 rounded mb-1">BROUILLON</span>
            )}
            <div className="truncate">{site.publisher.name}</div>
          </div>

          {[
            { icon: "📊", label: "Présentation" },
            { icon: "📚", label: "Ressources", active: true },
          ].map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-2.5 px-4 py-2.5 text-[13px] cursor-pointer transition border-l-[3px] ${
                item.active ? "bg-white/10 text-white border-white font-500" : "text-white/70 border-transparent hover:bg-white/8 hover:text-white"
              }`}
            >
              <span className="text-sm">{item.icon}</span>
              {item.label}
            </div>
          ))}

          <div className="flex-1" />
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 min-w-0">
          {/* Hero card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 flex gap-5 mb-5 shadow-sm items-stretch">
            {site.cover ? (
              <div className="w-28 shrink-0 rounded-lg overflow-hidden border border-gray-100">
                <img src={site.cover} alt={site.title} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-28 h-40 shrink-0 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50">
                <BookOpen size={28} className="text-gray-300" />
              </div>
            )}
            <div className="w-px bg-gray-100 shrink-0" />
            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {site.discipline && (
                    <span className="text-[10px] font-600 px-2 py-1 rounded-full" style={{ backgroundColor: "#e0f2f0", color: "#005a70" }}>
                      {site.discipline}
                    </span>
                  )}
                  {site.ean && (
                    <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{site.ean}</span>
                  )}
                </div>
                <h1 className="text-2xl font-extrabold text-[#0f172a] leading-tight mb-1">{site.title}</h1>
                {site.subtitle && <p className="text-sm font-700" style={{ color }}>{site.subtitle}</p>}
                {site.description && <p className="text-sm text-gray-500 mt-2 leading-relaxed">{site.description}</p>}
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100 flex-wrap">
                <button className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-xs font-500 hover:bg-gray-50 transition">
                  <Home size={13} /> Accueil éditeur
                </button>
                <button className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-xs font-500 hover:opacity-90 transition shadow" style={{ backgroundColor: color }}>
                  <Download size={13} /> Télécharger tout
                </button>
              </div>
            </div>
            {/* Stats */}
            <div className="shrink-0 grid grid-rows-2 gap-2 w-36">
              {[
                { label: "Cahiers", value: site.cahiers.length },
                { label: "Ressources", value: totalResources },
                { label: "Leçons", value: totalLecons },
                { label: "Libres", value: allResources.filter((r) => r.accessLevel === "LIBRE").length },
              ].map((s) => (
                <div key={s.label} className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 flex items-center gap-2">
                  <div>
                    <div className="text-base font-800 text-[#1a1a2e] leading-none">{s.value}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Two-col layout */}
          <div className="grid gap-4" style={{ gridTemplateColumns: "280px 1fr" }}>
            {/* Summary panel */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden self-start">
              <div className="bg-gray-50 border-b border-gray-100 px-3.5 py-2.5 text-[10px] font-700 uppercase tracking-wider text-gray-400">
                Sommaire
              </div>

              {/* Cahier tabs */}
              {site.cahiers.length > 1 && (
                <div className="flex border-b border-gray-100">
                  {site.cahiers.map((c, i) => (
                    <button
                      key={c.id}
                      onClick={() => { setActiveCahier(i); setActiveLeconId(null); }}
                      className={`flex-1 py-2 text-xs font-500 border-b-2 transition ${
                        activeCahier === i ? "border-[#00647D] text-[#00647D]" : "border-transparent text-gray-500 hover:text-gray-800"
                      }`}
                      style={activeCahier === i ? { borderBottomColor: color } : {}}
                    >
                      {c.title.length > 14 ? `Cahier ${i + 1}` : c.title}
                    </button>
                  ))}
                </div>
              )}

              {currentCahier?.periodes.map((periode) => (
                <div key={periode.id} className="border-b border-gray-100 last:border-0">
                  <div className="flex items-center justify-between px-3.5 py-2 bg-gray-50 text-[11px] font-700 uppercase tracking-wider text-gray-500">
                    {periode.title}
                    <span className="text-[9px] bg-[#e0f2f0] text-[#00647D] px-1.5 py-0.5 rounded-full font-700">
                      {periode.lecons.reduce((a, l) => a + l.resources.length, 0)}
                    </span>
                  </div>
                  {periode.lecons.map((lecon) => (
                    <LeconSection
                      key={lecon.id}
                      lecon={lecon}
                      isActive={activeLeconId === lecon.id}
                      onClick={() => setActiveLeconId(activeLeconId === lecon.id ? null : lecon.id)}
                    />
                  ))}
                </div>
              ))}

              {!currentCahier && (
                <div className="py-8 text-center text-xs text-gray-400">Aucun contenu disponible</div>
              )}
            </div>

            {/* Resources panel */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Search */}
              <div className="p-3 border-b border-gray-100">
                <div className="flex items-center bg-white border-2 rounded-lg px-3 h-9 gap-2" style={{ borderColor: color }}>
                  <Search size={14} style={{ color }} className="shrink-0" />
                  <input
                    className="bg-transparent border-none outline-none text-sm text-gray-700 w-full placeholder:text-gray-400"
                    placeholder="Rechercher une ressource…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setFilterType("ALL")}
                  className={`text-xs px-3 py-1 rounded-lg border font-500 transition ${filterType === "ALL" ? "text-white border-transparent" : "bg-white text-gray-500 border-gray-200 hover:border-[#00647D] hover:text-[#00647D]"}`}
                  style={filterType === "ALL" ? { backgroundColor: color, borderColor: color } : {}}
                >
                  Tout
                </button>
                <div className="w-px h-4 bg-gray-200" />
                {resourcesByType.map(({ type, count }) => {
                  const rt = getResourceType(type);
                  const active = filterType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setFilterType(active ? "ALL" : type)}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-500 transition flex items-center gap-1 ${
                        active ? "text-white border-transparent" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                      }`}
                      style={active ? { backgroundColor: rt.color, borderColor: rt.color } : {}}
                    >
                      {rt.label}
                      <span className={`text-[9px] px-1 py-0.5 rounded-full ${active ? "bg-white/20" : "bg-gray-100"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
                <div className="w-px h-4 bg-gray-200" />
                {["LIBRE", "ENSEIGNANT", "PRESCRIPTEUR"].map((level) => {
                  const al = getAccessLevel(level);
                  const active = filterAccess === level;
                  const cnt = allResources.filter((r) => r.accessLevel === level).length;
                  if (cnt === 0) return null;
                  return (
                    <button
                      key={level}
                      onClick={() => setFilterAccess(active ? "ALL" : level)}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-500 transition flex items-center gap-1`}
                      style={active
                        ? { color: al.color, backgroundColor: al.bg, borderColor: al.color }
                        : { color: al.color, backgroundColor: "white", borderColor: al.bg }}
                    >
                      {level === "LIBRE" ? <Unlock size={10} /> : <Lock size={10} />}
                      {al.label}
                      <span className="text-[9px] px-1 rounded-full bg-black/10">{cnt}</span>
                    </button>
                  );
                })}
                <span className="ml-auto text-xs text-gray-400 shrink-0">
                  {filteredResources.length} ressource{filteredResources.length > 1 ? "s" : ""}
                  {activeLeconId ? " · " + (currentCahier?.periodes.flatMap((p) => p.lecons).find((l) => l.id === activeLeconId)?.title ?? "") : ""}
                </span>
              </div>

              {/* Resource list */}
              <div>
                {filteredResources.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 text-sm">
                    <FileText size={32} className="mx-auto mb-2 opacity-30" />
                    Aucune ressource trouvée
                  </div>
                ) : (
                  filteredResources.map((resource) => (
                    <ResourceItem key={resource.id} resource={resource} />
                  ))
                )}
              </div>

              {/* Footer status */}
              <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Contenu à jour · {site.publisher.name}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-sm">WF<span className="text-[#1a1a2e]">2.0</span></span>
          <span className="text-gray-200">|</span>
          <span>© {new Date().getFullYear()} {site.publisher.name} — Tous droits réservés</span>
        </div>
        <div className="flex items-center gap-4">
          {["Mentions légales", "RGPD", "Accessibilité", "Support"].map((link) => (
            <a key={link} href="#" className="hover:text-gray-700 transition">{link}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
