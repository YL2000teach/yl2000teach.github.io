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

function hexToRgb(hex) {
  var n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
// ערבוב שני צבעים: t=0 הצבע הראשון, t=1 השני
function mix(a, b, t) {
  var x = hexToRgb(a), y = hexToRgb(b);
  return 'rgb(' + x.map(function (v, i) { return Math.round(v + (y[i] - v) * t); }).join(',') + ')';
}
function luminance(hex) {
  var c = hexToRgb(hex).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

var fontLoaded = false;
// כל הצבעים נגזרים משלושת הצבעים שבלשונית "שיעורים"
function applyTheme(t) {
  if (!t) return;
  var s = document.documentElement.style;
  s.setProperty('--bg', t.bg);
  s.setProperty('--ink', t.ink);
  s.setProperty('--accent', t.accent);
  s.setProperty('--accent-soft', mix(t.accent, t.bg, 0.7));
  s.setProperty('--on-accent', luminance(t.accent) > 0.45 ? t.ink : '#ffffff');
  s.setProperty('--muted', mix(t.ink, t.bg, 0.4));
  s.setProperty('--line', mix(t.ink, t.bg, 0.9));
  s.setProperty('--surface', mix(t.ink, t.bg, 0.97));
  s.setProperty('--font', '"' + t.font + '", "Heebo", Arial, sans-serif');
  // Heebo מאוחסן באתר. גופן אחר נטען מ־Google Fonts.
  if (!fontLoaded && t.font !== 'Heebo') {
    fontLoaded = true;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' + t.font.replace(/ /g, '+') + ':wght@400;600;700;800&display=swap';
    document.head.appendChild(l);
  }
}

// עיגול להצגה: עד שתי ספרות אחרי הנקודה
function fmt(x) {
  if (x === null || x === undefined || !isFinite(x)) return '';
  return String(Math.round(x * 100) / 100);
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
