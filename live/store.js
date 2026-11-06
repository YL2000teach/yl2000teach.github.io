// שכבת הנתונים. אותו ממשק בדיוק במצב Firebase ובמצב הדגמה מקומי.
import { FIREBASE_CONFIG, TEACHER_EMAIL } from "./config.js";

const FB_VERSION = "10.12.2";

export async function createStore(sessionId) {
  if (!FIREBASE_CONFIG) return localStore(sessionId);
  return firebaseStore(sessionId);
}

async function firebaseStore(sid) {
  const base = `https://www.gstatic.com/firebasejs/${FB_VERSION}`;
  const [appM, dbM, authM] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-database.js`),
    import(`${base}/firebase-auth.js`)
  ]);
  const app = appM.initializeApp(FIREBASE_CONFIG);
  const db = dbM.getDatabase(app);
  const auth = authM.getAuth(app);
  await auth.authStateReady();
  const root = `sessions/${sid}`;
  const r = (p) => dbM.ref(db, `${root}/${p}`);

  return {
    mode: "firebase",
    onState(cb) {
      return dbM.onValue(r("state"), (s) => cb(s.val() || {}));
    },
    onVotes(qid, cb) {
      return dbM.onValue(r(`votes/${qid}`), (s) => cb(s.val() || {}));
    },
    async vote(qid, value) {
      if (!auth.currentUser) await authM.signInAnonymously(auth);
      await dbM.set(r(`votes/${qid}/${auth.currentUser.uid}`), value);
    },
    onAuth(cb) {
      return authM.onAuthStateChanged(auth, cb);
    },
    isTeacher(user) {
      return !!(user && user.email && TEACHER_EMAIL &&
        user.email.toLowerCase() === TEACHER_EMAIL.toLowerCase());
    },
    async signInTeacher() {
      await authM.signInWithPopup(auth, new authM.GoogleAuthProvider());
    },
    async signOut() {
      await authM.signOut(auth);
    },
    async setState(patch) {
      await dbM.update(r("state"), patch);
    },
    async resetVotes(qid) {
      await dbM.remove(r(`votes/${qid}`));
    }
  };
}

function localStore(sid) {
  const KEY = `live:${sid}`;
  const empty = () => ({ state: {}, votes: {} });
  const read = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || empty(); }
    catch { return empty(); }
  };
  const subs = new Set();
  const emit = () => { const d = read(); subs.forEach((f) => f(d)); };
  const write = (d) => { localStorage.setItem(KEY, JSON.stringify(d)); emit(); };
  window.addEventListener("storage", (e) => { if (e.key === KEY) emit(); });
  const sub = (f) => { subs.add(f); f(read()); return () => subs.delete(f); };

  // כל לשונית היא "מצביע" נפרד, כדי שאפשר יהיה לבדוק כמה מצביעים במחשב אחד.
  let voter = sessionStorage.getItem("live:voter");
  if (!voter) {
    voter = Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem("live:voter", voter);
  }
  const rid = () => "sim" + Math.random().toString(36).slice(2, 9);

  return {
    mode: "local",
    onState(cb) { return sub((d) => cb(d.state || {})); },
    onVotes(qid, cb) { return sub((d) => cb((d.votes || {})[qid] || {})); },
    async vote(qid, value) {
      const d = read();
      if (!d.state.open || d.state.current !== qid) throw new Error("closed");
      d.votes[qid] = d.votes[qid] || {};
      d.votes[qid][voter] = value;
      write(d);
    },
    onAuth(cb) { cb({ email: "demo" }); return () => {}; },
    isTeacher() { return true; },
    async signInTeacher() {},
    async signOut() {},
    async setState(patch) { const d = read(); d.state = { ...d.state, ...patch }; write(d); },
    async resetVotes(qid) { const d = read(); delete d.votes[qid]; write(d); },
    async simulate(qid, values) {
      const d = read();
      d.votes[qid] = d.votes[qid] || {};
      values.forEach((v) => { d.votes[qid][rid()] = v; });
      write(d);
    }
  };
}

export function sessionFromUrl() {
  const s = new URLSearchParams(location.search).get("s") || "demo";
  return s.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "demo";
}
