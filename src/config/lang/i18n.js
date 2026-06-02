import en from './en.js';
import vi from './vi.js';
import zh from './zh.js';
import ja from './ja.js';

const translations = { en, vi, zh, ja };

// Determine initial language
let defaultLang = 'en';
const systemLang = navigator.language || navigator.userLanguage;
if (systemLang) {
  if (systemLang.startsWith('vi')) {
    defaultLang = 'vi';
  } else if (systemLang.startsWith('zh')) {
    defaultLang = 'zh';
  } else if (systemLang.startsWith('ja')) {
    defaultLang = 'ja';
  }
}

let currentLanguage = localStorage.getItem('app_lang') || defaultLang;

export function setLanguage(lang) {
  if (translations[lang]) {
    currentLanguage = lang;
    localStorage.setItem('app_lang', lang);
  }
}

export function getLanguage() {
  return currentLanguage;
}

export function t(key, params = {}) {
  const keys = key.split('.');
  let result = translations[currentLanguage];
  
  for (const k of keys) {
    if (result && result[k] !== undefined) {
      result = result[k];
    } else {
      // Fallback to English
      let fallback = translations['en'];
      let foundFallback = true;
      for (const fk of keys) {
        if (fallback && fallback[fk] !== undefined) {
          fallback = fallback[fk];
        } else {
          foundFallback = false;
          break;
        }
      }
      result = foundFallback ? fallback : key;
      break;
    }
  }

  // Handle parameterized replacement
  if (typeof result === 'string') {
    Object.keys(params).forEach(pKey => {
      result = result.replace(new RegExp(`{${pKey}}`, 'g'), params[pKey]);
    });
  }
  
  return result;
}
