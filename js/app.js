// Анкета модератора sashawaify в виде короткого «кино»: заставка, перед каждым разделом хлопушка, вопросы идут
// по одному кадру, в конце «Снято!» и титры. Ответы хранятся в A и в черновике браузера; готовая анкета уходит
// на сервер (wlapp на VPS, /api/modapp), оттуда в Telegram.
import { SECTIONS, HEAD } from "./questions.js";
import { createSky } from "./sky.js";
import { initCats, clapPaw } from "./cats.js";

const API = "https://173-249-26-11.sslip.io:8444/api/modapp";
const DRAFT = "sashawaify.modapp.draft.v1";
const CALM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const plural = (n, f) => f[n % 10 === 1 && n % 100 !== 11 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2];

const ITEMS = SECTIONS.flatMap((s) => s.items);
const NEED = ITEMS.filter((q) => !q.opt);
const started = Date.now();
const stage = $("stage");
const sky = createSky($("sky"));
const cats = initCats();

// порядок кадров: хлопушка раздела, его вопросы, ..., последний кадр с кнопкой отправки
const SEQ = [];
SECTIONS.forEach((s, si) => { SEQ.push({ t: "clap", si }); s.items.forEach((q, qi) => SEQ.push({ t: "q", q, si, qi })); });
SEQ.push({ t: "final" });

const A = {};               // ответы: id вопроса → строка
let pos = -1;               // номер кадра в SEQ; -1 — заставка
let cur = $("intro");       // кадр, который сейчас на экране
let agreed = false, sent = false, busy = false, clapT = 0, saveT = 0, lastDone = 0;

// ---------- ответы ----------
// почему ответ не годится; пустая строка — годится
function problem(q, v) {
  if (!v) return q.opt ? "" : "Тут пока пусто";
  if (q.id === "nick" && !/^@?[A-Za-z0-9_]{3,25}$/.test(v)) return "Ник на Twitch: латинские буквы, цифры и _, от 3 до 25 символов";
  if (q.type === "number") { const n = Number(v); if (!/^\d+$/.test(v) || n < q.min || n > q.max) return "Напиши возраст числом"; }
  if (q.id === "contact" && v.length < 3) return "Оставь ник в Telegram или Discord";
  if (q.minLen && v.length < q.minLen) return "Напиши подробнее, хотя бы пару предложений";
  return "";
}
const val = (q) => (A[q.id] || "").trim();
const doneCount = () => NEED.filter((q) => !problem(q, val(q))).length;

function progress() {
  const done = doneCount(), total = NEED.length;
  $("fill").style.width = (done / total * 100).toFixed(1) + "%";
  $("count").textContent = done + " / " + total + " ответов";
  $("goal").setAttribute("aria-valuemax", total); $("goal").setAttribute("aria-valuenow", done);
  if (done > lastDone) { $("goal").classList.remove("tick"); void $("goal").offsetWidth; $("goal").classList.add("tick"); }
  cats.ride(done / total * 100, done > lastDone);
  lastDone = done;
}

function saveDraft() {
  if (sent) return;
  const d = {};
  for (const q of ITEMS) if (A[q.id]) d[q.id] = A[q.id];
  try { localStorage.setItem(DRAFT, JSON.stringify(d)); } catch (e) { /* без черновика тоже работает */ }
}
(function loadDraft() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(DRAFT) || "null"); } catch (e) { d = null; }
  if (!d || typeof d !== "object") return;
  for (const q of ITEMS) {
    const v = d[q.id];
    if (typeof v !== "string" || !v) continue;
    if (q.type === "chips") { if (q.opts.includes(v)) A[q.id] = v; } else A[q.id] = v.slice(0, q.type === "number" ? 2 : q.max);
  }
})();

// ---------- смена кадров ----------
function shot(cls, html) {
  const el = document.createElement("section");
  el.className = "shot " + cls;
  el.innerHTML = '<div class="shot-in">' + html + "</div>";
  return el;
}
function fx(id) { const e = $(id); e.classList.remove("on"); void e.offsetWidth; e.classList.add("on"); }

// dir: 1 — вперёд, -1 — назад; scene — смена сцены (рывок камеры и свет по кадру), иначе лёгкий толчок
function swap(el, dir, scene) {
  const old = cur;
  if (old) {
    old.classList.remove("in-up", "in-down");
    old.classList.add(dir > 0 ? "out-up" : "out-down");
    old.inert = true;
    setTimeout(() => old.remove(), CALM ? 160 : 380);
  }
  el.classList.add(dir > 0 ? "in-up" : "in-down");
  stage.appendChild(el);
  cur = el;
  sky.boost(dir * (scene ? 1 : 0.3));
  if (scene && !CALM) fx("leak");
  const f = el.querySelector("[data-focus]");
  if (f) { f.focus({ preventScroll: true }); if (f.matches("[data-answer]") && f.value) f.setSelectionRange(f.value.length, f.value.length); }
}

function slate(e) {
  let text = "кастинг модеров";
  if (e === "done") text = "снято";
  else if (e && e.t === "final") text = "последний кадр";
  else if (e) text = "сцена " + (e.si + 1) + " из " + SECTIONS.length + (e.t === "q" ? ", кадр " + (e.qi + 1) + " из " + SECTIONS[e.si].items.length : "");
  $("slate").textContent = text;
}

// ---------- кадры ----------
const words = (text) => text.split(" ").map((w, i) => '<span class="w" style="--i:' + i + '">' + esc(w) + "</span>").join(" ");

function clapShot(si) {
  const s = SECTIONS[si], n = s.items.length;
  return shot("card clap-shot",
    '<div class="clap">' +
      '<svg class="sticks" viewBox="0 0 360 104" aria-hidden="true">' +
        '<g class="stick-top"><rect x="6" y="8" width="348" height="38" rx="9" fill="url(#pStripe)" stroke="#ffb3d6" stroke-width="2.500"/></g>' +
        '<rect x="6" y="58" width="348" height="38" rx="9" fill="url(#pStripe)" stroke="#ffb3d6" stroke-width="2.500"/>' +
        '<circle cx="26" cy="52" r="8" fill="#ffe9f2" stroke="#b3246a" stroke-width="2.500"/>' + clapPaw +
      "</svg>" +
      '<div class="board">' +
        '<div class="board-row"><span>сцена <b>' + (si + 1) + "</b> из " + SECTIONS.length + "</span><span><b>" + n + "</b> " + plural(n, ["вопрос", "вопроса", "вопросов"]) + "</span></div>" +
        '<h2 class="board-title">' + esc(s.title) + "</h2>" +
        '<p class="board-note">' + esc(s.note) + "</p>" +
      "</div>" +
    "</div>" +
    '<div class="nav center"><button class="ghost" type="button" data-act="roll" data-focus>Поехали</button></div>');
}

function qShot(e) {
  const q = e.q, v = A[q.id] || "", lastQ = SEQ[pos + 1] && SEQ[pos + 1].t === "final";
  const firstQ = !SEQ.slice(0, pos).some((x) => x.t === "q");          // с первого вопроса возвращаться некуда
  let field;
  if (q.type === "chips") {
    field = '<div class="chips" role="radiogroup" aria-labelledby="qt">' + q.opts.map((o, i) =>
      '<label class="chip" style="--i:' + i + '"><input type="radio" name="' + q.id + '" value="' + esc(o) + '"' + (o === v ? " checked data-focus" : "") + (!v && i === 0 ? " data-focus" : "") +
      '><span><svg aria-hidden="true"><use href="#i-heart"/></svg>' + esc(o) + "</span></label>").join("") + "</div>";
  } else if (q.type === "area") {
    field = '<textarea data-answer data-focus rows="2" aria-labelledby="qt" maxlength="' + q.max + '" placeholder="' + esc(q.ph || "") + '">' + esc(v) + '</textarea><span class="line"></span><p class="left" id="left"></p>';
  } else {
    const num = q.type === "number";
    field = '<input type="text" data-answer data-focus aria-labelledby="qt"' + (num ? ' inputmode="numeric" maxlength="2"' : ' maxlength="' + q.max + '"') +
      ' placeholder="' + esc(q.ph || "") + '" value="' + esc(v) + '" autocomplete="' + (q.auto || "off") + '" autocapitalize="' + (q.id === "nick" ? "off" : "sentences") + '" spellcheck="false" enterkeyhint="next"><span class="line"></span>';
  }
  return shot("q-shot",
    '<h2 class="q-text" id="qt">' + words(q.q) + "</h2>" +
    (q.opt ? '<p class="q-opt">можно пропустить</p>' : "") +
    (q.hint ? '<p class="q-hint">' + esc(q.hint) + "</p>" : "") +
    '<div class="q-field" id="qfield">' + field + "</div>" +
    '<p class="q-err" id="qerr" role="alert"></p>' +
    '<div class="nav"><button class="btn" type="button" data-act="next">' + (lastQ ? "К отправке" : "Дальше") + "</button>" +
      '<span class="keyhint">' + (q.type === "area" ? "Ctrl + Enter" : "Enter") + "</span>" +
      (firstQ ? "" : '<button class="ghost" type="button" data-act="back">Назад</button>') + "</div>");
}

function finalShot() {
  return shot("card final-shot",
    '<p class="pre">все кадры сняты</p>' +
    '<h2 class="big-title">Осталось отправить</h2>' +
    '<p class="lead">Ответов на месте: ' + doneCount() + " из " + NEED.length + ". Можно вернуться и поправить любой.</p>" +
    '<label class="agree"><input type="checkbox" id="agree"' + (agreed ? " checked" : "") + '><span class="box" aria-hidden="true"><svg><use href="#i-heart"/></svg></span>' +
      "<span>Понимаю, что модер — это порядок в чате, а не только зелёный меч у ника</span></label>" +
    '<p class="q-err" id="qerr" role="alert"></p>' +
    '<div class="nav center"><button class="btn big" type="button" data-act="send" data-focus><svg aria-hidden="true"><use href="#i-bow"/></svg><span id="sendText">Отправить анкету</span></button>' +
      '<button class="ghost" type="button" data-act="back">Назад к вопросам</button></div>' +
    '<p class="fine">Ответы увидят только Саша и её команда.</p>');
}

function doneShot(nick, contact) {
  const rows = [["В главной роли", nick], ["Режиссёр чата", "Саша Вайфу"], ["Зелёный меч", "пока в реквизите"], ["Массовка", "котики со стрима"], ["Злодеи", "боты со спамом"], ["Страница", "aliveenjoyer"]];
  return shot("card done-shot",
    '<div class="stamp" aria-hidden="true">Снято!</div>' +
    '<h2 class="big-title" tabindex="-1" data-focus>Анкета у Саши</h2>' +
    '<p class="lead">Если подойдёшь, тебе напишут туда, где ты оставил контакт: <b>' + esc(contact) + "</b>. А пока заходи на стрим и веди себя так, будто меч уже у тебя.</p>" +
    '<a class="btn" href="https://www.twitch.tv/sashawaify" target="_blank" rel="noopener">Открыть канал sashawaify</a>' +
    '<div class="credits" aria-label="Титры"><div class="credits-roll">' + rows.map((r) => "<p><span>" + esc(r[0]) + "</span><b>" + esc(r[1]) + "</b></p>").join("") + "</div></div>");
}

// ---------- переходы ----------
function go(n, dir) {
  clearTimeout(clapT);
  pos = n;
  const e = SEQ[n];
  let el;
  if (e.t === "clap") {
    el = clapShot(e.si);
    if (!CALM) setTimeout(() => { if (pos === n) { fx("flash"); sky.boost(0.5); } }, 740);     // щелчок хлопушки
    clapT = setTimeout(() => { if (pos === n) go(n + 1, 1); }, CALM ? 1700 : 2100);
  } else if (e.t === "q") el = qShot(e);
  else el = finalShot();
  swap(el, dir, e.t !== "q");
  slate(e);
  if (e.t === "q" && e.q.type === "area") { grow(el.querySelector("textarea")); leftChars(e.q); }
}

function err(text) {
  const p = cur.querySelector("#qerr"); if (p) p.textContent = text;
  const f = cur.querySelector("#qfield");
  if (f && text) { f.classList.remove("shake"); void f.offsetWidth; f.classList.add("shake"); }
  const i = cur.querySelector("[data-answer]"); if (i && text) i.focus({ preventScroll: true });
  if (text) cats.nope();
}

function next() {
  const e = SEQ[pos];
  if (!e) return;
  if (e.t === "q") {
    const v = val(e.q), p = problem(e.q, v);
    if (p) return err(p);
    if (v) A[e.q.id] = v; else delete A[e.q.id];
    saveDraft(); progress();
    if (v) cats.happy();
  }
  if (pos + 1 < SEQ.length) go(pos + 1, 1);
}

function back() {
  let n = pos - 1;
  while (n >= 0 && SEQ[n].t === "clap") n--;
  if (n >= 0) go(n, -1);
}

function start(fromTop) {
  let n = 0;
  if (!fromTop) {                                      // черновик: сразу к первому вопросу без ответа
    const i = SEQ.findIndex((e) => e.t === "q" && !e.q.opt && problem(e.q, val(e.q)));
    if (Object.keys(A).length && i > 0) n = SEQ[i - 1].t === "clap" ? i - 1 : i;
    else if (Object.keys(A).length && i < 0) n = SEQ.length - 1;
  }
  go(n, 1);
}

function grow(t) { if (t) { t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight + 2, window.innerHeight * 0.38) + "px"; } }
function leftChars(q) { const p = cur.querySelector("#left"); if (p) { const n = q.max - (A[q.id] || "").length; p.textContent = n <= 80 ? "осталось " + n : ""; } }

// ---------- события ----------
stage.addEventListener("input", (ev) => {
  const e = SEQ[pos], t = ev.target;
  if (t.id === "agree") { agreed = t.checked; err(""); return; }
  if (!e || e.t !== "q") return;
  if (t.type === "radio") A[e.q.id] = t.value;
  else if (t.matches("[data-answer]")) { A[e.q.id] = t.value; if (e.q.type === "area") { grow(t); leftChars(e.q); } }
  else return;
  err(""); progress();
  clearTimeout(saveT); saveT = setTimeout(saveDraft, 400);
});

stage.addEventListener("click", (ev) => {
  const e = SEQ[pos];
  const radio = ev.target.closest(".chip input");
  if (radio && ev.detail > 0 && e && e.t === "q") {          // выбрали мышью или пальцем: кадр сам идёт дальше
    const at = pos;
    A[e.q.id] = radio.value; progress();
    setTimeout(() => { if (pos === at) next(); }, CALM ? 150 : 460);
    return;
  }
  const b = ev.target.closest("[data-act]");
  if (b) {
    const act = b.dataset.act;
    if (act === "next") next(); else if (act === "back") back(); else if (act === "roll") go(pos + 1, 1); else if (act === "send") send();
    return;
  }
  if (e && e.t === "clap" && !ev.target.closest("a, button")) go(pos + 1, 1);   // щелчок по хлопушке — сразу дальше
});

document.addEventListener("keydown", (ev) => {
  if (ev.key !== "Enter" || ev.isComposing || sent) return;
  if (ev.target.closest && ev.target.closest("button, a")) return;              // у кнопок и ссылок Enter свой
  const e = SEQ[pos];
  if (pos === -1) { ev.preventDefault(); start(false); return; }
  if (!e) return;
  if (e.t === "clap") { ev.preventDefault(); go(pos + 1, 1); return; }
  if (e.t === "q") {
    if (ev.target.tagName === "TEXTAREA" && !(ev.ctrlKey || ev.metaKey)) return;
    ev.preventDefault(); next();
  }
});

$("start").addEventListener("click", () => start(false));
$("fromTop").addEventListener("click", () => start(true));

// ---------- отправка ----------
function hearts() {
  if (CALM) return;
  const colors = ["#e23d8b", "#ff8fc0", "#ffffff", "#ff5fa2"];
  let html = "";
  for (let i = 0; i < 30; i++) {
    html += '<svg style="--x:' + (Math.random() * 96).toFixed(1) + "%;--s:" + (18 + Math.round(Math.random() * 32)) + "px;--c:" + colors[i % 4] + ";--d:" +
      (2.2 + Math.random() * 2).toFixed(2) + "s;--w:" + (Math.random() * 1.1).toFixed(2) + "s;--r:" + Math.round(Math.random() * 80 - 40) + 'deg"><use href="#i-heart"/></svg>';
  }
  $("burst").innerHTML = html;
  setTimeout(() => { $("burst").innerHTML = ""; }, 5600);
}

async function send() {
  if (busy || sent) return;
  const bad = SEQ.findIndex((e) => e.t === "q" && problem(e.q, val(e.q)));
  if (bad >= 0) { go(bad, -1); err(problem(SEQ[bad].q, val(SEQ[bad].q))); return; }
  if (!agreed) return err("Сначала поставь галочку выше");
  const answers = {};
  for (const q of ITEMS) { const v = val(q); if (v && !HEAD.includes(q.id)) answers[q.id] = v; }
  const body = { nick: val({ id: "nick" }).replace(/^@/, ""), age: Number(val({ id: "age" })), contact: val({ id: "contact" }), answers, website: $("website").value, spent: Math.round((Date.now() - started) / 1000) };
  const btn = cur.querySelector('[data-act="send"]'), label = cur.querySelector("#sendText");
  busy = true; btn.disabled = true; label.textContent = "Отправляю…"; err("");
  let res = null, data = null;
  try {
    res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    data = await res.json();
  } catch (e) { res = null; }
  busy = false;
  if (res && res.ok && data && data.ok) {
    sent = true; clearTimeout(saveT);                   // иначе отложенное сохранение вернёт черновик уже после отправки
    try { localStorage.removeItem(DRAFT); } catch (e) { /* нечего стирать */ }
    pos = SEQ.length;
    swap(doneShot(body.nick, body.contact), 1, true);
    slate("done");
    $("fill").style.width = "100%"; $("count").textContent = "анкета отправлена";
    if (!CALM) fx("flash");
    hearts(); cats.finale(); cats.ride(100, true);
    return;
  }
  btn.disabled = false; label.textContent = "Отправить анкету";
  if (res && res.status === 422 && data && data.fields) {
    const id = Object.keys(data.fields)[0], i = SEQ.findIndex((e) => e.t === "q" && e.q.id === id);
    if (i >= 0) { go(i, -1); err(data.fields[id]); } else err("Сервер не принял анкету. Проверь ответы и попробуй ещё раз.");
  } else if (res && res.status === 429) err("С твоего адреса уже пришло несколько анкет. Попробуй через час, ответы никуда не денутся.");
  else err("Анкета не отправилась. Проверь интернет и нажми кнопку ещё раз, ответы на месте.");
}

// ---------- заставка ----------
(function intro() {
  const h = $("title"), parts = h.textContent.trim().split(" ");      // «в модеры» склеены неразрывным пробелом и остаются одним словом
  let i = 0;
  h.setAttribute("aria-label", h.textContent.trim().replace(/ /g, " "));
  h.innerHTML = parts.map((w) => '<span class="word" aria-hidden="true">' + [...w].map((c) => (c === " " ? " " : '<span class="l" style="--i:' + i++ + '">' + esc(c) + "</span>")).join("") + "</span>").join(" ");
  $("qcount").textContent = ITEMS.length + " " + plural(ITEMS.length, ["вопрос", "вопроса", "вопросов"]);
  if (Object.keys(A).length) { $("start").textContent = "Продолжить"; $("fromTop").hidden = false; }
  progress(); lastDone = doneCount();
  const ready = () => document.body.classList.add("ready");
  const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fonts, new Promise((r) => setTimeout(r, 1500))]).then(() => requestAnimationFrame(ready));
})();

// для проверки из консоли и тестов: перейти к кадру, посмотреть ответы
window.__anketa = { SEQ, A, go, next, back, start, send, pos: () => pos };
