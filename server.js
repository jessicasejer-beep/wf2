import path from "node:path";
import fs from "node:fs";
import express from "express";
import multer from "multer";

// Charge le fichier .env s'il existe (Node 20.12+).
if (fs.existsSync(".env")) process.loadEnvFile(".env");

const { initStore, listItems, getItem, addItem, updateItem, removeItem, newId, UPLOAD_DIR } =
  await import("./lib/store.js");
const { ACTIONS, MODEL, analyzeInfographic, runAction, friendlyError } = await import("./lib/claude.js");

const PORT = Number(process.env.PORT) || 3000;
// Formats d'image acceptés par l'API Claude, et taille max par image.
const MEDIA_TYPES = { "image/png": ".png", "image/jpeg": ".jpg", "image/gif": ".gif", "image/webp": ".webp" };
const MAX_BYTES = 5 * 1024 * 1024;

await initStore();
const app = express();
app.use(express.json({ limit: "1mb" }));

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, newId() + MEDIA_TYPES[file.mimetype]),
  }),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) =>
    MEDIA_TYPES[file.mimetype]
      ? cb(null, true)
      : cb(new Error("Format non pris en charge : utilisez PNG, JPG, GIF ou WebP.")),
});

// ---------- API ----------

app.get("/api/config", (_req, res) => {
  res.json({
    model: MODEL,
    actions: Object.entries(ACTIONS).map(([key, a]) => ({ key, label: a.label })),
  });
});

app.get("/api/items", (_req, res) => res.json(listItems()));

app.get("/api/items/:id", (req, res) => {
  const item = getItem(req.params.id);
  if (!item) return res.status(404).json({ error: "Fiche introuvable" });
  res.json(item);
});

// Dépôt d'une infographie : on l'enregistre puis on l'analyse pour remplir la carte.
app.post("/api/items", (req, res) => {
  upload.single("image")(req, res, async (uploadErr) => {
    if (uploadErr) {
      const msg =
        uploadErr.code === "LIMIT_FILE_SIZE" ? "Image trop lourde (5 Mo maximum)." : uploadErr.message;
      return res.status(400).json({ error: msg });
    }
    if (!req.file) return res.status(400).json({ error: "Aucune image reçue." });

    const item = await addItem({
      id: path.parse(req.file.filename).name,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mediaType: req.file.mimetype,
      createdAt: new Date().toISOString(),
      title: req.file.originalname.replace(/\.[^.]+$/, ""),
      description: "",
      category: "Autre",
      tags: [],
      level: null,
      readingMinutes: null,
      favorite: false,
      views: 0,
      status: "analyzing",
      results: {},
    });

    try {
      const meta = await analyzeInfographic(item);
      res.json(await updateItem(item.id, { ...meta, status: "ready" }));
    } catch (err) {
      console.error(err);
      res.json(await updateItem(item.id, { status: "ready", analysisError: friendlyError(err) }));
    }
  });
});

// Lance une action (traduction, résumé…) et garde le résultat dans la fiche.
app.post("/api/items/:id/actions/:action", async (req, res) => {
  const item = getItem(req.params.id);
  if (!item) return res.status(404).json({ error: "Fiche introuvable" });
  if (!ACTIONS[req.params.action]) return res.status(400).json({ error: "Action inconnue" });
  try {
    const result = await runAction(item, req.params.action);
    const updated = await updateItem(item.id, (it) => ({
      results: { ...it.results, [req.params.action]: result },
    }));
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: friendlyError(err) });
  }
});

// Relance l'analyse automatique (titre, tags…).
app.post("/api/items/:id/analyze", async (req, res) => {
  const item = getItem(req.params.id);
  if (!item) return res.status(404).json({ error: "Fiche introuvable" });
  try {
    const meta = await analyzeInfographic(item);
    res.json(await updateItem(item.id, { ...meta, analysisError: undefined }));
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: friendlyError(err) });
  }
});

// Modifications manuelles : titre, description, catégorie, tags, favori, compteur de vues.
app.patch("/api/items/:id", async (req, res) => {
  const allowed = ["title", "description", "category", "tags", "favorite"];
  const patch = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
  const item = getItem(req.params.id);
  if (!item) return res.status(404).json({ error: "Fiche introuvable" });
  if (req.body?.view) patch.views = (item.views || 0) + 1;
  res.json(await updateItem(item.id, patch));
});

app.delete("/api/items/:id", async (req, res) => {
  const removed = await removeItem(req.params.id);
  if (!removed) return res.status(404).json({ error: "Fiche introuvable" });
  res.json({ ok: true });
});

// ---------- Fichiers statiques ----------

app.use("/uploads", express.static(UPLOAD_DIR, { fallthrough: false }));
const vendor = { "marked.js": "node_modules/marked/lib/marked.umd.js", "purify.js": "node_modules/dompurify/dist/purify.min.js" };
app.get("/vendor/:file", (req, res) =>
  vendor[req.params.file] ? res.sendFile(path.resolve(vendor[req.params.file])) : res.sendStatus(404)
);
app.use(express.static("public"));

app.listen(PORT, () => {
  console.log(`Infothèque prête sur http://localhost:${PORT} (modèle : ${MODEL})`);
});
