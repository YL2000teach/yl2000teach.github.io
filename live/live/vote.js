import { QUESTIONS, DECK_TITLE } from "./questions.js";
import { createStore, sessionFromUrl } from "./store.js";

const $ = (id) => document.getElementById(id);
const sid = sessionFromUrl();
let store = null;
let state = {};
let shownKey = null;

document.title = DECK_TITLE;
$("deck").textContent = DECK_TITLE;

const myKey = (qid) => `live:my:${sid}:${qid}`;
const getMine = (qid) => localStorage.getItem(myKey(qid));
const setMine = (qid, v) => localStorage.setItem(myKey(qid), v);

function setStatus(msg, err = false) {
  const s = $("status");
  s.textContent = msg;
  s.classList.toggle("err", err);
}

function render() {
  const q = QUESTIONS.find((x) => x.id === state.current);
  const key = q ? `${q.id}:${!!state.open}` : "none";
  if (key === shownKey) return;
  shownKey = key;
  const view = $("view");
  view.innerHTML = "";
  setStatus("");

  if (!q) {
    $("pos").textContent = "";
    view.innerHTML = `<div class="waiting">ממתינים לשאלה הראשונה</div>`;
    return;
  }
  $("pos").textContent = `שאלה ${QUESTIONS.indexOf(q) + 1}`;
  if (!state.open) {
    view.innerHTML = `<div class="waiting">ההצבעה על השאלה הזו סגורה</div>`;
    return;
  }

  const h = document.createElement("h1");
  h.textContent = q.title;
  view.appendChild(h);
  if (q.context) {
    const p = document.createElement("p");
    p.className = "ctx";
    p.textContent = q.context;
    view.appendChild(p);
  }

  const mine = getMine(q.id);
  if (q.type === "choice") {
    const opts = document.createElement("div");
    opts.className = "opts";
    q.options.forEach((o) => {
      const b = document.createElement("button");
      b.className = "opt" + (mine === o.id ? " chosen" : "");
      b.textContent = o.label;
      b.onclick = () => send(q, o.id, () => {
        opts.querySelectorAll(".opt").forEach((x) => x.classList.remove("chosen"));
        b.classList.add("chosen");
      });
      opts.appendChild(b);
    });
    view.appendChild(opts);
    if (mine) setStatus("התשובה שלך נשמרה. אפשר לשנות עד שההצבעה תיסגר.");
  } else {
    const ta = document.createElement("textarea");
    ta.maxLength = q.maxLength || 120;
    ta.value = mine || "";
    ta.placeholder = "התשובה שלך";
    const b = document.createElement("button");
    b.className = "send";
    b.textContent = mine ? "עדכון התשובה" : "שליחה";
    b.onclick = () => {
      const v = ta.value.trim();
      if (!v) return setStatus("התשובה ריקה", true);
      send(q, v, () => { b.textContent = "עדכון התשובה"; });
    };
    view.append(ta, b);
    if (mine) setStatus("התשובה שלך נשמרה. אפשר לעדכן עד שההצבעה תיסגר.");
  }
}

async function send(q, value, onOk) {
  setStatus("שולח...");
  try {
    await store.vote(q.id, value);
    setMine(q.id, value);
    onOk();
    setStatus("התשובה שלך נשמרה. אפשר לשנות עד שההצבעה תיסגר.");
  } catch (err) {
    console.error(err);
    setStatus("התשובה לא נשלחה. ייתכן שההצבעה נסגרה.", true);
  }
}

(async function init() {
  try {
    store = await createStore(sid);
  } catch (err) {
    console.error(err);
    $("view").innerHTML = `<div class="waiting">אין חיבור. נסו לרענן את הדף.</div>`;
    return;
  }
  store.onState((s) => { state = s || {}; render(); });
})();
