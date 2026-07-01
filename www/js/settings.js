// ── Platform Sabitleri ────────────────────────────────────────────────────────
const browserLang = (() => {
    let lang = 'en';
    try {
        const raw = (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getUILanguage) 
            ? chrome.i18n.getUILanguage() 
            : (navigator.language || 'en');
        lang = raw.split('-')[0].toLowerCase();
    } catch (e) {}
    const supported = ['tr', 'en', 'de', 'fr', 'es', 'it', 'ru', 'pt', 'ar', 'zh', 'ja', 'ko', 'nl', 'pl', 'sv', 'uk', 'hi'];
    return supported.includes(lang) ? lang : 'en';
})();

const DEFAULT_YOUTUBE_SETTINGS = {
    fontSize: '22px',
    positionBottom: '12%',
    dualSubtitles: true,
    dualSubtitlesColor: '#cbd5e1',
    targetLang: browserLang,
    hideImdb: false,
    cinemaMode: false,
    panelFontSize: '14px',
    shadowing: false,
    shadowingSmart: false,
    autoRewind: false,
    rewindSeconds: 3,
    showWordFamily: false,
    showWordTags: false,
    showWordDetails: false,
    showQuickAccess: true,
    autoSlowMo: false,
    autoSlowMoSpeed: 0.75,
    autoSlowMoLevels: { A1: false, A2: false, B1: false, B2: false, C1: false, C2: false, phrasal: false, other: false, hard: false },
    allowSmartOnAsr: false,
    primeVideoDomain: 'default'
};

const DEFAULT_PRIME_SETTINGS = {
    fontSize: '22px',
    positionBottom: '12%',
    dualSubtitles: true,
    dualSubtitlesColor: '#cbd5e1',
    targetLang: browserLang,
    hideImdb: false,
    cinemaMode: false,
    panelFontSize: '14px',
    shadowing: false,
    shadowingSmart: false,
    autoRewind: false,
    rewindSeconds: 3,
    showWordFamily: false,
    showWordTags: false,
    showWordDetails: false,
    showQuickAccess: true,
    autoSlowMo: false,
    autoSlowMoSpeed: 0.75,
    autoSlowMoLevels: { A1: false, A2: false, B1: false, B2: false, C1: false, C2: false, phrasal: false, other: false, hard: false },
    allowSmartOnAsr: false,
    primeVideoDomain: 'default'
};

const DEFAULT_NETFLIX_SETTINGS = {
    fontSize: '22px',
    positionBottom: '20%',
    dualSubtitles: true,
    dualSubtitlesColor: '#cbd5e1',
    targetLang: browserLang,
    hideImdb: false,
    cinemaMode: false,
    panelFontSize: '14px',
    shadowing: false,
    shadowingSmart: false,
    autoRewind: false,
    rewindSeconds: 3,
    showWordFamily: false,
    showWordTags: false,
    showWordDetails: false,
    showQuickAccess: true,
    autoSlowMo: false,
    autoSlowMoSpeed: 0.75,
    autoSlowMoLevels: { A1: false, A2: false, B1: false, B2: false, C1: false, C2: false, phrasal: false, other: false, hard: false },
    allowSmartOnAsr: false,
    primeVideoDomain: 'default'
};

const DEFAULT_PLATFORM_SETTINGS = DEFAULT_YOUTUBE_SETTINGS; // keep as fallback reference

function getDefaultPlatformSettings(key) {
    if (key === 'youtube') return DEFAULT_YOUTUBE_SETTINGS;
    if (key === 'netflix') return DEFAULT_NETFLIX_SETTINGS;
    if (key === 'prime') return DEFAULT_PRIME_SETTINGS;
    return DEFAULT_YOUTUBE_SETTINGS;
}
function getPlatformKey(platformName) {
    if (!platformName)
        return 'youtube';
    const name = platformName.toLowerCase();
    if (name.includes('youtube'))
        return 'youtube';
    if (name.includes('prime') || name.includes('amazon'))
        return 'prime';
    if (name.includes('netflix'))
        return 'netflix';
    return 'youtube';
}
function getActivePlatform() {
    const activeBtn = document.querySelector('.platform-filter-btn.active');
    if (activeBtn)
        return activeBtn.dataset.platform;
    return getPlatformKey(currentPlatform);
}
function applyPlatformFilter(platform) {
    document.querySelectorAll('[data-supported-platforms]').forEach(el => {
        const supported = el.dataset.supportedPlatforms.split(',');
        if (platform === 'all' || supported.includes(platform))
            el.classList.remove('platform-hidden');
        else
            el.classList.add('platform-hidden');
    });
    document.querySelectorAll('.settings-section').forEach(section => {
        const totalGroups = section.querySelectorAll('.settings-group');
        if (totalGroups.length > 0) {
            const visibleGroups = Array.from(totalGroups).filter(group => {
                if (group.classList.contains('platform-hidden')) return false;
                if (group.style.display === 'none') return false;
                return true;
            });
            if (visibleGroups.length === 0)
                section.classList.add('platform-hidden');
            else
                section.classList.remove('platform-hidden');
        }
    });
}
function detectAndSetPlatform() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs && tabs[0];
        let detectedPlatform = null;
        if (tab && tab.url) {
            if (tab.url.includes('youtube.com') || tab.url.includes('youtu.be'))
                detectedPlatform = 'youtube';
            else if (tab.url.includes('primevideo.com') || tab.url.includes('amazon.com') || tab.url.includes('amazon.co.uk') || tab.url.includes('amazon.de'))
                detectedPlatform = 'prime';
            else if (tab.url.includes('netflix.com'))
                detectedPlatform = 'netflix';
        }
        const filterButtons = document.querySelectorAll('.platform-filter-btn');
        if (filterButtons.length > 0) {
            if (detectedPlatform) {
                let changed = false;
                filterButtons.forEach(btn => {
                    const wasActive = btn.classList.contains('active');
                    const shouldBeActive = btn.dataset.platform === detectedPlatform;
                    if (wasActive !== shouldBeActive) {
                        btn.classList.toggle('active', shouldBeActive);
                        changed = true;
                    }
                });
                applyPlatformFilter(detectedPlatform);
                if (changed)
                    loadSettings();
            }
            else {
                let activeBtn = document.querySelector('.platform-filter-btn.active');
                if (!activeBtn) {
                    activeBtn = document.querySelector('.platform-filter-btn[data-platform="youtube"]');
                    if (activeBtn) {
                        activeBtn.classList.add('active');
                        applyPlatformFilter(activeBtn.dataset.platform);
                        loadSettings();
                    }
                }
                else {
                    applyPlatformFilter(activeBtn.dataset.platform);
                }
            }
        }
    });
}
// ── Ayar Yükleme ──────────────────────────────────────────────────────────────
function loadSettings() {
    chrome.storage.local.get({ licenseType: 'FREE', licenseStatus: 'FREE_USER', licenseExpiration: '', isPremium: false, googleSyncEmail: '' }, (localData) => {
        // Email yoksa (giriş yapılmamış) asla premium sayma — storage'daki artık veri görmezden gel
        const isPremium = !!localData.googleSyncEmail && (
            localData.isPremium === true || 
            (localData.licenseType !== 'FREE' && localData.licenseStatus === 'ACTIVE')
        );
        
        // Update License badge & Expiration UI
        const badge = document.getElementById('license-badge');
        if (badge) {
            badge.textContent = localData.licenseType;
            if (isPremium) {
                badge.style.background = 'rgba(16, 185, 129, 0.15)';
                badge.style.color = '#10b981';
            } else {
                badge.style.background = 'rgba(99, 102, 241, 0.15)';
                badge.style.color = '#818cf8';
            }
        }
        
        const expRow = document.getElementById('license-exp-row');
        const expDate = document.getElementById('license-exp-date');
        if (expRow && expDate) {
            if (isPremium && localData.licenseExpiration) {
                expRow.style.display = 'flex';
                if (localData.licenseType === 'LIFETIME') {
                    expDate.textContent = 'Sınırsız (LIFETIME)';
                } else {
                    expDate.textContent = new Date(localData.licenseExpiration).toLocaleDateString();
                }
            } else {
                expRow.style.display = 'none';
            }
        }

        // Apply visual lock styles for Free users
        const syncToggle = document.getElementById('profile-sync-toggle');
        const syncRow = syncToggle ? syncToggle.closest('.setting-row') || syncToggle.parentNode.parentNode : null;
        const ankiBtn = document.getElementById('anki-export-btn');
        const backupBtn = document.getElementById('backup-btn');
        const restoreBtn = document.getElementById('restore-btn');
        
        // Smart features groups
        const shadowingToggle = document.getElementById('shadowing-toggle');
        const shadowingGroup = shadowingToggle ? shadowingToggle.closest('.settings-group') : null;
        const autoRewindToggle = document.getElementById('auto-rewind-toggle');
        const autoRewindGroup = autoRewindToggle ? autoRewindToggle.closest('.settings-group') : null;
        const autoSlowMoToggle = document.getElementById('auto-slow-mo-toggle');
        const autoSlowMoGroup = autoSlowMoToggle ? autoSlowMoToggle.closest('.settings-group') : null;
        const ytAsrToggle = document.getElementById('yt-allow-asr-toggle');
        const ytAsrGroup = ytAsrToggle ? ytAsrToggle.closest('.settings-group') || document.getElementById('yt-smart-features-note-group') : null;

        const shadowingRow = shadowingToggle ? shadowingToggle.closest('.setting-row') : null;
        const autoRewindRow = autoRewindToggle ? autoRewindToggle.closest('.setting-row') : null;
        const autoSlowMoRow = autoSlowMoToggle ? autoSlowMoToggle.closest('.setting-row') : null;
        const ytAsrRow = ytAsrToggle ? ytAsrToggle.closest('.setting-row') : null;

        const smartGroups = [shadowingGroup, autoRewindGroup, autoSlowMoGroup, ytAsrGroup].filter(Boolean);
        const smartRows = [shadowingRow, autoRewindRow, autoSlowMoRow, ytAsrRow].filter(Boolean);

        if (isPremium) {
            if (syncRow) syncRow.classList.remove('locked');
            if (ankiBtn) ankiBtn.classList.remove('locked');
            if (backupBtn) backupBtn.classList.remove('locked');
            if (restoreBtn) restoreBtn.classList.remove('locked');
            smartGroups.forEach(g => g.classList.remove('locked'));
            smartRows.forEach(r => r.classList.remove('locked'));
        } else {
            if (syncRow) syncRow.classList.add('locked');
            if (ankiBtn) ankiBtn.classList.add('locked');
            if (backupBtn) backupBtn.classList.add('locked');
            if (restoreBtn) restoreBtn.classList.add('locked');
            smartGroups.forEach(g => g.classList.add('locked'));
            smartRows.forEach(r => r.classList.add('locked'));

            // Free kullanıcı: premium ayarlarını storage'da da kapat
            // Böylece content script arka planda bu özellikleri çalıştıramaz
            chrome.storage.sync.get({ settings: {} }, ({ settings }) => {
                if (!settings) return;
                const premiumKeys = ['shadowing', 'shadowingSmart', 'autoRewind', 'autoSlowMo', 'allowSmartOnAsr'];
                let needsSave = false;
                ['youtube', 'prime', 'netflix'].forEach(plat => {
                    if (!settings[plat]) return;
                    premiumKeys.forEach(k => {
                        if (settings[plat][k]) {
                            settings[plat][k] = false;
                            needsSave = true;
                        }
                    });
                });
                // Top-level keys da sıfırla (eski format desteği)
                premiumKeys.forEach(k => {
                    if (settings[k]) {
                        settings[k] = false;
                        needsSave = true;
                    }
                });
                if (needsSave) {
                    settings.timestamp = Date.now();
                    chrome.storage.sync.set({ settings }, () => {
                        console.log('[PV-settings] Premium ayarlar free kullanıcı için devre dışı bırakıldı.');
                    });
                }
            });
        }

        // Dynamic kilit icons for games grid in review
        document.querySelectorAll('.game-card').forEach(card => {
            const gameType = card.dataset.game;
            // Only multiple_choice and fill_blank are free
            if (gameType === 'multiple_choice' || gameType === 'fill_blank' || isPremium) {
                card.classList.remove('locked');
            } else {
                card.classList.add('locked');
            }
        });

        chrome.storage.sync.get({ settings: { appLanguage: 'auto', gamesSound: true, deleteConfirm: true, youtube: {}, prime: {}, netflix: {} } }, ({ settings }) => {
        if (!settings)
            settings = {};
        const ensureInit = (key) => {
            if (!settings[key] || Object.keys(settings[key]).length === 0) {
                settings[key] = {};
                const defaults = getDefaultPlatformSettings(key);
                for (const k of Object.keys(defaults)) {
                    settings[key][k] = settings[k] !== undefined ? settings[k] : defaults[k];
                }
            }
        };
        ensureInit('youtube');
        ensureInit('prime');
        ensureInit('netflix');
        const platform = getActivePlatform();
        const ps = settings[platform] || {};
        const gamesSoundToggle = document.getElementById('games-sound-toggle');
        if (gamesSoundToggle)
            gamesSoundToggle.checked = settings.gamesSound !== false;
        const deleteConfirmToggle = document.getElementById('delete-confirm-toggle');
        if (deleteConfirmToggle)
            deleteConfirmToggle.checked = settings.deleteConfirm !== false;
        const enabledPlats = settings.enabledPlatforms || { youtube: true, netflix: true, prime: true };
        const ytToggle = document.getElementById('platform-toggle-youtube');
        if (ytToggle)
            ytToggle.checked = enabledPlats.youtube !== false;
        const nfToggle = document.getElementById('platform-toggle-netflix');
        if (nfToggle)
            nfToggle.checked = enabledPlats.netflix !== false;
        const prToggle = document.getElementById('platform-toggle-prime');
        if (prToggle)
            prToggle.checked = enabledPlats.prime !== false;
        const quickAccessToggle = document.getElementById('quick-access-toggle');
        if (quickAccessToggle)
            quickAccessToggle.checked = !!ps.showQuickAccess;
        const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
        if (isFirefox) {
            const quickAccessGroup = document.getElementById('quick-access-settings-group');
            if (quickAccessGroup) {
                quickAccessGroup.style.setProperty('display', 'none', 'important');
            }
        }
        document.querySelectorAll('#font-size-group .setting-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === ps.fontSize);
        });
        document.querySelectorAll('#position-group .setting-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === ps.positionBottom);
        });
        const dualToggle = document.getElementById('dual-subtitles-toggle');
        if (dualToggle)
            dualToggle.checked = !!ps.dualSubtitles;
        const hideImdbToggle = document.getElementById('hide-imdb-toggle');
        if (hideImdbToggle)
            hideImdbToggle.checked = !!ps.hideImdb;
        const cinemaModeToggle = document.getElementById('cinema-mode-toggle');
        if (cinemaModeToggle)
            cinemaModeToggle.checked = !!ps.cinemaMode;
        const pickerRow = document.getElementById('dual-color-picker-row');
        if (pickerRow)
            pickerRow.style.display = ps.dualSubtitles ? 'flex' : 'none';
        const dualColor = ps.dualSubtitlesColor || '#cbd5e1';
        document.querySelectorAll('.color-dot').forEach(dot => dot.classList.toggle('active', dot.dataset.color === dualColor));
        const targetSelect = document.getElementById('target-lang-select');
        if (targetSelect)
            targetSelect.value = ps.targetLang || 'tr';
        const appLangSelect = document.getElementById('app-lang-select');
        if (appLangSelect)
            appLangSelect.value = settings.appLanguage || 'auto';
        document.querySelectorAll('#panel-font-size-group .setting-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === (ps.panelFontSize || '14px'));
        });
        applyPanelFontSize(ps.panelFontSize || '14px');
        const shadowingToggle = document.getElementById('shadowing-toggle');
        if (shadowingToggle)
            shadowingToggle.checked = !!ps.shadowing;
        const shadowingSmartRow = document.getElementById('shadowing-smart-row');
        if (shadowingSmartRow)
            shadowingSmartRow.style.display = ps.shadowing ? 'block' : 'none';
        document.querySelectorAll('#shadowing-mode-group .setting-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === (ps.shadowingSmart ? 'smart' : 'standard'));
        });
        const autoRewindToggle = document.getElementById('auto-rewind-toggle');
        if (autoRewindToggle)
            autoRewindToggle.checked = !!ps.autoRewind;
        const rewindRow = document.getElementById('rewind-seconds-row');
        if (rewindRow)
            rewindRow.style.display = ps.autoRewind ? 'block' : 'none';
        document.querySelectorAll('#rewind-seconds-group .setting-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.value) === (ps.rewindSeconds || 3));
        });
        const toggleFamilyBtn = document.getElementById('toggle-family-btn');
        if (toggleFamilyBtn) {
            const isActive = !!ps.showWordFamily;
            toggleFamilyBtn.dataset.familyVisible = String(isActive);
            toggleFamilyBtn.classList.toggle('active', isActive);
            toggleFamilyBtn.title = isActive ? getMessage("tooltip_hide_family") : getMessage("tooltip_show_family");
        }
        const toggleTagsBtn = document.getElementById('toggle-tags-btn');
        if (toggleTagsBtn) {
            const isActive = ps.showWordTags !== false;
            toggleTagsBtn.dataset.tagsVisible = String(isActive);
            toggleTagsBtn.classList.toggle('active', isActive);
            toggleTagsBtn.title = isActive ? getMessage("tooltip_hide_tags") : getMessage("tooltip_show_tags");
        }
        const toggleExpandAllBtn = document.getElementById('toggle-expand-all-btn');
        if (toggleExpandAllBtn) {
            const isActive = !!ps.showWordDetails;
            toggleExpandAllBtn.dataset.expanded = String(isActive);
            toggleExpandAllBtn.classList.toggle('active', isActive);
            toggleExpandAllBtn.title = isActive ? getMessage("tooltip_collapse_all") : getMessage("tooltip_expand_all");
        }
        const autoSlowMoToggle = document.getElementById('auto-slow-mo-toggle');
        if (autoSlowMoToggle)
            autoSlowMoToggle.checked = !!ps.autoSlowMo;
        const slowMoRow = document.getElementById('slow-mo-details-row');
        if (slowMoRow)
            slowMoRow.style.display = ps.autoSlowMo ? 'block' : 'none';
        document.querySelectorAll('#slow-mo-speed-group .setting-btn').forEach(btn => {
            btn.classList.toggle('active', parseFloat(btn.dataset.value) === (ps.autoSlowMoSpeed || 0.75));
        });
        const levels = ps.autoSlowMoLevels || { A1: false, A2: false, B1: false, B2: false, C1: false, C2: false, phrasal: false, other: false, hard: false };
        const levelMap = { 'slow-mo-level-a1': levels.A1, 'slow-mo-level-a2': levels.A2, 'slow-mo-level-b1': levels.B1, 'slow-mo-level-b2': levels.B2, 'slow-mo-level-c1': levels.C1, 'slow-mo-level-c2': levels.C2, 'slow-mo-level-phrasal': levels.phrasal, 'slow-mo-level-other': levels.other, 'slow-mo-level-hard': levels.hard };
        for (const [id, checked] of Object.entries(levelMap)) {
            const el = document.getElementById(id);
            if (el)
                el.checked = !!checked;
        }
        const ytAllowAsrToggle = document.getElementById('yt-allow-asr-toggle');
        if (ytAllowAsrToggle) {
            ytAllowAsrToggle.checked = !!ps.allowSmartOnAsr;
            const warningEl = document.getElementById('yt-allow-asr-warning');
            if (warningEl)
                warningEl.style.display = ps.allowSmartOnAsr ? 'block' : 'none';
        }
        const primeDomainSelect = document.getElementById('prime-domain-select');
        if (primeDomainSelect)
            primeDomainSelect.value = ps.primeVideoDomain || 'default';
      });
    });
}
let lastLocalWriteTime = 0;
function saveSetting(key, value) {
    lastLocalWriteTime = Date.now();
    chrome.storage.sync.get({ settings: {} }, ({ settings }) => {
        if (!settings)
            settings = {};
        const ensureInit = (k) => { 
            if (!settings[k] || Object.keys(settings[k]).length === 0) {
                settings[k] = {};
                const defaults = getDefaultPlatformSettings(k);
                for (const kk of Object.keys(defaults))
                    settings[k][kk] = settings[kk] !== undefined ? settings[kk] : defaults[kk];
            } 
        };
        ensureInit('youtube');
        ensureInit('prime');
        ensureInit('netflix');
        if (key === 'appLanguage' || key === 'gamesSound' || key === 'deleteConfirm') {
            settings[key] = value;
        }
        else {
            const platform = getActivePlatform();
            settings[platform][key] = value;
            settings[key] = value;
        }
        settings.timestamp = Date.now();
        chrome.storage.sync.set({ settings }, () => {
            if (chrome.runtime.lastError) {
                console.error("[PV-settings] saveSetting failed:", chrome.runtime.lastError.message);
            } else {
                console.log("[PV-settings] saveSetting success:", key, value);
            }
        });
    });
}
function applyFamilyBtnState(show) {
    const btn = document.getElementById('toggle-family-btn');
    if (!btn)
        return;
    btn.dataset.familyVisible = String(show);
    btn.classList.toggle('active', show);
    btn.title = show ? getMessage("tooltip_hide_family") : getMessage("tooltip_show_family");
}
function applyPanelFontSize(size) {
    document.querySelectorAll('.word-chip, .transcript-row').forEach(el => { el.style.fontSize = size; });
    document.documentElement.style.setProperty('--panel-font-size', size);
}
// ── Ayar Event Listener'ları ──────────────────────────────────────────────────
document.querySelectorAll('#font-size-group .setting-btn').forEach(btn => { btn.addEventListener('click', () => { document.querySelectorAll('#font-size-group .setting-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); saveSetting('fontSize', btn.dataset.value); }); });
document.querySelectorAll('#position-group .setting-btn').forEach(btn => { btn.addEventListener('click', () => { document.querySelectorAll('#position-group .setting-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); saveSetting('positionBottom', btn.dataset.value); }); });
const dualToggleEl = document.getElementById('dual-subtitles-toggle');
if (dualToggleEl) {
    dualToggleEl.addEventListener('change', (e) => { saveSetting('dualSubtitles', e.target.checked); const pickerRow = document.getElementById('dual-color-picker-row'); if (pickerRow)
        pickerRow.style.display = e.target.checked ? 'flex' : 'none'; });
}
const quickAccessToggleEl = document.getElementById('quick-access-toggle');
if (quickAccessToggleEl)
    quickAccessToggleEl.addEventListener('change', (e) => saveSetting('showQuickAccess', e.target.checked));
const hideImdbToggleEl = document.getElementById('hide-imdb-toggle');
if (hideImdbToggleEl)
    hideImdbToggleEl.addEventListener('change', (e) => saveSetting('hideImdb', e.target.checked));
document.querySelectorAll('.platform-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.platform-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyPlatformFilter(btn.dataset.platform);
        loadSettings();
    });
});
const cinemaModeToggleEl = document.getElementById('cinema-mode-toggle');
if (cinemaModeToggleEl)
    cinemaModeToggleEl.addEventListener('change', (e) => saveSetting('cinemaMode', e.target.checked));
function executeIfPremium(action) {
    chrome.storage.local.get({ licenseType: 'FREE', isPremium: false, googleSyncEmail: '' }, ({ licenseType, isPremium, googleSyncEmail }) => {
        const hasPremium = !!googleSyncEmail && (isPremium === true || licenseType !== 'FREE');
        if (!hasPremium) {
            if (typeof showPremiumModal === 'function') {
                showPremiumModal(
                    getMessage("premium_modal_title") || "Premium Özellik",
                    getMessage("premium_smart_locked_desc") || "Akıllı Özellikleri kullanabilmek için Premium üyeliğe yükseltmeniz gerekmektedir."
                );
            }
            loadSettings();
            return;
        }
        action();
    });
}

/**
 * Premium satın alma akışı.
 * 
 * Ödeme sayfası açılmadan önce kullanıcının Google hesabının bağlı olduğunu kontrol eder.
 * Bağlı değilse önce connectGoogleAccount() ile bağlantı yaptırır,
 * bağlandıktan sonra ödeme sayfasını açar.
 * 
 * @param {string} baseCheckoutUrl - Lemon Squeezy ödeme linki (variant URL)
 * @param {string} licenseType     - MONTHLY | YEARLY | LIFETIME
 */
async function handleBuyPremium(baseCheckoutUrl, licenseType) {
    const storageData = await new Promise(r =>
        chrome.storage.local.get({ googleSyncEmail: '' }, r)
    );

    if (!storageData.googleSyncEmail) {
        // Google hesabı bağlı değil — önce bağlat
        showToast(getMessage('premium_connect_google_first') || 'Devam etmek için Google hesabınızı bağlayın...', 3000);
        try {
            if (typeof connectGoogleAccount !== 'function') {
                showToast('Bağlantı fonksiyonu bulunamadı.', 3000);
                return;
            }
            const userInfo = await connectGoogleAccount();
            showToast(`✅ ${userInfo.email} bağlandı! Yönlendiriliyorsunuz...`, 2500);
            // Bağlandıktan sonra ödeme sayfasını aç
            setTimeout(() => {
                const checkoutUrl = buildLsCheckoutUrl(baseCheckoutUrl, userInfo.email, licenseType);
                chrome.tabs.create({ url: checkoutUrl });
            }, 1800);
        } catch (err) {
            console.error('[PV-Premium] Google bağlantısı başarısız:', err);
            showToast(getMessage('premium_google_connect_cancelled') || 'Google bağlantısı iptal edildi.', 3000);
        }
        return;
    }

    // Google hesabı zaten bağlı — direkt ödeme sayfasına git
    const checkoutUrl = buildLsCheckoutUrl(baseCheckoutUrl, storageData.googleSyncEmail, licenseType);
    chrome.tabs.create({ url: checkoutUrl });
}

/**
 * Lemon Squeezy checkout URL'ine gerekli parametreleri ekler.
 * @param {string} baseUrl    - LS ürün/variant checkout URL'i
 * @param {string} email      - Kullanıcının Google e-postası
 * @param {string} licenseType - MONTHLY | YEARLY | LIFETIME
 * @returns {string} Parametreli checkout URL
 */
function buildLsCheckoutUrl(baseUrl, email, licenseType) {
    const url = new URL(baseUrl);
    // E-posta ön doldur (kullanıcı görecek, değiştirebilir ama tevik etmiyoruz)
    url.searchParams.set('checkout[email]', email);
    // GAS'a gidecek custom data
    url.searchParams.set('checkout[custom][license_type]', licenseType);
    return url.toString();
}

// ── Lemon Squeezy Ürün Checkout URL'leri ─────────────────────────────────────
const LS_URLS = {
    MONTHLY: 'https://primevocab.lemonsqueezy.com/checkout/buy/21098d81-25ed-4ded-a487-fb2c9e02d30f'
    // İleride başka planlar eklenirse buraya ekle:
    // YEARLY:   'https://primevocab.lemonsqueezy.com/checkout/buy/...'
};

const shadowingToggleEl = document.getElementById('shadowing-toggle');
if (shadowingToggleEl) {
    shadowingToggleEl.addEventListener('change', (e) => {
        executeIfPremium(() => {
            saveSetting('shadowing', e.target.checked);
            const row = document.getElementById('shadowing-smart-row');
            if (row) row.style.display = e.target.checked ? 'block' : 'none';
        });
    });
}
const shadowingSmartToggleEl = document.getElementById('shadowing-smart-toggle');
if (shadowingSmartToggleEl)
    shadowingSmartToggleEl.addEventListener('change', (e) => executeIfPremium(() => saveSetting('shadowingSmart', e.target.checked)));
document.querySelectorAll('#shadowing-mode-group .setting-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        executeIfPremium(() => {
            document.querySelectorAll('#shadowing-mode-group .setting-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            saveSetting('shadowingSmart', btn.dataset.value === 'smart');
        });
    });
});
const autoRewindToggleEl = document.getElementById('auto-rewind-toggle');
if (autoRewindToggleEl) {
    autoRewindToggleEl.addEventListener('change', (e) => {
        executeIfPremium(() => {
            saveSetting('autoRewind', e.target.checked);
            const row = document.getElementById('rewind-seconds-row');
            if (row) row.style.display = e.target.checked ? 'block' : 'none';
        });
    });
}
const autoSlowMoToggleEl = document.getElementById('auto-slow-mo-toggle');
if (autoSlowMoToggleEl) {
    autoSlowMoToggleEl.addEventListener('change', (e) => {
        executeIfPremium(() => {
            saveSetting('autoSlowMo', e.target.checked);
            const row = document.getElementById('slow-mo-details-row');
            if (row) row.style.display = e.target.checked ? 'block' : 'none';
        });
    });
}
const ytAllowAsrToggleEl = document.getElementById('yt-allow-asr-toggle');
if (ytAllowAsrToggleEl) {
    ytAllowAsrToggleEl.addEventListener('change', (e) => {
        executeIfPremium(() => {
            saveSetting('allowSmartOnAsr', e.target.checked);
            const warningEl = document.getElementById('yt-allow-asr-warning');
            if (warningEl) warningEl.style.display = e.target.checked ? 'block' : 'none';
        });
    });
}
const gamesSoundToggleEl = document.getElementById('games-sound-toggle');
if (gamesSoundToggleEl)
    gamesSoundToggleEl.addEventListener('change', (e) => saveSetting('gamesSound', e.target.checked));
const deleteConfirmToggleEl = document.getElementById('delete-confirm-toggle');
if (deleteConfirmToggleEl)
    deleteConfirmToggleEl.addEventListener('change', (e) => saveSetting('deleteConfirm', e.target.checked));
['youtube', 'netflix', 'prime'].forEach(plat => {
    const el = document.getElementById(`platform-toggle-${plat}`);
    if (el) {
        el.addEventListener('change', (e) => {
            chrome.storage.sync.get({ settings: {} }, ({ settings }) => {
                if (!settings)
                    settings = {};
                if (!settings.enabledPlatforms)
                    settings.enabledPlatforms = { youtube: true, netflix: true, prime: true };
                settings.enabledPlatforms[plat] = e.target.checked;
                settings.timestamp = Date.now();
                chrome.storage.sync.set({ settings });
            });
        });
    }
});
const primeDomainSelectEl = document.getElementById('prime-domain-select');
if (primeDomainSelectEl)
    primeDomainSelectEl.addEventListener('change', (e) => saveSetting('primeVideoDomain', e.target.value));
document.querySelectorAll('#slow-mo-speed-group .setting-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        executeIfPremium(() => {
            document.querySelectorAll('#slow-mo-speed-group .setting-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            saveSetting('autoSlowMoSpeed', parseFloat(btn.dataset.value));
        });
    });
});
[{ id: 'slow-mo-level-a1', key: 'A1' }, { id: 'slow-mo-level-a2', key: 'A2' }, { id: 'slow-mo-level-b1', key: 'B1' }, { id: 'slow-mo-level-b2', key: 'B2' }, { id: 'slow-mo-level-c1', key: 'C1' }, { id: 'slow-mo-level-c2', key: 'C2' }, { id: 'slow-mo-level-phrasal', key: 'phrasal' }, { id: 'slow-mo-level-other', key: 'other' }, { id: 'slow-mo-level-hard', key: 'hard' }].forEach(item => {
    const el = document.getElementById(item.id);
    if (el)
        el.addEventListener('change', (e) => {
            executeIfPremium(() => {
                chrome.storage.sync.get({ settings: {} }, ({ settings }) => {
                    if (!settings)
                        settings = {};
                    const platform = getActivePlatform();
                    if (!settings[platform])
                        settings[platform] = {};
                    const levels = Object.assign({}, settings[platform].autoSlowMoLevels || settings.autoSlowMoLevels || {});
                    levels[item.key] = e.target.checked;
                    saveSetting('autoSlowMoLevels', levels);
                });
            });
        });
});
const toggleFamilyBtnEl = document.getElementById('toggle-family-btn');
if (toggleFamilyBtnEl) {
    toggleFamilyBtnEl.dataset.familyVisible = 'false';
    toggleFamilyBtnEl.addEventListener('click', () => {
        const next = toggleFamilyBtnEl.dataset.familyVisible !== 'true';
        toggleFamilyBtnEl.dataset.familyVisible = String(next);
        toggleFamilyBtnEl.classList.toggle('active', next);
        toggleFamilyBtnEl.title = next ? getMessage("tooltip_hide_family") : getMessage("tooltip_show_family");
        saveSetting('showWordFamily', next);
        loadArchive();
    });
}
const toggleTagsBtnEl = document.getElementById('toggle-tags-btn');
if (toggleTagsBtnEl) {
    toggleTagsBtnEl.dataset.tagsVisible = 'true';
    toggleTagsBtnEl.addEventListener('click', () => {
        const next = toggleTagsBtnEl.dataset.tagsVisible !== 'true';
        toggleTagsBtnEl.dataset.tagsVisible = String(next);
        toggleTagsBtnEl.classList.toggle('active', next);
        toggleTagsBtnEl.title = next ? getMessage("tooltip_hide_tags") : getMessage("tooltip_show_tags");
        saveSetting('showWordTags', next);
        loadArchive();
    });
}
const toggleExpandAllBtnEl = document.getElementById('toggle-expand-all-btn');
if (toggleExpandAllBtnEl) {
    toggleExpandAllBtnEl.dataset.expanded = 'false';
    toggleExpandAllBtnEl.addEventListener('click', () => {
        const next = toggleExpandAllBtnEl.dataset.expanded !== 'true';
        toggleExpandAllBtnEl.dataset.expanded = String(next);
        toggleExpandAllBtnEl.classList.toggle('active', next);
        toggleExpandAllBtnEl.title = next ? getMessage("tooltip_collapse_all") : getMessage("tooltip_expand_all");
        saveSetting('showWordDetails', next);
        loadArchive();
    });
}
document.querySelectorAll('#rewind-seconds-group .setting-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        executeIfPremium(() => {
            document.querySelectorAll('#rewind-seconds-group .setting-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            saveSetting('rewindSeconds', parseInt(btn.dataset.value));
        });
    });
});
document.querySelectorAll('#panel-font-size-group .setting-btn').forEach(btn => { btn.addEventListener('click', () => { document.querySelectorAll('#panel-font-size-group .setting-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); saveSetting('panelFontSize', btn.dataset.value); applyPanelFontSize(btn.dataset.value); }); });
document.querySelectorAll('.color-dot').forEach(dot => { dot.addEventListener('click', () => { document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active')); dot.classList.add('active'); saveSetting('dualSubtitlesColor', dot.dataset.color); }); });
const targetSelectEl = document.getElementById('target-lang-select');
if (targetSelectEl)
    targetSelectEl.addEventListener('change', (e) => saveSetting('targetLang', e.target.value));
const appLangSelectEl = document.getElementById('app-lang-select');
if (appLangSelectEl) {
    appLangSelectEl.addEventListener('change', (e) => { saveSetting('appLanguage', e.target.value); setTimeout(() => window.location.reload(), 150); });
}
// ── Sıfırlama Butonları ───────────────────────────────────────────────────────
const resetSrsBtn = document.getElementById('reset-srs-btn');
if (resetSrsBtn) {
    resetSrsBtn.addEventListener('click', () => {
        showCustomConfirm("settings_reset_srs_confirm", () => {
            chrome.storage.local.get({ savedWords: [], srsStreakStats: { currentStreak: 0, lastStudyDate: '', bestStreak: 0 } }, ({ savedWords, srsStreakStats }) => {
                let { currentStreak, lastStudyDate, bestStreak } = srsStreakStats;
                const legacyMaxStreak = savedWords.reduce((m, w) => Math.max(m, w.streak ?? 0), 0);
                const updates = {};
                if ((currentStreak === 0 || !currentStreak) && legacyMaxStreak > 0) {
                    srsStreakStats.currentStreak = legacyMaxStreak;
                    srsStreakStats.lastStudyDate = new Date().toDateString();
                    srsStreakStats.bestStreak = Math.max(bestStreak || 0, legacyMaxStreak);
                    updates.srsStreakStats = srsStreakStats;
                }
                updates.savedWords = savedWords.map(w => { const { interval, easeFactor, nextReview, reviewCount, streak, firstReviewDate, againCount, hard, learned, ...rest } = w; return { ...rest, againCount: 0, hard: false }; });
                chrome.storage.local.set(updates, () => { showToast(getMessage("settings_reset_srs_done")); updateReviewBadge(); });
            });
        }, "btn_confirm_reset", "game_btn_cancel");
    });
}
const resetStreakBtn = document.getElementById('reset-streak-btn');
if (resetStreakBtn) {
    resetStreakBtn.addEventListener('click', () => {
        showCustomConfirm("settings_reset_streak_confirm", () => {
            chrome.storage.local.get({ savedWords: [] }, ({ savedWords }) => {
                const cleanedWords = savedWords.map(w => { if (w.streak !== undefined) {
                    const { streak, ...rest } = w;
                    return rest;
                } return w; });
                chrome.storage.local.set({ savedWords: cleanedWords, srsStreakStats: { currentStreak: 0, lastStudyDate: '', bestStreak: 0 } }, () => {
                    showToast(getMessage("settings_reset_streak_done"));
                    const streakEl = document.getElementById('srs-streak-count');
                    if (streakEl)
                        streakEl.textContent = '0';
                    const bestContainer = document.getElementById('srs-best-streak-container');
                    if (bestContainer) {
                        bestContainer.textContent = '';
                        bestContainer.style.display = 'none';
                    }
                });
            });
        }, "btn_confirm_reset", "game_btn_cancel");
    });
}
const resetGamesBtn = document.getElementById('reset-games-btn');
if (resetGamesBtn) {
    resetGamesBtn.addEventListener('click', () => {
        showCustomConfirm("settings_reset_games_confirm", () => {
            chrome.storage.local.set({ gameStats: {}, achievements: {} }, () => {
                showToast(getMessage("settings_reset_games_done"));
                const expDisplay = document.getElementById('user-exp-display');
                if (expDisplay)
                    expDisplay.textContent = '0';
            });
        }, "btn_confirm_reset", "game_btn_cancel");
    });
}
const refreshFamiliesBtn = document.getElementById('refresh-families-btn');
if (refreshFamiliesBtn) {
    refreshFamiliesBtn.addEventListener('click', async () => {
        chrome.storage.local.get({ savedWords: [] }, async ({ savedWords }) => {
            if (savedWords.length === 0) {
                showToast(getMessage("settings_refresh_families_empty"));
                return;
            }
            refreshFamiliesBtn.disabled = true;
            refreshFamiliesBtn.classList.add('spinning');
            let done = 0, updated = 0;
            for (const item of savedWords) {
                await new Promise(resolve => {
                    chrome.runtime.sendMessage({ action: 'get_word_family', word: item.word.toLowerCase() }, (res) => {
                        if (res?.success && Array.isArray(res.family) && res.family.length) {
                            item.wordFamily = res.family;
                            item.timestamp = Date.now();
                            updated++;
                        }
                        resolve();
                    });
                });
                done++;
                await new Promise(r => setTimeout(r, 120));
            }
            chrome.storage.local.set({ savedWords }, () => {
                refreshFamiliesBtn.disabled = false;
                refreshFamiliesBtn.classList.remove('spinning');
                showToast(getMessage("settings_refresh_families_toast").replace("{updated}", updated).replace("{total}", savedWords.length));
                loadArchive();
            });
        });
    });
}
// ── Yedekleme / Geri Yükleme ──────────────────────────────────────────────────
const backupBtn = document.getElementById('backup-btn');
if (backupBtn) {
    backupBtn.addEventListener('click', () => {
        chrome.storage.local.get({ licenseType: 'FREE', isPremium: false, googleSyncEmail: '' }, ({ licenseType, isPremium, googleSyncEmail }) => {
            // Bypass premium checks on native/mobile environment
            const hasPremium = true;
            if (!hasPremium) {
                showPremiumModal(
                    getMessage("premium_modal_title") || "Premium Özellik",
                    "Veri yedekleme özelliğini kullanabilmek için Premium üyeliğe yükseltmeniz gerekmektedir."
                );
                return;
            }
            Promise.all([
                new Promise(r => chrome.storage.local.get({ savedWords: [], deletedWords: [], gameStats: {}, achievements: {}, srsStreakStats: { currentStreak: 0, lastStudyDate: '', bestStreak: 0 }, srsSettings: { newLimit: 10, sessionLimit: 20 } }, r)),
                new Promise(r => chrome.storage.sync.get({ settings: {} }, r))
            ]).then(([localData, syncData]) => {
                const backup = { type: 'primevocab_backup', version: 2, timestamp: Date.now(), savedWords: localData.savedWords, deletedWords: localData.deletedWords || [], settings: syncData.settings, gameStats: localData.gameStats, achievements: localData.achievements, srsStreakStats: localData.srsStreakStats, srsSettings: localData.srsSettings };
                const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob), link = document.createElement('a');
                link.href = url;
                link.download = `primevocab_backup_${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        });
    });
}
const restoreBtn = document.getElementById('restore-btn');
const restoreInput = document.getElementById('restore-input');
if (restoreBtn && restoreInput) {
    restoreBtn.addEventListener('click', () => {
        chrome.storage.local.get({ licenseType: 'FREE', isPremium: false, googleSyncEmail: '' }, ({ licenseType, isPremium, googleSyncEmail }) => {
            // Bypass premium checks on native/mobile environment
            const hasPremium = true;
            if (!hasPremium) {
                showPremiumModal(
                    getMessage("premium_modal_title") || "Premium Özellik",
                    "Yedek geri yükleme özelliğini kullanabilmek için Premium üyeliğe yükseltmeniz gerekmektedir."
                );
                return;
            }
            restoreInput.click();
        });
    });
    restoreInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const backup = JSON.parse(event.target.result);
                if (backup.type !== 'primevocab_backup' || !Array.isArray(backup.savedWords)) {
                    showToast(getMessage("settings_restore_error") || "Hata: Geçersiz yedek dosyası formatı!", 3500);
                    return;
                }
                showCustomConfirm("settings_restore_confirm", () => {
                    const localData = { savedWords: backup.savedWords, deletedWords: backup.deletedWords || [] };
                    if (backup.gameStats)
                        localData.gameStats = backup.gameStats;
                    if (backup.achievements)
                        localData.achievements = backup.achievements;
                    if (backup.srsStreakStats)
                        localData.srsStreakStats = backup.srsStreakStats;
                    if (backup.srsSettings)
                        localData.srsSettings = backup.srsSettings;
                    chrome.storage.local.set(localData, () => {
                        if (backup.settings) {
                            backup.settings.timestamp = Date.now();
                        }
                        chrome.storage.sync.set({ settings: backup.settings || {} }, () => { showToast(getMessage("settings_restore_success") || "Yedek başarıyla geri yüklendi!", 3000); setTimeout(() => window.location.reload(), 1500); });
                    });
                }, "settings_restore_title", "game_btn_cancel");
            }
            catch (err) {
                showToast(getMessage("settings_restore_error") || "Hata: Geçersiz yedek dosyası formatı!", 3500);
            }
        };
        reader.readAsText(file);
        restoreInput.value = '';
    });
}
const ankiExportBtn = document.getElementById('anki-export-btn');
if (ankiExportBtn) {
    ankiExportBtn.addEventListener('click', () => {
        chrome.storage.local.get({ licenseType: 'FREE', isPremium: false, savedWords: [], googleSyncEmail: '' }, ({ licenseType, isPremium, savedWords, googleSyncEmail }) => {
            const hasPremium = !!googleSyncEmail && (isPremium === true || licenseType !== 'FREE');
            if (!hasPremium) {
                showPremiumModal(
                    getMessage("premium_modal_title") || "Premium Özellik",
                    "Anki'ye veri aktarma özelliğini kullanabilmek için Premium üyeliğe yükseltmeniz gerekmektedir."
                );
                return;
            }
            if (!savedWords || savedWords.length === 0) {
                showToast(getMessage("word_list_no_results") || "Eşleşen kelime bulunamadı.");
                return;
            }
            const uniqueWords = [...new Set(savedWords.map(w => w.word.toLowerCase()))];
            chrome.runtime.sendMessage({ action: "batch_lookup_cefr", words: uniqueWords }, (res) => {
                const cefrMap = res?.cefrMap || {};
                let txt = "";
                savedWords.forEach(item => {
                    const word = item.word || "", translation = item.translation || "";
                    let contextHtml = item.context || "";
                    if (contextHtml && word) {
                        contextHtml = contextHtml.replace(new RegExp(`\\b(${word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})\\b`, 'gi'), '<b>$1</b>');
                    }
                    let sourceStr = "";
                    if (item.source) {
                        sourceStr = item.source.showTitle || item.source.title || "";
                        if (item.source.season != null && item.source.episode != null)
                            sourceStr += ` (S${String(item.source.season).padStart(2, '0')}E${String(item.source.episode).padStart(2, '0')})`;
                        else if (item.source.season != null)
                            sourceStr += ` (S${String(item.source.season).padStart(2, '0')})`;
                    }
                    const cefr = cefrMap[word.toLowerCase()] || '';
                    let extraInfo = sourceStr;
                    if (cefr)
                        extraInfo = extraInfo ? `${extraInfo} [${cefr}]` : `[${cefr}]`;
                    const clean = (s) => s.replace(/\r?\n|\r/g, " ").replace(/\t/g, " ");
                    txt += `${clean(word)}\t${clean(translation)}\t${clean(contextHtml)}\t${clean(extraInfo)}\n`;
                });
                const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' });
                const url = URL.createObjectURL(blob), link = document.createElement('a');
                link.href = url;
                link.download = 'primevocab_anki_export.txt';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                showToast(getMessage("anki_export_success") || "Anki dışa aktarma dosyası indirildi!");
            });
        });
    });
}
const closeSidepanelBtn = document.getElementById('close-sidepanel-btn');
if (closeSidepanelBtn)
    closeSidepanelBtn.addEventListener('click', () => window.close());
// ── Ayarlar Alt Sekmeleri ─────────────────────────────────────────────────────
function initSettingsSubtabs() {
    const subtabPlatform = document.getElementById('subtab-platform-settings');
    const subtabGeneral = document.getElementById('subtab-general-settings');
    if (subtabPlatform)
        subtabPlatform.addEventListener('click', () => switchSettingsSubtab('platform'));
    if (subtabGeneral)
        subtabGeneral.addEventListener('click', () => switchSettingsSubtab('general'));
}
function switchSettingsSubtab(tab) {
    const platformBtn = document.getElementById('subtab-platform-settings');
    const generalBtn = document.getElementById('subtab-general-settings');
    const platformContent = document.getElementById('settings-tab-platform');
    const generalContent = document.getElementById('settings-tab-general');
    if (!platformContent || !generalContent)
        return;
    lastSettingsSubtab = tab;
    sessionStorage.setItem('lastSettingsSubtab', tab);
    [platformBtn, generalBtn].forEach(b => b && b.classList.remove('active'));
    [platformContent, generalContent].forEach(c => c && (c.style.display = 'none'));
    if (tab === 'platform') {
        platformBtn && platformBtn.classList.add('active');
        platformContent.style.display = 'block';
    }
    else if (tab === 'general') {
        generalBtn && generalBtn.classList.add('active');
        generalContent.style.display = 'block';
    }
}
// ── Keymapper ─────────────────────────────────────────────────────────────────
var DEFAULT_SHORTCUTS = { navLeft: "Numpad4", navRight: "Numpad6", navUp: "Numpad8", navDown: "Numpad2", navSave: "Numpad5", navCancel: "Numpad0" };
function formatKeyName(code) {
    if (!code)
        return '—';
    return code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Numpad ');
}
function initKeymapper() {
    let recordingEl = null;

    function onKeyDown(e) {
        if (!recordingEl) return;
        e.preventDefault();
        e.stopPropagation();

        const action = recordingEl.dataset.shortcut;
        const code = e.code;

        chrome.storage.local.get({ shortcuts: DEFAULT_SHORTCUTS }, ({ shortcuts }) => {
            const oldKey = shortcuts[action];
            const duplicateAction = Object.keys(shortcuts).find(act => act !== action && shortcuts[act] === code);

            if (duplicateAction) {
                // Swap bindings
                shortcuts[duplicateAction] = oldKey;
            }
            shortcuts[action] = code;

            chrome.storage.local.set({ shortcuts }, () => {
                recordingEl.textContent = formatKeyName(code);
                recordingEl.classList.remove('recording');
                recordingEl = null;
                window.removeEventListener('keydown', onKeyDown, true);
            });
        });
    }

    // Load shortcuts initially
    chrome.storage.local.get({ shortcuts: DEFAULT_SHORTCUTS }, ({ shortcuts }) => {
        Object.entries(shortcuts).forEach(([action, code]) => {
            const kbdEl = document.getElementById(`kbd-nav-${action.replace('nav', '').toLowerCase()}`);
            if (kbdEl)
                kbdEl.textContent = formatKeyName(code);
        });
    });

    // Add click listeners to all customizable key inputs
    document.querySelectorAll('.customizable-kbd').forEach(kbdEl => {
        kbdEl.addEventListener('click', (e) => {
            e.stopPropagation();
            if (recordingEl) {
                recordingEl.classList.remove('recording');
                const prevAction = recordingEl.dataset.shortcut;
                chrome.storage.local.get({ shortcuts: DEFAULT_SHORTCUTS }, ({ shortcuts }) => {
                    recordingEl.textContent = formatKeyName(shortcuts[prevAction]);
                    recordingEl = null;
                });
            }

            recordingEl = kbdEl;
            kbdEl.classList.add('recording');
            kbdEl.textContent = '...';
            window.addEventListener('keydown', onKeyDown, true);
        });
    });
}
// ── Storage Değişiklikleri Dinle ──────────────────────────────────────────────
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes.settings) {
        // Debounce: prevent UI state reversion from stale sync get if change triggered locally
        if (Date.now() - lastLocalWriteTime > 1000) {
            loadSettings();
        }
    }
    if (areaName === 'local' && changes.savedWords) {
        const savedWords = changes.savedWords.newValue || [];
        updateArchiveBadge();
        updateReviewBadge();
        const activeTab = document.querySelector('.tab.active');
        if (activeTab && activeTab.dataset.tab === 'archive')
            loadArchive();
        if (activeTab && activeTab.dataset.tab === 'review') {
            const sessionEl = document.getElementById('srs-session');
            const resultEl = document.getElementById('srs-result');
            const isSessionActive = (sessionEl && sessionEl.style.display !== 'none') || (resultEl && resultEl.style.display !== 'none');
            if (!isSessionActive)
                srsLoadHome();
            const srsWordsOverlay = document.getElementById('srs-words-overlay');
            if (srsWordsOverlay && srsWordsOverlay.style.display !== 'none')
                srsLoadWords();
        }
        document.querySelectorAll('.word-chip').forEach(chip => {
            const cleanWord = chip.textContent.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '');
            const exact = savedWords.some(item => item.word.toLowerCase() === cleanWord);
            if (exact) {
                chip.classList.add('word-saved');
                chip.classList.remove('word-family');
            }
            else {
                chip.classList.remove('word-saved');
                const inFamily = savedWords.some(item => Array.isArray(item.wordFamily) && item.wordFamily.includes(cleanWord));
                if (inFamily)
                    chip.classList.add('word-family');
                else
                    chip.classList.remove('word-family');
            }
        });
    }
    if (areaName === 'local' && changes.shortcuts) {
        const shortcuts = changes.shortcuts.newValue || DEFAULT_SHORTCUTS;
        Object.entries(shortcuts).forEach(([action, code]) => {
            const kbdEl = document.getElementById(`kbd-nav-${action.replace('nav', '').toLowerCase()}`);
            if (kbdEl)
                kbdEl.textContent = formatKeyName(code);
        });
    }
});

// Wire up full data reset button for mobile
const resetDataBtn = document.getElementById('reset-data-btn');
if (resetDataBtn) {
    resetDataBtn.addEventListener('click', () => {
        showCustomConfirm("Tüm kayıtlı kelimelerinizi, ayarlarınızı ve ilerlemenizi tamamen sıfırlamak istediğinize emin misiniz? Bu işlem geri alınamaz!", () => {
            chrome.storage.local.clear(() => {
                showToast("Tüm veriler başarıyla sıfırlandı!");
                setTimeout(() => window.location.reload(), 1000);
            });
        }, "Sıfırla", "Vazgeç");
    });
}


