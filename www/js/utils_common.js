// content/utils_common.js — Core Shared Utility Functions
// Consolidates i18n translation loaders, time formatters, and escaping functions shared between panels and content scripts.

// Safely patch chrome.runtime.sendMessage and chrome.tabs.sendMessage to automatically catch and suppress "Could not establish connection. Receiving end does not exist" errors in Chrome developer errors dashboard.
if (typeof chrome !== 'undefined') {
    if (chrome.runtime && !chrome.runtime.sendMessage._patched) {
        const originalSendMessage = chrome.runtime.sendMessage;
        chrome.runtime.sendMessage = function (...args) {
            const lastArgIndex = args.length - 1;
            if (typeof args[lastArgIndex] === 'function') {
                const originalCallback = args[lastArgIndex];
                args[lastArgIndex] = function (...cbArgs) {
                    const err = chrome.runtime.lastError; // Accessing lastError silences the "Unchecked runtime.lastError" warning
                    return originalCallback.apply(this, cbArgs);
                };
                return originalSendMessage.apply(chrome.runtime, args);
            } else {
                const promise = originalSendMessage.apply(chrome.runtime, args);
                if (promise && typeof promise.catch === 'function') {
                    return promise.catch(() => {});
                }
                return promise;
            }
        };
        chrome.runtime.sendMessage._patched = true;
    }
    if (chrome.tabs && !chrome.tabs.sendMessage._patched) {
        const originalTabsSendMessage = chrome.tabs.sendMessage;
        chrome.tabs.sendMessage = function (...args) {
            const lastArgIndex = args.length - 1;
            if (typeof args[lastArgIndex] === 'function') {
                const originalCallback = args[lastArgIndex];
                args[lastArgIndex] = function (...cbArgs) {
                    const err = chrome.runtime.lastError; // Accessing lastError silences the "Unchecked runtime.lastError" warning
                    return originalCallback.apply(this, cbArgs);
                };
                return originalTabsSendMessage.apply(chrome.tabs, args);
            } else {
                const promise = originalTabsSendMessage.apply(chrome.tabs, args);
                if (promise && typeof promise.catch === 'function') {
                    return promise.catch(() => {});
                }
                return promise;
            }
        };
        chrome.tabs.sendMessage._patched = true;
    }
}

// Safely polyfill chrome.storage API callbacks to prevent destructuring errors if the result is undefined.
if (typeof chrome !== 'undefined' && chrome.storage) {
    const wrapGet = (storageArea) => {
        if (storageArea && storageArea.get) {
            const originalGet = storageArea.get;
            storageArea.get = function (keys, callback) {
                if (typeof callback === 'function') {
                    originalGet.call(storageArea, keys, (result) => {
                        callback(result || {});
                    });
                } else {
                    return originalGet.apply(storageArea, arguments);
                }
            };
        }
    };
    wrapGet(chrome.storage.local);
    wrapGet(chrome.storage.sync);
}

var localeMessages = null;
async function initI18n(langOverride) {
    console.log("[PV-i18n] initI18n started", langOverride || '');
    return new Promise((resolve) => {
        const loadMessages = async (rawLang) => {
            let lang = rawLang || 'auto';
            if (lang === 'auto') {
                const uiLang = (chrome.i18n && chrome.i18n.getUILanguage) 
                    ? chrome.i18n.getUILanguage().split('-')[0].toLowerCase() 
                    : (navigator.language || 'en').split('-')[0].toLowerCase();
                lang = ['en', 'tr', 'de', 'fr', 'es'].includes(uiLang) ? uiLang : 'en';
            }
            try {
                const url = chrome.runtime.getURL(`_locales/${lang}/messages.json?v=31`);
                const res = await fetch(url);
                localeMessages = await res.json();
                window.localeMessages = localeMessages;
                console.log("[PV-i18n] Locale messages loaded", lang);
            }
            catch (err) {
                console.error("[PV-i18n] Failed to load locale", lang, err);
            }
            window.i18nInitialized = true;
            resolve();
        };

        if (langOverride) {
            loadMessages(langOverride);
        } else {
            try {
                chrome.storage.sync.get({ settings: { appLanguage: 'auto' } }, (result) => {
                    const settings = result?.settings;
                    let lang = settings?.appLanguage || 'auto';
                    loadMessages(lang);
                });
            } catch (e) {
                console.error("[PV-i18n] Synchronous error in storage.sync.get", e);
                loadMessages('auto');
            }
        }
    });
}
function getMessage(key) {
    if (localeMessages && localeMessages[key]) {
        return localeMessages[key].message;
    }
    const msg = chrome.i18n ? chrome.i18n['getMessage'](key) : '';
    if (msg && msg !== key) return msg;
    return '';
}
function formatTime(seconds) {
    if (isNaN(seconds) || seconds === null)
        return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const pad = (n) => String(n).padStart(2, '0');
    if (hrs > 0) {
        return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
}
function esc(text) {
    if (!text)
        return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}
function cleanWordForLookup(word) {
    if (!word)
        return "";
    // Convert to lowercase and trim
    let w = word.toLowerCase().trim();
    // Strip leading/trailing punctuation
    w = w.replace(/^[.,\/#!$%\^&\*;:{}=\-_`~()?’'‘’`]+|[.,\/#!$%\^&\*;:{}=\-_`~()?’'‘’`]+$/g, '');
    // Handle possessives and contractions
    // 1. Plural possessive: ends with s' or s’
    if (w.endsWith("s'") || w.endsWith("s’") || w.endsWith("s‘") || w.endsWith("s`")) {
        w = w.slice(0, -1);
    }
    // 2. Singular possessive or contractions ending in 's / ’s: user's, user’s, it's, it’s, he's, he’s, let's
    if (w.endsWith("'s") || w.endsWith("’s") || w.endsWith("‘s") || w.endsWith("`s")) {
        w = w.slice(0, -2);
    }
    // 3. Contractions:
    // - n't / n’t: don't, doesn't, didn't, shouldn't -> base is the verb (do, does, did, should, etc.)
    if (w.endsWith("n't") || w.endsWith("n’t") || w.endsWith("n‘t") || w.endsWith("n`t")) {
        w = w.slice(0, -3);
        // special cases: can't -> can, won't -> will, shan't -> shall
        if (w === "ca")
            w = "can";
        else if (w === "wo")
            w = "will";
        else if (w === "sha")
            w = "shall";
    }
    // - 're / ’re: you're, we're, they're -> base is the pronoun (you, we, they)
    else if (w.endsWith("'re") || w.endsWith("’re") || w.endsWith("‘re") || w.endsWith("`re")) {
        w = w.slice(0, -3);
    }
    // - 've / ’ve: I've, you've, we've, they've -> base is the pronoun (I, you, we, they)
    else if (w.endsWith("'ve") || w.endsWith("’ve") || w.endsWith("‘ve") || w.endsWith("`ve")) {
        w = w.slice(0, -3);
    }
    // - 'll / ’ll: I'll, you'll, he'll, she'll, we'll, they'll -> base is the pronoun
    else if (w.endsWith("'ll") || w.endsWith("’ll") || w.endsWith("‘ll") || w.endsWith("`ll")) {
        w = w.slice(0, -3);
    }
    // - 'd / ’d: I'd, you'd, he'd, she'd, we'd, they'd -> base is the pronoun
    else if (w.endsWith("'d") || w.endsWith("’d") || w.endsWith("‘d") || w.endsWith("`d")) {
        w = w.slice(0, -2);
    }
    // - 'm / ’m: I'm -> base is I
    else if (w.endsWith("'m") || w.endsWith("’m") || w.endsWith("‘m") || w.endsWith("`m")) {
        w = w.slice(0, -2);
    }
    // Clean up any remaining leading/trailing punctuation just in case
    w = w.replace(/^[.,\/#!$%\^&\*;:{}=\-_`~()?]+|[.,\/#!$%\^&\*;:{}=\-_`~()?]+$/g, '');
    return w;
}

/**
 * Shares a file using Capacitor Share sheet on mobile, or falls back to browser download on Web/PWA.
 * @param {string} fileName Name of the file including extension (e.g. 'primevocab_anki_export.txt')
 * @param {string} fileContent Raw content of the file
 * @param {string} mimeType MIME type of the file (e.g. 'text/plain;charset=utf-8;')
 */
async function shareExportFile(fileName, fileContent, mimeType) {
    if (window.Capacitor && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem && window.Capacitor.Plugins.Share) {
        try {
            // Safe UTF-8 base64 encoding
            const base64Data = btoa(unescape(encodeURIComponent(fileContent)));
            
            // Write file to Cache directory so the OS share sheet can access it
            const writeResult = await window.Capacitor.Plugins.Filesystem.writeFile({
                path: fileName,
                data: base64Data,
                directory: 'CACHE'
            });
            
            // Trigger native share sheet
            await window.Capacitor.Plugins.Share.share({
                title: fileName,
                url: writeResult.uri,
                dialogTitle: getMessage("share_dialog_title") || 'Paylaş'
            });
        } catch (e) {
            console.error("Capacitor share export failed:", e);
            const errStr = String(e.message || e).toLowerCase();
            // Suppress warning if user simply cancelled or dismissed the share sheet
            if (errStr.includes("cancel") || errStr.includes("dismiss") || errStr.includes("user rejected")) {
                return;
            }
            const errTpl = (typeof getMessage === 'function' && getMessage("share_error_toast")) || "Paylaşım hatası: {error}";
            const errMsg = errTpl.replace('{error}', e.message || e);
            if (typeof showToast === 'function') {
                showToast(errMsg);
            } else {
                alert(errMsg);
            }
        }
    } else {
        // Fallback for Web/PWA
        const blob = new Blob([fileContent], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }
}

/**
 * Uygulama dil ayarına göre çeviri hedef dilini belirler (Google Translate 'tl' parametresi).
 * Dil haritasındaki (appLanguage) her yeni dil buradan otomatik desteklenir.
 */
async function getTranslateTargetLang() {
    let targetLang = 'tr';
    try {
        const stored = await new Promise(r => {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
                chrome.storage.sync.get({ settings: { appLanguage: 'auto' } }, r);
            } else {
                r({ settings: { appLanguage: 'auto' } });
            }
        });
        const appLang = stored?.settings?.appLanguage;
        if (appLang && appLang !== 'auto') {
            targetLang = appLang;
        } else {
            const uiLocale = typeof getMessage === 'function' ? (getMessage("@@ui_locale") || "tr") : "tr";
            const langCode = uiLocale.split('_')[0].split('-')[0];
            if (langCode && langCode !== 'en') {
                targetLang = langCode;
            }
        }
    } catch (e) {}
    return targetLang;
}

/**
 * Cümle Çevirisi (Google Translate API)
 */
async function translateContextSentence(sentence, resultEl, btnEl = null) {
    if (!sentence || !sentence.trim()) return;
    const cleanSentence = sentence.replace(/^["'“«]+|["'”»]+$/g, '').trim();
    if (!cleanSentence) return;

    const targetLang = await getTranslateTargetLang();

    if (resultEl) {
        resultEl.style.display = 'block';
        resultEl.innerHTML = `<span style="font-size:11px; color:var(--text-muted); opacity:0.8;">${esc(getMessage('translating_label') || '⏳ Çevriliyor...')}</span>`;
    }

    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(cleanSentence)}`;
        const res = await fetch(url);
        const data = await res.json();

        let translatedText = '';
        if (data && data[0]) {
            data[0].forEach(part => {
                if (part && part[0]) translatedText += part[0];
            });
        }

        // If returned text is identical to cleanSentence (e.g. tl was same language), fallback try 'tr'
        if (translatedText.trim().toLowerCase() === cleanSentence.toLowerCase() && targetLang !== 'tr') {
            const fallbackUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=tr&dt=t&q=${encodeURIComponent(cleanSentence)}`;
            const res2 = await fetch(fallbackUrl);
            const data2 = await res2.json();
            if (data2 && data2[0]) {
                let fbText = '';
                data2[0].forEach(part => { if (part && part[0]) fbText += part[0]; });
                if (fbText.trim()) translatedText = fbText;
            }
        }

        if (resultEl) {
            if (translatedText && translatedText.trim().toLowerCase() !== cleanSentence.toLowerCase()) {
                resultEl.innerHTML = `
                    <div style="font-size:12.5px; color:#818cf8; font-weight:600; margin-top:3px; line-height:1.4; background:rgba(99,102,241,0.08); padding:6px 10px; border-radius:8px; border:1px solid rgba(99,102,241,0.2); text-align:left;">
                        💬 ${esc(translatedText)}
                    </div>
                `;
                if (btnEl) {
                    btnEl.style.display = 'none';
                }
            } else {
                resultEl.style.display = 'none';
            }
        }
    } catch (err) {
        console.warn("Sentence translation failed:", err);
        if (resultEl) {
            resultEl.style.display = 'none';
        }
    }
}

// Floating selection tooltip for translating any selected text with Google Translate
(function initSelectionTranslateTooltip() {
    let tooltipEl = null;

    function removeTooltip() {
        if (tooltipEl) {
            tooltipEl.remove();
            tooltipEl = null;
        }
    }

    document.addEventListener('selectionchange', () => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.toString().trim()) {
            setTimeout(() => {
                const s = window.getSelection();
                if (!s || s.isCollapsed || !s.toString().trim()) {
                    removeTooltip();
                }
            }, 300);
        }
    });

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('touchend', (e) => {
        setTimeout(handleSelection, 200);
    });

    function handleSelection(e) {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) return;
        const selectedText = sel.toString().trim();
        if (!selectedText || selectedText.length < 2) return;

        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;

        removeTooltip();

        try {
            const range = sel.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            if (!rect || (rect.width === 0 && rect.height === 0)) return;

            const googleIconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="#4285F4" style="vertical-align: middle;"><path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>`;

            tooltipEl = document.createElement('div');
            tooltipEl.style.position = 'fixed';
            tooltipEl.style.zIndex = '99999';
            tooltipEl.style.left = `${Math.max(10, Math.min(window.innerWidth - 150, rect.left + (rect.width / 2) - 60))}px`;
            tooltipEl.style.top = `${Math.max(10, rect.top - 38)}px`;
            tooltipEl.style.background = '#1e1b4b';
            tooltipEl.style.color = '#818cf8';
            tooltipEl.style.border = '1px solid #6366f1';
            tooltipEl.style.boxShadow = '0 4px 14px rgba(0,0,0,0.4)';
            tooltipEl.style.padding = '5px 12px';
            tooltipEl.style.borderRadius = '20px';
            tooltipEl.style.fontSize = '11px';
            tooltipEl.style.fontWeight = '700';
            tooltipEl.style.cursor = 'pointer';
            tooltipEl.style.userSelect = 'none';
            tooltipEl.style.display = 'flex';
            tooltipEl.style.alignItems = 'center';
            tooltipEl.style.gap = '5px';
            tooltipEl.innerHTML = `${googleIconSvg} <span>${esc(getMessage('google_translate_tooltip') || 'Google Çeviri')}</span>`;

            tooltipEl.addEventListener('click', (evt) => {
                evt.stopPropagation();
                evt.preventDefault();
                let targetLang = 'tr';
                const uiLocale = typeof getMessage === 'function' ? (getMessage("@@ui_locale") || "tr") : "tr";
                const langCode = uiLocale.split('_')[0].split('-')[0];
                if (langCode && langCode !== 'en') targetLang = langCode;

                const googleWebUrl = `https://translate.google.com/?sl=auto&tl=${targetLang}&text=${encodeURIComponent(selectedText)}&op=translate`;
                window.open(googleWebUrl, '_blank');
                removeTooltip();
            });

            document.body.appendChild(tooltipEl);
        } catch (err) {
            console.warn("Selection tooltip error:", err);
        }
    }

    document.addEventListener('mousedown', (e) => {
        if (tooltipEl && !tooltipEl.contains(e.target)) {
            removeTooltip();
        }
    });
})();

// ── Global CEFR & Word Type Color Palette ──
const GLOBAL_CEFR_COLORS = Object.freeze({
    'A1': '#4ade80',     // Açık Yeşil
    'a1': '#4ade80',
    'A2': '#16a34a',     // Koyu Yeşil
    'a2': '#16a34a',
    'B1': '#fde047',     // Açık Sarı
    'b1': '#fde047',
    'B2': '#ca8a04',     // Koyu Sarı / Altın
    'b2': '#ca8a04',
    'C1': '#f87171',     // Açık Kırmızı / Mercan
    'c1': '#f87171',
    'C2': '#b91c1c',     // Koyu Kırmızı
    'c2': '#b91c1c',
    'Phrasal': '#c084fc', // Mor / Lila
    'phrasal': '#c084fc',
    'PHRASAL': '#c084fc',
    'Idiom': '#fb923c',   // Turuncu
    'idiom': '#fb923c',
    'IDIOM': '#fb923c',
    'DEYİM': '#fb923c',
    'DEYIM': '#fb923c',
    'deyim': '#fb923c',
    'COL': '#38bdf8',     // Açık Mavi / Gökyüzü Mavisi
    'col': '#38bdf8',
    'Collocation': '#38bdf8',
    'collocation': '#38bdf8',
    'COLLOCATION': '#38bdf8',
    '??': '#64748b'
});

function getCEFRColor(level) {
    if (!level) return '#94a3b8';
    const str = String(level).trim();
    return GLOBAL_CEFR_COLORS[str] || 
           GLOBAL_CEFR_COLORS[str.toUpperCase()] || 
           GLOBAL_CEFR_COLORS[str.toLowerCase()] || 
           '#94a3b8';
}

function getCEFRBadgeHTML(level, options = {}) {
    if (!level || level === '??') return '';
    const norm = String(level).toLowerCase();
    const isPhrasal = norm === 'phrasal';
    const isIdiom = norm === 'idiom';
    const isColloc = norm === 'col' || norm === 'collocation';
    
    const color = getCEFRColor(level);
    const fontSize = options.fontSize || '9.5px';
    const inlineStyle = `font-size:${fontSize}; font-weight:800; color:${color}; background:${color}22; border:1px solid ${color}55; border-radius:4px; padding:1px 5px; letter-spacing:0.03em; display:inline-flex; align-items:center; gap:3px; vertical-align:middle;`;
    
    const getTxt = (key, fallback) => (typeof getMessage === 'function' ? getMessage(key) : '') || fallback;

    if (isPhrasal) {
        return `<span class="word-badge cefr-badge phrasal-badge" style="${inlineStyle}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/></svg>${getTxt('badge_phrasal', 'PHRASAL')}</span>`;
    } else if (isIdiom) {
        return `<span class="word-badge cefr-badge idiom-badge" style="${inlineStyle}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"/></svg>${getTxt('badge_idiom', 'DEYİM')}</span>`;
    } else if (isColloc) {
        return `<span class="word-badge cefr-badge colloc-badge" style="${inlineStyle}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>${getTxt('badge_collocation', 'EŞ DİZİM')}</span>`;
    } else {
        return `<span class="word-badge cefr-badge" style="${inlineStyle}">${esc(String(level).toUpperCase())}</span>`;
    }
}

// ── Centralized Shared SVG Icons Registry for Mobile App ──
const PV_ICONS = Object.freeze({
    search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`,
    clear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
    filter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M4 5h16l-6 8v6l-4-2v-4z"/></svg>`,
    sort: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M7 4v16M7 4 3 8M7 4l4 4M17 20V4M17 20l4-4M17 20l-4-4"/></svg>`,
    video: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><rect x="2.5" y="5" width="19" height="13" rx="2"/><path d="M8 20h8M12 18v2"/></svg>`,
    tag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M20.6 12.5 12.9 4.8a2 2 0 0 0-1.4-.6H5a1 1 0 0 0-1 1v6.5c0 .5.2 1 .6 1.4l7.7 7.7c.8.8 2 .8 2.8 0l5.5-5.5c.8-.8.8-2 0-2.8Z"/><circle cx="8" cy="8.5" r="1.3" fill="currentColor" stroke="none"/></svg>`,
    moreHorizontal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></svg>`,
    moreVertical: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="5" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="12" cy="19" r="1.3"/></svg>`,
    chevronDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" width="12" height="12"><path d="m6 9 6 6 6-6"/></svg>`,
    chevronRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="m9 18 6-6-6-6"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" width="14" height="14"><path d="M4 12l5 5L20 6"/></svg>`,
    speaker: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>`,
    flameHard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
    lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="11" height="11"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    cards: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><rect x="3" y="7" width="14" height="13" rx="2.5"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-1.19"/></svg>`,
    expandAll: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="m7 15 5 5 5-5M7 9l5-5 5 5"/></svg>`,
    family: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="12" cy="5" r="3"/><circle cx="6" cy="19" r="3"/><circle cx="18" cy="19" r="3"/><path d="M12 8v4M6 16v-1a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v1"/></svg>`,
    linkChain: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="9"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    tabArchive: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10M6 14h6"/></svg>`,
    tabReview: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    tabSettings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    tabProfile: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
});




