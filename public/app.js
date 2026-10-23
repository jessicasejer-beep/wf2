// Infothèque — interface (aucun framework, routage par #hash).

const ACTION_UI = {
  translate: { emoji: "🇫🇷", hint: "Tout le texte, fidèlement, en français", tint: "#E8F1FF" },
  simplify: { emoji: "🧒", hint: "Avec des mots simples et des analogies", tint: "#FFF1E0" },
  summary: { emoji: "📝", hint: "L'essentiel en quelques puces", tint: "#EAF7EE" },
  concept: { emoji: "💡", hint: "Comprendre en profondeur, avec exemples", tint: "#FFF8D6" },
  practice: { emoji: "🛠️", hint: "Comment l'appliquer en équipe produit", tint: "#F1ECFF" },
  quiz: { emoji: "🎯", hint: "5 questions pour vérifier ses acquis", tint: "#FFE9EE" },
  redesign: { emoji: "🎨", hint: "Une nouvelle version, entièrement en français", tint: "#E6F7F7" },
};
const DEFAULT_ACTIONS = ["translate", "summary"];
const CATEGORY_EMOJI = { IA: "🤖", "Product Management": "🧭", "IA & Produit": "🚀", Data: "📊", Autre: "✨" };

const state = {
  config: { actions: [] },
  items: [],
  filter: "Tous",
  search: "",
  featuredPage: 0,
  running: new Set(), // "itemId:action" en cours
  activeTab: {}, // onglet affiché par fiche
};

// ---------- Utilitaires ----------

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const label = (key) => state.config.actions.find((a) => a.key === key)?.label || key;
const imgUrl = (it) => `/uploads/${it.filename}`;
const md = (text) => DOMPurify.sanitize(marked.parse(text || ""));

async function api(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}
const json = (method, body) => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

function toast(message, isError = false) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.toggle("error", isError);
  el.hidden = false;
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.hidden = true), isError ? 7000 : 3000);
}

function upsert(item) {
  const i = state.items.findIndex((x) => x.id === item.id);
  if (i >= 0) state.items[i] = item;
  else state.items.unshift(item);
}

// ---------- Routage ----------

function route() {
  const hash = location.hash || "#/";
  const m = hash.match(/^#\/fiche\/([\w-]+)/);
  if (m) return renderDetail(m[1]);
  renderHome(hash === "#/favoris");
}
window.addEventListener("hashchange", () => {
  route();
  window.scrollTo({ top: 0 });
});

// ---------- Page d'accueil ----------

function renderHome(favoritesOnly = false) {
  const app = $("#app");
  const items = state.items;
  const categories = ["Tous", ...new Set(items.map((i) => i.category).filter(Boolean))];
  if (!categories.includes(state.filter)) state.filter = "Tous";

  const q = state.search.trim().toLowerCase();
  const visible = items.filter((it) => {
    if (favoritesOnly && !it.favorite) return false;
    if (state.filter !== "Tous" && it.category !== state.filter) return false;
    if (!q) return true;
    return [it.title, it.description, ...(it.tags || [])].join(" ").toLowerCase().includes(q);
  });

  const totalFiches = items.reduce((n, it) => n + Object.keys(it.results || {}).length, 0);

  app.innerHTML = `
    ${favoritesOnly ? "" : `
    <section class="hero">
      <div class="hero-text">
        <h1>Apprendre l'IA &amp; le produit, <span class="accent">une infographie</span> à la fois</h1>
        <p class="muted">Déposez les infographies trouvées sur internet : traduction, résumé, explication du concept
          ou version française, votre bibliothèque se remplit toute seule.</p>
        <div class="hero-stats">
          <div><strong>${items.length}</strong><span>infographies</span></div>
          <div><strong>${totalFiches}</strong><span>fiches générées</span></div>
          <div><strong>${items.filter((i) => i.favorite).length}</strong><span>favoris</span></div>
        </div>
      </div>
      <div class="dropzone" id="dropzone" tabindex="0" role="button" aria-label="Déposer une infographie">
        <span class="float f1">🤖</span><span class="float f2">💡</span><span class="float f3">🧭</span><span class="float f4">📊</span>
        <div class="dropzone-inner">
          <div class="dropzone-icon">⬆️</div>
          <h3>Déposez vos infographies ici</h3>
          <p class="muted">ou cliquez pour les choisir · PNG, JPG, WebP, GIF · 5 Mo max</p>
          <span class="btn btn-primary">Choisir des fichiers</span>
        </div>
      </div>
    </section>
    ${renderFeatured(items)}`}

    <section class="section" id="library">
      <div class="section-head">
        <div>
          <h2>${favoritesOnly ? "Mes <span class=\"accent\">favoris</span>" : "Découvrir, comprendre, <span class=\"accent\">retenir</span>"}</h2>
          <p class="muted">${visible.length} infographie${visible.length > 1 ? "s" : ""}</p>
        </div>
        <label class="search">
          <span>🔍</span>
          <input type="search" id="search" placeholder="Rechercher un sujet, un tag…" value="${esc(state.search)}" />
        </label>
      </div>
      <div class="chips">
        ${categories
          .map(
            (c) => `<button class="chip ${c === state.filter ? "active" : ""}" data-filter="${esc(c)}">
              ${c === "Tous" ? "🌈" : CATEGORY_EMOJI[c] || "✨"} ${esc(c)}</button>`
          )
          .join("")}
      </div>
      ${
        visible.length
          ? `<div class="grid">${visible.map(cardHtml).join("")}</div>`
          : `<div class="empty">
              <div class="empty-emoji">🍽️</div>
              <h3>${items.length ? "Rien ne correspond à votre recherche" : "Votre bibliothèque est vide"}</h3>
              <p class="muted">${items.length ? "Essayez un autre mot-clé ou une autre catégorie." : "Déposez une première infographie pour commencer."}</p>
              ${items.length ? "" : `<button class="btn btn-primary" data-open-upload>Ajouter une infographie</button>`}
            </div>`
      }
    </section>`;

  const dz = $("#dropzone");
  if (dz) bindDropzone(dz);
  $("#search").addEventListener("input", (e) => {
    state.search = e.target.value;
    const pos = e.target.selectionStart;
    renderHome(favoritesOnly);
    const input = $("#search");
    input.focus();
    input.setSelectionRange(pos, pos);
  });
}

// "À la une" : trois grandes cartes, celle du milieu mise en avant.
function renderFeatured(items) {
  if (items.length < 1) return "";
  const pages = Math.ceil(items.length / 3);
  state.featuredPage = Math.min(state.featuredPage, pages - 1);
  const slice = items.slice(state.featuredPage * 3, state.featuredPage * 3 + 3);
  const highlight = slice.length === 3 ? 1 : 0;
  return `
    <section class="section">
      <div class="section-head">
        <h2>À la <span class="accent">une</span> aujourd'hui</h2>
        ${pages > 1 ? `<div class="pager">
          <button data-page="-1" ${state.featuredPage === 0 ? "disabled" : ""} aria-label="Précédent">‹</button>
          <span>${state.featuredPage + 1} / ${pages}</span>
          <button data-page="1" ${state.featuredPage === pages - 1 ? "disabled" : ""} aria-label="Suivant">›</button>
        </div>` : ""}
      </div>
      <div class="featured">
        ${slice
          .map(
            (it, i) => `
          <article class="feature-card ${i === highlight ? "highlight" : ""}">
            <h3>${esc(it.title)}</h3>
            ${i === highlight && it.description ? `<p class="feature-desc">${esc(it.description)}</p>` : ""}
            <div class="feature-img">
              <img src="${imgUrl(it)}" alt="" loading="lazy" />
              <span class="pill pill-float">👁 ${it.views || 0}</span>
              ${i === highlight ? `<div class="feature-tags">
                ${it.level ? `<span class="pill">${esc(it.level)}</span>` : ""}
                <span class="pill">${esc(it.category)}</span>
                ${(it.tags || []).slice(0, 2).map((t) => `<span class="pill">${esc(t)}</span>`).join("")}
              </div>` : ""}
            </div>
            <a class="feature-cta" href="#/fiche/${it.id}">Voir la fiche complète <span>→</span></a>
          </article>`
          )
          .join("")}
      </div>
    </section>`;
}

function cardHtml(it) {
  const n = Object.keys(it.results || {}).length;
  return `
    <a class="card" href="#/fiche/${it.id}">
      <div class="card-img">
        <img src="${imgUrl(it)}" alt="" loading="lazy" />
        ${it.favorite ? `<span class="fav-badge">♥</span>` : ""}
        <div class="card-meta">
          ${it.readingMinutes ? `<span>⏱ ${it.readingMinutes} min</span>` : ""}
          ${it.level ? `<span>🎯 ${esc(it.level)}</span>` : ""}
          <span>✨ ${n} fiche${n > 1 ? "s" : ""}</span>
        </div>
      </div>
      <div class="card-body">
        <span class="card-cat">${CATEGORY_EMOJI[it.category] || "✨"} ${esc(it.category || "")}</span>
        <h3>${esc(it.title)}</h3>
        <span class="link">Voir la fiche</span>
      </div>
    </a>`;
}

// ---------- Page de détail ("la recette") ----------

async function renderDetail(id) {
  let item = state.items.find((x) => x.id === id);
  if (!item) {
    try {
      item = await api(`/api/items/${id}`);
      upsert(item);
    } catch {
      $("#app").innerHTML = `<div class="empty"><div class="empty-emoji">🤷</div><h3>Fiche introuvable</h3><a class="btn btn-primary" href="#/">Retour</a></div>`;
      return;
    }
  }
  if (!renderDetail._viewed?.has(id)) {
    renderDetail._viewed = renderDetail._viewed || new Set();
    renderDetail._viewed.add(id);
    api(`/api/items/${id}`, json("PATCH", { view: true })).then(upsert).catch(() => {});
  }

  const done = Object.keys(item.results || {});
  const order = state.config.actions.map((a) => a.key);
  done.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  let tab = state.activeTab[id];
  if (!done.includes(tab)) tab = done[0];

  $("#app").innerHTML = `
    <a href="#/" class="back">← Retour à la bibliothèque</a>
    <section class="detail">
      <aside class="detail-side">
        <div class="detail-img" data-zoom="${imgUrl(item)}">
          <img src="${imgUrl(item)}" alt="${esc(item.title)}" />
          <span class="pill pill-float">🔍 Agrandir</span>
        </div>
        <div class="meta-grid">
          <div><span>Catégorie</span><strong>${CATEGORY_EMOJI[item.category] || "✨"} ${esc(item.category || "—")}</strong></div>
          <div><span>Niveau</span><strong>${esc(item.level || "—")}</strong></div>
          <div><span>Lecture</span><strong>${item.readingMinutes ? `${item.readingMinutes} min` : "—"}</strong></div>
          <div><span>Langue d'origine</span><strong>${esc(item.sourceLanguage || "—")}</strong></div>
        </div>
        <div class="side-actions">
          <button class="btn btn-ghost" data-fav="${item.id}">${item.favorite ? "♥ Dans mes favoris" : "♡ Ajouter aux favoris"}</button>
          <button class="btn btn-ghost" data-reanalyze="${item.id}">↻ Ré-analyser</button>
          <button class="btn btn-danger" data-delete="${item.id}">Supprimer</button>
        </div>
      </aside>

      <div class="detail-main">
        <div class="title-row">
          <h1 id="title" data-editable="title">${esc(item.title)}</h1>
          <button class="icon-btn" data-edit="${item.id}" title="Modifier le titre, la description et les tags">✏️</button>
        </div>
        ${item.analysisError ? `<p class="alert">${esc(item.analysisError)}</p>` : ""}
        <p class="lead">${esc(item.description || "")}</p>
        <div class="tags">${(item.tags || []).map((t) => `<span class="tag">#${esc(t)}</span>`).join("")}</div>

        <h2 class="h-small">Que voulez-vous en faire ?</h2>
        <div class="action-tiles">
          ${order
            .map((key) => {
              const ui = ACTION_UI[key] || {};
              const running = state.running.has(`${id}:${key}`);
              const has = done.includes(key);
              return `<button class="tile ${has ? "done" : ""} ${running ? "running" : ""}" data-run="${key}" style="--tint:${ui.tint}" ${running ? "disabled" : ""}>
                <span class="tile-emoji">${running ? `<span class="spinner"></span>` : ui.emoji}</span>
                <span class="tile-label">${esc(label(key))}</span>
                <span class="tile-hint">${running ? "En préparation…" : has ? "✓ Prêt · cliquer pour voir" : ui.hint}</span>
              </button>`;
            })
            .join("")}
        </div>

        ${
          done.length
            ? `<div class="tabs">${done
                .map((k) => `<button class="tab ${k === tab ? "active" : ""}" data-tab="${k}">${ACTION_UI[k]?.emoji || ""} ${esc(label(k))}</button>`)
                .join("")}</div>
              <div class="result">${resultHtml(item, tab)}</div>`
            : `<div class="empty small"><div class="empty-emoji">🥣</div><p class="muted">Choisissez une ou plusieurs actions ci-dessus pour créer vos premières fiches.</p></div>`
        }
      </div>
    </section>`;

  const iframe = $("#redesign-frame");
  if (iframe) iframe.srcdoc = item.results.redesign.content;
}

function resultHtml(item, key) {
  const r = item.results[key];
  const date = new Date(r.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const toolbar = `
    <div class="result-bar">
      <span class="muted">Généré le ${date}</span>
      <div>
        ${r.format === "html"
          ? `<button class="btn btn-ghost btn-sm" data-open-html>Plein écran</button>
             <button class="btn btn-ghost btn-sm" data-download-html>Télécharger</button>`
          : `<button class="btn btn-ghost btn-sm" data-copy="${key}">Copier</button>`}
        <button class="btn btn-ghost btn-sm" data-run="${key}" data-force="1">↻ Régénérer</button>
      </div>
    </div>`;
  if (r.format === "html") {
    // Rendu isolé : pas de scripts, pas d'accès à la page.
    return `${toolbar}<iframe id="redesign-frame" class="redesign" sandbox title="Infographie en français"></iframe>`;
  }
  return `${toolbar}<article class="prose">${md(r.content)}</article>`;
}

async function runActionFor(id, key) {
  const tag = `${id}:${key}`;
  if (state.running.has(tag)) return;
  state.running.add(tag);
  rerenderIfOn(id);
  try {
    const item = await api(`/api/items/${id}/actions/${key}`, { method: "POST" });
    upsert(item);
    state.activeTab[id] = key;
    toast(`${ACTION_UI[key]?.emoji || "✓"} ${label(key)} : c'est prêt !`);
  } catch (err) {
    toast(err.message, true);
  } finally {
    state.running.delete(tag);
    rerenderIfOn(id);
  }
}

function rerenderIfOn(id) {
  if (location.hash.startsWith(`#/fiche/${id}`)) {
    const y = window.scrollY;
    renderDetail(id).then(() => window.scrollTo({ top: y }));
  }
}

async function editItem(id) {
  const item = state.items.find((x) => x.id === id);
  const title = prompt("Titre", item.title);
  if (title === null) return;
  const description = prompt("Description", item.description || "");
  if (description === null) return;
  const tags = prompt("Tags (séparés par des virgules)", (item.tags || []).join(", "));
  if (tags === null) return;
  upsert(
    await api(`/api/items/${id}`, json("PATCH", {
      title: title.trim() || item.title,
      description: description.trim(),
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    }))
  );
  route();
}

// ---------- Upload ----------

let pendingFiles = [];

function bindDropzone(el) {
  el.addEventListener("click", () => $("#file-input").click());
  el.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && $("#file-input").click());
  ["dragenter", "dragover"].forEach((t) =>
    el.addEventListener(t, (e) => {
      e.preventDefault();
      el.classList.add("over");
    })
  );
  ["dragleave", "drop"].forEach((t) => el.addEventListener(t, () => el.classList.remove("over")));
  el.addEventListener("drop", (e) => {
    e.preventDefault();
    openUpload([...e.dataTransfer.files]);
  });
}

// On accepte aussi un glisser-déposer n'importe où sur la page, et le collage (Ctrl+V).
document.addEventListener("dragover", (e) => e.preventDefault());
document.addEventListener("drop", (e) => {
  e.preventDefault();
  if (e.dataTransfer?.files?.length && !e.target.closest("#dropzone")) openUpload([...e.dataTransfer.files]);
});
document.addEventListener("paste", (e) => {
  const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith("image/"));
  if (files.length) openUpload(files);
});
$("#file-input").addEventListener("change", (e) => {
  openUpload([...e.target.files]);
  e.target.value = "";
});

function openUpload(files) {
  const ok = ["image/png", "image/jpeg", "image/gif", "image/webp"];
  const rejected = files.filter((f) => !ok.includes(f.type) || f.size > 5 * 1024 * 1024);
  pendingFiles = files.filter((f) => !rejected.includes(f));
  if (rejected.length) toast(`${rejected.length} fichier(s) ignoré(s) : format non pris en charge ou plus de 5 Mo.`, true);
  if (!pendingFiles.length) {
    if (!rejected.length) $("#file-input").click();
    return;
  }
  const previews = pendingFiles.map((f) => URL.createObjectURL(f));
  $("#upload-body").innerHTML = `
    <div class="upload-grid">
      <div class="upload-previews ${pendingFiles.length > 1 ? "multi" : ""}">
        ${previews.map((src) => `<img src="${src}" alt="" />`).join("")}
      </div>
      <div>
        <h2>Que voulez-vous en <span class="accent">faire</span> ?</h2>
        <p class="muted">${pendingFiles.length > 1 ? `${pendingFiles.length} infographies sélectionnées. ` : ""}Choisissez une ou plusieurs actions. Vous pourrez en lancer d'autres plus tard depuis la fiche.</p>
        <div class="choice-list">
          ${state.config.actions
            .map(
              (a) => `
            <label class="choice" style="--tint:${ACTION_UI[a.key]?.tint}">
              <input type="checkbox" value="${a.key}" ${DEFAULT_ACTIONS.includes(a.key) ? "checked" : ""} />
              <span class="choice-emoji">${ACTION_UI[a.key]?.emoji || "✨"}</span>
              <span><strong>${esc(a.label)}</strong><small>${ACTION_UI[a.key]?.hint || ""}</small></span>
            </label>`
            )
            .join("")}
        </div>
        <button class="btn btn-primary btn-lg" id="start-upload">C'est parti →</button>
      </div>
    </div>`;
  $("#upload-modal").hidden = false;
  $("#start-upload").addEventListener("click", startUpload);
}

async function startUpload() {
  const actions = [...document.querySelectorAll(".choice input:checked")].map((i) => i.value);
  const files = pendingFiles;
  const body = $("#upload-body");
  const steps = files.map((f) => ({ name: f.name, status: "attente", item: null }));
  const draw = () => {
    body.innerHTML = `
      <h2>On s'occupe de <span class="accent">tout</span> 🍳</h2>
      <p class="muted">Lecture de l'infographie, classement, puis préparation des fiches demandées. Cela peut prendre une à deux minutes.</p>
      <ul class="progress">
        ${steps
          .map(
            (s) => `<li class="${s.status === "ok" ? "ok" : s.status === "erreur" ? "ko" : ""}">
              <span class="progress-icon">${s.status === "ok" ? "✓" : s.status === "erreur" ? "!" : s.status === "attente" ? "·" : `<span class="spinner"></span>`}</span>
              <span><strong>${esc(s.item?.title || s.name)}</strong><small>${esc(s.detail || s.status)}</small></span>
            </li>`
          )
          .join("")}
      </ul>`;
  };
  draw();

  for (const step of steps) {
    const file = files[steps.indexOf(step)];
    try {
      step.status = "en cours";
      step.detail = "Lecture et classement de l'infographie…";
      draw();
      const fd = new FormData();
      fd.append("image", file);
      let item = await api("/api/items", { method: "POST", body: fd });
      upsert(item);
      step.item = item;
      // Les actions d'une même infographie tournent en parallèle.
      step.detail = `Préparation : ${actions.map(label).join(", ") || "aucune action"}…`;
      draw();
      const results = await Promise.allSettled(
        actions.map((a) => api(`/api/items/${item.id}/actions/${a}`, { method: "POST" }))
      );
      const fresh = await api(`/api/items/${item.id}`);
      upsert(fresh);
      step.item = fresh;
      const failed = results.filter((r) => r.status === "rejected");
      step.status = failed.length ? "erreur" : "ok";
      step.detail = failed.length
        ? `${failed.length} action(s) en échec : ${failed[0].reason.message}`
        : item.analysisError || "Prêt !";
    } catch (err) {
      step.status = "erreur";
      step.detail = err.message;
    }
    draw();
  }

  const created = steps.filter((s) => s.item);
  body.insertAdjacentHTML(
    "beforeend",
    `<div class="progress-actions">
      ${created.length === 1 ? `<a class="btn btn-primary" href="#/fiche/${created[0].item.id}" data-close-modal>Voir la fiche →</a>` : ""}
      <button class="btn btn-ghost" data-close-modal>Retour à la bibliothèque</button>
    </div>`
  );
  if (!location.hash.startsWith("#/fiche/")) route();
}

// ---------- Délégation des clics ----------

document.addEventListener("click", async (e) => {
  const t = e.target.closest(
    "[data-open-upload],[data-close-modal],[data-filter],[data-page],[data-scroll],[data-run],[data-tab],[data-fav],[data-delete],[data-reanalyze],[data-edit],[data-zoom],[data-copy],[data-open-html],[data-download-html]"
  );
  const lightbox = $("#lightbox");
  if (e.target.closest("#lightbox")) return (lightbox.hidden = true);
  if (e.target.id === "upload-modal") return ($("#upload-modal").hidden = true);
  if (!t) return;
  const d = t.dataset;
  const id = (location.hash.match(/^#\/fiche\/([\w-]+)/) || [])[1];
  const item = id && state.items.find((x) => x.id === id);

  if ("openUpload" in d) $("#file-input").click();
  else if ("closeModal" in d) $("#upload-modal").hidden = true;
  else if (d.filter) {
    state.filter = d.filter;
    route();
  } else if (d.page) {
    state.featuredPage += Number(d.page);
    route();
  } else if (d.scroll) {
    e.preventDefault();
    if (location.hash !== "#/" && location.hash !== "") location.hash = "#/";
    setTimeout(() => document.getElementById(d.scroll)?.scrollIntoView({ behavior: "smooth" }), 50);
  } else if (d.run && item) {
    if (item.results?.[d.run] && !d.force) {
      state.activeTab[id] = d.run;
      rerenderIfOn(id);
    } else runActionFor(id, d.run);
  } else if (d.tab) {
    state.activeTab[id] = d.tab;
    rerenderIfOn(id);
  } else if (d.fav) {
    upsert(await api(`/api/items/${d.fav}`, json("PATCH", { favorite: !item.favorite })));
    rerenderIfOn(id);
  } else if (d.delete) {
    if (!confirm("Supprimer cette infographie et toutes ses fiches ?")) return;
    await api(`/api/items/${d.delete}`, { method: "DELETE" });
    state.items = state.items.filter((x) => x.id !== d.delete);
    location.hash = "#/";
    toast("Infographie supprimée");
  } else if (d.reanalyze) {
    t.disabled = true;
    t.textContent = "Analyse…";
    try {
      upsert(await api(`/api/items/${d.reanalyze}/analyze`, { method: "POST" }));
    } catch (err) {
      toast(err.message, true);
    }
    rerenderIfOn(id);
  } else if (d.edit) {
    editItem(d.edit).catch((err) => toast(err.message, true));
  } else if (d.zoom) {
    lightbox.querySelector("img").src = d.zoom;
    lightbox.hidden = false;
  } else if (d.copy) {
    await navigator.clipboard.writeText(item.results[d.copy].content);
    toast("Copié dans le presse-papiers");
  } else if ("openHtml" in d) {
    // Plein écran sur l'iframe isolée (on n'ouvre pas le HTML généré dans un onglet de l'app).
    $("#redesign-frame")?.requestFullscreen?.();
  } else if ("downloadHtml" in d) {
    const blob = new Blob([item.results.redesign.content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: `${item.title}.html` }).click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    $("#upload-modal").hidden = true;
    $("#lightbox").hidden = true;
  }
});

// ---------- Démarrage ----------

(async function init() {
  try {
    [state.config, state.items] = await Promise.all([api("/api/config"), api("/api/items")]);
  } catch (err) {
    toast(`Impossible de charger la bibliothèque : ${err.message}`, true);
  }
  route();
})();
