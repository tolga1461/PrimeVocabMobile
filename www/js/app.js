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

        const loggedOutView = document.getElementById('profile-logged-out-view');
        const loggedInView = document.getElementById('profile-logged-in-view');

        // Settings View specific elements
        const settingsLoginBtn = document.getElementById('settings-login-btn');
        const settingsSyncContainer = document.getElementById('settings-sync-status-container');
        const settingsUserEmail = document.getElementById('settings-user-email');
        const settingsSyncNowBtn = document.getElementById('settings-sync-now-btn');
        const settingsLogoutBtn = document.getElementById('settings-logout-btn');
        const settingsUserAvatar = document.getElementById('settings-user-avatar');

        if (membershipBadge) {
            if (isPremium) {
                let badgeText = getMessage('profile_premium_badge') || 'PREMIUM 👑';
                if (data.licenseType === 'LIFETIME') {
                    badgeText += ' (LIFETIME)';
                } else if (data.licenseExpiration) {
                    const expMs = new Date(data.licenseExpiration).getTime();
                    const todayMs = Date.now();
                    const diffMs = expMs - todayMs;
                    const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                    badgeText += ` (${diffDays} ${getMessage('profile_days_left') || 'Gün Kaldı'})`;
                }
                membershipBadge.textContent = badgeText;
                membershipBadge.style.color = '#fbbf24';
                membershipBadge.style.background = '#0f172a';
                membershipBadge.style.border = '1px solid #fbbf24';
            } else {
                membershipBadge.textContent = getMessage('profile_free_badge') || 'FREE';
                membershipBadge.style.color = '#818cf8';
                membershipBadge.style.background = '#0f172a';
                membershipBadge.style.border = '1px solid #818cf8';
            }
        }

        // Dynamically style the avatar ring for Premium/Free users
        const avatarRing = document.querySelector('.profile-avatar-ring');
        if (avatarRing) {
            if (isPremium) {
                avatarRing.style.background = 'linear-gradient(135deg, #f59e0b, #fbbf24)';
                avatarRing.style.boxShadow = '0 0 20px rgba(251, 191, 36, 0.4)';
            } else {
                avatarRing.style.background = 'linear-gradient(135deg, #6366f1, #a855f7)';
                avatarRing.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.3)';
            }
        }

        // Tab-bar Profile Avatar Updates
        const tabProfileBtn = document.getElementById('tab-profile');
        if (tabProfileBtn) {
            let tabAvatarRing = tabProfileBtn.querySelector('.tab-profile-avatar-ring');
            let tabAvatarInner = tabProfileBtn.querySelector('.tab-profile-avatar-inner');
            
            if (data.googleSyncEmail && data.googleSyncPicture) {
                tabProfileBtn.classList.add('has-avatar');
                if (!tabAvatarRing) {
                    tabAvatarRing = document.createElement('div');
                    tabAvatarRing.className = 'tab-profile-avatar-ring';
                    tabAvatarRing.style.cssText = 'width: 26px; height: 26px; border-radius: 50%; padding: 1.5px; margin-bottom: 2px; display: flex; align-items: center; justify-content: center;';
                    tabAvatarInner = document.createElement('div');
                    tabAvatarInner.className = 'tab-profile-avatar-inner';
                    tabAvatarInner.style.cssText = 'width: 100%; height: 100%; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: var(--bg); font-size: 14px;';
                    tabAvatarRing.appendChild(tabAvatarInner);
                    tabProfileBtn.insertBefore(tabAvatarRing, tabProfileBtn.firstChild);
                }
                tabAvatarRing.style.display = 'flex';
                if (isPremium) {
                    tabAvatarRing.style.background = 'linear-gradient(135deg, #f59e0b, #fbbf24)';
                } else {
                    tabAvatarRing.style.background = 'linear-gradient(135deg, #6366f1, #a855f7)';
                }
                tabAvatarInner.innerHTML = `<img src="${data.googleSyncPicture}" referrerpolicy="no-referrer" onerror="this.onerror=null; this.outerHTML='👤';" style="width:100%; height:100%; object-fit:cover;">`;
            } else {
                tabProfileBtn.classList.remove('has-avatar');
                if (tabAvatarRing) {
                    tabAvatarRing.style.display = 'none';
                }
            }
        }

        if (data.googleSyncEmail) {
            const displayUsername = data.googleSyncEmail.split('@')[0];
            
            if (loggedOutView) loggedOutView.style.display = 'none';
            if (loggedInView) loggedInView.style.display = 'flex';

            // Header profile modal updates
            if (loginBtn) loginBtn.style.display = 'none';
            if (emailEl) emailEl.textContent = data.googleSyncEmail;
            if (usernameEl) usernameEl.textContent = displayUsername;
            if (logoutBtn) logoutBtn.style.display = 'block';
            if (syncStatus) {
                syncStatus.textContent = getMessage('profile_sync_active', data.googleSyncEmail);
            }
            if (syncNowBtn) {
                syncNowBtn.style.display = 'block';
            }

            // Sync user avatar
            if (avatarContainer) {
                if (data.googleSyncPicture) {
                    avatarContainer.innerHTML = `<img src="${data.googleSyncPicture}" referrerpolicy="no-referrer" onerror="this.onerror=null; this.outerHTML='👤';" style="width:100%; height:100%; object-fit:cover;">`;
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
                    settingsUserAvatar.innerHTML = `<img src="${data.googleSyncPicture}" referrerpolicy="no-referrer" onerror="this.onerror=null; this.outerHTML='👤';" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">`;
                } else {
                    settingsUserAvatar.innerHTML = '👤';
                }
            }
        } else {
            // Logged out / local user updates
            if (loggedOutView) loggedOutView.style.display = 'flex';
            if (loggedInView) loggedInView.style.display = 'none';

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
    
    // Auto-hide study list overlay on tab switch since it is fixed at the root level
    const srsWordsOverlay = document.getElementById('srs-words-overlay');
    if (srsWordsOverlay) {
        srsWordsOverlay.style.display = 'none';
        srsWordsOverlay.classList.remove('scrolled');
    }

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
            if (subtab === 'srs' && typeof srsLoadHome === 'function') {
                srsLoadHome();
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
    } else if (tabName === 'profile') {
        loadProfileData();
        updateProfileUI();
    }
}

// Bind main tab buttons click events
function initMainTabs() {
    document.querySelectorAll('.tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = btn.dataset.tab;
            if (tabName) switchMainTab(tabName);
        });
    });
}

// ── Profile data loader ──
function loadProfileData() {
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
        if (streakEl) streakEl.textContent = getMessage('profile_days_count', String(streak));
        if (expEl) expEl.textContent = exp.toLocaleString();

        // XP Level calculations
        const level = Math.floor(exp / 1000) + 1;
        const nextLevelProgress = (exp % 1000) / 10;
        const levelEl = document.getElementById('profile-level');
        const levelBarEl = document.getElementById('profile-level-bar');
        if (levelEl) {
            levelEl.textContent = getMessage('profile_level_display', [String(level), String(exp % 1000)]);
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
            todayActivityEl.textContent = getMessage('profile_words_saved_today', String(wordsSavedToday));
        }

        // Render achievements ratio
        const earnedAchievements = Object.keys(data.achievements || {}).filter(key => data.achievements[key] && data.achievements[key].earned);
        const totalAchievementsCount = (typeof ACHIEVEMENTS !== 'undefined') ? ACHIEVEMENTS.length : 34;
        const achievementsRatioEl = document.getElementById('profile-achievements-ratio');
        if (achievementsRatioEl) {
            achievementsRatioEl.textContent = `${earnedAchievements.length} / ${totalAchievementsCount}`;
        }

        // Render achievement badges
        const badgesContainer = document.getElementById('profile-achievements-badges');
        if (badgesContainer) {
            badgesContainer.innerHTML = '';
            if (earnedAchievements.length === 0) {
                badgesContainer.innerHTML = `<span style="font-size: 13px; color: var(--text-muted);" data-i18n="profile_no_achievements">Henüz başarım kazanılmadı.</span>`;
                localizeHtml(); // Localize fallback text
            } else {
                earnedAchievements.forEach(id => {
                    const ach = (typeof ACHIEVEMENTS !== 'undefined') 
                        ? ACHIEVEMENTS.find(a => a.id === id) 
                        : null;
                    if (ach) {
                        const title = getMessage(ach.titleKey) || ach.id;
                        const desc = getMessage(ach.descKey) || '';
                        const badgeSpan = document.createElement('span');
                        badgeSpan.className = 'profile-achievement-badge';
                        // Clean, modern CSS styling for square emoji achievement badges
                        badgeSpan.style.cssText = 'font-size: 18px; width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; transition: transform 0.2s ease;';
                        
                        // Scale effect on active click
                        badgeSpan.addEventListener('click', () => {
                            if (typeof showToast === 'function') {
                                showToast(`${title}: ${desc}`);
                            } else {
                                alert(`${title}: ${desc}`);
                            }
                        });

                        badgeSpan.textContent = ach.emoji; // Render ONLY the emoji icon
                        badgesContainer.appendChild(badgeSpan);
                    }
                });
            }
        }
    });
}

// Dynamic Info Modal logic
function updateAndShowInfoModal(tabName) {
    const overlay = document.getElementById('info-overlay');
    if (!overlay) return;

    const dynamicView = document.getElementById('info-dynamic-view');
    const aboutView = document.getElementById('info-about-view');
    const titleEl = document.getElementById('info-modal-title');
    const contentEl = document.getElementById('info-dynamic-content');

    // Reset view to dynamic guide first
    if (dynamicView) dynamicView.style.display = 'flex';
    if (aboutView) aboutView.style.display = 'none';

    const activeTab = tabName || sessionStorage.getItem('activeMainTab') || 'archive';
    
    let titleKey = 'info_archive_title';
    let descKey = 'info_archive_desc';

    if (activeTab === 'review') {
        titleKey = 'info_review_title';
        descKey = 'info_review_desc';
    } else if (activeTab === 'settings') {
        titleKey = 'info_settings_title';
        descKey = 'info_settings_desc';
    } else if (activeTab === 'profile') {
        titleKey = 'info_profile_title';
        descKey = 'info_profile_desc';
    }

    if (titleEl) titleEl.textContent = getMessage(titleKey) || "Bilgi";
    
    if (contentEl) {
        // Handle newlines correctly in desc
        const descText = getMessage(descKey) || "";
        contentEl.textContent = descText;
    }

    // Localize buttons in modal
    const aboutBtnText = document.getElementById('info-about-btn-text');
    if (aboutBtnText) aboutBtnText.textContent = getMessage('info_btn_about') || "PrimeVocab Hakkında";
    const backBtnText = document.getElementById('info-back-btn-text');
    if (backBtnText) backBtnText.textContent = getMessage('info_btn_back') || "Geri Dön";

    overlay.style.display = 'flex';
}

function showAboutModal() {
    const overlay = document.getElementById('info-overlay');
    if (!overlay) return;

    const dynamicView = document.getElementById('info-dynamic-view');
    const aboutView = document.getElementById('info-about-view');
    const titleEl = document.getElementById('info-modal-title');

    if (dynamicView) dynamicView.style.display = 'none';
    if (aboutView) aboutView.style.display = 'flex';
    if (titleEl) titleEl.textContent = "ℹ️ " + (getMessage('info_btn_about') || "PrimeVocab Hakkında");

    overlay.style.display = 'flex';
}

// Info overlay events
const infoBtn = document.getElementById('info-btn');
if (infoBtn) {
    infoBtn.addEventListener('click', () => {
        updateAndShowInfoModal();
    });
}
const infoCloseBtn = document.getElementById('info-close');
if (infoCloseBtn) {
    infoCloseBtn.addEventListener('click', () => {
        const overlay = document.getElementById('info-overlay');
        if (overlay) overlay.style.display = 'none';
    });
}
const infoAboutBtn = document.getElementById('info-about-btn');
if (infoAboutBtn) {
    infoAboutBtn.addEventListener('click', () => {
        showAboutModal();
    });
}
const infoBackBtn = document.getElementById('info-back-btn');
if (infoBackBtn) {
    infoBackBtn.addEventListener('click', () => {
        updateAndShowInfoModal();
    });
}

// Settings 'About PrimeVocab' row trigger
const aboutTriggerRow = document.getElementById('about-trigger-row');
if (aboutTriggerRow) {
    aboutTriggerRow.addEventListener('click', () => {
        showAboutModal();
    });
}


// ── Google OAuth Action Binders ──
async function handleSyncNow() {
    try {
        const syncNowBtn = document.getElementById('profile-sync-now-btn');
        const settingsSyncNowBtn = document.getElementById('settings-sync-now-btn');
        if (syncNowBtn) {
            syncNowBtn.disabled = true;
            syncNowBtn.classList.add('spinning');
        }
        if (settingsSyncNowBtn) {
            settingsSyncNowBtn.disabled = true;
            settingsSyncNowBtn.classList.add('spinning');
        }

        console.log("[PV-core] Triggering Google Drive synchronization...");
        const result = await performGoogleDriveSync(true);
        console.log("[PV-core] Synchronization successful!", result);
        
        loadProfileData(); // Reload statistics, word counts, and achievements
        updateProfileUI();
        showToast(getMessage('sync_success') || "Eşitleme tamamlandı!");
    } catch (err) {
        console.error("[PV-core] Sync failed:", err);
        if (err.message === "PREMIUM_REQUIRED") {
            showToast(getMessage('sync_premium_required') || "Senkronizasyonu kullanabilmek için Premium lisansına sahip olmalısınız.");
        } else {
            showToast((getMessage('sync_failed') || "Senkronizasyon başarısız: $1").replace('$1', err.message));
        }
    } finally {
        const syncNowBtn = document.getElementById('profile-sync-now-btn');
        const settingsSyncNowBtn = document.getElementById('settings-sync-now-btn');
        if (syncNowBtn) {
            syncNowBtn.disabled = false;
            syncNowBtn.classList.remove('spinning');
        }
        if (settingsSyncNowBtn) {
            settingsSyncNowBtn.disabled = false;
            settingsSyncNowBtn.classList.remove('spinning');
        }
    }
}

async function handleLogin() {
    try {
        console.log("[PV-core] Prompting Google Login...");
        const userInfo = await connectGoogleAccount();
        console.log("[PV-core] Google user connected:", userInfo);
        
        // Update UI immediately after connecting (don't wait for license check)
        updateProfileUI();
        // Switch to profile tab so user sees their info
        switchMainTab('profile');
        
        // Silent license validation
        chrome.runtime.sendMessage({ action: "api_check_license", email: userInfo.email }, () => {
            updateProfileUI();
            handleSyncNow(); // Attempt initial sync
        });
    } catch (err) {
        console.error("[PV-core] Google login failed:", err);
        showToast("Giriş yapılamadı: " + err.message);
    }
}

async function handleLogout() {
    showCustomConfirm(
        "profile_logout_confirm",
        async () => {
            showToast(getMessage('profile_logging_out') || "Çıkış yapılıyor...");

            // Silent sync before logout to secure local progress in cloud
            try {
                console.log("[PV-core] Performing silent sync before logout...");
                await performGoogleDriveSync(false);
                console.log("[PV-core] Silent sync before logout completed successfully.");
            } catch (syncErr) {
                console.warn("[PV-core] Silent sync before logout failed (offline or not premium), proceeding with logout:", syncErr);
            }

            // Save the current logged-in email to last_logged_sync_email before clearing it
            await new Promise(resolve => {
                chrome.storage.local.get({ googleSyncEmail: "" }, (data) => {
                    if (data.googleSyncEmail) {
                        localStorage.setItem('last_logged_sync_email', data.googleSyncEmail);
                    }
                    resolve();
                });
            });

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
            showToast(getMessage('profile_logged_out_toast') || "Çıkış yapıldı.");
        },
        "profile_logout_btn",
        "game_btn_cancel"
    );
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
    
    // Sync current logged-in email to last_logged_sync_email on startup
    chrome.storage.local.get({ googleSyncEmail: "" }, (data) => {
        if (data.googleSyncEmail) {
            localStorage.setItem('last_logged_sync_email', data.googleSyncEmail);
        }
    });
    
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

    // ── Auto-complete login if OAuth redirect just happened ──
    // oauth_callback.html stores the token then redirects back to index.html.
    // On that reload, googleSyncEmail may not be saved yet. Fix it here.
    const cachedToken = localStorage.getItem('google_sync_token');
    const cachedExpires = localStorage.getItem('google_sync_token_expires');
    const tokenValid = cachedToken && cachedExpires && parseInt(cachedExpires) > Date.now();
    if (tokenValid) {
        const savedEmail = localStorage.getItem('local_googleSyncEmail');
        if (!savedEmail) {
            // Token exists but email not saved → complete the login silently
            console.log("[PV-core] Detected pending OAuth token, completing login...");
            try {
                const userInfo = await getGoogleUserInfo(cachedToken);
                await new Promise(resolve =>
                    chrome.storage.local.set({
                        googleSyncEmail: userInfo.email,
                        googleSyncPicture: userInfo.picture || ''
                    }, resolve)
                );
                console.log("[PV-core] Auto-login complete:", userInfo.email);
                updateProfileUI();
            } catch (e) {
                console.warn("[PV-core] Auto-login failed:", e);
            }
        }
    }

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
    
    // Auto-sync immediately on startup if logged in
    triggerSilentSync(true);
}


document.addEventListener('DOMContentLoaded', () => {
    start();
});

// Reactivity mapping for storage changes in standalone context
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if (changes.licenseType || changes.googleSyncEmail || changes.googleSyncPicture || changes.isPremium) {
            loadProfileData(); // Ensure stats and badges reload
            updateProfileUI();
        }

        // Reload profile data dynamically if achievements/stats change while on profile tab
        if (changes.achievements || changes.gameStats || changes.srsStreakStats || changes.savedWords || changes.deletedWords) {
            const activeTab = document.querySelector('.tab.active');
            if (activeTab && activeTab.dataset.tab === 'profile') {
                loadProfileData();
            }

            // Centralized silent sync trigger on local user modifications (ignoring background sync changes)
            if (!window.isSyncInProgress) {
                console.log("[PV-core] Local database change detected (user action). Scheduling silent sync...");
                triggerSilentSync();
            }
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
            openBottomSheet('archive-sort', getMessage('archive_sort_title') || 'Kelime Sıralaması');
        });
    }

    const sourceTrigger = document.getElementById('source-trigger-btn');
    if (sourceTrigger) {
        sourceTrigger.addEventListener('click', () => {
            openBottomSheet('archive-source-select', getMessage('archive_source_filter_title') || 'Kaynağa Göre Filtrele');
        });
    }

    const tagTrigger = document.getElementById('tag-trigger-btn');
    if (tagTrigger) {
        tagTrigger.addEventListener('click', () => {
            openBottomSheet('archive-tag-select', getMessage('archive_tag_filter_title') || 'Etikete Göre Filtrele');
        });
    }

    const langTrigger = document.getElementById('lang-trigger-row');
    if (langTrigger) {
        langTrigger.addEventListener('click', () => {
            openBottomSheet('app-lang-select', getMessage('settings_app_lang_title') || 'Uygulama Dili');
        });
    }

    const fontsizeTrigger = document.getElementById('fontsize-trigger-row');
    if (fontsizeTrigger) {
        fontsizeTrigger.addEventListener('click', () => {
            openBottomSheet('app-fontsize-select', getMessage('settings_fontsize_title') || 'Yazı Boyutu');
        });
    }

    const srsSortTrigger = document.getElementById('srs-words-sort-trigger');
    if (srsSortTrigger) {
        srsSortTrigger.addEventListener('click', () => {
            openBottomSheet('srs-words-sort', getMessage('srs_words_sort_title') || 'Sıralama Seçenekleri');
        });
    }

    const filterTrigger = document.getElementById('filter-trigger-btn');
    if (filterTrigger) {
        filterTrigger.addEventListener('click', () => {
            openBottomSheet('archive-filter-select', getMessage('archive_level_filter_title') || 'Seviye Seçin');
        });
    }

    // Synchronize legacy selects state with our custom buttons
    function syncSelectsToTriggers() {
        const selects = [
            { id: 'archive-sort', btnId: 'sort-trigger-btn', labelId: 'sort-trigger-label' },
            { id: 'archive-source-select', btnId: 'source-trigger-btn', labelId: 'source-trigger-label' },
            { id: 'archive-tag-select', btnId: 'tag-trigger-btn', labelId: 'tag-trigger-label' },
            { id: 'app-lang-select', btnId: 'lang-trigger-row', labelId: 'app-lang-value' },
            { id: 'app-fontsize-select', btnId: 'fontsize-trigger-row', labelId: 'app-fontsize-value' },
            { id: 'srs-words-sort', btnId: 'srs-words-sort-trigger', labelId: 'srs-words-sort-label' },
            { id: 'archive-filter-select', btnId: 'filter-trigger-btn', labelId: 'filter-trigger-label' }
        ];

        selects.forEach(item => {
            const selectEl = document.getElementById(item.id);
            const btnEl = document.getElementById(item.btnId);
            const labelEl = document.getElementById(item.labelId);

            if (!selectEl || !btnEl || !labelEl) return;

            // Mirror display visibility (only for source & tag filters)
            if (item.id === 'archive-source-select' || item.id === 'archive-tag-select') {
                const hasOptions = selectEl.options.length > 1;
                btnEl.style.display = hasOptions ? 'flex' : 'none';
            }

            // Mirror label text
            if (selectEl.selectedIndex >= 0) {
                let selectedOptText = selectEl.options[selectEl.selectedIndex].textContent;
                if (item.id === 'archive-filter-select') {
                    selectedOptText = `${getMessage('archive_level_prefix') || 'Seviye: '}${selectedOptText}`;
                }
                labelEl.textContent = selectedOptText;
            }
        });
    }

    // Check periodically for changes (very cheap, maintains 100% reactive parity)
    setInterval(syncSelectsToTriggers, 300);
}

// Initialize bottom sheet controller
initBottomSheetController();

// ── Pull-to-Refresh Controller for Dictionary (Archive) ──
function initPullToRefresh() {
    const wordList = document.getElementById('word-list');
    const ptr = document.getElementById('archive-pull-to-refresh');
    const panel = document.getElementById('panel-archive');
    if (!wordList || !ptr) return;

    const spinnerPath = ptr.querySelector('.ptr-spinner-path');
    const circumference = 62.8; // 2 * pi * r (r=10)

    let startY = 0;
    let isPulling = false;
    let lastPullDistance = 0;
    const triggerThreshold = 65; // Pull distance in px to trigger sync
    const maxPullDistance = 95;

    function getGapBaseTop() {
        const headerWrap = document.getElementById('archive-header-wrap');
        if (panel && headerWrap) {
            const panelRect = panel.getBoundingClientRect();
            if (panel.classList.contains('scrolled')) {
                const searchWrap = document.querySelector('.archive-sticky-search-wrap');
                if (searchWrap) {
                    const searchRect = searchWrap.getBoundingClientRect();
                    return Math.round(searchRect.bottom - panelRect.top + 4);
                }
            } else {
                const headerRect = headerWrap.getBoundingClientRect();
                return Math.round(headerRect.bottom - panelRect.top + 4);
            }
        }
        return panel && panel.classList.contains('scrolled') ? 95 : 270; // safe dynamic fallback
    }

    wordList.addEventListener('touchstart', (e) => {
        // Only trigger pull-to-refresh if scrolled to top
        if (wordList.scrollTop <= 0 && !ptr.classList.contains('loading')) {
            startY = e.touches[0].screenY;
            isPulling = false;
            lastPullDistance = 0;

            // Set initial top position
            ptr.style.top = `${getGapBaseTop()}px`;
        }
    }, { passive: true });

    wordList.addEventListener('touchmove', (e) => {
        if (wordList.scrollTop > 0 || ptr.classList.contains('loading')) return;

        // Skip if search or filters are active
        const searchInput = document.getElementById('archive-search');
        if (searchInput && searchInput.value.trim().length > 0) return;

        const currentY = e.touches[0].screenY;
        const deltaY = currentY - startY;

        if (deltaY > 0) {
            const pullDistance = Math.min(deltaY * 0.45, maxPullDistance); // Apply resistance
            if (pullDistance > 6) {
                isPulling = true;
                lastPullDistance = pullDistance;
                
                // Prevent elastic scroll bounce on iOS/Android PWA
                if (e.cancelable) {
                    e.preventDefault();
                }

                if (panel) {
                    panel.classList.add('word-list-pulling');
                    ptr.style.top = `${getGapBaseTop()}px`;
                }
                ptr.classList.remove('loading');
                ptr.classList.add('pulling');
                
                // Translate the spinner slightly slower than the list (parallax reveal)
                const ptrTranslate = pullDistance * 0.35;
                ptr.style.setProperty('--ptr-translate', `${ptrTranslate}px`);
                
                // Shift the word list down (accordion pull effect)
                wordList.style.transform = `translateY(${pullDistance}px)`;

                // Fill the SVG circle dynamically
                if (spinnerPath) {
                    const progress = Math.min(pullDistance / triggerThreshold, 1);
                    const offset = circumference - (circumference * progress * 0.85);
                    spinnerPath.style.strokeDashoffset = offset;
                }

                // Add visual indicator if reached threshold
                if (pullDistance >= triggerThreshold) {
                    ptr.style.transform = `translate(-50%, ${ptrTranslate}px) scale(1.15)`;
                    ptr.style.borderColor = 'var(--accent)';
                } else {
                    ptr.style.transform = `translate(-50%, ${ptrTranslate}px) scale(1)`;
                    ptr.style.borderColor = 'var(--border2)';
                }
            }
        }
    }, { passive: false });

    wordList.addEventListener('touchend', async () => {
        if (!isPulling) return;
        isPulling = false;

        if (panel) panel.classList.remove('word-list-pulling');

        // Reset custom transform properties
        ptr.style.removeProperty('--ptr-translate');
        ptr.style.transform = '';
        ptr.style.borderColor = '';

        // If pulled far enough, trigger loading state
        if (lastPullDistance >= triggerThreshold) {
            ptr.classList.remove('pulling');
            ptr.classList.add('loading');
            
            // Keep word-list shifted down during loading (65px gap)
            wordList.style.transform = 'translateY(65px)';
            
            // Center the loading spinner in the opened gap (14px from top baseTop)
            ptr.style.top = `${getGapBaseTop()}px`;
            ptr.style.transform = 'translate(-50%, 14px) scale(1)';
            
            // Keep the spinner path partially filled during loading rotation
            if (spinnerPath) {
                spinnerPath.style.strokeDashoffset = circumference * 0.3;
            }
            
            try {
                console.log("[PV-core] Pull-to-refresh triggered sync...");
                await performGoogleDriveSync(false);
                console.log("[PV-core] Pull-to-refresh sync completed.");
                showToast(getMessage('sync_success') || "Eşitleme tamamlandı!");
                
                // Reload list
                if (typeof loadArchive === 'function') {
                    loadArchive();
                }
            } catch (err) {
                console.warn("[PV-core] Pull-to-refresh sync failed:", err);
                if (err.message === "PREMIUM_REQUIRED") {
                    showToast(getMessage('sync_premium_required') || "Senkronizasyon için Premium lisansına sahip olmalısınız.");
                } else {
                    showToast((getMessage('sync_failed') || "Eşitleme başarısız: $1").replace('$1', err.message));
                }
            } finally {
                ptr.classList.remove('loading');
                ptr.style.transform = '';
                wordList.style.transform = 'translateY(0)';
                if (spinnerPath) {
                    spinnerPath.style.strokeDashoffset = circumference;
                }
            }
        } else {
            ptr.classList.remove('pulling');
            wordList.style.transform = 'translateY(0)';
            if (spinnerPath) {
                spinnerPath.style.strokeDashoffset = circumference;
            }
        }
    });
}

initPullToRefresh();

// ── Automated Silent Synchronization Scheduler ──
let silentSyncTimeout = null;
function triggerSilentSync(immediate = false) {
    chrome.storage.local.get({ googleSyncEmail: "", googleSyncEnabled: false }, (data) => {
        if (!data.googleSyncEmail) return; // Skip if not logged in

        if (silentSyncTimeout) clearTimeout(silentSyncTimeout);

        const performSync = async () => {
            try {
                console.log("[PV-core] Triggering automated silent sync...");
                await performGoogleDriveSync(false);
                console.log("[PV-core] Automated silent sync completed successfully.");
            } catch (err) {
                console.warn("[PV-core] Automated silent sync failed:", err);
            }
        };

        if (immediate) {
            performSync();
        } else {
            silentSyncTimeout = setTimeout(performSync, 5000); // 5 seconds debounce
        }
    });
}

// Auto-sync when app comes from background to foreground (Mobile app resume)
if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
    window.Capacitor.Plugins.App.addListener('appStateChange', (state) => {
        if (state.isActive) {
            console.log("[PV-core] App state active, triggering sync...");
            triggerSilentSync(true);
        }
    });
}

// Auto-sync when web/PWA window gains focus (Web resume)
window.addEventListener('focus', () => {
    console.log("[PV-core] Window focused, triggering sync...");
    triggerSilentSync(true);
});

// Auto-sync when web/PWA visibility changes to visible
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        console.log("[PV-core] Visibility state visible, triggering sync...");
        triggerSilentSync(true);
    }
});

