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
async function initI18n() {
    console.log("[PV-i18n] initI18n started");
    return new Promise((resolve) => {
        try {
            chrome.storage.sync.get({ settings: {
                    appLanguage: 'auto'
                }
            }, async (result) => {
                console.log("[PV-i18n] Storage sync callback triggered", result);
                const settings = result?.settings;
                let lang = settings?.appLanguage || 'auto';
                if (lang === 'auto') {
                    const uiLang = chrome.i18n.getUILanguage().split('-')[0].toLowerCase();
                    lang = ['en', 'tr', 'de', 'fr', 'es'].includes(uiLang) ? uiLang : 'en';
                }
                try {
                    const url = chrome.runtime.getURL(`_locales/${lang}/messages.json`);
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
            });
        } catch (e) {
            console.error("[PV-i18n] Synchronous error in storage.sync.get", e);
            resolve();
        }
    });
}
function getMessage(key) {
    if (localeMessages && localeMessages[key]) {
        return localeMessages[key].message;
    }
    return chrome.i18n['getMessage'](key) || '';
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
            if (typeof showToast === 'function') {
                showToast("Paylaşım hatası: " + (e.message || e));
            } else {
                alert("Paylaşım hatası: " + (e.message || e));
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
 * Cümle Çevirisi (Google Translate API + Web Fallback)
 */
async function translateContextSentence(sentence, resultEl) {
    if (!sentence || !sentence.trim()) return;
    const cleanSentence = sentence.replace(/^["'“«]+|["'”»]+$/g, '').trim();
    if (!cleanSentence) return;

    const userLang = (typeof getMessage === 'function' ? (getMessage("@@ui_locale") || "tr") : "tr").split('_')[0].split('-')[0];
    const googleWebUrl = `https://translate.google.com/?sl=auto&tl=${userLang}&text=${encodeURIComponent(cleanSentence)}&op=translate`;

    if (resultEl) {
        resultEl.style.display = 'block';
        resultEl.innerHTML = `<span style="font-size:11px; color:var(--text-muted); opacity:0.8;">⏳ ${typeof getMessage === 'function' ? (getMessage("loading") || "Çevriliyor...") : "Çevriliyor..."}</span>`;
    }

    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${userLang}&dt=t&q=${encodeURIComponent(cleanSentence)}`;
        const res = await fetch(url);
        const data = await res.json();

        let translatedText = '';
        if (data && data[0]) {
            data[0].forEach(part => {
                if (part && part[0]) translatedText += part[0];
            });
        }

        const openInGTranslateMsg = typeof getMessage === 'function' ? (getMessage("open_in_google_translate") || "Google Translate'de Aç ↗") : "Google Translate'de Aç ↗";

        if (resultEl) {
            if (translatedText) {
                resultEl.innerHTML = `
                    <div style="font-size:12.5px; color:#818cf8; font-weight:600; margin-top:2px; line-height:1.4; background:rgba(99,102,241,0.08); padding:6px 10px; border-radius:8px; border:1px solid rgba(99,102,241,0.2); text-align:left;">
                        💬 ${esc(translatedText)}
                    </div>
                    <div style="margin-top:4px; text-align:center;">
                        <a href="${googleWebUrl}" target="_blank" rel="noopener noreferrer" style="font-size:10.5px; color:var(--text-muted); text-decoration:underline; display:inline-flex; align-items:center; gap:3px;">
                            🌐 ${openInGTranslateMsg}
                        </a>
                    </div>
                `;
            } else {
                window.open(googleWebUrl, '_blank');
                resultEl.style.display = 'none';
            }
        } else {
            window.open(googleWebUrl, '_blank');
        }
    } catch (err) {
        console.warn("Sentence translation failed:", err);
        const openInGTranslateMsg = typeof getMessage === 'function' ? (getMessage("open_in_google_translate") || "Google Translate'de Aç ↗") : "Google Translate'de Aç ↗";
        if (resultEl) {
            resultEl.innerHTML = `
                <div style="margin-top:4px; text-align:center;">
                    <a href="${googleWebUrl}" target="_blank" rel="noopener noreferrer" style="font-size:11px; color:#818cf8; text-decoration:underline;">
                        🌐 ${openInGTranslateMsg}
                    </a>
                </div>
            `;
        } else {
            window.open(googleWebUrl, '_blank');
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

            tooltipEl = document.createElement('div');
            tooltipEl.style.position = 'fixed';
            tooltipEl.style.zIndex = '99999';
            tooltipEl.style.left = `${Math.max(10, Math.min(window.innerWidth - 150, rect.left + (rect.width / 2) - 60))}px`;
            tooltipEl.style.top = `${Math.max(10, rect.top - 38)}px`;
            tooltipEl.style.background = '#1e1b4b';
            tooltipEl.style.color = '#818cf8';
            tooltipEl.style.border = '1px solid #6366f1';
            tooltipEl.style.boxShadow = '0 4px 14px rgba(0,0,0,0.4)';
            tooltipEl.style.padding = '4px 10px';
            tooltipEl.style.borderRadius = '20px';
            tooltipEl.style.fontSize = '11px';
            tooltipEl.style.fontWeight = '700';
            tooltipEl.style.cursor = 'pointer';
            tooltipEl.style.userSelect = 'none';
            tooltipEl.style.display = 'flex';
            tooltipEl.style.alignItems = 'center';
            tooltipEl.style.gap = '4px';
            tooltipEl.innerHTML = `<span>🌐</span> <span>Google Çeviri</span>`;

            tooltipEl.addEventListener('click', (evt) => {
                evt.stopPropagation();
                evt.preventDefault();
                const userLang = (typeof getMessage === 'function' ? (getMessage("@@ui_locale") || "tr") : "tr").split('_')[0].split('-')[0];
                const googleWebUrl = `https://translate.google.com/?sl=auto&tl=${userLang}&text=${encodeURIComponent(selectedText)}&op=translate`;
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



