// ── PrimeVocab Mobile PWA Main Application Coordinator (app.js) ──
// Global variables are defined in polyfill.js

// Helper: Get localized message
function getMessage(key, substitutions) {
    return chrome.i18n.getMessage(key, substitutions);
}

// ── HTML Localization Utility ──
function localizeHtml() {
    console.log("[PV-core] Localizing HTML elements");
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        const msg = getMessage(key);
        if (msg) {
            // If it contains HTML elements, keep them
            if (el.children.length === 0) {
                el.textContent = msg;
            } else {
                // Keep structural inner elements but localize text content (simple fallback)
                const textNodes = Array.from(el.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
                if (textNodes.length > 0) {
                    textNodes[0].nodeValue = msg;
                }
            }
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        const msg = getMessage(key);
        if (msg) el.placeholder = msg;
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.dataset.i18nTitle;
        const msg = getMessage(key);
        if (msg) el.title = msg;
    });
}

// ── Badge & UI Updaters ──
function updateArchiveBadge() {
    chrome.storage.local.get({ savedWords: [] }, (data) => {
        const badge = document.getElementById('archive-badge');
        if (badge) {
            const count = data.savedWords ? data.savedWords.length : 0;
            badge.textContent = count;
            badge.style.display = count > 0 ? '' : 'none';
        }
    });
}

function updateReviewBadge() {
    chrome.storage.local.get({ savedWords: [], srsSettings: { newLimit: 10, sessionLimit: 20 } }, (data) => {
        const badge = document.getElementById('review-badge');
        if (!badge) return;

        const dueWords = (data.savedWords || []).filter(w => {
            if (w.isLearned) return false;
            if (!w.nextReviewTime) return true; // new card
            return w.nextReviewTime <= Date.now();
        });

        const count = dueWords.length;
        badge.textContent = count;
        badge.style.display = count > 0 ? '' : 'none';
    });
}

// ── Profile Banner UI Updater ──
function updateProfileUI() {
    chrome.storage.local.get({
        googleSyncEmail: "",
        googleSyncPicture: "",
        licenseType: "FREE",
        isPremium: false,
        licenseExpiration: ""
    }, (data) => {
        const isPremium = data.isPremium === true || data.licenseType !== 'FREE';
        const membershipBadge = document.getElementById('profile-membership-badge');
        const loginBtn = document.getElementById('profile-login-btn');
        const syncStatus = document.getElementById('profile-sync-status');
        const syncNowBtn = document.getElementById('profile-sync-now-btn');
        const logoutBtn = document.getElementById('profile-logout-btn');
        const emailEl = document.getElementById('profile-email');
        const usernameEl = document.getElementById('profile-username');
        const avatarContainer = document.getElementById('profile-avatar-container');

        // Settings View specific elements
        const settingsLoginBtn = document.getElementById('settings-login-btn');
        const settingsSyncContainer = document.getElementById('settings-sync-status-container');
        const settingsUserEmail = document.getElementById('settings-user-email');
        const settingsSyncNowBtn = document.getElementById('settings-sync-now-btn');
        const settingsLogoutBtn = document.getElementById('settings-logout-btn');
        const settingsUserAvatar = document.getElementById('settings-user-avatar');

        if (membershipBadge) {
            if (isPremium) {
                let badgeText = 'PREMIUM 👑';
                if (data.licenseType === 'LIFETIME') {
                    badgeText += ' (LIFETIME)';
                } else if (data.licenseExpiration) {
                    const expMs = new Date(data.licenseExpiration).getTime();
                    const todayMs = Date.now();
                    const diffMs = expMs - todayMs;
                    const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                    badgeText += ` (${diffDays} Gün Kaldı)`;
                }
                membershipBadge.textContent = badgeText;
                membershipBadge.style.color = '#fbbf24';
                membershipBadge.style.background = '#0f172a';
                membershipBadge.style.border = '1px solid #fbbf24';
            } else {
                membershipBadge.textContent = 'FREE';
                membershipBadge.style.color = '#818cf8';
                membershipBadge.style.background = '#0f172a';
                membershipBadge.style.border = '1px solid #818cf8';
            }
        }

        if (data.googleSyncEmail) {
            const displayUsername = data.googleSyncEmail.split('@')[0];
            
            // Header profile modal updates
            if (loginBtn) loginBtn.style.display = 'none';
            if (emailEl) emailEl.textContent = data.googleSyncEmail;
            if (usernameEl) usernameEl.textContent = displayUsername;
            if (logoutBtn) logoutBtn.style.display = 'block';
            if (syncStatus) {
                syncStatus.textContent = `Eşitleme Aktif: ${data.googleSyncEmail}`;
            }
            if (syncNowBtn) {
                syncNowBtn.style.display = 'block';
            }

            // Sync user avatar
            if (avatarContainer) {
                if (data.googleSyncPicture) {
                    avatarContainer.innerHTML = `<img src="${data.googleSyncPicture}" style="width:48px; height:48px; border-radius:50%; object-fit:cover;">`;
                } else {
                    avatarContainer.innerHTML = '👤';
                }
            }

            // Settings view updates
            if (settingsLoginBtn) settingsLoginBtn.style.display = 'none';
            if (settingsSyncContainer) settingsSyncContainer.style.display = 'block';
            if (settingsUserEmail) settingsUserEmail.textContent = data.googleSyncEmail;
            if (settingsSyncNowBtn) settingsSyncNowBtn.style.display = 'block';
            if (settingsLogoutBtn) settingsLogoutBtn.style.display = 'block';
            if (settingsUserAvatar) {
                if (data.googleSyncPicture) {
                    settingsUserAvatar.innerHTML = `<img src="${data.googleSyncPicture}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">`;
                } else {
                    settingsUserAvatar.innerHTML = '👤';
                }
            }
        } else {
            // Logged out / local user updates
            if (loginBtn) loginBtn.style.display = 'block';
            if (emailEl) emailEl.textContent = getMessage('profile_local_user') || 'Yerel Kullanıcı';
            if (usernameEl) usernameEl.textContent = getMessage('profile_user_title') || 'Kullanıcı';
            if (syncStatus) syncStatus.textContent = getMessage('profile_sync_status_unlinked') || 'Senkronizasyon Kapalı';
            if (syncNowBtn) syncNowBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (avatarContainer) avatarContainer.innerHTML = '👤';

            // Settings view updates
            if (settingsLoginBtn) settingsLoginBtn.style.display = 'block';
            if (settingsSyncContainer) settingsSyncContainer.style.display = 'none';
        }

        // Update Last Sync Time stamp
        const lastSyncTimeEl = document.getElementById('profile-last-sync-time');
        const settingsLastSyncEl = document.getElementById('settings-sync-status-text');
        
        chrome.storage.local.get({ lastGoogleSyncTime: 0 }, (syncData) => {
            const timeStr = syncData.lastGoogleSyncTime 
                ? new Date(syncData.lastGoogleSyncTime).toLocaleString() 
                : getMessage('profile_last_sync_never') || 'Henüz Yapılmadı';
            
            if (lastSyncTimeEl) lastSyncTimeEl.textContent = timeStr;
            if (settingsLastSyncEl && syncData.lastGoogleSyncTime) {
                settingsLastSyncEl.textContent = `Son eşitleme: ${timeStr}`;
            } else if (settingsLastSyncEl) {
                settingsLastSyncEl.textContent = 'Eşitleme kurulmadı';
            }
        });
    });
}

// ── Tab Switching Logic ──
function switchMainTab(tabName) {
    console.log(`[PV-core] Switching to main tab: ${tabName}`);
    
    // Deactivate all tabs and panels
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));

    // Activate the requested tab
    const tabEl = document.getElementById(`tab-${tabName}`);
    const panelEl = document.getElementById(`panel-${tabName}`);

    if (tabEl) tabEl.classList.add('active');
    if (panelEl) panelEl.classList.add('active');

    sessionStorage.setItem('activeMainTab', tabName);

    // Dynamic loads depending on tab context
    if (tabName === 'archive') {
        if (typeof loadArchive === 'function') {
            loadArchive();
        }
    } else if (tabName === 'review') {
        // Force refresh due badge status and reload srs hub
        updateReviewBadge();
        const activeSubtab = document.querySelector('.review-subtab.active');
        if (activeSubtab) {
            const subtab = activeSubtab.dataset.subtab;
            if (subtab === 'srs' && typeof initSrsHome === 'function') {
                initSrsHome();
            } else if (subtab === 'games' && typeof loadGamesHub === 'function') {
                loadGamesHub();
            } else if (subtab === 'achievements' && typeof initAchievements === 'function') {
                initAchievements();
            }
        }
    } else if (tabName === 'settings') {
        if (typeof loadSettings === 'function') {
            loadSettings();
        }
    }
}

// Bind main tab buttons click events
function initMainTabs() {
    document.querySelectorAll('.tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = btn.dataset.tab;
            if (tabName === 'profile') {
                const profileBtn = document.getElementById('profile-btn');
                if (profileBtn) profileBtn.click();
                return;
            }
            if (tabName) switchMainTab(tabName);
        });
    });
}

// ── Profile overlay events ──
const profileBtn = document.getElementById('profile-btn');
if (profileBtn) {
    profileBtn.addEventListener('click', () => {
        const overlay = document.getElementById('profile-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            chrome.storage.local.get({
                savedWords: [],
                srsStreakStats: { currentStreak: 0, lastStudyDate: '', bestStreak: 0 },
                gameStats: {},
                achievements: {}
            }, (data) => {
                const totalWords = data.savedWords ? data.savedWords.length : 0;
                let streak = data.srsStreakStats ? (data.srsStreakStats.currentStreak || 0) : 0;
                
                // Reset streak if missed days
                if (data.srsStreakStats && data.srsStreakStats.lastStudyDate) {
                    const todayStr = new Date().toDateString();
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toDateString();
                    if (data.srsStreakStats.lastStudyDate !== todayStr && data.srsStreakStats.lastStudyDate !== yesterdayStr) {
                        streak = 0;
                        if (data.srsStreakStats.currentStreak !== 0) {
                            data.srsStreakStats.currentStreak = 0;
                            chrome.storage.local.set({ srsStreakStats: data.srsStreakStats });
                        }
                    }
                }
                const exp = data.gameStats ? (data.gameStats.totalExp || 0) : 0;
                
                const totalWordsEl = document.getElementById('profile-total-words');
                const streakEl = document.getElementById('profile-streak');
                const expEl = document.getElementById('profile-exp');
                
                if (totalWordsEl) totalWordsEl.textContent = totalWords.toLocaleString();
                if (streakEl) streakEl.textContent = `${streak} Gün`;
                if (expEl) expEl.textContent = exp.toLocaleString();

                // XP Level calculations
                const level = Math.floor(exp / 1000) + 1;
                const nextLevelProgress = (exp % 1000) / 10;
                const levelEl = document.getElementById('profile-level');
                const levelBarEl = document.getElementById('profile-level-bar');
                if (levelEl) {
                    levelEl.textContent = `Seviye ${level} (${exp % 1000} / 1000 XP)`;
                }
                if (levelBarEl) levelBarEl.style.width = `${nextLevelProgress}%`;

                // Calculate today activity
                const todayStr = new Date().toDateString();
                const wordsSavedToday = (data.savedWords || []).filter(w => {
                    if (!w || !w.timestamp) return false;
                    return new Date(w.timestamp).toDateString() === todayStr;
                }).length;
                const todayActivityEl = document.getElementById('profile-today-activity');
                if (todayActivityEl) {
                    todayActivityEl.textContent = `${wordsSavedToday} kelime kaydedildi`;
                }

                // Render achievements ratio
                const earnedAchievements = Object.keys(data.achievements || {}).filter(key => data.achievements[key] && data.achievements[key].earned);
                const totalAchievementsCount = (typeof ACHIEVEMENTS !== 'undefined') ? ACHIEVEMENTS.length : 34;
                const achievementsRatioEl = document.getElementById('profile-achievements-ratio');
                if (achievementsRatioEl) {
                    achievementsRatioEl.textContent = `${earnedAchievements.length} / ${totalAchievementsCount}`;
                }
            });
        }
    });
}

// Close profile modal events
const profileCloseBtn = document.getElementById('profile-close');
if (profileCloseBtn) {
    profileCloseBtn.addEventListener('click', () => {
        const overlay = document.getElementById('profile-overlay');
        if (overlay) overlay.style.display = 'none';
    });
}

// Info overlay events
const infoBtn = document.getElementById('info-btn');
if (infoBtn) {
    infoBtn.addEventListener('click', () => {
        const overlay = document.getElementById('info-overlay');
        if (overlay) overlay.style.display = 'flex';
    });
}
const infoCloseBtn = document.getElementById('info-close');
if (infoCloseBtn) {
    infoCloseBtn.addEventListener('click', () => {
        const overlay = document.getElementById('info-overlay');
        if (overlay) overlay.style.display = 'none';
    });
}

// ── Google OAuth Action Binders ──
async function handleSyncNow() {
    try {
        const syncNowBtn = document.getElementById('profile-sync-now-btn');
        const settingsSyncNowBtn = document.getElementById('settings-sync-now-btn');
        if (syncNowBtn) syncNowBtn.disabled = true;
        if (settingsSyncNowBtn) settingsSyncNowBtn.disabled = true;

        console.log("[PV-core] Triggering Google Drive synchronization...");
        const result = await performGoogleDriveSync(true);
        console.log("[PV-core] Synchronization successful!", result);
        
        updateProfileUI();
        alert("Eşitleme tamamlandı!");
    } catch (err) {
        console.error("[PV-core] Sync failed:", err);
        if (err.message === "PREMIUM_REQUIRED") {
            alert("Senkronizasyonu kullanabilmek için Premium lisansına sahip olmalısınız.");
        } else {
            alert("Senkronizasyon başarısız: " + err.message);
        }
    } finally {
        const syncNowBtn = document.getElementById('profile-sync-now-btn');
        const settingsSyncNowBtn = document.getElementById('settings-sync-now-btn');
        if (syncNowBtn) syncNowBtn.disabled = false;
        if (settingsSyncNowBtn) settingsSyncNowBtn.disabled = false;
    }
}

async function handleLogin() {
    try {
        console.log("[PV-core] Prompting Google Login...");
        const userInfo = await connectGoogleAccount();
        console.log("[PV-core] Google user connected:", userInfo);
        
        // Silent license validation immediately
        chrome.runtime.sendMessage({ action: "api_check_license", email: userInfo.email }, () => {
            updateProfileUI();
            handleSyncNow(); // Attempt initial sync
        });
    } catch (err) {
        console.error("[PV-core] Google login failed:", err);
        alert("Giriş yapılamadı: " + err.message);
    }
}

async function handleLogout() {
    if (confirm("Çıkış yapmak istediğinize emin misiniz? Yerel verileriniz korunacaktır.")) {
        await clearGoogleAuthToken();
        await new Promise(resolve => {
            chrome.storage.local.remove([
                'googleSyncEmail', 
                'googleSyncPicture', 
                'googleSyncEnabled', 
                'lastGoogleSyncTime'
            ], resolve);
        });
        updateProfileUI();
        alert("Çıkış yapıldı.");
    }
}

function bindAuthButtons() {
    const loginBtn = document.getElementById('profile-login-btn');
    const settingsLoginBtn = document.getElementById('settings-login-btn');
    const syncNowBtn = document.getElementById('profile-sync-now-btn');
    const settingsSyncNowBtn = document.getElementById('settings-sync-now-btn');
    const logoutBtn = document.getElementById('profile-logout-btn');
    const settingsLogoutBtn = document.getElementById('settings-logout-btn');

    if (loginBtn) loginBtn.addEventListener('click', handleLogin);
    if (settingsLoginBtn) settingsLoginBtn.addEventListener('click', handleLogin);
    if (syncNowBtn) syncNowBtn.addEventListener('click', handleSyncNow);
    if (settingsSyncNowBtn) settingsSyncNowBtn.addEventListener('click', handleSyncNow);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (settingsLogoutBtn) settingsLogoutBtn.addEventListener('click', handleLogout);
}

// ── Reset local data option ──
const resetDataBtn = document.getElementById('reset-data-btn');
if (resetDataBtn) {
    resetDataBtn.addEventListener('click', () => {
        if (confirm("Tüm yerel kelimelerinizi, oyun istatistiklerinizi ve başarımlarınızı sıfırlamak istediğinize emin misiniz? Bu işlem geri alınamaz!")) {
            chrome.storage.local.clear(() => {
                alert("Tüm veriler sıfırlandı!");
                window.location.reload();
            });
        }
    });
}

// ── Service Worker PWA Installation prompt ──
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const banner = document.getElementById('install-banner');
    if (banner) banner.style.display = 'flex';
});

const installActionBtn = document.getElementById('install-action-btn');
if (installActionBtn) {
    installActionBtn.addEventListener('click', () => {
        if (deferredInstallPrompt) {
            deferredInstallPrompt.prompt();
            deferredInstallPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                }
                deferredInstallPrompt = null;
                const banner = document.getElementById('install-banner');
                if (banner) banner.style.display = 'none';
            });
        }
    });
}
const installCloseBtn = document.getElementById('install-close-btn');
if (installCloseBtn) {
    installCloseBtn.addEventListener('click', () => {
        const banner = document.getElementById('install-banner');
        if (banner) banner.style.display = 'none';
    });
}

// ── SRS streak migrations ──
function migrateLegacyStreakIfNeeded() {
    chrome.storage.local.get({
        savedWords: [],
        srsStreakStats: { currentStreak: 0, lastStudyDate: '', bestStreak: 0 }
    }, ({ savedWords, srsStreakStats }) => {
        let { currentStreak, lastStudyDate, bestStreak } = srsStreakStats;
        const legacyMaxStreak = savedWords.reduce((m, w) => Math.max(m, w.streak ?? 0), 0);
        if ((currentStreak === 0 || !currentStreak) && legacyMaxStreak > 0) {
            const today = new Date().toDateString();
            currentStreak = legacyMaxStreak;
            srsStreakStats.currentStreak = legacyMaxStreak;
            srsStreakStats.lastStudyDate = today;
            srsStreakStats.bestStreak = Math.max(bestStreak || 0, legacyMaxStreak);
            chrome.storage.local.set({ srsStreakStats }, () => {
                console.log("[PV-core] Migrated legacy streak to srsStreakStats:", srsStreakStats);
            });
        }
    });
}

// ── Startup & Initialization ──
async function start() {
    console.log("[PV-core] start() PWA initiated");
    migrateLegacyStreakIfNeeded();
    
    await initI18n();
    localizeHtml();
    
    // Initialize UI badges & tabs
    updateArchiveBadge();
    updateReviewBadge();
    
    if (typeof loadSettings === 'function') {
        loadSettings();
    }
    
    if (typeof initReviewSubtabs === 'function') {
        initReviewSubtabs();
    }
    
    initMainTabs();
    bindAuthButtons();
    updateProfileUI();

    // Default load tab states (handles home screen shortcuts using query params)
    const urlParams = new URLSearchParams(window.location.search);
    const urlTab = urlParams.get('tab');
    let initialTab = 'archive';
    
    if (urlTab && ['archive', 'review', 'settings'].includes(urlTab)) {
        initialTab = urlTab;
    } else {
        initialTab = sessionStorage.getItem('activeMainTab') || 'archive';
    }
    switchMainTab(initialTab);
}

document.addEventListener('DOMContentLoaded', () => {
    start();
});

// Reactivity mapping for storage changes in standalone context
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if (changes.licenseType || changes.googleSyncEmail || changes.googleSyncPicture || changes.isPremium) {
            updateProfileUI();
        }

        if (changes.savedWords || changes.isPremium) {
            updateArchiveBadge();
            updateReviewBadge();
            
            const activeTab = document.querySelector('.tab.active');
            if (activeTab && activeTab.dataset.tab === 'archive') {
                if (typeof loadArchive === 'function') {
                    loadArchive();
                }
            } else if (activeTab && activeTab.dataset.tab === 'review') {
                const gamesBtn = document.getElementById('subtab-games');
                if (gamesBtn && gamesBtn.classList.contains('active')) {
                    const gamePlayArea = document.getElementById('game-play-area');
                    const isPlaying = gamePlayArea && gamePlayArea.style.display === 'flex';
                    if (!isPlaying && typeof loadGamesHub === 'function') {
                        loadGamesHub();
                    }
                }
            }
        }
    }
});

// ── Bottom Sheet Drawer Controller ──
function initBottomSheetController() {
    const overlay = document.getElementById('bottom-sheet-overlay');
    const optionsContainer = document.getElementById('bottom-sheet-options');
    const titleEl = document.getElementById('bottom-sheet-title');
    const closeBtn = document.getElementById('bottom-sheet-close');

    if (!overlay || !optionsContainer || !titleEl) return;

    // Open bottom sheet populated by hidden select
    window.openBottomSheet = function(selectId, titleText) {
        const selectEl = document.getElementById(selectId);
        if (!selectEl) return;

        titleEl.textContent = titleText;
        optionsContainer.innerHTML = '';

        // Generate option rows
        Array.from(selectEl.options).forEach(opt => {
            const row = document.createElement('div');
            row.className = 'bottom-sheet-option';
            if (opt.value === selectEl.value) {
                row.classList.add('active');
            }
            row.textContent = opt.textContent || opt.value;
            
            // Set option on click
            row.addEventListener('click', () => {
                selectEl.value = opt.value;
                selectEl.dispatchEvent(new Event('change', { bubbles: true }));
                closeBottomSheet();
            });
            optionsContainer.appendChild(row);
        });

        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Lock scrolling
    };

    function closeBottomSheet() {
        overlay.style.display = 'none';
        document.body.style.overflow = ''; // Unlock scrolling
    }

    // Bind close events
    if (closeBtn) closeBtn.addEventListener('click', closeBottomSheet);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeBottomSheet();
    });

    // Bind triggers to open bottom sheet
    const sortTrigger = document.getElementById('sort-trigger-btn');
    if (sortTrigger) {
        sortTrigger.addEventListener('click', () => {
            openBottomSheet('archive-sort', 'Kelime Sıralaması');
        });
    }

    const sourceTrigger = document.getElementById('source-trigger-btn');
    if (sourceTrigger) {
        sourceTrigger.addEventListener('click', () => {
            openBottomSheet('archive-source-select', 'Kaynağa Göre Filtrele');
        });
    }

    const tagTrigger = document.getElementById('tag-trigger-btn');
    if (tagTrigger) {
        tagTrigger.addEventListener('click', () => {
            openBottomSheet('archive-tag-select', 'Etikete Göre Filtrele');
        });
    }

    // Synchronize legacy selects state with our custom buttons
    function syncSelectsToTriggers() {
        const selects = [
            { id: 'archive-sort', btnId: 'sort-trigger-btn', labelId: 'sort-trigger-label' },
            { id: 'archive-source-select', btnId: 'source-trigger-btn', labelId: 'source-trigger-label' },
            { id: 'archive-tag-select', btnId: 'tag-trigger-btn', labelId: 'tag-trigger-label' }
        ];

        selects.forEach(item => {
            const selectEl = document.getElementById(item.id);
            const btnEl = document.getElementById(item.btnId);
            const labelEl = document.getElementById(item.labelId);

            if (!selectEl || !btnEl || !labelEl) return;

            // Mirror display visibility (since source/tag selects are hidden if empty)
            const style = window.getComputedStyle(selectEl);
            const isSelectVisible = selectEl.style.display !== 'none' && style.display !== 'none';
            btnEl.style.display = isSelectVisible ? 'flex' : 'none';

            // Mirror label text
            if (selectEl.selectedIndex >= 0) {
                const selectedOptText = selectEl.options[selectEl.selectedIndex].textContent;
                labelEl.textContent = selectedOptText;
            }
        });
    }

    // Check periodically for changes (very cheap, maintains 100% reactive parity)
    setInterval(syncSelectsToTriggers, 300);
}

// Initialize bottom sheet controller
initBottomSheetController();

