import { QUESTIONS, DECK_TITLE } from "./questions.js";
import { createStore, sessionFromUrl } from "./store.js";

const $ = (id) => document.getElementById(id);
const sid = sessionFromUrl();
const voteUrl = new URL(`vote.html?s=${encodeURIComponent(sid)}`, location.href).href;

let store = null;
let state = {};
let isAdmin = false;
let votes = {};
let unsubVotes = null;
let watchedQ = null;
let resetArmed = 0;

document.title = DECK_TITLE;
$("deck").textContent = DECK_TITLE;
$("url").textContent = voteUrl;
drawQr();

function drawQr() {
  const qr = qrcode(0, "M");
  qr.addData(voteUrl);
  qr.make();
  $("qr").innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
}

function toast(msg, ms = 2200) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add("hidden"), ms);
}

const currentIndex = () => {
  const i = QUESTIONS.findIndex((q) => q.id === state.current);
  return i < 0 ? 0 : i;
};
const currentQ = () => QUESTIONS[currentIndex()];

function renderQuestion() {
  const q = currentQ();
  const i = currentIndex();
  $("pos").textContent = `שאלה ${i + 1} מתוך ${QUESTIONS.length}`;
  $("qtitle").textContent = q.title;
  $("qcontext").textContent = q.context || "";
  $("qtable").innerHTML = "";
  if (q.table) $("qtable").appendChild(buildTable(q.table));

  const isLive = state.current === q.id;
  const open = isLive && !!state.open;
  $("pill").textContent = open ? "ההצבעה פתוחה" : "ההצבעה סגורה";
  $("pill").classList.toggle("open", open);
  $("open").textContent = open ? "סגירת הצבעה" : "פתיחת הצבעה";
  $("reveal").textContent = state.showResults ? "הסתרת תוצאות" : "הצגת תוצאות";

  if (watchedQ !== q.id) {
    if (unsubVotes) unsubVotes();
    votes = {};
    watchedQ = q.id;
    unsubVotes = store.onVotes(q.id, (v) => { votes = v; renderResults(); });
  }
  renderResults();
}

function buildTable(t) {
  const table = document.createElement("table");
  table.className = "data";
  const tr = table.insertRow();
  t.head.forEach((h) => { const th = document.createElement("th"); th.textContent = h; tr.appendChild(th); });
  t.rows.forEach((row) => {
    const r = table.insertRow();
    row.forEach((c) => { r.insertCell().textContent = c; });
  });
  return table;
}

function renderResults() {
  const q = currentQ();
  const values = Object.values(votes || {});
  const n = values.length;
  $("count").textContent = `${n} תשובות`;
  const box = $("results");
  box.innerHTML = "";

  if (!state.showResults) {
    box.innerHTML = `<div class="veil"><div class="big">${n}</div><div class="small">תשובות התקבלו. התוצאות מוסתרות.</div></div>`;
    return;
  }

  if (q.type === "choice") {
    const wrap = document.createElement("div");
    wrap.className = "bars";
    q.options.forEach((o) => {
      const c = values.filter((v) => v === o.id).length;
      const pct = n ? Math.round((c / n) * 100) : 0;
      const row = document.createElement("div");
      row.className = "bar-row";
      row.innerHTML = `<span class="bar-label"></span><div class="bar-track"><div class="bar-fill"></div></div><span class="bar-num"></span>`;
      row.querySelector(".bar-label").textContent = o.label;
      row.querySelector(".bar-num").textContent = `${c} (${pct}%)`;
      wrap.appendChild(row);
      requestAnimationFrame(() => { row.querySelector(".bar-fill").style.width = pct + "%"; });
    });
    box.appendChild(wrap);
  } else {
    // תשובות פתוחות: מאחדים תשובות זהות ומציגים כמה פעמים נכתבו.
    const counts = new Map();
    values.forEach((v) => {
      const key = String(v).trim();
      if (!key) return;
      const norm = key.toLowerCase();
      const cur = counts.get(norm) || { text: key, n: 0 };
      cur.n += 1;
      counts.set(norm, cur);
    });
    const wrap = document.createElement("div");
    wrap.className = "cards";
    [...counts.values()].sort((a, b) => b.n - a.n).forEach((a) => {
      const card = document.createElement("div");
      card.className = "card";
      card.textContent = a.text;
      if (a.n > 1) {
        const s = document.createElement("span");
        s.className = "n";
        s.textContent = String(a.n);
        card.appendChild(s);
      }
      wrap.appendChild(card);
    });
    box.appendChild(wrap);
  }
}

function renderControls() {
  const need = !isAdmin;
  ["prev", "next", "open", "reveal", "reset"].forEach((id) => { $(id).disabled = need; });
  $("login").classList.toggle("hidden", isAdmin || store.mode === "local");
  $("sim").classList.toggle("hidden", store.mode !== "local");
  const b = $("banner");
  if (store.mode === "local") {
    b.textContent = "מצב הדגמה: ההצבעות נשמרות רק בדפדפן הזה";
    b.classList.remove("hidden");
  } else if (!isAdmin) {
    b.textContent = "לא מחוברת כמנחה: אפשר לצפות, אי־אפשר לשלוט";
    b.classList.remove("hidden");
  } else {
    b.classList.add("hidden");
  }
}

async function go(delta) {
  if (!isAdmin) return toast("צריך להתחבר כמנחה");
  const i = Math.min(QUESTIONS.length - 1, Math.max(0, currentIndex() + delta));
  if (QUESTIONS[i].id === state.current && delta !== 0) return;
  await store.setState({ current: QUESTIONS[i].id, open: true, showResults: false });
}

async function toggleOpen() {
  if (!isAdmin) return toast("צריך להתחבר כמנחה");
  const q = currentQ();
  const open = state.current === q.id && !!state.open;
  await store.setState({ current: q.id, open: !open });
}

async function toggleReveal() {
  if (!isAdmin) return toast("צריך להתחבר כמנחה");
  await store.setState({ showResults: !state.showResults });
}

async function reset() {
  if (!isAdmin) return toast("צריך להתחבר כמנחה");
  if (Date.now() - resetArmed > 3000) {
    resetArmed = Date.now();
    return toast("לחצי שוב תוך 3 שניות כדי למחוק את התשובות לשאלה הזו", 3000);
  }
  resetArmed = 0;
  await store.resetVotes(currentQ().id);
  toast("התשובות נמחקו");
}

function simulate() {
  const q = currentQ();
  if (!(state.current === q.id && state.open)) return toast("פתחי קודם את ההצבעה");
  let vals;
  if (q.type === "choice") {
    const w = [0.15, 0.45, 0.4];
    vals = Array.from({ length: 20 }, () => {
      let r = Math.random(), k = 0;
      while (k < w.length - 1 && r > w[k]) { r -= w[k]; k++; }
      return q.options[Math.min(k, q.options.length - 1)].id;
    });
  } else {
    const pool = ["הנתונים הגולמיים", "טבלת שכיחויות", "כמה נסיעות מעל 40", "אחוז הנסיעות שמאחרות", "הנתונים הגולמיים", "התפלגות הזמנים"];
    vals = Array.from({ length: 20 }, () => pool[Math.floor(Math.random() * pool.length)]);
  }
  store.simulate(q.id, vals);
}

function bind() {
  $("prev").onclick = () => go(-1);
  $("next").onclick = () => go(1);
  $("open").onclick = toggleOpen;
  $("reveal").onclick = toggleReveal;
  $("reset").onclick = reset;
  $("sim").onclick = simulate;
  $("login").onclick = () => store.signInTeacher().catch(() => toast("ההתחברות נכשלה"));
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    const k = e.key;
    if (k === "ArrowLeft" || k === "PageDown" || k === " ") { e.preventDefault(); go(1); }
    else if (k === "ArrowRight" || k === "PageUp") { e.preventDefault(); go(-1); }
    else if (k === "o" || k === "O" || k === "ם") toggleOpen();
    else if (k === "r" || k === "R" || k === "ר") toggleReveal();
    else if (k === "f" || k === "F" || k === "כ") {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(() => {});
    }
  });
}

(async function init() {
  try {
    store = await createStore(sid);
  } catch (err) {
    console.error(err);
    $("qtitle").textContent = "לא הצלחתי להתחבר למאגר ההצבעות. בדקי את החיבור לאינטרנט ואת config.js.";
    return;
  }
  bind();
  store.onAuth((u) => { isAdmin = store.isTeacher(u); renderControls(); });
  store.onState((s) => { state = s || {}; renderQuestion(); });
})();
