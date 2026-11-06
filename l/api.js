// חיבור לגיליון דרך Apps Script. זו השורה היחידה שצריך לעדכן אם הכתובת משתנה.
var API_URL = 'https://script.google.com/macros/s/AKfycby64imIostTfpm2OvCoWh3W9W7G6AThVS7inAhbT5aYvbh1DKJfgl7i3zVelSs9dv7uNA/exec';

// פרמטרים מהכתובת: d = מזהה שיעור, s = שם מפגש
var BOOT = (function () {
  var q = new URLSearchParams(location.search);
  var clean = function (v) { return String(v || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40); };
  return { deck: clean(q.get('d')), session: clean(q.get('s')) || 'class1' };
})();

// קריאה לגיליון. בלי עוגיות ובלי פרטי חשבון.
function call(action) {
  var args = Array.prototype.slice.call(arguments, 1);
  return fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ a: action, args: args }),
    credentials: 'omit',
    cache: 'no-store'
  }).then(function (r) {
    if (!r.ok) throw new Error('שגיאת רשת ' + r.status);
    return r.json();
  }).then(function (j) {
    if (!j.ok) throw new Error(j.error || 'שגיאה');
    return j.result;
  });
}

function soften(hex) {
  var n = parseInt(hex.slice(1), 16);
  var mix = function (c) { return Math.round(c + (255 - c) * 0.82); };
  return 'rgb(' + mix((n >> 16) & 255) + ',' + mix((n >> 8) & 255) + ',' + mix(n & 255) + ')';
}

var fontLoaded = false;
function applyTheme(t) {
  if (!t) return;
  var s = document.documentElement.style;
  s.setProperty('--bg', t.bg);
  s.setProperty('--ink', t.ink);
  s.setProperty('--accent', t.accent);
  s.setProperty('--accent-soft', soften(t.accent));
  s.setProperty('--font', '"' + t.font + '", "Heebo", Arial, sans-serif');
  // Heebo מאוחסן באתר. גופן אחר נטען מ־Google Fonts.
  if (!fontLoaded && t.font !== 'Heebo') {
    fontLoaded = true;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' + t.font.replace(/ /g, '+') + ':wght@400;600;700&display=swap';
    document.head.appendChild(l);
  }
}

var memStore = {};
var store = {
  get: function (k) { try { return localStorage.getItem(k); } catch (e) { return memStore[k] || null; } },
  set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { memStore[k] = v; } }
};
var tabStore = {
  get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return memStore['t:' + k] || null; } },
  set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) { memStore['t:' + k] = v; } }
};

function errText(e) {
  return String((e && e.message) || e).replace(/^Exception:\s*/, '');
}
