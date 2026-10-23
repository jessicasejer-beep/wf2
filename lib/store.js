// Stockage simple sur disque : un fichier JSON pour les fiches + un dossier pour les images.
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const DATA_DIR = path.resolve(process.env.DATA_DIR || "./data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const DB_FILE = path.join(DATA_DIR, "library.json");

let items = [];
// Les écritures passent par une file pour ne jamais se chevaucher.
let writeQueue = Promise.resolve();

export async function initStore() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  try {
    items = JSON.parse(await fs.readFile(DB_FILE, "utf8"));
    // Une analyse interrompue (serveur arrêté) ne doit pas rester bloquée.
    for (const it of items) if (it.status === "analyzing") it.status = "ready";
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    items = [];
  }
}

function persist() {
  const snapshot = JSON.stringify(items, null, 2);
  writeQueue = writeQueue.then(async () => {
    const tmp = `${DB_FILE}.tmp`;
    await fs.writeFile(tmp, snapshot);
    await fs.rename(tmp, DB_FILE);
  });
  return writeQueue;
}

export const newId = () => crypto.randomUUID();

export function listItems() {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getItem(id) {
  return items.find((it) => it.id === id) || null;
}

export async function addItem(item) {
  items.push(item);
  await persist();
  return item;
}

export async function updateItem(id, patch) {
  const item = getItem(id);
  if (!item) return null;
  Object.assign(item, typeof patch === "function" ? patch(item) : patch);
  await persist();
  return item;
}

export async function removeItem(id) {
  const item = getItem(id);
  if (!item) return null;
  items = items.filter((it) => it.id !== id);
  await persist();
  await fs.rm(path.join(UPLOAD_DIR, item.filename), { force: true });
  return item;
}
