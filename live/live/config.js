// הגדרות המערכת.
// כל עוד FIREBASE_CONFIG הוא null, המערכת עובדת במצב הדגמה מקומי:
// ההצבעות נשמרות בדפדפן בלבד, ואפשר לבדוק את העיצוב בשתי לשוניות באותו מחשב.

// מדביקים כאן את האובייקט firebaseConfig מתוך Firebase Console (Project settings > Your apps).
export const FIREBASE_CONFIG = null;
/* דוגמה למבנה:
export const FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "....firebaseapp.com",
  databaseURL: "https://...firebasedatabase.app",
  projectId: "...",
  appId: "..."
};
*/

// כתובת ה־Gmail שאיתה את מתחברת כמנחה. רק היא יכולה לפתוח, לסגור ולאפס הצבעות.
// חייבת להיות זהה לכתובת שבקובץ database.rules.json.
export const TEACHER_EMAIL = "";
