// ── Google Drive Senkronizasyon Yardımcısı (Google Drive Sync Helper) - Mobile PWA Context ──

const GD_SYNC_FILE_NAME = window.CONFIG.GD_SYNC_FILE_NAME || "primevocab_sync.json";
const SYNC_DEFAULT_SHORTCUTS = { navLeft: "Numpad4", navRight: "Numpad6", navUp: "Numpad8", navDown: "Numpad2", navSave: "Numpad5", navCancel: "Numpad0" };

let oauthTokenClient = null;

// Initialize Google OAuth client using Google Identity Services SDK
function initGoogleAuthClient() {
    if (oauthTokenClient) return;
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
        console.warn("[PV-Sync] Google Identity Services SDK not loaded yet.");
        return;
    }
    
    oauthTokenClient = google.accounts.oauth2.initTokenClient({
        client_id: window.CONFIG.GOOGLE_CLIENT_ID,
        scope: window.CONFIG.GOOGLE_SCOPES,
        callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                const expiresAt = Date.now() + (tokenResponse.expires_in * 1000);
                localStorage.setItem('google_sync_token', tokenResponse.access_token);
                localStorage.setItem('google_sync_token_expires', expiresAt);
                if (window.onOAuthSuccess) {
                    window.onOAuthSuccess(tokenResponse.access_token);
                }
            } else {
                if (window.onOAuthError) {
                    window.onOAuthError(new Error("OAuth token acquisition failed"));
                }
            }
        },
    });
}

/**
 * Google OAuth2 yetki jetonunu alır (Gets OAuth2 token).
 * @param {boolean} interactive Kullanıcı arayüzü gösterilsin mi? (Show UI prompt?)
 * @returns {Promise<string>} Access Token
 */
function getGoogleAuthToken(interactive = false) {
    initGoogleAuthClient();
    
    const cachedToken = localStorage.getItem('google_sync_token');
    const cachedExpires = localStorage.getItem('google_sync_token_expires');
    const isTokenValid = cachedToken && cachedExpires && parseInt(cachedExpires) > Date.now();
    
    if (isTokenValid) {
        return Promise.resolve(cachedToken);
    }
    
    if (!interactive) {
        return Promise.reject(new Error("No valid cached token, interactive login required"));
    }
    
    return new Promise((resolve, reject) => {
        window.onOAuthSuccess = (token) => {
            resolve(token);
        };
        window.onOAuthError = (err) => {
            reject(err);
        };
        if (oauthTokenClient) {
            oauthTokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            reject(new Error("Google Identity Services client is not initialized. Please verify GOOGLE_CLIENT_ID in config.js"));
        }
    });
}

/**
 * Google hesabını bağlar (Hafif OAuth Akışı).
 * @returns {Promise<{email: string, picture: string}>}
 */
async function connectGoogleAccount() {
    const token = await getGoogleAuthToken(true);
    const userInfo = await getGoogleUserInfo(token);

    await new Promise(resolve =>
        chrome.storage.local.set({
            googleSyncEmail:   userInfo.email,
            googleSyncPicture: userInfo.picture || ''
        }, resolve)
    );

    return { email: userInfo.email, picture: userInfo.picture || '' };
}

function clearGoogleAuthToken() {
    const token = localStorage.getItem('google_sync_token');
    localStorage.removeItem('google_sync_token');
    localStorage.removeItem('google_sync_token_expires');
    
    if (token) {
        if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
            try {
                google.accounts.oauth2.revoke(token, () => {
                    console.log("[PV-Sync] OAuth token revoked via GIS.");
                });
            } catch (err) {
                console.warn("[PV-Sync] Error revoking token via GIS client:", err);
            }
        }
        return fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`)
            .then(() => true)
            .catch(() => true);
    }
    return Promise.resolve(false);
}

/**
 * Kullanıcı e-posta bilgisini alır (Fetch user email).
 */
async function getGoogleUserInfo(token) {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch userinfo");
    const data = await res.json();
    return { email: data.email, picture: data.picture || "" };
}

/**
 * Drive appDataFolder içindeki dosyayı bulur (Find file in appDataFolder).
 * @returns {Promise<string|null>} File ID if exists, otherwise null
 */
async function findSyncFile(token) {
    const query = encodeURIComponent(`name = '${GD_SYNC_FILE_NAME}' and 'appDataFolder' in parents and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,name)`;
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to list files");
    const data = await res.json();
    if (data.files && data.files.length > 0) {
        return data.files[0].id;
    }
    return null;
}

/**
 * Dosya içeriğini indirir (Download JSON file contents).
 */
async function downloadSyncFile(token, fileId) {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to download file");
    return await res.json();
}

/**
 * Dosyayı yükler ya da günceller (Upload/Update file in appDataFolder).
 */
async function uploadSyncFile(token, fileId, payload) {
    const metadata = {
        name: GD_SYNC_FILE_NAME,
        parents: fileId ? undefined : ['appDataFolder']
    };

    const boundary = 'primevocab_boundary';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const body = 
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(payload) +
        closeDelimiter;

    const url = fileId
        ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
        : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;

    const method = fileId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
        method: method,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: body
    });

    if (!res.ok) throw new Error("Failed to upload file");
    return await res.json();
}

/**
 * Lokal ve bulut veritabanını birleştirir (Merge local and cloud database).
 */
function mergeSyncData(local, cloud, localSettings = {}) {
    const merged = {
        savedWords: [],
        deletedWords: [],
        gameStats: local.gameStats || {},
        achievements: local.achievements || {},
        srsStreakStats: local.srsStreakStats || { currentStreak: 0, lastStudyDate: '', bestStreak: 0 },
        srsSettings: local.srsSettings || { newLimit: 10, sessionLimit: 20 },
        shortcuts: {},
        onboardingCompleted: false,
        settings: {},
        timestamp: Date.now()
    };

    const localWords = local.savedWords || [];
    const cloudWords = cloud.savedWords || [];
    const localDeleted = local.deletedWords || [];
    const cloudDeleted = cloud.deletedWords || [];

    // 1. Silinen Kelimeleri Birleştir (Merge deletedWords / Tombstones)
    const deletionMap = new Map();
    cloudDeleted.forEach(item => {
        if (item && item.word) {
            deletionMap.set(item.word.toLowerCase().trim(), item.deletedAt || 0);
        }
    });
    localDeleted.forEach(item => {
        if (item && item.word) {
            const key = item.word.toLowerCase().trim();
            const existingTime = deletionMap.get(key) || 0;
            if ((item.deletedAt || 0) > existingTime) {
                deletionMap.set(key, item.deletedAt || 0);
            }
        }
    });
    const mergedDeletedWords = Array.from(deletionMap.entries()).map(([word, deletedAt]) => ({ word, deletedAt }));
    merged.deletedWords = mergedDeletedWords;

    // 2. Kelimeleri Birleştir (Merge savedWords)
    const wordMap = new Map();

    cloudWords.forEach(w => {
        if (w && w.word) {
            const key = w.word.toLowerCase().trim();
            const deletedTime = deletionMap.get(key);
            if (deletedTime !== undefined && (w.timestamp || 0) <= deletedTime) {
                return;
            }
            wordMap.set(key, w);
        }
    });

    localWords.forEach(w => {
        if (!w || !w.word) return;
        const key = w.word.toLowerCase().trim();
        const deletedTime = deletionMap.get(key);
        if (deletedTime !== undefined && (w.timestamp || 0) <= deletedTime) {
            return;
        }
        if (wordMap.has(key)) {
            const existing = wordMap.get(key);
            const localTime = w.timestamp || 0;
            const cloudTime = existing.timestamp || 0;
            if (localTime > cloudTime) {
                wordMap.set(key, w);
            }
        } else {
            wordMap.set(key, w);
        }
    });

    merged.savedWords = Array.from(wordMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // 2. Oyun İstatistiklerini Birleştir (Merge gameStats)
    const cStats = cloud.gameStats || {};
    const lStats = local.gameStats || {};
    const statsKeys = new Set([...Object.keys(lStats), ...Object.keys(cStats)]);
    statsKeys.forEach(k => {
        if (typeof lStats[k] === 'number' && typeof cStats[k] === 'number') {
            if (k === 'totalExp' || k === 'bestScore' || k.includes('highScore')) {
                merged.gameStats[k] = Math.max(lStats[k], cStats[k]);
            } else {
                merged.gameStats[k] = Math.max(lStats[k], cStats[k]);
            }
        } else {
            merged.gameStats[k] = lStats[k] !== undefined ? lStats[k] : cStats[k];
        }
    });

    // 3. Başarımları Birleştir (Merge achievements)
    const cAch = cloud.achievements || {};
    const lAch = local.achievements || {};
    const achKeys = new Set([...Object.keys(lAch), ...Object.keys(cAch)]);
    achKeys.forEach(k => {
        merged.achievements[k] = lAch[k] || cAch[k];
    });

    // 4. Gün Serisini Birleştir (Merge Streaks)
    const cStreak = cloud.srsStreakStats || {};
    const lStreak = local.srsStreakStats || {};

    const todayStr = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    const isLActive = lStreak.lastStudyDate === todayStr || lStreak.lastStudyDate === yesterdayStr;
    const isCActive = cStreak.lastStudyDate === todayStr || cStreak.lastStudyDate === yesterdayStr;

    const activeLStreak = isLActive ? (lStreak.currentStreak || 0) : 0;
    const activeCStreak = isCActive ? (cStreak.currentStreak || 0) : 0;

    let mergedCurrentStreak = 0;
    let mergedLastStudyDate = '';

    if (isLActive && isCActive) {
        const lDate = new Date(lStreak.lastStudyDate);
        const cDate = new Date(cStreak.lastStudyDate);
        if (lDate > cDate) {
            mergedCurrentStreak = activeLStreak;
            mergedLastStudyDate = lStreak.lastStudyDate;
        } else if (cDate > lDate) {
            mergedCurrentStreak = activeCStreak;
            mergedLastStudyDate = cStreak.lastStudyDate;
        } else {
            mergedCurrentStreak = Math.max(activeLStreak, activeCStreak);
            mergedLastStudyDate = lStreak.lastStudyDate;
        }
    } else if (isLActive) {
        mergedCurrentStreak = activeLStreak;
        mergedLastStudyDate = lStreak.lastStudyDate;
    } else if (isCActive) {
        mergedCurrentStreak = activeCStreak;
        mergedLastStudyDate = cStreak.lastStudyDate;
    } else {
        mergedCurrentStreak = 0;
        const lDate = lStreak.lastStudyDate ? new Date(lStreak.lastStudyDate) : new Date(0);
        const cDate = cStreak.lastStudyDate ? new Date(cStreak.lastStudyDate) : new Date(0);
        mergedLastStudyDate = lDate > cDate ? (lStreak.lastStudyDate || '') : (cStreak.lastStudyDate || lStreak.lastStudyDate || '');
    }

    merged.srsStreakStats = {
        currentStreak: mergedCurrentStreak,
        bestStreak: Math.max(lStreak.bestStreak || 0, cStreak.bestStreak || 0),
        lastStudyDate: mergedLastStudyDate
    };

    // 5. SRS Ayarlarını Birleştir (Merge SRS settings)
    const cSrsSet = cloud.srsSettings || {};
    const lSrsSet = local.srsSettings || {};
    const useCloudSrsSettings = !local.lastGoogleSyncTime || !lSrsSet.timestamp || (cSrsSet.timestamp && cSrsSet.timestamp > lSrsSet.timestamp);
    if (useCloudSrsSettings) {
        merged.srsSettings = {
            newLimit: cSrsSet.newLimit !== undefined ? cSrsSet.newLimit : (lSrsSet.newLimit !== undefined ? lSrsSet.newLimit : 10),
            sessionLimit: cSrsSet.sessionLimit !== undefined ? cSrsSet.sessionLimit : (lSrsSet.sessionLimit !== undefined ? lSrsSet.sessionLimit : 20),
            timestamp: cSrsSet.timestamp || lSrsSet.timestamp || Date.now()
        };
    } else {
        merged.srsSettings = {
            newLimit: lSrsSet.newLimit !== undefined ? lSrsSet.newLimit : (cSrsSet.newLimit !== undefined ? cSrsSet.newLimit : 10),
            sessionLimit: lSrsSet.sessionLimit !== undefined ? lSrsSet.sessionLimit : (cSrsSet.sessionLimit !== undefined ? cSrsSet.sessionLimit : 20),
            timestamp: lSrsSet.timestamp || cSrsSet.timestamp || Date.now()
        };
    }

    // 6. Eklenti Ayarlarını Birleştir (Merge extension settings)
    const cSettings = cloud.settings || {};
    const lSettings = localSettings || {};

    const isLocalFresh = !local.lastGoogleSyncTime || !lSettings.timestamp;
    const useCloudSettings = isLocalFresh || (cSettings.timestamp && cSettings.timestamp > lSettings.timestamp);

    if (useCloudSettings) {
        merged.settings = {
            ...lSettings,
            ...cSettings,
            youtube: { ...(lSettings.youtube || {}), ...(cSettings.youtube || {}) },
            prime: { ...(lSettings.prime || {}), ...(cSettings.prime || {}) },
            netflix: { ...(lSettings.netflix || {}), ...(cSettings.netflix || {}) },
            appLanguage: cSettings.appLanguage || lSettings.appLanguage || 'auto',
            gamesSound: cSettings.gamesSound !== undefined ? cSettings.gamesSound : (lSettings.gamesSound !== undefined ? lSettings.gamesSound : true),
            enabledPlatforms: { ...(lSettings.enabledPlatforms || {}), ...(cSettings.enabledPlatforms || {}) },
            timestamp: cSettings.timestamp || lSettings.timestamp || Date.now()
        };
    } else {
        merged.settings = {
            ...cSettings,
            ...lSettings,
            youtube: { ...(cSettings.youtube || {}), ...(lSettings.youtube || {}) },
            prime: { ...(cSettings.prime || {}), ...(lSettings.prime || {}) },
            netflix: { ...(cSettings.netflix || {}), ...(lSettings.netflix || {}) },
            appLanguage: lSettings.appLanguage || cSettings.appLanguage || 'auto',
            gamesSound: lSettings.gamesSound !== undefined ? lSettings.gamesSound : (cSettings.gamesSound !== undefined ? cSettings.gamesSound : true),
            enabledPlatforms: { ...(lSettings.enabledPlatforms || {}), ...(cSettings.enabledPlatforms || {}) },
            timestamp: lSettings.timestamp || cSettings.timestamp || Date.now()
        };
    }

    // 7. Kısayolları ve Onboarding Durumunu Birleştir (Merge Shortcuts and Onboarding Status)
    merged.onboardingCompleted = !!(local.onboardingCompleted || cloud.onboardingCompleted);

    if (useCloudSettings) {
        merged.shortcuts = {
            ...SYNC_DEFAULT_SHORTCUTS,
            ...(local.shortcuts || {}),
            ...(cloud.shortcuts || {})
        };
    } else {
        merged.shortcuts = {
            ...SYNC_DEFAULT_SHORTCUTS,
            ...(cloud.shortcuts || {}),
            ...(local.shortcuts || {})
        };
    }

    return merged;
}

/**
 * Tam Senkronizasyon Akışını Çalıştırır (Runs full synchronization logic).
 * @param {boolean} interactive Yetkilendirme arayüzü gösterilsin mi? (Show Auth UI?)
 * @returns {Promise<object>} Eşitlenmiş veritabanı paketi (Synchronized data package)
 */
async function performGoogleDriveSync(interactive = false) {
    const token = await getGoogleAuthToken(interactive);
    const userInfo = await getGoogleUserInfo(token);
    const email = userInfo.email;
    const picture = userInfo.picture;

    // Check license using local polyfilled message or directly
    const licenseRes = await new Promise(resolve => {
        chrome.runtime.sendMessage({ action: "api_check_license", email: email }, resolve);
    });

    const localLic = await new Promise(resolve => {
        chrome.storage.local.get({ licenseType: 'FREE', isPremium: false }, resolve);
    });

    const isDriveAllowed = localLic.isPremium === true || localLic.licenseType !== 'FREE';
    if (!isDriveAllowed) {
        await new Promise(resolve => {
            chrome.storage.local.set({ googleSyncEmail: email, googleSyncPicture: picture }, resolve);
        });

        // ── Tek Seferlik Geri Yükleme (One-time Restore) ──
        const currentLocal = await new Promise(resolve => {
            chrome.storage.local.get({ savedWords: [], lastGoogleSyncTime: 0 }, resolve);
        });
        const hasLocalWords = currentLocal.savedWords && currentLocal.savedWords.length > 0;
        const hasEverSynced = !!currentLocal.lastGoogleSyncTime;

        if (!hasLocalWords && !hasEverSynced) {
            try {
                const restoreFileId = await findSyncFile(token);
                if (restoreFileId) {
                    const cloudData = await downloadSyncFile(token, restoreFileId);
                    if (cloudData && cloudData.savedWords && cloudData.savedWords.length > 0) {
                        await new Promise(resolve => {
                            chrome.storage.local.set({
                                savedWords:      cloudData.savedWords      || [],
                                deletedWords:    cloudData.deletedWords    || [],
                                gameStats:       cloudData.gameStats       || {},
                                achievements:    cloudData.achievements    || {},
                                srsStreakStats:  cloudData.srsStreakStats  || { currentStreak: 0, lastStudyDate: '', bestStreak: 0 },
                                srsSettings:     cloudData.srsSettings    || { newLimit: 10, sessionLimit: 20 },
                                onboardingCompleted: !!(cloudData.onboardingCompleted),
                            }, resolve);
                        });
                        console.log(`[PV-Sync] One-time restore: ${cloudData.savedWords.length} kelime geri yüklendi.`);
                    }
                }
            } catch (restoreErr) {
                console.warn('[PV-Sync] One-time restore başarısız:', restoreErr);
            }
        }

        throw new Error("PREMIUM_REQUIRED");
    }

    await new Promise(resolve => {
        chrome.storage.local.set({ googleSyncEmail: email, googleSyncPicture: picture }, resolve);
    });

    const localData = await new Promise(resolve => {
        chrome.storage.local.get({
            savedWords: [],
            deletedWords: [],
            gameStats: {},
            achievements: {},
            srsStreakStats: { currentStreak: 0, lastStudyDate: '', bestStreak: 0 },
            srsSettings: { newLimit: 10, sessionLimit: 20 },
            shortcuts: SYNC_DEFAULT_SHORTCUTS,
            onboardingCompleted: false,
            lastGoogleSyncTime: 0
        }, resolve);
    });

    const syncSettingsData = await new Promise(resolve => {
        chrome.storage.sync.get({ settings: {} }, resolve);
    });
    const localSettings = syncSettingsData.settings || {};

    const fileId = await findSyncFile(token);
    let cloudData = { savedWords: [], deletedWords: [], gameStats: {}, achievements: {} };
    if (fileId) {
        try {
            cloudData = await downloadSyncFile(token, fileId);
        } catch (e) {
            console.error("[PV-Sync] Failed to download cloud file, using empty default", e);
        }
    }

    const mergedData = mergeSyncData(localData, cloudData, localSettings);

    await new Promise(resolve => {
        chrome.storage.local.set({
            savedWords: mergedData.savedWords,
            deletedWords: mergedData.deletedWords || [],
            gameStats: mergedData.gameStats,
            achievements: mergedData.achievements,
            srsStreakStats: mergedData.srsStreakStats,
            srsSettings: mergedData.srsSettings,
            shortcuts: mergedData.shortcuts,
            onboardingCompleted: mergedData.onboardingCompleted,
            lastGoogleSyncTime: Date.now(),
            googleSyncEmail: email,
            googleSyncPicture: picture
        }, resolve);
    });

    await new Promise(resolve => {
        chrome.storage.sync.set({ settings: mergedData.settings }, resolve);
    });

    await uploadSyncFile(token, fileId, mergedData);

    return { email, picture, totalWords: mergedData.savedWords.length, settings: mergedData.settings };
}
