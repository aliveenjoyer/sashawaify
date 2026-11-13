// Анкета модератора sashawaify: рисует вопросы из questions.js, считает ответы на полосе в шапке, хранит черновик
// в браузере и отправляет анкету на сервер (wlapp на VPS, /api/modapp) — оттуда она уходит в Telegram.
import { SECTIONS, HEAD } from "./questions.js";

const API = "https://173-249-26-11.sslip.io:8444/api/modapp";
const DRAFT = "sashawaify.modapp.draft.v1";
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const ITEMS = SECTIONS.flatMap((s) => s.items);
const NEED = ITEMS.filter((q) => !q.opt);
const started = Date.now();

// ---------- вёрстка вопросов ----------
function field(q) {
  const id = "q-" + q.id, hint = q.hint ? '<span class="q-hint">' + esc(q.hint) + "</span>" : "";
  const opt = q.opt ? ' <span class="q-opt">можно пропустить</span>' : "";
  if (q.type === "chips") {
    return '<div class="q" data-q="' + q.id + '" role="radiogroup" aria-labelledby="' + id + '"><p class="q-label" id="' + id + '">' + esc(q.q) + hint + "</p>" +
      '<div class="chips">' + q.opts.map((o) =>
        '<label class="chip"><input type="radio" name="' + q.id + '" value="' + esc(o) + '"><span><svg aria-hidden="true"><use href="#i-heart"/></svg>' + esc(o) + "</span></label>").join("") +
      "</div></div>";
  }
  const common = ' id="' + id + '" name="' + q.id + '" placeholder="' + esc(q.ph || "") + '" maxlength="' + q.max + '"';
  let input;
  if (q.type === "area") input = "<textarea" + common + ' rows="3"></textarea><div class="q-foot"><span data-left="' + q.id + '"></span></div>';
  else if (q.type === "number") input = '<input type="number" inputmode="numeric" min="' + q.min + '" max="' + q.max + '" id="' + id + '" name="' + q.id + '" placeholder="' + esc(q.ph || "") + '">';
  else input = '<input type="text"' + common + (q.auto ? ' autocomplete="' + q.auto + '" autocapitalize="off" spellcheck="false"' : "") + ">";
  return '<div class="q" data-q="' + q.id + '"><label class="q-label" for="' + id + '">' + esc(q.q) + opt + hint + "</label>" + input + "</div>";
}

$("sections").innerHTML = SECTIONS.map((s) =>
  '<section class="sheet" aria-labelledby="h-' + s.id + '">' +
    '<div class="sheet-head"><h2 class="tape" id="h-' + s.id + '">' + esc(s.title) + '</h2><span class="sheet-note">' + esc(s.note) + "</span></div>" +
    '<svg class="sticker ' + s.sticker + '" aria-hidden="true"><use href="#i-' + s.sticker + '"/></svg>' +
    s.items.map(field).join("") +
  "</section>").join("");

// блёстки на сцене: места постоянные, чтобы картинка не прыгала от загрузки к загрузке
(function sky() {
  let seed = 20261113;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  let html = "";
  for (let i = 0; i < 34; i++) {
    const s = 4 + Math.round(rnd() * 9);
    html += '<i style="--x:' + (rnd() * 98).toFixed(1) + "%;--y:" + (rnd() * 96).toFixed(1) + "%;--s:" + s + "px;--d:" + (2.4 + rnd() * 3.6).toFixed(2) + "s;--w:-" + (rnd() * 5).toFixed(2) + 's"></i>';
  }
  $("sky").innerHTML = html;
})();

// ---------- ответы ----------
const form = $("form");
function value(q) {
  if (q.type === "chips") { const c = form.querySelector('input[name="' + q.id + '"]:checked'); return c ? c.value : ""; }
  return (form.elements[q.id].value || "").trim();
}
function setValue(q, v) {
  if (q.type === "chips") { const c = [...form.querySelectorAll('input[name="' + q.id + '"]')].find((r) => r.value === v); if (c) c.checked = true; }
  else form.elements[q.id].value = v;
}
// почему ответ не годится; пустая строка — годится
function problem(q, v) {
  if (!v) return q.opt ? "" : "Тут пока пусто";
  if (q.id === "nick" && !/^@?[A-Za-z0-9_]{3,25}$/.test(v)) return "Ник на Twitch: латинские буквы, цифры и _, от 3 до 25 символов";
  if (q.type === "number") { const n = Number(v); if (!Number.isInteger(n) || n < q.min || n > q.max) return "Напиши возраст числом"; }
  if (q.id === "contact" && v.length < 3) return "Оставь ник в Telegram или Discord";
  if (q.minLen && v.length < q.minLen) return "Напиши подробнее, хотя бы пару предложений";
  return "";
}

function progress() {
  const done = NEED.filter((q) => !problem(q, value(q))).length, total = NEED.length;
  document.querySelectorAll("[data-fill]").forEach((e) => { e.style.width = (done / total * 100).toFixed(1) + "%"; });
  document.querySelectorAll("[data-count]").forEach((e) => { e.textContent = done + " / " + total + " ответов"; });
  $("goal").setAttribute("aria-valuemax", total); $("goal").setAttribute("aria-valuenow", done);
  return done;
}
function leftChars() {
  for (const q of ITEMS) if (q.type === "area") {
    const n = q.max - form.elements[q.id].value.length;
    form.querySelector('[data-left="' + q.id + '"]').textContent = n <= 80 ? "осталось " + n : "";
  }
}
function unmiss(id) {
  const box = form.querySelector('[data-q="' + id + '"]');
  if (!box || !box.classList.contains("miss")) return;
  box.classList.remove("miss");
  const note = box.querySelector(".miss-note"); if (note) note.remove();
}
function miss(id, text) {
  const box = form.querySelector('[data-q="' + id + '"]');
  if (!box) return null;
  box.classList.add("miss");
  let note = box.querySelector(".miss-note");
  if (!note) { note = document.createElement("p"); note.className = "miss-note"; box.appendChild(note); }
  note.textContent = text;
  return box;
}

// ---------- черновик ----------
let sent = false;
function saveDraft() {
  if (sent) return;
  const d = {};
  for (const q of ITEMS) { const v = q.type === "chips" ? value(q) : form.elements[q.id].value; if (v) d[q.id] = v; }
  try { localStorage.setItem(DRAFT, JSON.stringify(d)); } catch (e) { /* без черновика тоже работает */ }
}
(function loadDraft() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(DRAFT) || "null"); } catch (e) { d = null; }
  if (d && typeof d === "object") for (const q of ITEMS) if (typeof d[q.id] === "string") setValue(q, d[q.id].slice(0, q.type === "number" ? 3 : q.max || 200));
})();

let saveT = 0;
form.addEventListener("input", (e) => {
  const id = e.target.name;
  if (id) unmiss(id);
  if (e.target.id === "agree") $("agreeMiss").hidden = true;
  $("formmsg").hidden = true;
  progress(); leftChars();
  clearTimeout(saveT); saveT = setTimeout(saveDraft, 400);
});
progress(); leftChars();

// полоса в углу появляется, когда полоса на сцене уехала из виду
if ("IntersectionObserver" in window) {
  new IntersectionObserver(([en]) => { $("dock").classList.toggle("show", !en.isIntersecting && !$("form").hidden); }, { threshold: 0 }).observe($("goalbox"));
}

// ---------- отправка ----------
function say(text) { const m = $("formmsg"); m.textContent = text; m.hidden = false; }
function hearts() {
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colors = ["#e23d8b", "#ff8fc0", "#ffffff", "#ff5fa2"];
  let html = "";
  for (let i = 0; i < 26; i++) {
    html += '<svg style="--x:' + (Math.random() * 96).toFixed(1) + "%;--s:" + (18 + Math.round(Math.random() * 30)) + "px;--c:" + colors[i % 4] + ";--d:" +
      (2.2 + Math.random() * 1.8).toFixed(2) + "s;--w:" + (Math.random() * 0.9).toFixed(2) + "s;--r:" + Math.round(Math.random() * 80 - 40) + 'deg"><use href="#i-heart"/></svg>';
  }
  $("burst").innerHTML = html;
  setTimeout(() => { $("burst").innerHTML = ""; }, 5200);
}

let busy = false;
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (busy) return;
  const bad = [];
  for (const q of ITEMS) { const p = problem(q, value(q)); if (p) bad.push(miss(q.id, p)); else unmiss(q.id); }
  const agreed = $("agree").checked;
  $("agreeMiss").hidden = agreed;
  if (bad.length || !agreed) {
    say(bad.length ? "Без ответа остались вопросы: " + bad.length + ". Они подсвечены выше." : "Осталась галочка над кнопкой.");
    const first = bad[0];
    if (first) { first.scrollIntoView({ block: "center" }); const f = first.querySelector("input, textarea"); if (f) f.focus({ preventScroll: true }); }
    return;
  }
  const answers = {};
  for (const q of ITEMS) { const v = value(q); if (v && !HEAD.includes(q.id)) answers[q.id] = v; }
  const body = {
    nick: value(ITEMS.find((q) => q.id === "nick")).replace(/^@/, ""),
    age: Number(value(ITEMS.find((q) => q.id === "age"))),
    contact: value(ITEMS.find((q) => q.id === "contact")),
    answers, website: $("website").value, spent: Math.round((Date.now() - started) / 1000),
  };
  busy = true; $("send").disabled = true; $("sendText").textContent = "Отправляю…"; $("formmsg").hidden = true;
  let res = null, data = null;
  try {
    res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    data = await res.json();
  } catch (err) { res = null; }
  busy = false; $("send").disabled = false; $("sendText").textContent = "Отправить анкету";
  if (res && res.ok && data && data.ok) {
    sent = true; clearTimeout(saveT);                        // иначе отложенное сохранение вернёт черновик уже после отправки
    try { localStorage.removeItem(DRAFT); } catch (err) { /* нечего стирать */ }
    $("doneContact").textContent = body.contact;
    form.hidden = true; $("done").hidden = false; $("dock").classList.remove("show");
    document.querySelectorAll("[data-fill]").forEach((el) => { el.style.width = "100%"; });
    document.querySelectorAll("[data-count]").forEach((el) => { el.textContent = "анкета отправлена"; });
    $("done").scrollIntoView({ block: "center" }); $("done").focus({ preventScroll: true });
    hearts();
    return;
  }
  if (res && res.status === 422 && data && data.fields) {
    let first = null;
    for (const [id, text] of Object.entries(data.fields)) { const b = miss(id, text); if (b && !first) first = b; }
    say("Сервер не принял часть ответов. Они подсвечены выше.");
    if (first) first.scrollIntoView({ block: "center" });
  } else if (res && res.status === 429) say("С твоего адреса уже пришло несколько анкет. Попробуй через час, ответы никуда не денутся.");
  else say("Анкета не отправилась. Проверь интернет и нажми кнопку ещё раз, ответы на месте.");
});
