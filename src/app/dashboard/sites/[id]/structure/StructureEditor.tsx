"use client";

import { useState, useRef } from "react";
import {
  Plus, ChevronDown, ChevronRight, Trash2, Loader2,
  BookOpen, Calendar, FileText, Upload, X, Lock, Unlock, User
} from "lucide-react";
import { RESOURCE_TYPES, ACCESS_LEVELS, formatFileSize, getResourceType, getAccessLevel } from "@/lib/utils";

interface Resource {
  id: string;
  title: string;
  type: string;
  accessLevel: string;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  filePages: number | null;
}

interface Lecon {
  id: string;
  title: string;
  order: number;
  resources: Resource[];
}

interface Periode {
  id: string;
  title: string;
  order: number;
  lecons: Lecon[];
}

interface Cahier {
  id: string;
  title: string;
  order: number;
  periodes: Periode[];
}

interface Props {
  siteId: string;
  initialCahiers: Cahier[];
}

function ResourceForm({ leconId, onAdded }: { leconId: string; onAdded: (r: Resource) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("SUPPORT");
  const [accessLevel, setAccessLevel] = useState("LIBRE");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fileData, setFileData] = useState<{ url: string; name: string; size: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      setFileData({ url: data.url, name: data.name, size: data.size });
      if (!title) setTitle(file.name.replace(/\.pdf$/i, ""));
    }
    setUploading(false);
  }

  async function handleSave() {
    if (!title) return;
    setSaving(true);

    const res = await fetch(`/api/lecons/${leconId}/resources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        type,
        accessLevel,
        fileUrl: fileData?.url ?? null,
        fileName: fileData?.name ?? null,
        fileSize: fileData?.size ?? null,
      }),
    });

    if (res.ok) {
      const resource = await res.json();
      onAdded(resource);
      setTitle(""); setFileData(null); setType("SUPPORT"); setAccessLevel("LIBRE");
      setOpen(false);
    }
    setSaving(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-[#00647D] font-600 hover:underline mt-1"
      >
        <Plus size={13} /> Ajouter une ressource
      </button>
    );
  }

  return (
    <div className="mt-2 bg-[#f0faf8] rounded-lg border border-[#00647D]/20 p-4 space-y-3">
      <div className="font-600 text-sm text-gray-900">Nouvelle ressource</div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-600 text-gray-600 mb-1">Titre *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#00647D]"
            placeholder="Ex : Fiche d'entraînement"
          />
        </div>
        <div>
          <label className="block text-xs font-600 text-gray-600 mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#00647D] bg-white"
          >
            {RESOURCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-600 text-gray-600 mb-1">Niveau d&apos;accès</label>
        <div className="flex gap-2">
          {ACCESS_LEVELS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => setAccessLevel(l.value)}
              className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-600 border transition ${
                accessLevel === l.value ? "border-current" : "border-gray-200 bg-white text-gray-400"
              }`}
              style={accessLevel === l.value ? { color: l.color, backgroundColor: l.bg, borderColor: l.color } : {}}
            >
              {l.value === "LIBRE" ? <Unlock size={11} /> : l.value === "ENSEIGNANT" ? <Lock size={11} /> : <User size={11} />}
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-600 text-gray-600 mb-1">Fichier PDF</label>
        {fileData ? (
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs">
            <span className="text-red-600 font-700">PDF</span>
            <span className="flex-1 truncate text-gray-700">{fileData.name}</span>
            <span className="text-gray-400">{formatFileSize(fileData.size)}</span>
            <button type="button" onClick={() => { setFileData(null); if (fileRef.current) fileRef.current.value = ""; }}>
              <X size={13} className="text-gray-400 hover:text-red-500" />
            </button>
          </div>
        ) : (
          <label className="flex items-center gap-2 cursor-pointer bg-white border border-dashed border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-500 hover:border-[#00647D] hover:text-[#00647D] transition w-fit">
            {uploading ? <Loader2 size={13} className="animate-spin text-[#00647D]" /> : <Upload size={13} />}
            {uploading ? "Envoi en cours…" : "Choisir un PDF"}
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFile} />
          </label>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => { setOpen(false); setTitle(""); setFileData(null); }}
          className="flex-1 text-xs text-gray-500 border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !title}
          className="flex-1 flex items-center justify-center gap-1 text-xs bg-[#00647D] text-white rounded-lg py-1.5 hover:bg-[#005a70] disabled:opacity-60"
        >
          {saving && <Loader2 size={12} className="animate-spin" />}
          Enregistrer
        </button>
      </div>
    </div>
  );
}

function AccessBadge({ level }: { level: string }) {
  const l = getAccessLevel(level);
  return (
    <span className="text-[9px] font-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide"
      style={{ color: l.color, backgroundColor: l.bg }}>
      {l.label}
    </span>
  );
}

function ResourceRow({ resource, onDelete }: { resource: Resource; onDelete: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const rt = getResourceType(resource.type);

  async function handleDelete() {
    if (!confirm(`Supprimer "${resource.title}" ?`)) return;
    setDeleting(true);
    await fetch(`/api/resources/${resource.id}`, { method: "DELETE" });
    onDelete();
  }

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 group">
      <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: rt.bg, color: rt.color }}>
        <FileText size={10} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-500 text-gray-800 truncate block">{resource.title}</span>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{rt.label}</span>
          <AccessBadge level={resource.accessLevel} />
          {resource.fileUrl && (
            <>
              <span className="text-[9px] font-700 text-red-500 bg-red-50 px-1.5 py-0.5 rounded">PDF</span>
              {resource.fileSize && <span className="text-[9px] text-gray-400">{formatFileSize(resource.fileSize)}</span>}
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
        {resource.fileUrl && (
          <a href={resource.fileUrl} target="_blank" rel="noopener" className="text-[10px] text-[#00647D] font-600 hover:underline">
            Voir
          </a>
        )}
        <button onClick={handleDelete} disabled={deleting} className="text-red-400 hover:text-red-600 ml-1">
          {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
        </button>
      </div>
    </div>
  );
}

function LeconBlock({ lecon, periodeId, onDelete }: { lecon: Lecon; periodeId: string; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [resources, setResources] = useState<Resource[]>(lecon.resources);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Supprimer la leçon "${lecon.title}" et ses ressources ?`)) return;
    setDeleting(true);
    await fetch(`/api/lecons/${lecon.id}`, { method: "DELETE" });
    onDelete();
  }

  return (
    <div className="border border-gray-100 rounded-lg mb-1.5 bg-white overflow-hidden">
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 group"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown size={13} className="text-gray-400 shrink-0" /> : <ChevronRight size={13} className="text-gray-400 shrink-0" />}
        <FileText size={13} className="text-[#00647D] shrink-0" />
        <span className="text-sm font-600 text-gray-800 flex-1">{lecon.title}</span>
        <span className="text-xs text-gray-400 mr-2">{resources.length} ressource{resources.length > 1 ? "s" : ""}</span>
        <button
          onClick={(e) => { e.stopPropagation(); handleDelete(); }}
          disabled={deleting}
          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition"
        >
          {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        </button>
      </div>

      {open && (
        <div className="px-3 pb-3 border-t border-gray-50">
          <div className="mt-2 space-y-0.5">
            {resources.map((r) => (
              <ResourceRow
                key={r.id}
                resource={r}
                onDelete={() => setResources(resources.filter((x) => x.id !== r.id))}
              />
            ))}
          </div>
          <ResourceForm
            leconId={lecon.id}
            onAdded={(r) => setResources([...resources, r])}
          />
        </div>
      )}
    </div>
  );
}

function PeriodeBlock({ periode, onDelete }: { periode: Periode; onDelete: () => void }) {
  const [open, setOpen] = useState(true);
  const [lecons, setLecons] = useState<Lecon[]>(periode.lecons);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function addLecon() {
    if (!newTitle.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/periodes/${periode.id}/lecons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    if (res.ok) {
      const lecon = await res.json();
      setLecons([...lecons, { ...lecon, resources: [] }]);
      setNewTitle(""); setAdding(false);
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm(`Supprimer la période "${periode.title}" ?`)) return;
    setDeleting(true);
    await fetch(`/api/periodes/${periode.id}`, { method: "DELETE" });
    onDelete();
  }

  return (
    <div className="border border-gray-200 rounded-xl mb-3 overflow-hidden bg-white shadow-sm">
      <div
        className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 cursor-pointer hover:bg-gray-100 group"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown size={14} className="text-gray-500 shrink-0" /> : <ChevronRight size={14} className="text-gray-500 shrink-0" />}
        <Calendar size={14} className="text-[#00647D] shrink-0" />
        <span className="text-sm font-700 text-gray-700 flex-1">{periode.title}</span>
        <span className="text-xs bg-[#e0f2f0] text-[#005a70] px-2 py-0.5 rounded-full font-600">
          {lecons.length} leçon{lecons.length > 1 ? "s" : ""}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); handleDelete(); }}
          disabled={deleting}
          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 ml-2 transition"
        >
          {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        </button>
      </div>

      {open && (
        <div className="p-3">
          {lecons.map((lecon) => (
            <LeconBlock
              key={lecon.id}
              lecon={lecon}
              periodeId={periode.id}
              onDelete={() => setLecons(lecons.filter((l) => l.id !== lecon.id))}
            />
          ))}

          {adding ? (
            <div className="flex gap-2 mt-2">
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addLecon(); if (e.key === "Escape") setAdding(false); }}
                placeholder="Titre de la leçon…"
                className="flex-1 border border-[#00647D] rounded-lg px-3 py-1.5 text-sm focus:outline-none"
              />
              <button onClick={addLecon} disabled={saving} className="bg-[#00647D] text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-[#005a70]">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              </button>
              <button onClick={() => setAdding(false)} className="text-gray-400 hover:text-gray-700 px-2">
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 text-xs text-[#00647D] font-600 hover:underline mt-1 px-2"
            >
              <Plus size={13} /> Ajouter une leçon
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CahierBlock({ cahier, onDelete }: { cahier: Cahier; onDelete: () => void }) {
  const [open, setOpen] = useState(true);
  const [periodes, setPeriodes] = useState<Periode[]>(cahier.periodes);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function addPeriode() {
    if (!newTitle.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/cahiers/${cahier.id}/periodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    if (res.ok) {
      const periode = await res.json();
      setPeriodes([...periodes, { ...periode, lecons: [] }]);
      setNewTitle(""); setAdding(false);
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm(`Supprimer le cahier "${cahier.title}" et tout son contenu ?`)) return;
    setDeleting(true);
    await fetch(`/api/cahiers/${cahier.id}`, { method: "DELETE" });
    onDelete();
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
      <div
        className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-gray-50 group"
        onClick={() => setOpen(!open)}
        style={{ borderBottom: open ? "1px solid #f0f2f5" : undefined }}
      >
        {open ? <ChevronDown size={16} className="text-gray-500 shrink-0" /> : <ChevronRight size={16} className="text-gray-500 shrink-0" />}
        <BookOpen size={16} className="text-[#00647D] shrink-0" />
        <span className="font-800 text-gray-900 flex-1 text-[15px]">{cahier.title}</span>
        <span className="text-xs bg-[#e0f2f0] text-[#005a70] px-2 py-0.5 rounded-full font-600 mr-2">
          {periodes.length} période{periodes.length > 1 ? "s" : ""}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); handleDelete(); }}
          disabled={deleting}
          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition px-2"
        >
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>

      {open && (
        <div className="p-4">
          {periodes.map((periode) => (
            <PeriodeBlock
              key={periode.id}
              periode={periode}
              onDelete={() => setPeriodes(periodes.filter((p) => p.id !== periode.id))}
            />
          ))}

          {adding ? (
            <div className="flex gap-2 mt-2">
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addPeriode(); if (e.key === "Escape") setAdding(false); }}
                placeholder="Ex : Période 1"
                className="flex-1 border border-[#00647D] rounded-lg px-3 py-2 text-sm focus:outline-none"
              />
              <button onClick={addPeriode} disabled={saving} className="bg-[#00647D] text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1 hover:bg-[#005a70]">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              </button>
              <button onClick={() => setAdding(false)} className="text-gray-400 hover:text-gray-700 px-2">
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 text-sm text-[#00647D] font-600 hover:underline mt-2"
            >
              <Plus size={14} /> Ajouter une période
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function StructureEditor({ siteId, initialCahiers }: Props) {
  const [cahiers, setCahiers] = useState<Cahier[]>(initialCahiers);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function addCahier() {
    if (!newTitle.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/sites/${siteId}/cahiers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    if (res.ok) {
      const cahier = await res.json();
      setCahiers([...cahiers, { ...cahier, periodes: [] }]);
      setNewTitle(""); setAdding(false);
    }
    setSaving(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-700 text-gray-900">Cahiers / Volumes</h2>
          <p className="text-xs text-gray-400 mt-0.5">Organisez le contenu en cahiers → périodes → leçons → ressources</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 bg-[#00647D] text-white px-4 py-2 rounded-lg text-sm font-600 hover:bg-[#005a70] transition"
        >
          <Plus size={15} /> Ajouter un cahier
        </button>
      </div>

      {cahiers.length === 0 && !adding && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 py-16 text-center text-gray-400 shadow-sm">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-500 mb-1">Aucun contenu pour l&apos;instant</p>
          <p className="text-xs mb-4">Commencez par ajouter un cahier pour structurer votre site</p>
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-2 bg-[#00647D] text-white px-4 py-2 rounded-lg text-sm font-600 hover:bg-[#005a70]"
          >
            <Plus size={15} /> Ajouter le premier cahier
          </button>
        </div>
      )}

      {cahiers.map((cahier) => (
        <CahierBlock
          key={cahier.id}
          cahier={cahier}
          onDelete={() => setCahiers(cahiers.filter((c) => c.id !== cahier.id))}
        />
      ))}

      {adding && (
        <div className="flex gap-2 mb-4">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addCahier(); if (e.key === "Escape") setAdding(false); }}
            placeholder="Ex : Cahier 1 — Calcul"
            className="flex-1 border-2 border-[#00647D] rounded-xl px-4 py-2.5 text-sm focus:outline-none"
          />
          <button onClick={addCahier} disabled={saving} className="bg-[#00647D] text-white px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 hover:bg-[#005a70]">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Créer
          </button>
          <button onClick={() => setAdding(false)} className="text-gray-400 hover:text-gray-700 px-3">
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
