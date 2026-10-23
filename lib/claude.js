// Tous les appels à Claude : analyse d'une infographie et "actions" (traduire, résumer, etc.).
import fs from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { UPLOAD_DIR } from "./store.js";

export const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";

// Le client lit ANTHROPIC_API_KEY (ou un profil `ant auth login`) automatiquement.
const client = new Anthropic();

// Si Claude refuse une requête (filtre de sécurité), l'API la relance
// automatiquement sur le modèle de repli recommandé.
const FALLBACK = {
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",
};

const SYSTEM = `Tu es l'éditeur d'une bibliothèque de connaissances en français consacrée à l'intelligence artificielle et au product management.
L'utilisatrice y dépose des infographies trouvées sur internet (souvent en anglais) et veut se les approprier.
Tu écris toujours en français clair et naturel, sans jargon inutile. Quand un terme technique anglais est d'usage courant (prompt, backlog, roadmap, fine-tuning…), garde-le et explique-le brièvement la première fois.
Reste fidèle au contenu de l'infographie : n'invente pas de chiffres ni de sources. Si un passage est illisible, dis-le.`;

// ---------- Actions proposées après le dépôt ----------

export const ACTIONS = {
  translate: {
    label: "Traduire en français",
    effort: "medium",
    prompt: `Traduis intégralement le texte de cette infographie en français.
Respecte sa structure : reprends les titres, sections, listes et légendes dans le même ordre, avec des titres Markdown (##, ###) et des listes.
N'ajoute pas de commentaire ni d'explication : uniquement la traduction.`,
  },
  simplify: {
    label: "Expliquer simplement",
    effort: "medium",
    prompt: `Explique le contenu de cette infographie comme à une personne curieuse qui n'y connaît rien.
- Commence par une phrase qui dit de quoi ça parle.
- Utilise des mots simples, des phrases courtes et une ou deux analogies du quotidien.
- Termine par une section "## À retenir" avec 3 points maximum.
Format Markdown, 300 mots maximum.`,
  },
  summary: {
    label: "Résumer",
    effort: "low",
    prompt: `Fais un résumé de cette infographie.
- Une phrase d'accroche en gras qui donne l'idée principale.
- Puis 3 à 6 puces avec les points clés.
Format Markdown, 150 mots maximum.`,
  },
  concept: {
    label: "Expliquer le concept",
    effort: "high",
    prompt: `Identifie le ou les concepts principaux présentés dans cette infographie et explique-les en profondeur pour une professionnelle du product management qui veut monter en compétence sur l'IA.
Structure en Markdown :
## Le concept en une phrase
## Comment ça marche
## Pourquoi c'est important (pour un produit, une équipe)
## Exemple concret
## Limites et pièges courants
## Pour aller plus loin (notions liées à explorer, sans inventer de liens)`,
  },
  practice: {
    label: "Mettre en pratique",
    effort: "medium",
    prompt: `À partir de cette infographie, propose comment l'appliquer concrètement dans le travail d'une équipe produit.
Structure en Markdown :
## Quand l'utiliser
## Plan d'action (étapes numérotées, 3 à 6)
## Questions à se poser en atelier
## Erreurs à éviter`,
  },
  quiz: {
    label: "Quiz de révision",
    effort: "medium",
    prompt: `Crée un petit quiz de 5 questions pour vérifier qu'on a bien compris cette infographie.
Pour chaque question : la question en gras, 3 propositions (A, B, C), puis la bonne réponse et une explication d'une phrase dans un bloc de citation (> ).
Format Markdown.`,
  },
  redesign: {
    label: "Refaire l'infographie en français",
    effort: "high",
    format: "html",
    prompt: `Recrée cette infographie en français sous forme d'une page HTML autonome.
Contraintes :
- Un seul document HTML complet (<!doctype html>…), CSS dans une balise <style>, aucune ressource externe, aucun JavaScript.
- Tu peux utiliser du SVG inline pour les schémas, icônes et flèches.
- Garde la structure et la hiérarchie de l'original (titre, sections, schémas) mais traduis tout le texte en français.
- Design moderne, lisible et aéré : coins arrondis, palette douce et cohérente, bon contraste, police système (system-ui).
- Largeur maximale de 900px, centrée, adaptée au mobile.
Réponds uniquement avec le code HTML, sans texte avant ou après.`,
  },
};

// ---------- Helpers ----------

async function imageBlock(item) {
  const data = await fs.readFile(path.join(UPLOAD_DIR, item.filename));
  return {
    type: "image",
    source: { type: "base64", media_type: item.mediaType, data: data.toString("base64") },
  };
}

function textOf(message) {
  if (message.stop_reason === "refusal") {
    throw new Error("Claude a refusé de traiter cette image.");
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error("La réponse a été coupée car elle était trop longue. Réessayez.");
  }
  return message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

// Les réponses sont longues : on passe par le streaming pour éviter les délais d'attente HTTP.
async function ask({ item, instruction, effort, format, maxTokens = 64000 }) {
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    ...FALLBACK,
    system: SYSTEM,
    thinking: { type: "adaptive" },
    output_config: { effort, ...(format ? { format } : {}) },
    messages: [
      {
        role: "user",
        content: [await imageBlock(item), { type: "text", text: instruction }],
      },
    ],
  });
  const message = await stream.finalMessage();
  return { text: textOf(message), model: message.model };
}

// ---------- Analyse automatique (remplit la "carte" de la bibliothèque) ----------

const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "category", "tags", "level", "reading_minutes", "source_language"],
  properties: {
    title: { type: "string", description: "Titre court et accrocheur en français (60 caractères max)" },
    description: { type: "string", description: "Une ou deux phrases en français qui donnent envie de lire la fiche" },
    category: { type: "string", enum: ["IA", "Product Management", "IA & Produit", "Data", "Autre"] },
    tags: { type: "array", items: { type: "string" }, description: "3 à 5 mots-clés courts en français" },
    level: { type: "string", enum: ["Débutant", "Intermédiaire", "Avancé"] },
    reading_minutes: { type: "integer", description: "Temps estimé pour lire et comprendre l'infographie" },
    source_language: { type: "string", description: "Langue du texte de l'infographie, en français (ex. anglais)" },
  },
};

export async function analyzeInfographic(item) {
  const { text } = await ask({
    item,
    effort: "low",
    maxTokens: 4000,
    format: { type: "json_schema", schema: ANALYSIS_SCHEMA },
    instruction:
      "Analyse cette infographie pour la classer dans la bibliothèque. Remplis chaque champ en français.",
  });
  const meta = JSON.parse(text);
  return {
    title: meta.title,
    description: meta.description,
    category: meta.category,
    tags: meta.tags.slice(0, 5),
    level: meta.level,
    readingMinutes: Math.max(1, meta.reading_minutes),
    sourceLanguage: meta.source_language,
  };
}

export async function runAction(item, actionKey) {
  const action = ACTIONS[actionKey];
  if (!action) throw new Error(`Action inconnue : ${actionKey}`);
  let { text, model } = await ask({ item, instruction: action.prompt, effort: action.effort });
  if (action.format === "html") {
    // Retire un éventuel bloc ```html … ``` autour du code.
    const fenced = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
    if (fenced) text = fenced[1].trim();
  }
  return { content: text, format: action.format || "markdown", model, createdAt: new Date().toISOString() };
}

// Message d'erreur lisible pour l'interface.
export function friendlyError(err) {
  if (err instanceof Anthropic.AuthenticationError) {
    return "Clé API Anthropic invalide ou absente. Renseignez ANTHROPIC_API_KEY dans le fichier .env puis relancez le serveur.";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "Trop de requêtes en même temps. Patientez quelques secondes puis réessayez.";
  }
  if (err instanceof Anthropic.BadRequestError) {
    return `Requête refusée par l'API : ${err.message}`;
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return "Impossible de joindre l'API Anthropic. Vérifiez votre connexion.";
  }
  if (err instanceof Anthropic.APIError) {
    return `Erreur de l'API Anthropic (${err.status ?? "?"}). Réessayez dans un instant.`;
  }
  if (/credentials|apiKey|authToken/i.test(err?.message || "")) {
    return "Aucune clé API trouvée. Renseignez ANTHROPIC_API_KEY dans le fichier .env puis relancez le serveur.";
  }
  return err?.message || "Erreur inconnue";
}
