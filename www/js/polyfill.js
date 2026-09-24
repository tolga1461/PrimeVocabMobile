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
    }
  },
  onChanged: {
    addListener: function(listener) {
      storageListeners.push(listener);
    }
  }
};

const SAMPLE_DUMMY_WORDS = [
  { word: "resilient", translation: "dirençli, esnek", cefrLevel: "B2", reviewCount: 0, interval: 0, nextReview: 0, learned: false, context: "Children are often remarkably resilient.", tags: ["psikoloji"], wordFamily: ["resilience", "resiliently"], source: { showTitle: "The Crown", season: 4, episode: 3, time: 1420, url: "https://netflix.com" } },
  { word: "serendipity", translation: "mutlu tesadüf", cefrLevel: "C1", reviewCount: 2, interval: 3, nextReview: Date.now() - 10000, learned: false, context: "Finding this cafe was pure serendipity.", tags: ["favori", "akademik"], wordFamily: ["serendipitous", "serendipitously"], source: { showTitle: "Friends", season: 2, episode: 14, time: 745, url: "https://netflix.com" } },
  { word: "ephemeral", translation: "geçici, kısa ömürlü", cefrLevel: "C2", reviewCount: 1, interval: 1, nextReview: Date.now() - 5000, learned: false, context: "Fame in the digital age can be ephemeral.", tags: ["felsefe"], wordFamily: ["ephemerality"], source: { title: "TED Talk", time: 312, url: "https://youtube.com/watch?v=123" } },
  { word: "eloquent", translation: "etkileyici konuşan", cefrLevel: "B2", reviewCount: 3, interval: 7, nextReview: Date.now() + 86400000 * 4, learned: true, context: "She gave an eloquent speech yesterday.", tags: ["hitabet"], wordFamily: ["eloquence", "eloquently"], source: { showTitle: "BBC News", title: "Global Summit", time: 540 } },
  { word: "give up", translation: "vazgeçmek, pes etmek", cefrLevel: "Phrasal", reviewCount: 1, interval: 2, nextReview: Date.now() - 2000, learned: false, context: "Never give up on your dreams.", tags: ["günlük"], source: { showTitle: "Stranger Things", season: 1, episode: 1, time: 820 } },
  { word: "piece of cake", translation: "çocuk oyuncağı", cefrLevel: "Idiom", reviewCount: 2, interval: 5, nextReview: Date.now() + 86400000 * 2, learned: false, context: "The test was a piece of cake.", tags: ["deyimler"], source: { showTitle: "The Office", season: 3, episode: 5, time: 410 } },
  { word: "meticulous", translation: "titiz, kılı kırk yaran", cefrLevel: "C1", reviewCount: 0, interval: 0, nextReview: 0, learned: false, context: "He was meticulous about keeping his records clean.", tags: ["akademik", "favori"], wordFamily: ["meticulously", "meticulousness"], source: { showTitle: "Breaking Bad", season: 2, episode: 8, time: 1120 } },
  { word: "look forward to", translation: "dört gözle beklemek", cefrLevel: "Phrasal", reviewCount: 4, interval: 10, nextReview: Date.now() + 86400000 * 6, learned: true, context: "I look forward to meeting you soon.", tags: ["günlük"], source: { showTitle: "Sherlock", season: 1, episode: 2, time: 640 } },
  { word: "break a leg", translation: "iyi şanslar (sahne deyimi)", cefrLevel: "Idiom", reviewCount: 1, interval: 1, nextReview: Date.now() - 1000, learned: false, context: "You're going to be great tonight, break a leg!", tags: ["deyimler"], source: { showTitle: "Modern Family", season: 4, episode: 10, time: 530 } },
  { word: "ubiquitous", translation: "her yerde bulunan", cefrLevel: "C2", reviewCount: 0, interval: 0, nextReview: 0, learned: false, context: "Smartphones have become ubiquitous in everyday life.", tags: ["teknoloji"], wordFamily: ["ubiquity", "ubiquitously"], source: { showTitle: "Black Mirror", season: 3, episode: 1, time: 945 } },
  { word: "profound", translation: "derin, etkileyici", cefrLevel: "B2", reviewCount: 2, interval: 4, nextReview: Date.now() + 86400000, learned: false, context: "Her speech had a profound impact on the entire audience.", tags: ["felsefe", "akademik"], wordFamily: ["profoundly", "profundity"], source: { title: "Inception", time: 2450 } },
  { word: "catch up", translation: "yetişmek, arayı kapatmak", cefrLevel: "Phrasal", reviewCount: 1, interval: 2, nextReview: Date.now() - 3000, learned: false, context: "Let's grab a coffee and catch up this weekend.", tags: ["günlük"], source: { showTitle: "Suits", season: 1, episode: 4, time: 380 } },
  { word: "inevitable", translation: "kaçınılmaz", cefrLevel: "B2", reviewCount: 1, interval: 3, nextReview: Date.now() + 86400000 * 2, learned: false, context: "Change is an inevitable part of life.", tags: ["felsefe"], wordFamily: ["inevitably", "inevitability"], source: { showTitle: "Dark", season: 1, episode: 1, time: 512 } },
  { word: "come across", translation: "tesadüfen rastlamak", cefrLevel: "Phrasal", reviewCount: 0, interval: 0, nextReview: 0, learned: false, context: "I came across an old photo while cleaning.", tags: ["günlük"], source: { showTitle: "Friends", season: 3, episode: 2, time: 310 } },
  { word: "pragmatic", translation: "faydacı, pratik", cefrLevel: "C1", reviewCount: 3, interval: 6, nextReview: Date.now() + 86400000 * 3, learned: false, context: "We need a pragmatic solution to this issue.", tags: ["iş"], wordFamily: ["pragmatically", "pragmatism"], source: { showTitle: "Succession", season: 2, episode: 5, time: 940 } },
  { word: "burn the midnight oil", translation: "gece geç saatlere kadar çalışmak", cefrLevel: "Idiom", reviewCount: 1, interval: 1, nextReview: Date.now() - 4000, learned: false, context: "He burned the midnight oil to prepare for the bar exam.", tags: ["deyimler", "akademik"], source: { showTitle: "Better Call Saul", season: 1, episode: 3, time: 1100 } },
  { word: "lucid", translation: "berrak, açık ve net", cefrLevel: "C1", reviewCount: 0, interval: 0, nextReview: 0, learned: false, context: "He gave a lucid explanation of complex quantum mechanics.", tags: ["akademik"], wordFamily: ["lucidity", "lucidly"], source: { title: "Cosmos", time: 780 } },
  { word: "call off", translation: "iptal etmek", cefrLevel: "Phrasal", reviewCount: 2, interval: 4, nextReview: Date.now() + 86400000, learned: false, context: "They had to call off the meeting due to heavy snow.", tags: ["iş", "günlük"], source: { showTitle: "The Office", season: 2, episode: 8, time: 420 } },
  { word: "ambiguous", translation: "belirsiz, iki anlamlı", cefrLevel: "B2", reviewCount: 1, interval: 2, nextReview: Date.now() - 1500, learned: false, context: "The ending of the film was intentionally ambiguous.", tags: ["sanat"], wordFamily: ["ambiguity", "ambiguously"], source: { title: "Interstellar", time: 3400 } },
  { word: "once in a blue moon", translation: "kırk yılda bir", cefrLevel: "Idiom", reviewCount: 2, interval: 5, nextReview: Date.now() + 86400000 * 5, learned: false, context: "My brother lives abroad so I only see him once in a blue moon.", tags: ["deyimler"], source: { showTitle: "Modern Family", season: 2, episode: 11, time: 615 } }
];

window.seedSampleWords = function(force = false) {
  try {
    const existing = localStorage.getItem('local_savedWords');
    if (force || !existing || existing === '[]' || existing === 'null') {
      localStorage.setItem('local_savedWords', JSON.stringify(SAMPLE_DUMMY_WORDS));
      localStorage.setItem('local_srsStreakStats', JSON.stringify({ currentStreak: 5, bestStreak: 12, lastStudyDate: new Date().toDateString() }));
      localStorage.setItem('pv_dev_seeded', '1');
      console.log('[Polyfill] Seeded ' + SAMPLE_DUMMY_WORDS.length + ' rich sample words.');
      if (typeof loadArchive === 'function') loadArchive();
      if (typeof updateArchiveBadge === 'function') updateArchiveBadge();
      return true;
    }
  } catch (e) {
    console.warn('[Polyfill] Error seeding words:', e);
  }
  return false;
};

// Seed default sample words and developer license for development and standalone PWA preview
(function() {
  try {
    const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.protocol === 'file:';
    if (isDev) {
      if (!localStorage.getItem('local_licenseType') || localStorage.getItem('local_licenseType') === 'FREE') {
        localStorage.setItem('local_licenseType', 'LIFETIME');
        localStorage.setItem('local_licenseStatus', 'ACTIVE');
        localStorage.setItem('local_isPremium', 'true');
        if (!localStorage.getItem('local_googleSyncEmail')) {
          localStorage.setItem('local_googleSyncEmail', 'developer@primevocab.app');
          localStorage.setItem('local_googleSyncName', 'Geliştirici');
        }
      }
    }
    const existing = localStorage.getItem('local_savedWords');
    let words = [];
    try { words = JSON.parse(existing) || []; } catch(e) {}
    if (!existing || existing === '[]' || existing === 'null' || words.length < 15) {
      localStorage.setItem('local_savedWords', JSON.stringify(SAMPLE_DUMMY_WORDS));
      localStorage.setItem('local_srsStreakStats', JSON.stringify({ currentStreak: 5, bestStreak: 12, lastStudyDate: new Date().toDateString() }));
      localStorage.setItem('pv_dev_seeded', '1');
      console.log('[Polyfill] Directly seeded ' + SAMPLE_DUMMY_WORDS.length + ' sample words into local_savedWords.');
    }
  } catch(e) {
    console.warn('[Polyfill] Seeder error', e);
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
        if (callback) callback({ success: true, licenseType: 'LIFETIME', isPremium: true, status: 'ACTIVE' });
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
