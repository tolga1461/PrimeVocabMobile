// ── PrimeVocab Mobile PWA Main Application Coordinator (app.js) ──
// Global variables are defined in polyfill.js

// Helper: Get localized message
function getMessage(key, substitutions) {
    if (!chrome.i18n) return '';
    const msg = chrome.i18n.getMessage(key, substitutions);
    if (msg && msg !== key) return msg;
    return '';
}

// ── HTML Localization Utility ──
function localizeHtml() {
    console.log("[PV-core] Localizing HTML elements");
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        const msg = getMessage(key);
        if (msg && msg !== key) {
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
        const key = el.getAttribute('data-i18n-title') || el.dataset.i18nTitle;
        const msg = getMessage(key);
        if (msg) el.title = msg;
    });

    document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
        const key = el.getAttribute('data-i18n-aria-label') || el.dataset.i18nAriaLabel;
        const msg = getMessage(key);
        if (msg) el.setAttribute('aria-label', msg);
    });
}

// ── Comprehensive App Re-Localization ──
window.applyLanguageEverywhere = function() {
    console.log("[PV-core] Applying language everywhere across all views");
    localizeHtml();
    if (typeof loadSettings === 'function') loadSettings();
    if (typeof updateProfileUI === 'function') updateProfileUI();
    if (typeof loadProfileData === 'function') loadProfileData();
    if (typeof syncSelectsToTriggers === 'function') syncSelectsToTriggers();
    if (typeof loadArchive === 'function') loadArchive();
    if (typeof srsLoadHome === 'function') srsLoadHome();
    if (typeof loadGamesHub === 'function') loadGamesHub();
};

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
    chrome.storage.local.get({ savedWords: [], srsSettings: { newLimit: 10 } }, (data) => {
        const badge = document.getElementById('review-badge');
        if (!badge) return;

        const savedWords = data.savedWords || [];
        const srsSettings = data.srsSettings || { newLimit: 10 };
        const now = Date.now(), today = new Date().toDateString();
        const reviewDue = savedWords.filter(w => !w.learned && (w.reviewCount ?? 0) > 0 && (w.nextReview ?? 0) <= now);
        const newCards = savedWords.filter(w => !w.learned && (w.reviewCount ?? 0) === 0);
        const introducedToday = savedWords.filter(w => !w.learned && (w.reviewCount ?? 0) > 0 && w.firstReviewDate === today).length;
        const newLimit = srsSettings.newLimit ?? 10;
        const newAvailable = newLimit === 0 ? newCards.length : Math.max(0, Math.min(newCards.length, newLimit - introducedToday));
        const total = reviewDue.length + newAvailable;

        badge.textContent = total;
        badge.style.display = total > 0 ? '' : 'none';
    });
}

// ── Profile Banner UI Updater ──
const PV_USER_AVATAR_SVG = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="color: #a5b4fc; padding: 18%;"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

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
            const defaultTabIcon = tabProfileBtn.querySelector('.tab-icon');
            
            if (data.googleSyncEmail && data.googleSyncPicture) {
                tabProfileBtn.classList.add('has-avatar');
                if (defaultTabIcon) defaultTabIcon.style.display = 'none';

                if (!tabAvatarRing) {
                    tabAvatarRing = document.createElement('div');
                    tabAvatarRing.className = 'tab-profile-avatar-ring';
                    tabAvatarRing.style.cssText = 'width: 26px; height: 26px; border-radius: 50%; padding: 1.5px; margin-bottom: 2px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;';
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
                tabAvatarInner.innerHTML = `<img src="${data.googleSyncPicture}" referrerpolicy="no-referrer" onerror="this.onerror=null; this.parentElement.innerHTML=PV_USER_AVATAR_SVG;" style="width:100%; height:100%; object-fit:cover; border-radius:50%; display:block;">`;
            } else {
                tabProfileBtn.classList.remove('has-avatar');
                if (tabAvatarRing) {
                    tabAvatarRing.style.display = 'none';
                }
                if (defaultTabIcon) {
                    defaultTabIcon.style.display = 'block';
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
                    avatarContainer.innerHTML = `<img src="${data.googleSyncPicture}" referrerpolicy="no-referrer" onerror="this.onerror=null; this.parentElement.innerHTML=PV_USER_AVATAR_SVG;" style="width:100%; height:100%; object-fit:cover; border-radius:50%; display:block;">`;
                } else {
                    avatarContainer.innerHTML = PV_USER_AVATAR_SVG;
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
                    settingsUserAvatar.innerHTML = `<img src="${data.googleSyncPicture}" referrerpolicy="no-referrer" onerror="this.onerror=null; this.innerHTML=PV_USER_AVATAR_SVG;" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">`;
                } else {
                    settingsUserAvatar.innerHTML = PV_USER_AVATAR_SVG;
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
            if (avatarContainer) avatarContainer.innerHTML = PV_USER_AVATAR_SVG;

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
                const tpl = getMessage('settings_last_sync_status') || 'Son eşitleme: {time}';
                settingsLastSyncEl.textContent = tpl.replace('{time}', timeStr);
            } else if (settingsLastSyncEl) {
                settingsLastSyncEl.textContent = getMessage('settings_sync_not_setup') || 'Eşitleme kurulmadı';
            }
        });
    });
}

let tabHistory = ['archive'];

function switchMainTab(tabName, isBack = false) {
    console.log(`[PV-core] Switching to main tab: ${tabName}`);
    
    if (!isBack) {
        tabHistory = tabHistory.filter(t => t !== tabName);
        tabHistory.push(tabName);
    }
    
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

    // Restore bars if hidden & reset scroll state
    const appContainer = document.querySelector('.app');
    if (appContainer) appContainer.classList.remove('nav-hidden', 'review-nav-hidden');
    // Reset archive scroll state so header shows correctly on re-entry
    if (typeof resetArchiveScrollState === 'function') resetArchiveScrollState();

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
        const headerStreakEl = document.getElementById('header-streak-count');
        const expEl = document.getElementById('profile-exp');
        
        if (totalWordsEl) totalWordsEl.textContent = totalWords.toLocaleString();
        if (streakEl) streakEl.textContent = getMessage('profile_days_count', String(streak));
        if (headerStreakEl) headerStreakEl.textContent = String(streak);
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

        // Calculate today activity (words studied/reviewed today)
        const todayStr = new Date().toDateString();
        const wordsStudiedToday = (data.savedWords || []).filter(w => {
            if (!w || !w.lastReviewDate) return false;
            return w.lastReviewDate === todayStr;
        }).length;
        const todayActivityEl = document.getElementById('profile-today-activity');
        if (todayActivityEl) {
            todayActivityEl.textContent = getMessage('profile_words_saved_today', String(wordsStudiedToday));
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

    const iconBox = document.getElementById('info-modal-icon-box');
    if (iconBox) {
        iconBox.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`;
    }

    if (titleEl) {
        titleEl.setAttribute('data-i18n', titleKey || 'info_modal_title');
        titleEl.textContent = getMessage(titleKey) || getMessage('info_modal_title') || "Bilgi";
    }
    
    if (contentEl) {
        // Handle newlines correctly in desc
        const descText = getMessage(descKey) || "";
        contentEl.textContent = descText;
    }

    // Localize buttons in modal
    const aboutBtnText = document.getElementById('info-about-btn-text');
    if (aboutBtnText) aboutBtnText.textContent = getMessage('info_btn_about') || "PrimeVocab Hakkında";

    localizeHtml();

    overlay.style.display = 'flex';
}

let aboutOrigin = 'help'; // Tracks if about modal was opened from 'settings' or 'help'

function showAboutModal(fromSettings = false) {
    const overlay = document.getElementById('info-overlay');
    if (!overlay) return;

    aboutOrigin = fromSettings ? 'settings' : 'help';

    const dynamicView = document.getElementById('info-dynamic-view');
    const aboutView = document.getElementById('info-about-view');
    const titleEl = document.getElementById('info-modal-title');
    const iconBox = document.getElementById('info-modal-icon-box');

    if (dynamicView) dynamicView.style.display = 'none';
    if (aboutView) aboutView.style.display = 'flex';
    
    if (titleEl) {
        titleEl.setAttribute('data-i18n', 'info_about_btn');
        titleEl.textContent = getMessage('info_about_btn') || "PrimeVocab Hakkında";
    }
    if (iconBox) {
        iconBox.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`;
    }

    const backBtnText = document.getElementById('info-back-btn-text');
    const backBtnIcon = document.getElementById('info-back-icon');
    if (backBtnText) {
        if (aboutOrigin === 'settings') {
            backBtnText.setAttribute('data-i18n', 'info_close_btn');
            backBtnText.textContent = getMessage('info_close_btn') || "Kapat";
            if (backBtnIcon) {
                backBtnIcon.innerHTML = `<path d="M18 6 6 18"/><path d="m6 6 12 12"/>`;
            }
        } else {
            backBtnText.setAttribute('data-i18n', 'info_back_btn');
            backBtnText.textContent = getMessage('info_btn_back') || getMessage('info_back_btn') || "Geri Dön";
            if (backBtnIcon) {
                backBtnIcon.innerHTML = `<path d="m15 18-6-6 6-6"/>`;
            }
        }
    }

    localizeHtml();

    overlay.style.display = 'flex';
}

// Header streak badge click -> open profile tab
const headerStreakBadge = document.getElementById('header-streak-badge');
if (headerStreakBadge) {
    headerStreakBadge.addEventListener('click', () => {
        const profileTab = document.querySelector('.tab[data-tab="profile"]');
        if (profileTab) profileTab.click();
    });
}

// Profile achievements box click -> open Review -> Achievements subtab
const profileAchBox = document.getElementById('profile-achievements-box');
if (profileAchBox) {
    profileAchBox.addEventListener('click', () => {
        const reviewTab = document.querySelector('.tab[data-tab="review"]');
        if (reviewTab) reviewTab.click();
        setTimeout(() => {
            const achSubtab = document.getElementById('subtab-achievements');
            if (achSubtab) achSubtab.click();
        }, 60);
    });
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
        showAboutModal(false);
    });
}
const infoBackBtn = document.getElementById('info-back-btn');
if (infoBackBtn) {
    infoBackBtn.addEventListener('click', () => {
        if (aboutOrigin === 'settings') {
            const overlay = document.getElementById('info-overlay');
            if (overlay) overlay.style.display = 'none';
        } else {
            updateAndShowInfoModal();
        }
    });
}

// Settings 'About PrimeVocab' row trigger
const aboutTriggerRow = document.getElementById('about-trigger-row');
if (aboutTriggerRow) {
    aboutTriggerRow.addEventListener('click', () => {
        showAboutModal(true);
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
        
        // Silent license validation — 3 durum:
        // Case 1: Kullanıcı tabloda hiç yok (isNewRegistration: true)
        // Case 2: Kullanıcı tabloda var ama lisansı FREE (status: FREE_USER)
        // Case 3: Kullanıcı tabloda var ve lisansı MONTHLY/YEARLY/LIFETIME (isPremium: true)
        chrome.runtime.sendMessage({ action: "api_check_license", email: userInfo.email }, (res) => {
            const apiData = (res && res.success && res.data) ? res.data : null;
            
            // API tamamen başarısız olduysa — ağ hatası gibi durumlar.
            // Bu durumda kullanıcıyı yanlış engellememek için premium olmayan bloğu göster ama case 2 olarak
            if (!apiData) {
                console.warn("[PV-core] License API failed, showing fallback modal. Error:", res && res.message);
                forceLogoutWithoutConfirm().then(() => showPremiumBlockerModal(userInfo.email, 2));
                return;
            }
            
            const licenseType = String(apiData.licenseType || 'FREE').toUpperCase().trim();
            const status = String(apiData.status || 'FREE_USER').toUpperCase().trim();
            const isNewRegistration = apiData.isNewRegistration === true;
            
            // Case 3 (Premium): isPremium true veya ACTIVE + FREE olmayan lisans
            const isPremium = apiData.isPremium === true || ((status === "ACTIVE") && (licenseType !== "FREE"));
            
            if (isPremium) {
                // Case 3: Premium kullanıcı — devam et
                console.log("[PV-core] Premium user verified. LicenseType:", licenseType, "Status:", status);
                updateProfileUI();
                handleSyncNow(); // Attempt initial sync
            } else {
                // Premium değil — case 1 mi case 2 mi belirle
                console.log("[PV-core] Non-premium user login blocked. isNewRegistration:", isNewRegistration, "Status:", status, "Type:", licenseType);
                forceLogoutWithoutConfirm().then(() => {
                    if (isNewRegistration || status === "NOT_FOUND") {
                        // Case 1: Tabloda hiç kayıtlı değil — eklenti kullanmasını öneririz, satın alma butonu YOK
                        showPremiumBlockerModal(userInfo.email, 1);
                    } else {
                        // Case 2: Tabloda kayıtlı ama FREE — satın alma butonu VAR
                        showPremiumBlockerModal(userInfo.email, 2);
                    }
                });
            }
        });
    } catch (err) {
        console.error("[PV-core] Google login failed:", err);
        const tpl = getMessage("login_failed_toast") || "Giriş yapılamadı: {error}";
        showToast(tpl.replace('{error}', err.message));
    }
}

// userCase: 1 = Tabloda hiç kayıtlı değil (eklentiye yönlendir, satın alma YOK)
//           2 = Tabloda kayıtlı ama FREE lisans (satın alma VAR)
function showPremiumBlockerModal(email, userCase) {
    let modal = document.getElementById('premium-blocker-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'premium-blocker-modal';
        modal.style.cssText = "display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.9); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); z-index:99999; justify-content:center; align-items:center; padding:20px; box-sizing:border-box;";
        document.body.appendChild(modal);
    }
    
    if (userCase === 1) {
        // Case 1: E-posta tabloda hiç kayıtlı değil
        // Kullanıcı satın alsa bile mobil app'i hemen kullanamaz çünkü eklentide verisi yok.
        // Bu yüzden satın alma butonu gösterme, eklentiyi kullanmasını öner.
        modal.innerHTML = `
            <div style="background:linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); border:1px solid #818cf8; border-radius:16px; padding:28px 24px; max-width:400px; width:100%; text-align:center; box-shadow:0 10px 25px -5px rgba(0,0,0,0.5), 0 0 20px rgba(129, 140, 248, 0.15); box-sizing:border-box;">
                <div style="font-size:52px; margin-bottom:16px;">🔍</div>
                <h3 style="color:#c7d2fe; font-family:'Outfit', sans-serif; font-size:20px; font-weight:700; margin:0 0 10px 0;">Hesap Bulunamadı</h3>
                <p style="color:#94a3b8; font-family:'Outfit', sans-serif; font-size:13px; line-height:1.7; margin:0 0 8px 0;">
                    <strong style="color:#c7d2fe;">${email}</strong> adresiyle kayıtlı bir PrimeVocab hesabı bulunamadı.
                </p>
                <div style="background:rgba(129,140,248,0.08); border:1px solid rgba(129,140,248,0.2); border-radius:10px; padding:14px; margin:16px 0; text-align:left;">
                    <p style="color:#c7d2fe; font-family:'Outfit', sans-serif; font-size:13px; font-weight:600; margin:0 0 8px 0;">📌 Mobil uygulamayı kullanmak için:</p>
                    <ol style="color:#cbd5e1; font-family:'Outfit', sans-serif; font-size:13px; line-height:1.8; margin:0; padding-left:18px;">
                        <li>Bilgisayarınıza <strong>PrimeVocab Chrome Eklentisi</strong>'ni kurun</li>
                        <li>Eklentide bu e-posta ile giriş yapın</li>
                        <li>Kelimelerinizi kaydedin ve senkronize edin</li>
                        <li>Mobil uygulamaya tekrar giriş yapın</li>
                    </ol>
                </div>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <a href="https://chrome.google.com/webstore" target="_blank" style="background:linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color:#fff; text-decoration:none; padding:12px 24px; border-radius:8px; font-family:'Outfit', sans-serif; font-size:14px; font-weight:700; box-shadow:0 4px 12px rgba(99,102,241,0.3); text-align:center; display:block;">
                        Chrome Eklentisini İndir
                    </a>
                    <button id="premium-blocker-close-btn" style="background:transparent; border:1px solid #334155; color:#64748b; padding:10px 24px; border-radius:8px; font-family:'Outfit', sans-serif; font-size:13px; cursor:pointer; font-weight:500;">
                        Kapat
                    </button>
                </div>
            </div>
        `;
    } else {
        // Case 2: E-posta tabloda kayıtlı ama lisansı FREE
        // Bu kullanıcı satın alırsa Drive'daki verileri yüklenir, uygulama çalışır.
        // App Store / Play Store politikaları gereği direkt satın alma linki göstermiyoruz.
        modal.innerHTML = `
            <div style="background:linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); border:1px solid #eab308; border-radius:16px; padding:28px 24px; max-width:400px; width:100%; text-align:center; box-shadow:0 10px 25px -5px rgba(0,0,0,0.5), 0 0 20px rgba(234, 179, 8, 0.15); box-sizing:border-box;">
                <div style="font-size:52px; margin-bottom:16px;">👑</div>
                <h3 style="color:#fef08a; font-family:'Outfit', sans-serif; font-size:20px; font-weight:700; margin:0 0 10px 0;">Premium Üyelik Gerekli</h3>
                <p style="color:#94a3b8; font-family:'Outfit', sans-serif; font-size:13px; line-height:1.7; margin:0 0 16px 0;">
                    PrimeVocab Mobil, tarayıcı eklentisindeki kelimelerinizi senkronize eden bir <strong style="color:#fef08a;">Premium</strong> özelliktir.<br><br>
                    <strong style="color:#cbd5e1;">${email}</strong> hesabınız şu anda ücretsiz plandadır.
                </p>
                <div style="background:rgba(234,179,8,0.08); border:1px solid rgba(234,179,8,0.2); border-radius:10px; padding:14px; margin:16px 0; text-align:left;">
                    <p style="color:#fef08a; font-family:'Outfit', sans-serif; font-size:13px; font-weight:600; margin:0 0 6px 0;">Nasıl Premium Olabilirim?</p>
                    <p style="color:#cbd5e1; font-family:'Outfit', sans-serif; font-size:12px; line-height:1.6; margin:0;">
                        Bilgisayarınızdaki <strong>Chrome Eklentisi</strong> üzerinden profil sekmesini açarak güvenli bir şekilde Premium'a geçebilirsiniz. Ardından mobil uygulamanız otomatik olarak aktifleşecektir.
                    </p>
                </div>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <button id="premium-blocker-close-btn" style="background:linear-gradient(135deg, #334155 0%, #1e293b 100%); border:1px solid #475569; color:#cbd5e1; padding:12px 24px; border-radius:8px; font-family:'Outfit', sans-serif; font-size:14px; cursor:pointer; font-weight:700; text-align:center; width:100%;">
                        Kapat
                    </button>
                </div>
            </div>
        `;
    }
    
    modal.querySelector('#premium-blocker-close-btn').addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    modal.style.display = 'flex';
}

async function forceLogoutWithoutConfirm() {
    if (silentSyncTimeout) {
        clearTimeout(silentSyncTimeout);
        silentSyncTimeout = null;
    }
    window.isSyncInProgress = false;

    // Immediately clear tokens & revocation in background
    clearGoogleAuthToken().catch(() => {});

    // Clean storage immediately
    await new Promise(resolve => {
        chrome.storage.local.remove([
            'googleSyncEmail', 
            'googleSyncPicture', 
            'googleSyncEnabled', 
            'lastGoogleSyncTime',
            'isPremium',
            'licenseType',
            'licenseStatus',
            'licenseExpiration',
            'licenseSignature'
        ], resolve);
    });

    // Wipe local storage items
    localStorage.removeItem('google_sync_token');
    localStorage.removeItem('google_sync_token_expires');
    localStorage.removeItem('google_sync_refresh_token');
    localStorage.removeItem('local_googleSyncEmail');
    localStorage.removeItem('googleSyncEmail');
    localStorage.removeItem('googleSyncPicture');
    localStorage.removeItem('googleSyncEnabled');
    localStorage.removeItem('last_logged_sync_email');

    // Reset UI synchronously
    resetProfileDOMToLoggedOut();
    updateProfileUI();
}

function resetProfileDOMToLoggedOut() {
    const loggedOutView = document.getElementById('profile-logged-out-view');
    const loggedInView = document.getElementById('profile-logged-in-view');
    const loginBtn = document.getElementById('profile-login-btn');
    const logoutBtn = document.getElementById('profile-logout-btn');
    const emailEl = document.getElementById('profile-email');
    const usernameEl = document.getElementById('profile-username');
    const syncStatus = document.getElementById('profile-sync-status');
    const syncNowBtn = document.getElementById('profile-sync-now-btn');
    const avatarContainer = document.getElementById('profile-avatar-container');
    const membershipBadge = document.getElementById('profile-membership-badge');
    const settingsLoginBtn = document.getElementById('settings-login-btn');
    const settingsSyncContainer = document.getElementById('settings-sync-status-container');
    const settingsLogoutBtn = document.getElementById('settings-logout-btn');

    if (loggedOutView) loggedOutView.style.display = 'flex';
    if (loggedInView) loggedInView.style.display = 'none';
    if (loginBtn) loginBtn.style.display = 'block';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (emailEl) emailEl.textContent = getMessage('profile_local_user') || 'Yerel Kullanıcı';
    if (usernameEl) usernameEl.textContent = getMessage('profile_user_title') || 'Kullanıcı';
    if (syncStatus) syncStatus.textContent = getMessage('profile_sync_status_unlinked') || 'Senkronizasyon Kapalı';
    if (syncNowBtn) syncNowBtn.style.display = 'none';
    if (avatarContainer) avatarContainer.innerHTML = PV_USER_AVATAR_SVG;
    if (membershipBadge) {
        membershipBadge.textContent = getMessage('profile_free_badge') || 'FREE';
        membershipBadge.style.color = '#818cf8';
        membershipBadge.style.background = '#0f172a';
        membershipBadge.style.border = '1px solid #818cf8';
    }
    if (settingsLoginBtn) settingsLoginBtn.style.display = 'block';
    if (settingsSyncContainer) settingsSyncContainer.style.display = 'none';
    if (settingsLogoutBtn) settingsLogoutBtn.style.display = 'none';

    const tabProfileBtn = document.getElementById('tab-profile');
    if (tabProfileBtn) {
        tabProfileBtn.classList.remove('has-avatar');
        const tabAvatarRing = tabProfileBtn.querySelector('.tab-profile-avatar-ring');
        if (tabAvatarRing) tabAvatarRing.style.display = 'none';
        const defaultTabIcon = tabProfileBtn.querySelector('.tab-icon');
        if (defaultTabIcon) defaultTabIcon.style.display = 'block';
    }
}

async function handleLogout() {
    showCustomConfirm(
        "profile_logout_confirm",
        async () => {
            // Cancel any pending debounced sync
            if (silentSyncTimeout) {
                clearTimeout(silentSyncTimeout);
                silentSyncTimeout = null;
            }
            window.isSyncInProgress = false;

            // Immediately wipe all tokens from localStorage so no pending process can reuse them
            localStorage.removeItem('google_sync_token');
            localStorage.removeItem('google_sync_token_expires');
            localStorage.removeItem('google_sync_refresh_token');
            localStorage.removeItem('local_googleSyncEmail');
            localStorage.removeItem('googleSyncEmail');
            localStorage.removeItem('googleSyncPicture');
            localStorage.removeItem('googleSyncEnabled');
            localStorage.removeItem('last_logged_sync_email');

            // Immediately revoke token in background without blocking
            clearGoogleAuthToken().catch(err => console.warn("[PV-core] Error revoking token:", err));

            // Clean storage immediately
            await new Promise(resolve => {
                chrome.storage.local.remove([
                    'googleSyncEmail', 
                    'googleSyncPicture', 
                    'googleSyncEnabled', 
                    'lastGoogleSyncTime',
                    'isPremium',
                    'licenseType',
                    'licenseStatus',
                    'licenseExpiration',
                    'licenseSignature'
                ], resolve);
            });

            // Instant DOM UI reset with zero lag or flicker
            resetProfileDOMToLoggedOut();
            updateProfileUI();
            if (typeof loadProfileData === 'function') loadProfileData();

            // Trigger haptic feedback & confirmation toast
            if (window.HapticsService) window.HapticsService.light();
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


// ── Service Worker PWA Installation prompt (Disabled per user request) ──
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
});

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
    
    // Bütünlük kontrolünü yap (Defensive wrap to prevent blocking on startup errors)
    try {
        if (window.PV_ApiClient && typeof window.PV_ApiClient.enforceLicenseIntegrity === 'function') {
            const isSecure = await window.PV_ApiClient.enforceLicenseIntegrity();
            if (!isSecure) {
                console.warn("[PV-core] Startup license integrity verification failed.");
                return;
            }
        }
    } catch (err) {
        console.error("[PV-core] Startup integrity check failed silently:", err);
    }

    migrateLegacyStreakIfNeeded();
    
    // Purge any legacy developer backdoor account from storage
    await new Promise(resolve => {
        chrome.storage.local.get({ googleSyncEmail: "" }, (data) => {
            if (data.googleSyncEmail === 'developer@primevocab.app') {
                chrome.storage.local.remove([
                    'googleSyncEmail', 
                    'googleSyncPicture', 
                    'googleSyncEnabled', 
                    'lastGoogleSyncTime',
                    'isPremium',
                    'licenseType',
                    'licenseStatus',
                    'licenseExpiration',
                    'licenseSignature'
                ], resolve);
                localStorage.removeItem('local_googleSyncEmail');
                localStorage.removeItem('local_googleSyncName');
                localStorage.removeItem('local_licenseType');
                localStorage.removeItem('local_licenseStatus');
                localStorage.removeItem('local_isPremium');
                if (localStorage.getItem('last_logged_sync_email') === 'developer@primevocab.app') {
                    localStorage.removeItem('last_logged_sync_email');
                }
            } else {
                if (data.googleSyncEmail) {
                    localStorage.setItem('last_logged_sync_email', data.googleSyncEmail);
                }
                resolve();
            }
        });
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
    
    const isNearExpiry = (expiresAt) => {
        if (!expiresAt) return true;
        return Date.now() + 300000 > parseInt(expiresAt);
    };
    
    const tokenValid = cachedToken && cachedExpires && !isNearExpiry(cachedExpires);
    if (tokenValid) {
        const localData = await new Promise(resolve => chrome.storage.local.get({ googleSyncEmail: '' }, resolve));
        if (!localData.googleSyncEmail) {
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
                localStorage.setItem('local_googleSyncEmail', userInfo.email);
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
chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === 'local') {
        try {
            if (changes.licenseType || changes.isPremium) {
                if (window.PV_ApiClient && typeof window.PV_ApiClient.enforceLicenseIntegrity === 'function') {
                    const isValid = await window.PV_ApiClient.enforceLicenseIntegrity();
                    if (!isValid) return; // Bütünlük bozulduysa güncellemeyi iptal et
                }
            }
        } catch (err) {
            console.error("[PV-core] License integrity check in onChanged failed:", err);
        }
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
            const isActive = opt.value === selectEl.value;
            if (isActive) {
                row.classList.add('active');
            }
            const label = document.createElement('span');
            label.textContent = opt.textContent || opt.value;
            row.appendChild(label);
            if (isActive) {
                const check = document.createElement('span');
                check.className = 'bottom-sheet-option-check';
                check.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" width="18" height="18"><path d="M4 12l5 5L20 6"/></svg>';
                row.appendChild(check);
            }

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

    const gamePoolTrigger = document.getElementById('game-pool-trigger');
    if (gamePoolTrigger) {
        gamePoolTrigger.addEventListener('click', () => {
            openBottomSheet('game-pool-select', getMessage('game_pool_title') || 'Çalışma Havuzu');
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
            { id: 'archive-filter-select', btnId: 'filter-trigger-btn', labelId: 'filter-trigger-label' },
            { id: 'game-pool-select', btnId: 'game-pool-trigger', labelId: 'game-pool-label' }
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
    window.syncSelectsToTriggers = syncSelectsToTriggers;
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

    let startX = 0;
    let startY = 0;
    let canPull = false;
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
        // Only trigger pull-to-refresh if:
        // 1. Panel is scrolled to the absolute top (panel.scrollTop <= 1)
        // 2. Not currently loading
        // 3. Search query is empty
        const panelScrollTop = panel ? panel.scrollTop : 0;
        const searchInput = document.getElementById('archive-search');
        const hasSearch = searchInput && searchInput.value.trim().length > 0;

        if (panelScrollTop <= 1 && !ptr.classList.contains('loading') && !hasSearch) {
            canPull = true;
            startX = e.touches[0].screenX;
            startY = e.touches[0].screenY;
            isPulling = false;
            lastPullDistance = 0;

            // Set initial top position
            ptr.style.top = `${getGapBaseTop()}px`;
        } else {
            canPull = false;
        }
    }, { passive: true });

    wordList.addEventListener('touchmove', (e) => {
        if (!canPull || ptr.classList.contains('loading')) return;

        // Double check panel scroll position - if user scrolled down, cancel pulling
        const panelScrollTop = panel ? panel.scrollTop : 0;
        if (panelScrollTop > 1) {
            canPull = false;
            if (isPulling) {
                isPulling = false;
                if (panel) panel.classList.remove('word-list-pulling');
                ptr.classList.remove('pulling');
                wordList.style.transform = 'translateY(0)';
            }
            return;
        }

        const currentX = e.touches[0].screenX;
        const currentY = e.touches[0].screenY;
        const deltaX = Math.abs(currentX - startX);
        const deltaY = currentY - startY;

        // If gesture is horizontal, ignore pull-to-refresh
        if (!isPulling && deltaX > Math.abs(deltaY)) {
            canPull = false;
            return;
        }

        // If user is swiping up (scrolling down the list), cancel pulling
        if (deltaY <= 0) {
            if (isPulling) {
                isPulling = false;
                if (panel) panel.classList.remove('word-list-pulling');
                ptr.classList.remove('pulling');
                wordList.style.transform = 'translateY(0)';
            }
            return;
        }

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
    }, { passive: false });

    const handleTouchEndOrCancel = async () => {
        canPull = false;
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
                const storage = await new Promise(resolve => {
                    chrome.storage.local.get({ googleSyncEmail: "" }, resolve);
                });

                if (storage.googleSyncEmail) {
                    console.log("[PV-core] Pull-to-refresh triggered sync...");
                    try {
                        await performGoogleDriveSync(false);
                    } catch (syncErr) {
                        if (syncErr.message && syncErr.message.includes("interactive login required")) {
                            console.log("[PV-core] Silent sync failed, prompting interactive login...");
                            showToast(getMessage('sync_session_expired_reconnecting') || "Oturum süresi doldu, tekrar bağlanılıyor...");
                            await performGoogleDriveSync(true);
                        } else {
                            throw syncErr;
                        }
                    }
                    showToast(getMessage('sync_success') || "Eşitleme tamamlandı!");
                }

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
    };

    wordList.addEventListener('touchend', handleTouchEndOrCancel);
    wordList.addEventListener('touchcancel', handleTouchEndOrCancel);
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

    window.Capacitor.Plugins.App.addListener('backButton', () => {
        console.log("[PV-core] Hardware backButton pressed");

        // 1. Custom Confirm Overlay
        const confirmOverlay = document.getElementById('custom-confirm-overlay');
        if (confirmOverlay && confirmOverlay.style.display !== 'none' && confirmOverlay.style.display !== '') {
            const cancelBtn = document.getElementById('custom-confirm-cancel');
            if (cancelBtn) cancelBtn.click();
            return;
        }

        // 2. Flashcard Overlay
        const fcOverlay = document.getElementById('fc-overlay');
        if (fcOverlay && fcOverlay.style.display !== 'none' && fcOverlay.style.display !== '') {
            const fcClose = document.getElementById('fc-close');
            if (fcClose) fcClose.click();
            return;
        }

        // 3. Study List Overlay (Çalışma Listesi)
        const srsWordsOverlay = document.getElementById('srs-words-overlay');
        if (srsWordsOverlay && srsWordsOverlay.style.display !== 'none' && srsWordsOverlay.style.display !== '') {
            const srsWordsCloseBtn = document.getElementById('srs-words-close-btn');
            if (srsWordsCloseBtn) srsWordsCloseBtn.click();
            return;
        }

        // 4. Game Active Play Area
        const gamePlayArea = document.getElementById('game-play-area');
        if (gamePlayArea && gamePlayArea.style.display !== 'none' && gamePlayArea.style.display !== '') {
            const gameExitBtn = document.getElementById('game-exit-btn');
            if (gameExitBtn) gameExitBtn.click();
            return;
        }

        // 5. Resume Game Container
        const resumeGameContainer = document.getElementById('resume-game-container');
        if (resumeGameContainer && resumeGameContainer.style.display !== 'none' && resumeGameContainer.style.display !== '') {
            const discardGameBtn = document.getElementById('discard-game-btn');
            if (discardGameBtn) discardGameBtn.click();
            return;
        }

        // 6. Active SRS Session / Result
        const srsSession = document.getElementById('srs-session');
        const srsResult = document.getElementById('srs-result');
        if ((srsSession && srsSession.style.display !== 'none' && srsSession.style.display !== '') ||
            (srsResult && srsResult.style.display !== 'none' && srsResult.style.display !== '')) {
            const quitBtn = document.getElementById('srs-quit-btn') || document.getElementById('srs-back-btn');
            if (quitBtn) {
                quitBtn.click();
            } else if (typeof srsLoadHome === 'function') {
                srsLoadHome();
            }
            return;
        }

        // 7. Tab history navigation (e.g. Settings -> Study -> Dictionary)
        if (tabHistory.length > 1) {
            tabHistory.pop(); // Remove current tab
            const prevTab = tabHistory[tabHistory.length - 1];
            if (typeof switchMainTab === 'function') {
                switchMainTab(prevTab, true);
            }
            return;
        }

        // 8. Otherwise exit app
        window.Capacitor.Plugins.App.exitApp();
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

// Check and maintain daily study reminder schedule on startup
try {
    chrome.storage.sync.get({ settings: {} }, ({ settings }) => {
        if (settings && settings.dailyReminderEnabled && window.NotificationService) {
            window.NotificationService.scheduleDailyReminder(settings.dailyReminderTime || '20:00');
        }
    });
} catch (e) {}

