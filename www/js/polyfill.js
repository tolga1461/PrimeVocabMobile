// chrome extension API polyfill for standalone Web App (PWA) context

// Define global state variables using 'var' so they are hoisted as global variables
// and won't trigger ReferenceErrors in other files.
var currentPlatform = null;
var currentWord = null;
var currentContext = null;
var currentTranslation = null;
var currentLang = null;
var lastReviewSubtab = "srs";
var lastSettingsSubtab = "general";
var myTabId = 1;
var currentVideoTime = null;
var lastSubtitleText = "";
var posCache = {};
var localeMessages = null; // matching utils_common.js

(function() {
  console.log("[Polyfill] Initializing Chrome Extension Mocks...");
  
  // Create a mutable chrome mock object
  const mockChrome = {};
  
  try {
    // Attempt to delete native/headless read-only chrome object
    delete window.chrome;
  } catch(e) {
    console.warn("[Polyfill] delete window.chrome failed", e);
  }
  
  try {
    Object.defineProperty(window, 'chrome', {
      value: mockChrome,
      writable: true,
      configurable: true,
      enumerable: true
    });
  } catch(e) {
    console.warn("[Polyfill] defineProperty window.chrome failed, using direct assign", e);
    window.chrome = mockChrome;
  }
})();

// Initialize storage listeners
let storageListeners = [];
const notifyStorageChange = (changes, area) => {
  storageListeners.forEach(listener => {
    try {
      listener(changes, area);
    } catch(e) {
      console.error("[Polyfill Storage Changed Error]", e);
    }
  });
};

// chrome.storage polyfill using localStorage
chrome.storage = {
  local: {
    get: function(keys, callback) {
      let defaults = {};
      let searchKeys = [];
      if (typeof keys === 'string') {
        searchKeys = [keys];
      } else if (Array.isArray(keys)) {
        searchKeys = keys;
      } else if (typeof keys === 'object' && keys !== null) {
        defaults = keys;
        searchKeys = Object.keys(keys);
      }
      
      let result = {};
      searchKeys.forEach(key => {
        let val = localStorage.getItem('local_' + key);
        if (val !== null) {
          try {
            result[key] = JSON.parse(val);
          } catch(e) {
            result[key] = val;
          }
        } else if (defaults[key] !== undefined) {
          result[key] = defaults[key];
        }
      });
      
      if (callback) callback(result);
      return Promise.resolve(result);
    },
    set: function(items, callback) {
      let changes = {};
      Object.keys(items).forEach(key => {
        let oldVal = localStorage.getItem('local_' + key);
        let newVal = JSON.stringify(items[key]);
        localStorage.setItem('local_' + key, newVal);
        changes[key] = {
          oldValue: oldVal ? JSON.parse(oldVal) : undefined,
          newValue: items[key]
        };
      });
      notifyStorageChange(changes, 'local');
      if (callback) callback();
      return Promise.resolve();
    },
    remove: function(keys, callback) {
      let removeKeys = Array.isArray(keys) ? keys : [keys];
      let changes = {};
      removeKeys.forEach(key => {
        let oldVal = localStorage.getItem('local_' + key);
        localStorage.removeItem('local_' + key);
        changes[key] = {
          oldValue: oldVal ? JSON.parse(oldVal) : undefined,
          newValue: undefined
        };
      });
      notifyStorageChange(changes, 'local');
      if (callback) callback();
      return Promise.resolve();
    },
    clear: function(callback) {
      let changes = {};
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('local_')) {
          let realKey = key.substring(6);
          let oldVal = localStorage.getItem(key);
          localStorage.removeItem(key);
          changes[realKey] = {
            oldValue: oldVal ? JSON.parse(oldVal) : undefined,
            newValue: undefined
          };
        }
      });
      notifyStorageChange(changes, 'local');
      if (callback) callback();
      return Promise.resolve();
    }
  },
  sync: {
    get: function(keys, callback) {
      let defaults = {};
      let searchKeys = [];
      if (typeof keys === 'string') {
        searchKeys = [keys];
      } else if (Array.isArray(keys)) {
        searchKeys = keys;
      } else if (typeof keys === 'object' && keys !== null) {
        defaults = keys;
        searchKeys = Object.keys(keys);
      }
      
      let result = {};
      searchKeys.forEach(key => {
        let val = localStorage.getItem('sync_' + key);
        if (val !== null) {
          try {
            result[key] = JSON.parse(val);
          } catch(e) {
            result[key] = val;
          }
        } else if (defaults[key] !== undefined) {
          result[key] = defaults[key];
        }
      });
      
      if (callback) callback(result);
      return Promise.resolve(result);
    },
    set: function(items, callback) {
      let changes = {};
      Object.keys(items).forEach(key => {
        let oldVal = localStorage.getItem('sync_' + key);
        let newVal = JSON.stringify(items[key]);
        localStorage.setItem('sync_' + key, newVal);
        changes[key] = {
          oldValue: oldVal ? JSON.parse(oldVal) : undefined,
          newValue: items[key]
        };
      });
      notifyStorageChange(changes, 'sync');
      if (callback) callback();
      return Promise.resolve();
    },
    remove: function(keys, callback) {
      let removeKeys = Array.isArray(keys) ? keys : [keys];
      let changes = {};
      removeKeys.forEach(key => {
        let oldVal = localStorage.getItem('sync_' + key);
        localStorage.removeItem('sync_' + key);
        changes[key] = {
          oldValue: oldVal ? JSON.parse(oldVal) : undefined,
          newValue: undefined
        };
      });
      notifyStorageChange(changes, 'sync');
      if (callback) callback();
      return Promise.resolve();
    },
    clear: function(callback) {
      let changes = {};
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sync_')) {
          let realKey = key.substring(5);
          let oldVal = localStorage.getItem(key);
          localStorage.removeItem(key);
          changes[realKey] = {
            oldValue: oldVal ? JSON.parse(oldVal) : undefined,
            newValue: undefined
          };
        }
      });
      notifyStorageChange(changes, 'sync');
      if (callback) callback();
      return Promise.resolve();
    }
  },
  onChanged: {
    addListener: function(listener) {
      storageListeners.push(listener);
    }
  }
};

// Remove any legacy developer backdoor credentials if present & ensure empty starting state
(function() {
  try {
    if (localStorage.getItem('local_googleSyncEmail') === 'developer@primevocab.app') {
      localStorage.removeItem('local_googleSyncEmail');
      localStorage.removeItem('local_googleSyncName');
      localStorage.removeItem('local_licenseType');
      localStorage.removeItem('local_licenseStatus');
      localStorage.removeItem('local_isPremium');
    }

    const existing = localStorage.getItem('local_savedWords');
    if (!existing || existing === 'null') {
      localStorage.setItem('local_savedWords', JSON.stringify([]));
      localStorage.setItem('local_srsStreakStats', JSON.stringify({ currentStreak: 0, bestStreak: 0, lastStudyDate: '' }));
    } else if (!localStorage.getItem('local_googleSyncEmail')) {
      // If an unauthenticated device previously received the auto-seeded dummy words, reset to empty
      try {
        const parsed = JSON.parse(existing);
        if (Array.isArray(parsed) && parsed.length === 20 && parsed[0]?.word === 'resilient' && parsed[1]?.word === 'serendipity') {
          localStorage.setItem('local_savedWords', JSON.stringify([]));
          localStorage.removeItem('pv_dev_seeded');
        }
      } catch(e) {}
    }
  } catch(e) {
    console.warn('[Polyfill] Init error', e);
  }
})();



// chrome.i18n polyfill
chrome.i18n = {
  getMessage: function(messageName, substitutions) {
    if (!window.localeMessages || !window.localeMessages[messageName]) {
      const defaults = {
        "tab_archive": "Sözlük",
        "tab_review": "Çalışma",
        "tab_settings": "Ayarlar",
        "subtab_srs": "Antrenman",
        "subtab_games": "Oyunlar",
        "subtab_achievements": "Başarımlar",
        "srs_study_session": "Çalışma Oturumu",
        "srs_rate_learned_link": "Bunu zaten biliyorum (Öğrenildi)",
        "archive_search_placeholder": "Kelime veya çeviri ara…",
        "select_all_tags": "Tüm etiketler",
        "archive_card_add_tag": "Etiket ekle",
        "archive_card_mark_hard": "Zor Olarak İşaretle",
        "archive_card_unmark_hard": "Zor İşaretini Kaldır",
        "archive_card_delete": "Sil",
        "badge_phrasal": "Phrasal",
        "badge_idiom": "Deyim",
        "archive_card_tools_tooltip": "İşlemler",
        "archive_word_family_lbl": "Kelime Ailesi",
        "archive_hard_badge_label": "ZOR",
        "archive_inactive_badge_label": "PASİF",
        "badge_collocation": "Eş Dizim",
        "archive_tool_expand_all": "Tüm Detayları Aç",
        "archive_tool_word_family": "Kelime Ailesi",
        "archive_tool_tagging": "Kelime Etiketleme",
        "archive_tool_review_practice": "Tekrar Antrenmanı",
        "archive_tool_refresh_families": "Aile bilgisini yenile",
        "archive_tool_clear": "Sözlüğü temizle",
        "filter_hard": "Zor",
        "archive_clear_title": "Sözlüğü Temizle",
        "archive_clear_confirm": "Tüm kayıtlı kelimeleri silmek istediğinize emin misiniz?",
        "game_btn_clear": "Temizle",
        "game_btn_cancel": "Vazgeç",
        "fc_again_btn": "Tekrar",
        "fc_good_btn": "Bildim",
        "fc_done_title": "Tebrikler!",
        "fc_restart_btn": "Tümünü Başlat",
        "fc_stat_total": "Toplam",
        "fc_stat_remembered": "Bildim",
        "fc_stat_accuracy": "Başarı",
        "alert_no_words_dictionary": "Sözlüğünüzde henüz kelime yok.",
        "alert_no_words_filter": "Mevcut filtrede kelime bulunamadı.",
        "archive_tag_placeholder": "etiket…",
        "archive_existing_tags_lbl": "Mevcut Etiketler"
      };
      return defaults[messageName] || messageName;
    }
    let message = window.localeMessages[messageName].message;
    if (substitutions) {
      if (Array.isArray(substitutions)) {
        substitutions.forEach((sub, i) => {
          message = message.replace(`$${i+1}`, sub);
        });
      } else {
        message = message.replace('$1', substitutions);
      }
    }
    return message;
  },
  getUILanguage: function() {
    return navigator.language || 'tr';
  }
};

// chrome.runtime polyfill
chrome.runtime = {
  getURL: function(path) {
    if (path.startsWith('../')) {
      return './' + path.substring(3);
    }
    return './' + path;
  },
  sendMessage: function(message, callback) {
    console.debug('[Polyfill chrome.runtime.sendMessage]', message);
    
    if (message.action === "api_check_license") {
      if (window.PV_ApiClient && typeof window.PV_ApiClient.checkLicense === 'function') {
        window.PV_ApiClient.checkLicense(message.email)
          .then(res => {
            if (callback) callback(res);
          })
          .catch(err => {
            if (callback) callback({ success: false, message: err.message });
          });
        return true;
      } else {
        if (callback) callback({ success: false, message: 'PV_ApiClient not available' });
      }
    } else if (message.action === "api_sync_usage") {
      if (window.PV_ApiClient && typeof window.PV_ApiClient.syncUsage === 'function') {
        window.PV_ApiClient.syncUsage(message.count)
          .then(res => {
            if (callback) callback(res);
          })
          .catch(err => {
            if (callback) callback({ success: false, message: err.message });
          });
        return true;
      } else {
        if (callback) callback({ success: true });
      }
    } else if (message.action === "batch_lookup_cefr") {
      const words = message.words || [];
      const result = {};
      if (typeof window.lookupCEFR === 'function') {
        for (const w of words) {
          result[w] = window.lookupCEFR(w) || '??';
        }
      }
      if (callback) callback({ cefrMap: result });
      return true;
    } else if (message.action === "lookup_cefr") {
      let level = '??';
      if (typeof window.lookupCEFR === 'function') {
        level = window.lookupCEFR(message.word) || '??';
      }
      if (callback) callback({ level });
      return true;
    } else if (message.action === "get_word_family") {
      const rawWord = (message.word || '').toLowerCase().trim();
      let family = [];
      if (rawWord && typeof CEFR_MAP !== 'undefined') {
        // Kelimenin kökünü bul (IRREGULAR_FORMS + temel stemming)
        let root = rawWord;
        if (typeof IRREGULAR_FORMS !== 'undefined' && IRREGULAR_FORMS[root]) {
          root = IRREGULAR_FORMS[root];
        }
        // Suffix soyma: -ing, -ed, -er, -est, -ly, -s, -es, -tion, -ness, -ment
        const suffixes = ['tion','ness','ment','ing','est','ed','er','ly','es','s'];
        for (const suf of suffixes) {
          if (root.endsWith(suf) && root.length - suf.length >= 4) {
            const candidate = root.slice(0, -suf.length);
            if (CEFR_MAP[candidate] || CEFR_MAP[candidate + 'e']) {
              root = CEFR_MAP[candidate + 'e'] ? candidate + 'e' : candidate;
              break;
            }
          }
        }
        // Kök en az 4 karakter olsun, CEFR_MAP içindeki eşleşenleri topla
        if (root.length >= 4) {
          for (const w of Object.keys(CEFR_MAP)) {
            if (w !== rawWord && w.startsWith(root.slice(0, 4)) &&
                (w.startsWith(root) || root.startsWith(w.slice(0, Math.min(w.length, root.length))))) {
              family.push(w);
              if (family.length >= 10) break;
            }
          }
        }
      }
      if (callback) callback({ success: true, family });
      return true;
    } else {
      if (callback) callback({ success: true });
    }
  },
  onMessage: {
    addListener: function(listener) {
      window.addEventListener('message', (e) => {
        if (e.data && e.data.source === 'mock-background') {
          listener(e.data.message, {}, () => {});
        }
      });
    }
  }
};

// Mock chrome.tabs
chrome.tabs = {
  query: function(queryInfo, callback) {
    if (callback) callback([{ id: 1, url: window.location.href }]);
  },
  sendMessage: function(tabId, message, options, callback) {
    if (typeof options === 'function') {
      callback = options;
    }
    if (callback) callback({ success: true });
  }
};
