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
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
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
