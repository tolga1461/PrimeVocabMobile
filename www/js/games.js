// ── Review Alt Sekmeleri ──────────────────────────────────────────────────────
let activeConfirmCallback = null;
let activeCancelCallback = null;

/**
 * Sets up auto-hide scroll behavior for a review subtab container.
 * Only .tabs (bottom nav) hides when scrolling down, reappears on scroll up.
 * The .header and .review-subtabs bar are intentionally NOT hidden here (stay fixed
 * for context + easy tab switching) — unlike the archive/srs-overlay panels, which
 * use the separate .nav-hidden class to hide both header and bottom nav together.
 * Each container gets independent scroll state via closure.
 * @param {string} containerId - The element ID of the scrollable content container
 */
function setupReviewScroll(containerId) {
    const container = document.getElementById(containerId);
    const appContainer = document.querySelector('.app');
    if (!container || !appContainer) return;
    if (container._hasTwitterScroll) return;
    container._hasTwitterScroll = true;

    // Per-container scroll state (closure variables)
    let lastScrollTop = 0;
    let accumulatedDelta = 0;
    let lastDirection = null;
    let isNavHidden = false;

    container.addEventListener('scroll', () => {
        const currentScrollTop = container.scrollTop;

        // 1. Twitter behavior: Always show when at the very top (within 15px)
        if (currentScrollTop <= 15) {
            if (isNavHidden || appContainer.classList.contains('review-nav-hidden')) {
                isNavHidden = false;
                appContainer.classList.remove('review-nav-hidden');
            }
            accumulatedDelta = 0;
            lastDirection = null;
            lastScrollTop = currentScrollTop;
            return;
        }

        // 2. Twitter behavior: Ignore rubber-band bounce near bottom
        const isNearBottom = (currentScrollTop + container.clientHeight >= container.scrollHeight - 35);
        if (isNearBottom) {
            lastScrollTop = currentScrollTop;
            return;
        }

        const delta = currentScrollTop - lastScrollTop;
        lastScrollTop = currentScrollTop;

        // Ignore microscopic jitter (< 2px)
        if (Math.abs(delta) < 2) return;

        const currentDirection = delta > 0 ? 'down' : 'up';
        if (currentDirection !== lastDirection) {
            accumulatedDelta = 0;
            lastDirection = currentDirection;
        }

        accumulatedDelta += Math.abs(delta);

        // 3. Twitter (X) Hysteresis thresholds:
        // Down: Requires continuous downward movement of at least 28px AND beyond top margin (40px)
        // Up: Responsive reappearance after at least 8px of continuous upward movement
        if (currentDirection === 'down') {
            if (accumulatedDelta >= 28 && currentScrollTop > 40) {
                if (!isNavHidden) {
                    isNavHidden = true;
                    appContainer.classList.add('review-nav-hidden');
                }
            }
        } else {
            if (accumulatedDelta >= 8) {
                if (isNavHidden) {
                    isNavHidden = false;
                    appContainer.classList.remove('review-nav-hidden');
                }
            }
        }
    }, { passive: true });
}

// Keep backward-compatible alias (called in legacy paths / renderAchievementsTab)
function setupAchievementsScroll() {
    setupReviewScroll('review-achievements-content');
}

function initReviewSubtabs() {
    // Set up Twitter/X auto-hide scroll for all 3 review subtab containers
    setupReviewScroll('review-training-content');
    setupReviewScroll('review-games-content');
    setupReviewScroll('review-achievements-content');

    const subtabSrs = document.getElementById('subtab-srs');
    const subtabGames = document.getElementById('subtab-games');
    const subtabAchievements = document.getElementById('subtab-achievements');
    if (subtabSrs)
        subtabSrs.addEventListener('click', () => switchReviewSubtab('srs'));
    if (subtabGames)
        subtabGames.addEventListener('click', () => switchReviewSubtab('games'));
    if (subtabAchievements)
        subtabAchievements.addEventListener('click', () => switchReviewSubtab('achievements'));
    const confirmOk = document.getElementById('custom-confirm-ok');
    const confirmCancel = document.getElementById('custom-confirm-cancel');
    const confirmOverlay = document.getElementById('custom-confirm-overlay');
    if (confirmOk) {
        confirmOk.addEventListener('click', () => {
            if (confirmOverlay)
                confirmOverlay.style.display = 'none';
            if (activeConfirmCallback) {
                activeConfirmCallback();
                activeConfirmCallback = null;
            }
        });
    }
    if (confirmCancel) {
        confirmCancel.addEventListener('click', () => {
            if (confirmOverlay)
                confirmOverlay.style.display = 'none';
            activeConfirmCallback = null;
            if (typeof activeCancelCallback === 'function') {
                activeCancelCallback();
            }
            activeCancelCallback = null;
        });
    }
    const exitBtn = document.getElementById('game-exit-btn');
    if (exitBtn) {
        exitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Oyun zaten bittiyse (sonuç ekranındaysak) kaybedilecek ilerleme yok, onay sorma
            if (activeGame.finished) {
                document.getElementById('panel-review')?.classList.remove('in-game');
                activeGame.type = null;
                loadGamesHub();
                return;
            }
            showCustomConfirm("game_quit_confirm", () => { activeGame.type = null; loadGamesHub(); }, "game_btn_quit", "game_btn_cancel", "game_quit_title");
        });
    }
    const resumeBtn = document.getElementById('resume-game-btn');
    if (resumeBtn) {
        resumeBtn.addEventListener('click', () => {
            const resumeContainer = document.getElementById('resume-game-container');
            const gamePlayArea = document.getElementById('game-play-area');
            const subtabs = document.getElementById('review-subtabs');
            if (resumeContainer)
                resumeContainer.style.display = 'none';
            if (gamePlayArea)
                gamePlayArea.style.display = 'flex';
            if (subtabs)
                subtabs.style.display = 'none';
            renderGameQuestion();
        });
    }
    const discardBtn = document.getElementById('discard-game-btn');
    if (discardBtn) {
        discardBtn.addEventListener('click', () => {
            showCustomConfirm("game_quit_confirm", () => { activeGame.type = null; loadGamesHub(); }, "game_btn_quit", "game_btn_cancel", "game_quit_title");
        });
    }
}
function switchReviewSubtab(tab) {
    const srsBtn = document.getElementById('subtab-srs');
    const gamesBtn = document.getElementById('subtab-games');
    const achBtn = document.getElementById('subtab-achievements');
    const srsContent = document.getElementById('review-training-content');
    const gamesContent = document.getElementById('review-games-content');
    const achContent = document.getElementById('review-achievements-content');
    if (!srsContent || !gamesContent)
        return;
    const appContainer = document.querySelector('.app');
    if (appContainer) appContainer.classList.remove('nav-hidden', 'review-nav-hidden');
    lastReviewSubtab = tab;
    sessionStorage.setItem('lastReviewSubtab', tab);
    [srsBtn, gamesBtn, achBtn].forEach(b => b && b.classList.remove('active'));
    [srsContent, gamesContent, achContent].forEach(c => c && (c.style.display = 'none'));
    if (tab === 'srs') {
        srsBtn && srsBtn.classList.add('active');
        srsContent.style.display = 'flex';
        srsLoadHome();
    }
    else if (tab === 'games') {
        gamesBtn && gamesBtn.classList.add('active');
        gamesContent.style.display = 'flex';
        loadGamesHub();
    }
    else if (tab === 'achievements') {
        achBtn && achBtn.classList.add('active');
        achContent && (achContent.style.display = 'flex');
        renderAchievementsTab();
    }
}
function showCustomConfirm(messageKey, onConfirm, okTextKey = "game_btn_quit", cancelTextKey = "game_btn_cancel", titleOrCancel = null) {
    const overlay = document.getElementById('custom-confirm-overlay');
    const titleEl = document.getElementById('custom-confirm-title');
    const msgEl = document.getElementById('custom-confirm-message');
    const okBtn = document.getElementById('custom-confirm-ok');
    const cancelBtn = document.getElementById('custom-confirm-cancel');
    
    activeConfirmCallback = onConfirm;
    if (typeof titleOrCancel === 'function') {
        activeCancelCallback = titleOrCancel;
    } else {
        activeCancelCallback = null;
    }

    if (!overlay || !msgEl || !okBtn || !cancelBtn) {
        if (confirm(getMessage(messageKey) || messageKey)) {
            if (onConfirm) onConfirm();
        } else {
            if (activeCancelCallback) activeCancelCallback();
        }
        return;
    }

    let titleKey = (typeof titleOrCancel === 'string') ? titleOrCancel : 'confirm_title';
    let resolvedTitle = getMessage(titleKey);
    if (!resolvedTitle) {
        if (titleKey === "archive_clear_title") resolvedTitle = "Sözlüğü Temizle";
        else if (titleKey === "game_quit_title") resolvedTitle = "Oyundan Çıkılsın mı?";
        else resolvedTitle = "Onay Gerekiyor";
    }
    if (titleEl) {
        titleEl.textContent = resolvedTitle;
    }

    let resolvedMsg = getMessage(messageKey) || messageKey;
    if (messageKey === "archive_clear_confirm" && (!resolvedMsg || resolvedMsg === messageKey)) {
        resolvedMsg = "Tüm kayıtlı kelimeleri silmek istediğinize emin misiniz?";
    }
    msgEl.textContent = resolvedMsg;

    let resolvedOk = getMessage(okTextKey);
    if (!resolvedOk) {
        if (okTextKey === "game_btn_clear") resolvedOk = "Temizle";
        else if (okTextKey === "game_btn_quit") resolvedOk = "Çık";
        else resolvedOk = okTextKey;
    }
    okBtn.textContent = resolvedOk;

    let resolvedCancel = getMessage(cancelTextKey);
    if (!resolvedCancel) {
        resolvedCancel = (cancelTextKey === "game_btn_cancel") ? "Vazgeç" : cancelTextKey;
    }
    cancelBtn.textContent = resolvedCancel;

    overlay.style.display = 'flex';
}
// ── Oyun State & Hub ──────────────────────────────────────────────────────────
let activeGame = {
    type: null, words: [], currentIndex: 0, score: 0,
    selectedTile: null, matchedWords: [], wrongWords: [], scrambleInput: [], skippedWords: [],
    finished: false
};
function loadGamesHub() {
    document.getElementById('panel-review')?.classList.remove('in-game');
    const gamesHub = document.getElementById('games-hub');
    const gamePlayArea = document.getElementById('game-play-area');
    const resumeContainer = document.getElementById('resume-game-container');
    const statsContainer = document.getElementById('games-stats-container');
    if (!gamesHub || !gamePlayArea || !resumeContainer)
        return;
    const subtabs = document.getElementById('review-subtabs');
    if (subtabs)
        subtabs.style.display = 'flex';
    if (activeGame && activeGame.type) {
        gamesHub.style.display = 'none';
        gamePlayArea.style.display = 'none';
        resumeContainer.style.display = 'flex';
        if (statsContainer)
            statsContainer.style.display = 'none';
        const descEl = document.getElementById('resume-game-desc');
        if (descEl) {
            const typeToKey = { multiple_choice: 'game_mc_title', fill_blank: 'game_blank_title', scramble: 'game_scramble_title', match: 'game_match_title', dictation: 'game_dictation_title', context_choice: 'game_context_title' };
            const gameName = getMessage(typeToKey[activeGame.type] || 'game_mc_title') || activeGame.type;
            const descTpl = getMessage('game_resume_desc') || "{game} oyununda kaldığınız bir oturum var. Devam etmek ister misiniz?";
            descEl.textContent = descTpl.replace('{game}', gameName);
        }
        return;
    }
    resumeContainer.style.display = 'none';
    gamesHub.style.display = 'flex';
    gamePlayArea.style.display = 'none';
    chrome.storage.local.get({ savedWords: [], licenseType: 'FREE', googleSyncEmail: '', isPremium: false }, ({ savedWords, licenseType, googleSyncEmail, isPremium: isPremFlag }) => {
        const container = document.getElementById('review-games-content');
        const existingEmpty = container.querySelector('.games-empty-state');
        if (existingEmpty)
            existingEmpty.remove();
        if (statsContainer)
            statsContainer.style.display = 'flex';
        renderStatsTab();

        // Çalışma Havuzu seçimi yükleme ve bağlama (Modern Popover)
        const poolSelectBtn = document.getElementById('poolSelect');
        const poolPopover = document.getElementById('poolPopover');
        const poolSelectDot = document.getElementById('poolSelectDot');
        const poolSelectLabel = document.getElementById('poolSelectLabel');
        const poolColors = {
            all: null,
            words: '#22c55e',
            collocation: '#38bdf8',
            phrasal: '#a855f7',
            idiom: '#fb923c'
        };

        const updatePoolUI = (val) => {
            const color = poolColors[val];
            if (poolSelectDot) {
                if (color) {
                    poolSelectDot.style.background = color;
                    poolSelectDot.style.boxShadow = `0 0 8px ${color}90`;
                } else {
                    poolSelectDot.style.background = '#94a3b8';
                    poolSelectDot.style.boxShadow = 'none';
                }
            }
            if (poolPopover) {
                const targetChip = poolPopover.querySelector(`.pool-chip[data-val="${val}"]`);
                if (targetChip) {
                    poolPopover.querySelectorAll('.pool-chip').forEach(c => c.classList.remove('on'));
                    targetChip.classList.add('on');
                    if (poolSelectLabel) {
                        const chipLabel = targetChip.querySelector('[data-i18n]')?.textContent || targetChip.textContent.trim();
                        const tpl = getMessage('games_pool_label') || 'Havuz: {pool}';
                        poolSelectLabel.textContent = tpl.replace('{pool}', chipLabel);
                    }
                }
            }
        };

        chrome.storage.local.get({ selectedGamePool: 'all' }, ({ selectedGamePool }) => {
            updatePoolUI(selectedGamePool || 'all');
        });

        if (poolSelectBtn && !poolSelectBtn._listenerBound) {
            poolSelectBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (poolPopover) {
                    const isOpen = poolPopover.style.display === 'flex';
                    poolPopover.style.display = isOpen ? 'none' : 'flex';
                }
            });

            if (poolPopover) {
                poolPopover.querySelectorAll('.pool-chip').forEach(chip => {
                    chip.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const val = chip.dataset.val;
                        updatePoolUI(val);
                        poolPopover.style.display = 'none';
                        chrome.storage.local.set({ selectedGamePool: val });
                    });
                });
            }

            document.addEventListener('click', (e) => {
                if (poolPopover && !e.target.closest('#poolSelect') && !e.target.closest('#poolPopover')) {
                    poolPopover.style.display = 'none';
                }
            });

            poolSelectBtn._listenerBound = true;
        }

        if (savedWords.length < 4) {
            gamesHub.style.display = 'none';
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'empty-state games-empty-state';
            emptyDiv.innerHTML = `
        <div class="empty-icon">🎮</div>
        <p style="font-weight:700;font-size:14px;margin-top:10px;">${getMessage("games_empty_title") || "Yetersiz Kelime"}</p>
        <small style="color:var(--text-muted);font-size:12px;max-width:220px;text-align:center;">${(getMessage("games_empty_desc") || "Oyunları oynamak için sözlüğünüzde en az {count} kelime olmalıdır.").replace('{count}', '4')}</small>
      `;
            container.insertBefore(emptyDiv, statsContainer);
            return;
        }
        document.querySelectorAll('.game-tile, .game-card').forEach(card => {
            const gameType = card.dataset.game;
            const newCard = card.cloneNode(true);
            newCard.classList.remove('locked');

            card.parentNode.replaceChild(newCard, card);
            newCard.addEventListener('click', () => {
                chrome.storage.sync.get({ settings: {} }, ({ settings }) => {
                    chrome.storage.local.get({ selectedGamePool: 'all' }, ({ selectedGamePool }) => {
                        const showLearned = !settings || settings.showLearnedInGames !== false;
                        const activeChip = document.querySelector('#poolPopover .pool-chip.on');
                        const poolFilter = selectedGamePool || (activeChip ? activeChip.dataset.val : 'all') || 'all';
                        startMiniGame(gameType, savedWords, showLearned, poolFilter);
                    });
                });
            });
        });
    });
}
function startMiniGame(gameType, savedWords, showLearned = true, poolFilter = null) {
    if (!poolFilter) {
        const activeChip = document.querySelector('#poolPopover .pool-chip.on');
        poolFilter = (activeChip && activeChip.dataset.val) || 'all';
    }

    let eligibleWords = showLearned ? savedWords : savedWords.filter(w => !w.learned);
    
    // Çalışma Havuzu Filtresi Uygulama
    if (poolFilter === 'phrasal') {
        eligibleWords = eligibleWords.filter(w => {
            const wl = (w.word || '').toLowerCase().trim();
            return (typeof PHRASAL_VERBS_DB !== 'undefined' && !!PHRASAL_VERBS_DB[wl]) || w.cefrLevel === 'Phrasal';
        });
    } else if (poolFilter === 'idiom') {
        eligibleWords = eligibleWords.filter(w => {
            const wl = (w.word || '').toLowerCase().trim();
            return (typeof IDIOMS_DB !== 'undefined' && !!IDIOMS_DB[wl]) || w.cefrLevel === 'Idiom';
        });
    } else if (poolFilter === 'collocation') {
        eligibleWords = eligibleWords.filter(w => {
            const wl = (w.word || '').toLowerCase().trim();
            const isPhrasal = (typeof PHRASAL_VERBS_DB !== 'undefined' && !!PHRASAL_VERBS_DB[wl]) || w.cefrLevel === 'Phrasal';
            const isIdiom = (typeof IDIOMS_DB !== 'undefined' && !!IDIOMS_DB[wl]) || w.cefrLevel === 'Idiom';
            return (w.cefrLevel === 'COL' || wl.includes(' ')) && !isPhrasal && !isIdiom;
        });
    } else if (poolFilter === 'words') {
        eligibleWords = eligibleWords.filter(w => {
            const wl = (w.word || '').toLowerCase().trim();
            const isPhrasal = (typeof PHRASAL_VERBS_DB !== 'undefined' && !!PHRASAL_VERBS_DB[wl]) || w.cefrLevel === 'Phrasal';
            const isIdiom = (typeof IDIOMS_DB !== 'undefined' && !!IDIOMS_DB[wl]) || w.cefrLevel === 'Idiom';
            return !wl.includes(' ') && !isPhrasal && !isIdiom && w.cefrLevel !== 'COL';
        });
    }

    if (gameType === 'context_choice') {
        eligibleWords = eligibleWords.filter(w => w.context && w.context.trim() && w.context.toLowerCase().includes(w.word.toLowerCase()));
    }

    if (eligibleWords.length < 4) {
        let msg = (getMessage('game_insufficient_unlearned_words') || 'Bu oyunu oynamak için öğrenilmemiş en az 4 kelime gerekli.');
        if (poolFilter !== 'all') {
            msg = getMessage('game_insufficient_filtered_words') || 'Bu oyunu oynamak için bu havuzda en az 4 kayıtlı kelimeniz olmalıdır.';
        } else if (gameType === 'context_choice') {
            msg = getMessage('game_context_no_words') || 'Bu oyun için cümlesi olan en az 4 kelime gerekli.';
        }

        const existing = document.querySelector('.context-no-words-msg');
        if (existing)
            existing.remove();
        const msgEl = document.createElement('div');
        msgEl.className = 'context-no-words-msg';
        msgEl.style.cssText = 'padding:12px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:10px;color:#ef4444;font-size:13px;font-weight:600;text-align:center;margin-top:8px;';
        msgEl.textContent = msg;
        const hub = document.getElementById('games-hub');
        if (hub)
            hub.appendChild(msgEl);
        setTimeout(() => msgEl.remove(), 3000);
        return;
    }
    activeGame.type = gameType;
    activeGame.finished = false;
    activeGame.showLearned = showLearned;
    activeGame.poolFilter = poolFilter;
    activeGame.eligiblePool = eligibleWords;
    activeGame.currentIndex = 0;
    activeGame.score = 0;
    activeGame.selectedTile = null;
    activeGame.matchedWords = [];
    activeGame.wrongWords = [];
    activeGame.scrambleInput = [];
    activeGame.skippedWords = [];
    activeGame.mismatchMap = {};
    activeGame.errors = 0;
    activeGame.completedCount = 0;
    activeGame.cardDeck = null;
    activeGame.matchedWordIds = [];
    let deck = [...eligibleWords];
    if (gameType === 'fill_blank') {
        const withCtx = deck.filter(w => w.context && w.context.trim() && w.context.toLowerCase().includes(w.word.toLowerCase()));
        const withoutCtx = deck.filter(w => !(w.context && w.context.trim() && w.context.toLowerCase().includes(w.word.toLowerCase())));
        deck = [...withCtx, ...withoutCtx];
    }
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    activeGame.words = deck.slice(0, Math.min(gameType === 'context_choice' ? 6 : 10, deck.length));
    document.getElementById('games-hub').style.display = 'none';
    document.getElementById('game-play-area').style.display = 'flex';
    document.getElementById('panel-review')?.classList.add('in-game');
    const statsContainer = document.getElementById('games-stats-container');
    if (statsContainer)
        statsContainer.style.display = 'none';
    const subtabs = document.getElementById('review-subtabs');
    if (subtabs)
        subtabs.style.display = 'none';
    renderGameQuestion();
}
// ── Skor Göstergesi Güncelleyici ──────────────────────────────────────────────
// Kelime Eşleştirme ilerleme çubuğu: doğru VE yanlış eşleşmeler ilerlemeyi
// sayar (yanlış eşleşen kutucuklar da tahtadan kalkıp "çözülmüş" sayılır),
// yalnızca doğru sayısı değil.
function updateMatchProgressBar() {
    const progressBar = document.getElementById('game-progress-bar');
    if (!progressBar || !activeGame.words) return;
    const resolvedCount = activeGame.score + (activeGame.wrongWords ? activeGame.wrongWords.length : 0);
    const percent = activeGame.words.length > 0 ? (resolvedCount / activeGame.words.length) * 100 : 0;
    progressBar.style.width = `${Math.min(100, percent)}%`;
}
function updateGameScoreDisplay() {
    const el = document.getElementById('game-play-score') || document.getElementById('game-play-score-val');
    if (!el || !activeGame) return;
    const scoreText = getMessage("game_score_lbl") || "{score} Puan";
    const starSvg = `<svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" style="color:#fbbf24;flex-shrink:0;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
    const formattedScore = scoreText.replace('{score}', activeGame.score || 0);

    if (activeGame.type === 'context_choice') {
        const errorsText = getMessage("game_errors_lbl") || "Hata";
        el.innerHTML = `${starSvg}<span>${formattedScore}</span><span style="opacity:0.35;margin:0 4px;">|</span><span style="color:var(--text-muted);font-size:12px;font-weight:700;">${errorsText}: ${activeGame.errors || 0}</span>`;
    } else {
        el.innerHTML = `${starSvg}<span>${formattedScore}</span>`;
    }
}

// ── Oyun Soru Yöneticisi ──────────────────────────────────────────────────────
function renderGameQuestion() {
    document.getElementById('panel-review')?.classList.add('in-game');
    const subtabs = document.getElementById('review-subtabs');
    if (subtabs) subtabs.style.display = 'none';
    const stage = document.getElementById('game-stage');
    stage.innerHTML = '';
    const totalQuestions = activeGame.type === 'match' ? Math.ceil(activeGame.words.length / 5) : (activeGame.type === 'context_choice' ? Math.ceil(activeGame.words.length / 6) : activeGame.words.length);
    const progressPercent = activeGame.type === 'match'
        ? (activeGame.words.length > 0 ? ((activeGame.score + (activeGame.wrongWords ? activeGame.wrongWords.length : 0)) / activeGame.words.length) * 100 : 0)
        : (activeGame.type === 'context_choice'
            ? (activeGame.words.length > 0 ? (activeGame.completedCount / activeGame.words.length) * 100 : 0)
            : (activeGame.currentIndex / totalQuestions) * 100);
    const progressBar = document.getElementById('game-progress-bar');
    if (progressBar) progressBar.style.width = `${progressPercent}%`;
    updateGameScoreDisplay();
    const typeToKey = { multiple_choice: 'game_mc_title', fill_blank: 'game_blank_title', scramble: 'game_scramble_title', match: 'game_match_title', dictation: 'game_dictation_title', context_choice: 'game_context_title' };
    const titleEl = document.getElementById('game-play-title');
    if (titleEl) titleEl.textContent = getMessage(typeToKey[activeGame.type] || '') || activeGame.type;
    if (activeGame.currentIndex >= totalQuestions) {
        showGameResult(totalQuestions);
        return;
    }
    if (activeGame.type === 'multiple_choice')
        renderMultipleChoiceQuestion();
    else if (activeGame.type === 'fill_blank')
        renderFillBlankQuestion();
    else if (activeGame.type === 'scramble')
        renderScrambleQuestion();
    else if (activeGame.type === 'match')
        renderMatchQuestion();
    else if (activeGame.type === 'dictation')
        renderDictationQuestion();
    else if (activeGame.type === 'context_choice')
        renderContextChoiceQuestion();
}
function renderMultipleChoiceQuestion() {
    const stage = document.getElementById('game-stage');
    const target = activeGame.words[activeGame.currentIndex];
    chrome.storage.local.get({ savedWords: [] }, ({ savedWords }) => {
        const pool = activeGame.showLearned ? savedWords : savedWords.filter(w => !w.learned);
        const filteredPool = (activeGame.eligiblePool && activeGame.eligiblePool.length >= 4) ? activeGame.eligiblePool : pool;
        let distractors = [...new Set(filteredPool.filter(w => w.word.toLowerCase() !== target.word.toLowerCase()).map(w => w.translation))];
        if (distractors.length < 3) {
            const extra = pool.filter(w => w.word.toLowerCase() !== target.word.toLowerCase()).map(w => w.translation);
            distractors = [...new Set([...distractors, ...extra])];
        }
        distractors = distractors.slice(0, 3);
        while (distractors.length < 3)
            distractors.push("—");
        const options = [target.translation, ...distractors];
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }
        const mcDiv = document.createElement('div');
        mcDiv.className = 'mc-stage';
        mcDiv.innerHTML = `<div class="mc-word" lang="en">${target.word}</div><div class="mc-choices">${options.map(opt => `<button class="mc-btn" data-opt="${opt}">${opt}</button>`).join('')}</div>`;
        stage.appendChild(mcDiv);
        mcDiv.querySelectorAll('.mc-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const correct = btn.dataset.opt === target.translation;
                mcDiv.querySelectorAll('.mc-btn').forEach(b => b.disabled = true);
                if (correct) {
                    btn.classList.add('correct');
                    activeGame.score++;
                    playSoundEffect('correct');
                    handleGameAnswer(true, target);
                }
                else {
                    btn.classList.add('wrong');
                    playSoundEffect('wrong');
                    mcDiv.querySelectorAll('.mc-btn').forEach(b => { if (b.dataset.opt === target.translation)
                        b.classList.add('correct'); });
                    handleGameAnswer(false, target);
                }
                setTimeout(() => { activeGame.currentIndex++; renderGameQuestion(); }, 1300);
            });
        });
    });
}
function renderFillBlankQuestion() {
    const stage = document.getElementById('game-stage');
    const target = activeGame.words[activeGame.currentIndex];
    let sentence = target.context || '';
    if (sentence.toLowerCase().includes(target.word.toLowerCase())) {
        sentence = sentence.replace(new RegExp(target.word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'), '_____');
    }
    else {
        sentence = `Translate: _____`;
    }
    chrome.storage.local.get({ savedWords: [] }, ({ savedWords }) => {
        const distractors = [...new Set(savedWords.filter(w => w.word.toLowerCase() !== target.word.toLowerCase()).map(w => w.word))].slice(0, 3);
        while (distractors.length < 3)
            distractors.push("—");
        const options = [target.word, ...distractors];
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }
        const fbDiv = document.createElement('div');
        fbDiv.className = 'blank-stage';
        fbDiv.innerHTML = `
        <div class="scramble-prompt">
          <div class="scramble-sentence">"${esc(sentence)}"</div>
          <div class="scramble-meaning">
            <svg class="scramble-meaning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/></svg>
            <span class="scramble-meaning-text">${esc(target.translation)}</span>
          </div>
        </div>
        <div class="mc-choices" style="margin-top:10px;">${options.map(opt => `<button class="mc-btn" data-opt="${esc(opt)}">${esc(opt)}</button>`).join('')}</div>`;
        stage.appendChild(fbDiv);
        fbDiv.querySelectorAll('.mc-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const correct = btn.dataset.opt.toLowerCase() === target.word.toLowerCase();
                fbDiv.querySelectorAll('.mc-btn').forEach(b => b.disabled = true);
                if (correct) {
                    btn.classList.add('correct');
                    activeGame.score++;
                    playSoundEffect('correct');
                    handleGameAnswer(true, target);
                }
                else {
                    btn.classList.add('wrong');
                    playSoundEffect('wrong');
                    fbDiv.querySelectorAll('.mc-btn').forEach(b => { if (b.dataset.opt.toLowerCase() === target.word.toLowerCase())
                        b.classList.add('correct'); });
                    handleGameAnswer(false, target);
                }
                setTimeout(() => { activeGame.currentIndex++; renderGameQuestion(); }, 1300);
            });
        });
    });
}
function renderScrambleQuestion() {
    const stage = document.getElementById('game-stage');
    const target = activeGame.words[activeGame.currentIndex];
    activeGame.scrambleInput = [];
    const cleanWord = target.word.replace(/[^a-zA-Z]/g, '');
    const letters = cleanWord.toLowerCase().split('');
    let scrambled = [...letters];
    let tries = 0;
    while (tries < 10) {
        for (let i = scrambled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [scrambled[i], scrambled[j]] = [scrambled[j], scrambled[i]];
        }
        if (scrambled.join('') !== cleanWord.toLowerCase() || letters.length <= 1)
            break;
        tries++;
    }
    let hintSentence = target.context || '';
    if (hintSentence.toLowerCase().includes(target.word.toLowerCase())) {
        hintSentence = hintSentence.replace(new RegExp(target.word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'), '_____');
    }
    const scrDiv = document.createElement('div');
    scrDiv.className = 'scramble-stage';
    scrDiv.innerHTML = `
    <div class="scramble-prompt">
      ${hintSentence ? `<div class="scramble-sentence">"${esc(hintSentence)}"</div>` : ''}
      <div class="scramble-meaning">
        <svg class="scramble-meaning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/></svg>
        <span class="scramble-meaning-text">${esc(target.translation)}</span>
      </div>
    </div>
    <div class="scramble-input-box" id="scramble-input-box" lang="en"></div>
    <input type="text" id="scramble-hidden-input" style="position: absolute; top: -100px; left: -100px; width: 1px; height: 1px; opacity: 0; pointer-events: none;" autocomplete="off" autocapitalize="off" spellcheck="false">
    <div class="scramble-tiles" id="scramble-tiles" lang="en">${scrambled.map((char, index) => `<button class="scramble-tile" data-index="${index}" data-char="${char}" lang="en">${char.toUpperCase()}</button>`).join('')}</div>
    <div class="scramble-actions">
      <button type="button" class="scramble-btn clear-btn" id="scramble-clear-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        <span>${getMessage("game_btn_clear") || "Temizle"}</span>
      </button>
      <button type="button" class="scramble-btn check-btn" id="scramble-check-btn" disabled>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15"><polyline points="20 6 9 17 4 12"/></svg>
        <span>${getMessage("game_btn_check") || "Kontrol Et"}</span>
      </button>
      <button type="button" class="scramble-btn skip-btn" id="scramble-skip-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
        <span>${getMessage("game_btn_skip") || "Atla"}</span>
      </button>
    </div>
    <div id="scramble-result-msg"></div>
  `;
    stage.appendChild(scrDiv);
    const inputBox = scrDiv.querySelector('#scramble-input-box');
    const checkBtn = scrDiv.querySelector('#scramble-check-btn');
    const clearBtn = scrDiv.querySelector('#scramble-clear-btn');
    const skipBtn = scrDiv.querySelector('#scramble-skip-btn');
    const resultMsg = scrDiv.querySelector('#scramble-result-msg');
    
    const hiddenInput = scrDiv.querySelector('#scramble-hidden-input');
    if (hiddenInput) {
        hiddenInput.value = ' ';
        hiddenInput.addEventListener('input', (e) => {
            const val = hiddenInput.value;
            if (val.length > 1) {
                let typedText = val.toLowerCase();
                if (typedText.startsWith(' ')) {
                    typedText = typedText.substring(1);
                }
                
                if (typedText.length === 1) {
                    const tile = scrDiv.querySelector(`.scramble-tile[data-char="${typedText}"]:not(.used)`);
                    if (tile && !tile.disabled) {
                        tile.click();
                    }
                } else if (typedText.length > 1) {
                    // Autocomplete suggestion selected
                    activeGame.scrambleInput = [];
                    scrDiv.querySelectorAll('.scramble-tile').forEach(t => {
                        t.classList.remove('used');
                        t.disabled = false;
                    });
                    for (let i = 0; i < typedText.length; i++) {
                        const char = typedText.charAt(i);
                        const tile = scrDiv.querySelector(`.scramble-tile[data-char="${char}"]:not(.used)`);
                        if (tile && !tile.disabled) {
                            tile.classList.add('used');
                            activeGame.scrambleInput.push({ char: tile.dataset.char, index: parseInt(tile.dataset.index) });
                        }
                    }
                    updateScrambleUI();
                }
                
                hiddenInput.value = ' ';
                hiddenInput.blur();
                hiddenInput.focus();
            } else if (val.length === 0) {
                if (typeof activeGame.undoScramble === 'function') {
                    activeGame.undoScramble();
                }
                hiddenInput.value = ' ';
            }
        });
        hiddenInput.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' || e.keyCode === 8) {
                e.preventDefault();
                if (typeof activeGame.undoScramble === 'function') {
                    activeGame.undoScramble();
                }
                hiddenInput.value = ' ';
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const continueBtn = scrDiv.querySelector('#scramble-continue-btn');
                if (continueBtn && !continueBtn.disabled) {
                    continueBtn.click();
                } else if (checkBtn && !checkBtn.disabled) {
                    checkBtn.click();
                }
            }
        });
        scrDiv.addEventListener('click', (e) => {
            if (!e.target.closest('.scramble-tile') && !e.target.closest('.scramble-btn')) {
                hiddenInput.focus();
            }
        });
        setTimeout(() => { hiddenInput.focus(); }, 150);
    }
    function updateScrambleUI() {
        inputBox.innerHTML = '';
        for (let i = 0; i < cleanWord.length; i++) {
            const spot = document.createElement('div');
            spot.className = 'scramble-input-letter';
            spot.setAttribute('lang', 'en');
            if (i < activeGame.scrambleInput.length) {
                spot.textContent = activeGame.scrambleInput[i].char.toUpperCase();
            }
            else {
                spot.style.opacity = '0.35';
                spot.style.borderStyle = 'dashed';
            }
            inputBox.appendChild(spot);
        }
        checkBtn.disabled = activeGame.scrambleInput.length !== cleanWord.length;
    }
    activeGame.undoScramble = () => {
        if (activeGame.scrambleInput.length > 0) {
            const lastItem = activeGame.scrambleInput.pop();
            scrDiv.querySelectorAll('.scramble-tile').forEach(tile => { if (parseInt(tile.dataset.index) === lastItem.index)
                tile.classList.remove('used'); });
            updateScrambleUI();
        }
    };
    updateScrambleUI();
    scrDiv.querySelectorAll('.scramble-tile').forEach(tile => {
        tile.addEventListener('click', () => {
            if (tile.classList.contains('used'))
                return;
            activeGame.scrambleInput.push({ char: tile.dataset.char, index: parseInt(tile.dataset.index) });
            tile.classList.add('used');
            updateScrambleUI();
        });
    });
    clearBtn.addEventListener('click', () => {
        activeGame.scrambleInput = [];
        scrDiv.querySelectorAll('.scramble-tile').forEach(t => t.classList.remove('used'));
        updateScrambleUI();
        resultMsg.innerHTML = '';
    });
    skipBtn.addEventListener('click', () => {
        if (!activeGame.skippedWords)
            activeGame.skippedWords = [];
        activeGame.skippedWords.push(target);
        handleGameAnswer(false, target);
        activeGame.currentIndex++;
        renderGameQuestion();
    });
    checkBtn.addEventListener('click', () => {
        const formed = activeGame.scrambleInput.map(item => item.char).join('');
        const correct = formed.toLowerCase() === cleanWord.toLowerCase();
        scrDiv.querySelectorAll('.scramble-tile').forEach(tile => tile.disabled = true);
        checkBtn.disabled = true;
        clearBtn.disabled = true;
        if (correct) {
            activeGame.score++;
            const correctText = getMessage("game_correct") || "✨ Doğru!";
            resultMsg.innerHTML = `<div class="scramble-correct-answer" style="background:rgba(16,185,129,0.15);color:var(--green);border-color:var(--green);">${correctText}</div>`;
            playSoundEffect('correct');
            handleGameAnswer(true, target);
            setTimeout(() => { activeGame.currentIndex++; renderGameQuestion(); }, 1500);
        }
        else {
            const wrongTextTemplate = getMessage("game_wrong_template") || "✗ Yanlış! Doğrusu: {word}";
            const wrongText = wrongTextTemplate.replace('{word}', `<strong>${cleanWord}</strong>`);
            resultMsg.innerHTML = `<div class="scramble-correct-answer" style="background:rgba(239,68,68,0.15);color:var(--red);border-color:var(--red);">${wrongText}</div>`;
            playSoundEffect('wrong');
            handleGameAnswer(false, target);
            const continueBtn = document.createElement('button');
            continueBtn.id = 'scramble-continue-btn';
            continueBtn.className = 'scramble-btn check-btn';
            continueBtn.style.marginTop = '8px';
            continueBtn.style.marginLeft = 'auto';
            continueBtn.style.display = 'block';
            continueBtn.textContent = getMessage('game_btn_continue') || 'Devam Et';
            continueBtn.addEventListener('click', () => { activeGame.currentIndex++; renderGameQuestion(); });
            resultMsg.appendChild(continueBtn);
        }
    });
}
function renderMatchQuestion() {
    const stage = document.getElementById('game-stage');
    const startIdx = activeGame.currentIndex * 5;
    const roundWords = activeGame.words.slice(startIdx, startIdx + 5);
    if (roundWords.length === 0) {
        activeGame.currentIndex++;
        renderGameQuestion();
        return;
    }
    const englishItems = roundWords.map(w => ({ id: w.word, text: w.word }));
    const turkishItems = roundWords.map(w => ({ id: w.word, text: w.translation }));
    for (let i = englishItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [englishItems[i], englishItems[j]] = [englishItems[j], englishItems[i]];
    }
    for (let i = turkishItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [turkishItems[i], turkishItems[j]] = [turkishItems[j], turkishItems[i]];
    }
    const matchDiv = document.createElement('div');
    matchDiv.className = 'match-stage';
    matchDiv.innerHTML = `
    <div class="match-columns">
      <div class="match-col" id="match-english-col">${englishItems.map(item => {
          let extraClass = '';
          if (activeGame.matchedWords?.includes(item.id)) extraClass = ' matched';
          else if (activeGame.wrongWords?.includes(item.id)) extraClass = ' wrong';
          return `<div class="match-tile${extraClass}" data-side="en" data-id="${item.id}">${item.text}</div>`;
      }).join('')}</div>
      <div class="match-col" id="match-turkish-col">${turkishItems.map(item => {
          let extraClass = '';
          if (activeGame.matchedWords?.includes(item.id)) extraClass = ' matched';
          else if (activeGame.wrongWords?.includes(item.id)) extraClass = ' wrong';
          return `<div class="match-tile${extraClass}" data-side="tr" data-id="${item.id}">${item.text}</div>`;
      }).join('')}</div>
    </div>`;
    stage.appendChild(matchDiv);
    let selectedTile = null;
    matchDiv.querySelectorAll('.match-tile').forEach(tile => {
        tile.addEventListener('click', () => {
            if (tile.classList.contains('matched') || tile.classList.contains('error') || tile.classList.contains('wrong'))
                return;
            if (selectedTile) {
                if (selectedTile === tile) {
                    tile.classList.remove('selected');
                    selectedTile = null;
                    return;
                }
                if (selectedTile.dataset.side === tile.dataset.side) {
                    selectedTile.classList.remove('selected');
                    tile.classList.add('selected');
                    selectedTile = tile;
                    return;
                }
                const match = selectedTile.dataset.id === tile.dataset.id;
                const currentWordItem = roundWords.find(w => w.word === tile.dataset.id || w.word === selectedTile.dataset.id);
                if (match) {
                    selectedTile.classList.remove('selected');
                    selectedTile.classList.add('matched');
                    tile.classList.add('matched');
                    selectedTile = null;
                    activeGame.score++;
                    if (!activeGame.matchedWords)
                        activeGame.matchedWords = [];
                    activeGame.matchedWords.push(tile.dataset.id);
                    playSoundEffect('correct');
                    updateGameScoreDisplay();
                    updateMatchProgressBar();
                    const finishedCount = matchDiv.querySelectorAll('.match-tile.matched, .match-tile.wrong').length;
                    if (finishedCount === roundWords.length * 2) {
                        setTimeout(() => { activeGame.currentIndex++; renderGameQuestion(); }, 1000);
                    }
                }
                else {
                    const t1 = selectedTile, t2 = tile;
                    t1.classList.remove('selected');

                    const siblingTile = matchDiv.querySelector(`.match-tile[data-id="${t1.dataset.id}"]:not([data-side="${t1.dataset.side}"])`);

                    t1.classList.add('wrong');
                    if (siblingTile) {
                        siblingTile.classList.add('wrong');
                    }
                    t2.classList.add('error');

                    if (!activeGame.wrongWords)
                        activeGame.wrongWords = [];
                    activeGame.wrongWords.push(t1.dataset.id);

                    selectedTile = null;
                    playSoundEffect('wrong');
                    if (currentWordItem)
                        handleGameAnswer(false, currentWordItem);
                    updateMatchProgressBar();

                    setTimeout(() => { t2.classList.remove('error'); }, 600);

                    const finishedCount = matchDiv.querySelectorAll('.match-tile.matched, .match-tile.wrong').length;
                    if (finishedCount === roundWords.length * 2) {
                        setTimeout(() => { activeGame.currentIndex++; renderGameQuestion(); }, 1000);
                    }
                }
            }
            else {
                tile.classList.add('selected');
                selectedTile = tile;
            }
        });
    });
}
function handleGameAnswer(isCorrect, targetWordItem) {
    if (window.HapticsService) {
        if (isCorrect) window.HapticsService.success();
        else window.HapticsService.error();
    }
    if (!targetWordItem || !targetWordItem.word) return;
    const cleanWord = targetWordItem.word.trim().toLowerCase();
    chrome.storage.local.get({ savedWords: [] }, ({ savedWords }) => {
        let updated = false;
        savedWords.forEach((w) => {
            if (w && w.word && w.word.trim().toLowerCase() === cleanWord) {
                let hardStreak = w.hardStreak ?? 0;
                let wrongStreak = w.wrongStreak ?? 0;
                if (isCorrect) {
                    hardStreak++;
                    wrongStreak = 0; // Doğru cevaplandığında yanlış serisi sıfırlanır
                    if (w.hard && hardStreak >= 3) {
                        w.hard = false;
                        hardStreak = 0;
                    }
                } else {
                    wrongStreak++;
                    hardStreak = 0; // Yanlış yapıldığında doğru serisi sıfırlanır
                    if (!w.hard && wrongStreak >= 3) {
                        w.hard = true;
                        wrongStreak = 0;
                    }
                }
                w.hardStreak = hardStreak;
                w.wrongStreak = wrongStreak;
                w.updatedAt = Date.now();
                w.lastReviewedAt = Date.now();
                updated = true;
            }
        });
        if (updated) {
            chrome.storage.local.set({ savedWords }, () => {
                if (typeof updateReviewBadge === 'function') updateReviewBadge();
                if (typeof loadArchive === 'function') loadArchive();
            });
        }
    });
}
function showGameResult(totalQuestions = 10) {
    activeGame.finished = true;
    const stage = document.getElementById('game-stage');
    stage.innerHTML = '';
    const currentGameType = activeGame.type;
    const maxPossibleScore = (activeGame.words && activeGame.words.length > 0) ? activeGame.words.length : totalQuestions;
    const isPerfect = activeGame.score >= maxPossibleScore && maxPossibleScore > 0;
    const percent = maxPossibleScore > 0 ? Math.min(100, Math.round((activeGame.score / maxPossibleScore) * 100)) : 0;
    const earnedExp = isPerfect ? 50 : 20;

    if (window.HapticsService) {
        if (isPerfect || percent >= 80) window.HapticsService.celebrate();
        else window.HapticsService.tap();
    }

    chrome.storage.local.get({ gameStats: {} }, ({ gameStats }) => {
        gameStats.totalGamesPlayed = (gameStats.totalGamesPlayed || 0) + 1;
        gameStats.totalCorrect = (gameStats.totalCorrect || 0) + activeGame.score;
        if (isPerfect)
            gameStats.perfectGames = (gameStats.perfectGames || 0) + 1;
        gameStats.bestScore = Math.max(gameStats.bestScore || 0, activeGame.score);
        const prefix = `game_${currentGameType}`;
        gameStats[`${prefix}_played`] = (gameStats[`${prefix}_played`] || 0) + 1;
        gameStats[`${prefix}_correct`] = (gameStats[`${prefix}_correct`] || 0) + activeGame.score;
        gameStats[`${prefix}_questions`] = (gameStats[`${prefix}_questions`] || 0) + maxPossibleScore;
        gameStats[`${prefix}_highScore`] = Math.max(gameStats[`${prefix}_highScore`] || 0, activeGame.score);
        gameStats.timestamp = Date.now();
        chrome.storage.local.set({ gameStats }, () => {
            addExp(earnedExp, null, 'user_exp_game_completed');
            if (typeof checkAndAwardAchievements === 'function') {
                setTimeout(() => checkAndAwardAchievements({ type: 'game_end' }), 500);
            }
        });
    });
    playSoundEffect('complete');
    const resDiv = document.createElement('div');
    resDiv.className = 'game-result-container';
    
    let skippedHtml = '';
    if (activeGame.skippedWords && activeGame.skippedWords.length > 0) {
        const skippedTpl = getMessage('game_result_skipped_words') || 'Atlanan Kelimeler ({count})';
        const skippedLabel = skippedTpl.replace('{count}', activeGame.skippedWords.length);
        skippedHtml = `
          <div class="game-result-skipped-box">
            <div class="game-result-skipped-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" width="14" height="14"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span>${esc(skippedLabel)}</span>
            </div>
            <div class="game-result-skipped-list">
              ${activeGame.skippedWords.map(w => `
                <div class="game-result-skipped-item">
                  <span style="font-weight:700;color:var(--text);">${esc(w.word)}</span>
                  <span style="color:var(--text-dim);font-weight:500;">${esc(w.translation)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
    }
    const perfectDesc = getMessage("game_result_perfect") || "Mükemmel! Tüm soruları doğru yanıtladınız.";
    const completedDesc = getMessage("game_result_completed") || "Tebrikler! Pratik oturumunu tamamladınız.";
    const scoreLbl = getMessage("game_stat_score") || "Skor";
    const accuracyLbl = getMessage("game_stat_accuracy") || "Başarı";
    const xpLbl = getMessage("game_stat_xp") || "XP";
    const retryLbl = getMessage("game_btn_retry") || "Tekrar Oyna";
    const backToGamesLbl = getMessage("game_result_btn_back") || "Oyunlara Dön";

    resDiv.innerHTML = `
      <div class="game-result-icon-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
          <path d="M4 22h16"/>
          <path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1h8c.55 0 1-.45 1-1v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34"/>
          <path d="M18 4H6v7a6 6 0 0 0 12 0V4z"/>
        </svg>
      </div>
      <div class="game-result-header">
        <div class="game-result-title">${getMessage("game_result_title") || "Oyun Tamamlandı!"}</div>
        <p class="game-result-desc">${isPerfect ? esc(perfectDesc) : esc(completedDesc)}</p>
      </div>
      <div class="game-result-stats-row">
        <div class="game-stat-pill">
          <span class="game-stat-num accent">${activeGame.score}/${maxPossibleScore}</span>
          <span class="game-stat-lbl">${esc(scoreLbl)}</span>
        </div>
        <div class="game-stat-pill">
          <span class="game-stat-num green">%${percent}</span>
          <span class="game-stat-lbl">${esc(accuracyLbl)}</span>
        </div>
        <div class="game-stat-pill">
          <span class="game-stat-num amber">+${earnedExp}</span>
          <span class="game-stat-lbl">${esc(xpLbl)}</span>
        </div>
      </div>
      ${skippedHtml}
      <div class="game-result-actions">
        <button type="button" class="resume-discard-btn" id="game-result-back-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          <span>${esc(backToGamesLbl)}</span>
        </button>
        <button type="button" class="resume-main-btn" id="game-result-retry-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-1.19"/></svg>
          <span>${esc(retryLbl)}</span>
        </button>
      </div>
    `;

    stage.replaceChildren ? stage.replaceChildren(resDiv) : (stage.innerHTML = '', stage.appendChild(resDiv));
    resDiv.querySelector('#game-result-back-btn').addEventListener('click', () => {
        document.getElementById('panel-review')?.classList.remove('in-game');
        activeGame.type = null;
        loadGamesHub();
    });
    const retryBtn = resDiv.querySelector('#game-result-retry-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            if (currentGameType) {
                chrome.storage.local.get({ savedWords: [] }, ({ savedWords }) => {
                    chrome.storage.sync.get({ settings: {} }, ({ settings }) => {
                        const showLearned = !settings || settings.showLearnedInGames !== false;
                        const activeChip = document.querySelector('#poolPopover .pool-chip.on');
                        const poolFilter = (activeChip ? activeChip.dataset.val : 'all') || 'all';
                        startMiniGame(currentGameType, savedWords, showLearned, poolFilter);
                    });
                });
            } else {
                loadGamesHub();
            }
        });
    }
    activeGame.type = null;
}
function getEditDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}
// ── Dikte Oyunu ───────────────────────────────────────────────────────────────
function renderDictationQuestion() {
    const stage = document.getElementById('game-stage');
    const target = activeGame.words[activeGame.currentIndex];
    const listenText = (getMessage('game_dictation_listen') || 'Tekrar Dinle').replace(/^🔊\s*/, '');
    const dictDiv = document.createElement('div');
    dictDiv.className = 'dictation-stage';
    dictDiv.innerHTML = `
    <div class="dictation-hero-card">
      <button type="button" class="dictation-play-btn" id="dictation-listen-btn" title="${listenText}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="28" height="28">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
        </svg>
      </button>
      <div class="scramble-meaning" style="margin:0;">
        <svg class="scramble-meaning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/></svg>
        <span class="scramble-meaning-text">${esc(target.translation)}</span>
      </div>
    </div>
    <div class="dictation-input-wrap">
      <input type="text" class="dictation-input" id="dictation-input" placeholder="${getMessage('game_dictation_placeholder') || 'Duyduğunuz kelimeyi yazın...'}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" lang="en">
    </div>
    <div class="scramble-actions" id="dictation-actions">
      <button type="button" class="scramble-btn check-btn" id="dictation-check-btn" disabled>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15"><polyline points="20 6 9 17 4 12"/></svg>
        <span>${getMessage("game_btn_check") || "Kontrol Et"}</span>
      </button>
      <button type="button" class="scramble-btn skip-btn" id="dictation-skip-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
        <span>${getMessage("game_btn_skip") || "Atla"}</span>
      </button>
    </div>
    <div id="dictation-result-msg"></div>
  `;
    stage.appendChild(dictDiv);
    const input = dictDiv.querySelector('#dictation-input');
    const checkBtn = dictDiv.querySelector('#dictation-check-btn');
    const skipBtn = dictDiv.querySelector('#dictation-skip-btn');
    const listenBtn = dictDiv.querySelector('#dictation-listen-btn');
    const resultMsg = dictDiv.querySelector('#dictation-result-msg');
    speakWord(target.word, target.lang || 'en');
    setTimeout(() => input && input.focus(), 200);
    input.addEventListener('input', () => { checkBtn.disabled = !input.value.trim(); });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            const cb = document.getElementById('dictation-continue-btn');
            if (cb) {
                cb.click();
                return;
            }
            if (!checkBtn.disabled)
                checkBtn.click();
        }
    });
    listenBtn.addEventListener('click', () => speakWord(target.word, target.lang || 'en'));
    skipBtn.addEventListener('click', () => {
        if (!activeGame.skippedWords)
            activeGame.skippedWords = [];
        activeGame.skippedWords.push(target);
        handleGameAnswer(false, target);
        activeGame.currentIndex++;
        renderGameQuestion();
    });
    checkBtn.addEventListener('click', () => {
        const userInput = input.value.trim().toLowerCase();
        const correctWord = target.word.toLowerCase();
        const distance = getEditDistance(userInput, correctWord);
        const threshold = target.word.length <= 5 ? 1 : 2;

        checkBtn.disabled = true;
        skipBtn.disabled = true;
        input.disabled = true;
        input.blur();

        if (distance === 0) {
            input.classList.add('correct-border');
            resultMsg.innerHTML = '';
            const msgBox = document.createElement('div');
            msgBox.style.cssText = 'background:rgba(16,185,129,0.15); color:var(--green); border:1px solid var(--green); padding:10px; border-radius:8px; margin-top:8px; font-weight:600; text-align:center; font-size:14px;';
            msgBox.textContent = getMessage('game_dictation_correct') || 'Harika, doğru heceleme!';
            resultMsg.appendChild(msgBox);
            activeGame.score++;
            playSoundEffect('correct');
            handleGameAnswer(true, target);
            updateGameStat('dictationCorrect', 1);
            setTimeout(() => { activeGame.currentIndex++; renderGameQuestion(); }, 1500);
        }
        else if (distance <= threshold) {
            input.classList.add('correct-border');
            input.style.borderColor = '#f59e0b';
            resultMsg.innerHTML = '';
            const msgBox = document.createElement('div');
            msgBox.style.cssText = 'background:rgba(245,158,11,0.15); color:#d97706; border:1px solid #f59e0b; padding:10px; border-radius:8px; margin-top:8px; font-weight:600; text-align:center; font-size:14px;';
            const msg = (getMessage('game_dictation_almost') || 'Neredeyse doğru! Doğru yazılışı: {word}').replace('{word}', `<strong>${target.word}</strong>`);
            msgBox.innerHTML = msg;
            resultMsg.appendChild(msgBox);
            activeGame.score++;
            playSoundEffect('typo');
            handleGameAnswer(true, target);
            updateGameStat('dictationCorrect', 1);
            const continueBtn = document.createElement('button');
            continueBtn.id = 'dictation-continue-btn';
            continueBtn.className = 'scramble-btn check-btn';
            continueBtn.style.marginTop = '12px';
            continueBtn.style.width = '100%';
            continueBtn.textContent = getMessage('game_btn_continue') || 'Devam Et';
            continueBtn.addEventListener('click', () => { activeGame.currentIndex++; renderGameQuestion(); });
            resultMsg.appendChild(continueBtn);
        }
        else {
            input.classList.add('wrong-border');
            resultMsg.innerHTML = '';
            const msgBox = document.createElement('div');
            msgBox.style.cssText = 'background:rgba(239,68,68,0.15); color:var(--red); border:1px solid var(--red); padding:10px; border-radius:8px; margin-top:8px; font-weight:600; text-align:center; font-size:14px;';
            const msg = (getMessage('game_dictation_wrong') || 'Yanlış! Doğrusu: {word}').replace('{word}', `<strong>${target.word}</strong>`);
            msgBox.innerHTML = msg;
            resultMsg.appendChild(msgBox);
            playSoundEffect('wrong');
            handleGameAnswer(false, target);
            const continueBtn = document.createElement('button');
            continueBtn.id = 'dictation-continue-btn';
            continueBtn.className = 'scramble-btn check-btn';
            continueBtn.style.marginTop = '12px';
            continueBtn.style.width = '100%';
            continueBtn.textContent = getMessage('game_btn_continue') || 'Devam Et';
            continueBtn.addEventListener('click', () => { activeGame.currentIndex++; renderGameQuestion(); });
            resultMsg.appendChild(continueBtn);
        }
    });
}
function renderContextChoiceQuestion() {
    const stage = document.getElementById('game-stage');
    const startIdx = activeGame.currentIndex * 6;
    const roundWords = activeGame.words.slice(startIdx, startIdx + 6);
    if (roundWords.length === 0) {
        activeGame.currentIndex++;
        renderGameQuestion();
        return;
    }
    // Resume: use saved card order if resuming, otherwise shuffle fresh
    if (!activeGame.cardDeck) {
        let cards = [];
        roundWords.forEach((w, index) => {
            cards.push({ id: index * 2, wordId: w.word, type: 'en', text: w.word });
            cards.push({ id: index * 2 + 1, wordId: w.word, type: 'tr', text: w.translation });
        });
        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }
        activeGame.cardDeck = cards;
    }
    if (!activeGame.matchedWordIds) activeGame.matchedWordIds = [];
    const cards = activeGame.cardDeck;
    const alreadyMatchedIds = activeGame.matchedWordIds;
    const memDiv = document.createElement('div');
    memDiv.className = 'memory-stage';
    const memSubtitle = getMessage('game_context_desc') || 'Kartları çevirip kelimeleri anlamlarıyla eşleştirin';
    memDiv.innerHTML = `
    <div class="blank-hint" style="margin: 0 auto 6px; font-size: 13px;">${esc(memSubtitle)}</div>
    <div class="match-grid">
      ${cards.map(card => {
          const isMatched = alreadyMatchedIds.includes(card.wordId.toLowerCase());
          return `
        <button type="button" class="memory-tile${isMatched ? ' matched' : ''}" data-id="${card.id}" data-word-id="${esc(card.wordId)}" data-type="${card.type}" data-text="${esc(card.text)}">
          <span class="mem-inner">${isMatched ? esc(card.text) : '?'}</span>
        </button>
      `}).join('')}
    </div>
    `;
    stage.replaceChildren ? stage.replaceChildren(memDiv) : (stage.innerHTML = '', stage.appendChild(memDiv));
    let flippedCards = [];
    let matchedPairs = alreadyMatchedIds.length;
    memDiv.querySelectorAll('.memory-tile').forEach(card => {
        card.addEventListener('click', () => {
            if (card.classList.contains('flipped') && flippedCards.length === 1 && flippedCards[0] === card) {
                card.classList.remove('flipped');
                card.querySelector('.mem-inner').textContent = '?';
                flippedCards = [];
                return;
            }
            if (card.classList.contains('flipped') || card.classList.contains('matched') || flippedCards.length >= 2) {
                return;
            }
            card.classList.add('flipped');
            card.querySelector('.mem-inner').textContent = card.dataset.text;
            flippedCards.push(card);
            if (flippedCards.length === 2) {
                const c1 = flippedCards[0];
                const c2 = flippedCards[1];
                const id1 = c1.dataset.wordId.toLowerCase();
                const id2 = c2.dataset.wordId.toLowerCase();
                const type1 = c1.dataset.type;
                const type2 = c2.dataset.type;
                if (id1 === id2 && type1 !== type2) {
                    setTimeout(() => {
                        c1.classList.add('matched');
                        c2.classList.add('matched');
                        c1.classList.remove('flipped');
                        c2.classList.remove('flipped');
                        playSoundEffect('correct');
                        if (!activeGame.matchedWordIds.includes(id1)) {
                            activeGame.matchedWordIds.push(id1);
                        }
                        const targetWordItem = roundWords.find(w => w.word.toLowerCase() === id1);
                        const mismatches = activeGame.mismatchMap[id1] || 0;
                        
                        if (mismatches <= 1) {
                            activeGame.score++;
                            if (targetWordItem) {
                                handleGameAnswer(true, targetWordItem);
                            }
                        } else {
                            if (targetWordItem) {
                                handleGameAnswer(false, targetWordItem);
                            }
                        }
                        
                        activeGame.completedCount++;
                        updateGameScoreDisplay();
                        const progressBar = document.getElementById('game-progress-bar');
                        if (progressBar) {
                            progressBar.style.width = `${activeGame.words.length > 0 ? (activeGame.completedCount / activeGame.words.length) * 100 : 0}%`;
                        }
                        
                        matchedPairs++;
                        flippedCards = [];
                        if (matchedPairs === roundWords.length) {
                            updateGameStat('contextCorrect', roundWords.length);
                            activeGame.cardDeck = null;
                            activeGame.matchedWordIds = [];
                            setTimeout(() => {
                                activeGame.currentIndex++;
                                renderGameQuestion();
                            }, 1000);
                        }
                    }, 350);
                }
                else {
                    setTimeout(() => {
                        playSoundEffect('wrong');
                        c1.classList.add('wrong');
                        c2.classList.add('wrong');
                        activeGame.mismatchMap[id1] = (activeGame.mismatchMap[id1] || 0) + 1;
                        activeGame.mismatchMap[id2] = (activeGame.mismatchMap[id2] || 0) + 1;
                        activeGame.errors++;
                        updateGameScoreDisplay();
                        
                        setTimeout(() => {
                            c1.classList.remove('flipped', 'wrong');
                            c2.classList.remove('flipped', 'wrong');
                            c1.querySelector('.mem-inner').textContent = '?';
                            c2.querySelector('.mem-inner').textContent = '?';
                            flippedCards = [];
                        }, 750);
                    }, 350);
                }
            }
        });
    });
}
// ── Klavye Kısayolları ────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable))
        return;
    const playArea = document.getElementById('game-play-area');
    if (!playArea || playArea.style.display === 'none')
        return;
    const backBtn = playArea.querySelector('#game-result-back-btn');
    if (backBtn && !backBtn.disabled && e.key === 'Enter') {
        e.preventDefault();
        backBtn.click();
        return;
    }
    if (!activeGame)
        return;
    if (['multiple_choice', 'fill_blank', 'context_choice'].includes(activeGame.type)) {
        if (['1', '2', '3', '4'].includes(e.key)) {
            const buttons = playArea.querySelectorAll('.mc-choices .mc-btn');
            const btn = buttons[parseInt(e.key) - 1];
            if (btn && !btn.disabled) {
                e.preventDefault();
                btn.click();
            }
        }
    }
    else if (activeGame.type === 'scramble') {
        const key = e.key.toLowerCase();
        if (key.length === 1 && key >= 'a' && key <= 'z') {
            const tile = playArea.querySelector(`.scramble-tile[data-char="${key}"]:not(.used)`);
            if (tile && !tile.disabled) {
                e.preventDefault();
                tile.click();
            }
        }
        else if (e.key === 'Backspace') {
            e.preventDefault();
            if (typeof activeGame.undoScramble === 'function')
                activeGame.undoScramble();
        }
        else if (e.key === ' ' || e.key === 'Spacebar') {
            const sb = playArea.querySelector('#scramble-skip-btn');
            if (sb && !sb.disabled) {
                e.preventDefault();
                sb.click();
            }
        }
        else if (e.key === 'Enter') {
            const cont = playArea.querySelector('#scramble-continue-btn');
            const chk = playArea.querySelector('#scramble-check-btn');
            if (cont && !cont.disabled) {
                e.preventDefault();
                cont.click();
            }
            else if (chk && !chk.disabled) {
                e.preventDefault();
                chk.click();
            }
        }
    }
    else if (activeGame.type === 'match') {
        if (['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].includes(e.key)) {
            e.preventDefault();
            let idx = -1, side = '';
            if (['1', '2', '3', '4', '5'].includes(e.key)) {
                idx = parseInt(e.key) - 1;
                side = 'en';
            }
            else {
                idx = e.key === '0' ? 4 : parseInt(e.key) - 6;
                side = 'tr';
            }
            const col = playArea.querySelector(`#${side === 'en' ? 'match-english-col' : 'match-turkish-col'}`);
            if (col) {
                const tiles = col.querySelectorAll('.match-tile');
                if (tiles[idx])
                    tiles[idx].click();
            }
        }
    }
    else if (activeGame.type === 'dictation') {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            const cb = document.getElementById('dictation-continue-btn');
            if (cb && !cb.disabled) {
                e.preventDefault();
                cb.click();
            }
        }
    }
});
// ── EXP & Stats ───────────────────────────────────────────────────────────────
function updateGameStat(key, delta) {
    chrome.storage.local.get({ gameStats: {} }, ({ gameStats }) => {
        gameStats[key] = (gameStats[key] || 0) + delta;
        gameStats.timestamp = Date.now();
        chrome.storage.local.set({ gameStats });
    });
}
function addExp(amount, sourceElement = null, reasonKey = '') {
    if (!amount || amount <= 0)
        return;
    chrome.storage.local.get({ gameStats: {} }, ({ gameStats }) => {
        const oldExp = gameStats.totalExp || 0;
        gameStats.totalExp = oldExp + amount;
        gameStats.timestamp = Date.now();
        chrome.storage.local.set({ gameStats }, () => {
            const expDisplay = document.getElementById('user-exp-display');
            if (expDisplay)
                animateExpCounter(expDisplay, oldExp, gameStats.totalExp);
            if (sourceElement)
                showFloatingExp(amount, sourceElement);
            else
                showGlobalExpToast(amount, reasonKey);
        });
    });
}
function animateExpCounter(el, start, end) {
    const duration = 1000, startTime = performance.now();
    function update(time) {
        const elapsed = time - startTime, progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(start + (end - start) * easeProgress).toLocaleString();
        if (progress < 1)
            requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}
function showFloatingExp(amount, element) {
    const rect = element.getBoundingClientRect();
    const floatEl = document.createElement('div');
    floatEl.className = 'exp-float-anim';
    floatEl.textContent = `+${amount} XP`;
    floatEl.style.left = `${rect.left + rect.width / 2}px`;
    floatEl.style.top = `${rect.top}px`;
    document.body.appendChild(floatEl);
    setTimeout(() => floatEl.remove(), 1500);
}
function showGlobalExpToast(amount, reasonKey) {
    let container = document.getElementById('exp-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'exp-toast-container';
        container.className = 'exp-toast-container';
        document.body.appendChild(container);
    }
    const reason = reasonKey ? (getMessage(reasonKey) || reasonKey) : '';
    const toast = document.createElement('div');
    toast.className = 'exp-toast';
    toast.innerHTML = `
        <div class="exp-toast-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
        </div>
        <span class="exp-toast-amount">+${amount} XP</span>
        ${reason ? `<span class="exp-toast-reason">${reason}</span>` : ''}
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 250);
    }, 2200);
}
// ── Başarımlar ────────────────────────────────────────────────────────────────
const ACH_ICONS = {
    first_step: { bg: 'rgba(34,197,94,.18)', col: '#86efac', svg: '<path d="M7 20h10M12 20v-8M12 12a5 5 0 0 1 5-5c0 3-2 5-5 5zM12 12a5 5 0 0 0-5-5c0 3 2 5 5 5z"/>' },
    word_hunter: { bg: 'rgba(56,189,248,.18)', col: '#7dd3fc', svg: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/>' },
    word_collector: { bg: 'rgba(168,85,247,.18)', col: '#c084fc', svg: '<rect x="5" y="7" width="14" height="13" rx="2"/><path d="M9 7V5a3 3 0 0 1 6 0v2M9 13h6"/>' },
    word_expert: { bg: 'rgba(249,115,22,.18)', col: '#fdba74', svg: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>' },
    word_master: { bg: 'rgba(245,158,11,.18)', col: '#fbbf24', svg: '<path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4zM7 5H4a3 3 0 0 0 3 3M17 5h3a3 3 0 0 1-3 3"/>' },
    word_legend: { bg: 'rgba(234,179,8,.18)', col: '#fde047', svg: '<path d="M3 18h18l-1.6-9-4.9 3.4L12 6l-2.5 6.4L4.6 9 3 18z"/>' },
    word_titan: { bg: 'rgba(139,92,246,.18)', col: '#c4b5fd', svg: '<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-30 12 12)"/>' },
    word_god: { bg: 'rgba(236,72,153,.18)', col: '#f472b6', svg: '<path d="M9.5 4a3.5 3.5 0 0 0-3.5 3.5c0 .4.1.8.2 1.1A3.5 3.5 0 0 0 5 12a3.5 3.5 0 0 0 1.2 2.6 3.5 3.5 0 0 0 3.3 5.4H12m2.5-16a3.5 3.5 0 0 1 3.5 3.5c0 .4-.1.8-.2 1.1A3.5 3.5 0 0 1 19 12a3.5 3.5 0 0 1-1.2 2.6 3.5 3.5 0 0 1-3.3 5.4H12v-16z"/>' },
    a1_explorer: { bg: 'rgba(34,197,94,.18)', col: '#86efac', svg: '<polygon points="12 2 15 9 22 12 15 15 12 22 9 15 2 12 9 9 12 2"/>' },
    b1_scholar: { bg: 'rgba(56,189,248,.18)', col: '#7dd3fc', svg: '<path d="M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c0 2 3 3 6 3s6-1 6-3v-5"/>' },
    c1_polymath: { bg: 'rgba(168,85,247,.18)', col: '#c084fc', svg: '<circle cx="12" cy="11" r="7"/><path d="M7 19h10M9 22h6"/>' },
    phrasal_explorer: { bg: 'rgba(99,102,241,.18)', col: '#a5b4fc', svg: '<path d="M12 2v20M12 4h6l2 3-2 3h-6M12 12H6l-2 3 2 3h6"/>' },
    phrasal_master: { bg: 'rgba(168,85,247,.18)', col: '#c084fc', svg: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>' },
    phrasal_guru: { bg: 'rgba(244,114,182,.18)', col: '#f472b6', svg: '<circle cx="12" cy="8" r="5"/><path d="M8.2 13.5L7 22l5-3 5 3-1.2-8.5"/>' },
    idiom_hunter: { bg: 'rgba(251,146,60,.18)', col: '#fdba74', svg: '<path d="M3 11a9 9 0 0 1 18 0c0 5-4 9-9 9s-9-4-9-9zM8 9h.01M16 9h.01M9 14c1 1.5 2 2 3 2s2-.5 3-2"/>' },
    idiom_master: { bg: 'rgba(245,158,11,.18)', col: '#fbbf24', svg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM8 10h.01M12 10h.01M16 10h.01"/>' },
    idiom_sage: { bg: 'rgba(217,119,6,.18)', col: '#fcd34d', svg: '<path d="M8 2h8a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4zM8 7h8M8 11h8M8 15h5"/>' },
    collocation_seeker: { bg: 'rgba(45,212,191,.18)', col: '#5eead4', svg: '<path d="M19 14v1a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3h1M15 5h1a3 3 0 0 1 3 3v1M12 2v3M2 12h3"/>' },
    collocation_master: { bg: 'rgba(56,189,248,.18)', col: '#7dd3fc', svg: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>' },
    collocation_architect: { bg: 'rgba(129,140,248,.18)', col: '#a5b4fc', svg: '<path d="M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10M3 10h18M12 3L2 10h20z"/>' },
    game_rookie: { bg: 'rgba(34,197,94,.18)', col: '#86efac', svg: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>' },
    speed_player: { bg: 'rgba(234,179,8,.18)', col: '#fde047', svg: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>' },
    game_addict: { bg: 'rgba(168,85,247,.18)', col: '#c084fc', svg: '<rect x="2" y="6" width="20" height="12" rx="6"/><path d="M6 12h4M8 10v4M15 11h.01M17 13h.01"/>' },
    game_champion: { bg: 'rgba(239,68,68,.18)', col: '#fca5a5', svg: '<path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l2 2 4-4-2-2M14.5 6.5L18 3h3v3l-3.5 3.5M6 18l-3 3"/>' },
    game_grandmaster: { bg: 'rgba(245,158,11,.18)', col: '#fbbf24', svg: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.45 1-1 1H8v4h8v-4h-1c-.55 0-1-.45-1-1v-2.34M7 3h10v6a5 5 0 0 1-10 0V3z"/>' },
    perfect_game: { bg: 'rgba(239,68,68,.18)', col: '#fca5a5', svg: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>' },
    perfectionist: { bg: 'rgba(56,189,248,.18)', col: '#7dd3fc', svg: '<path d="M6 3h12l4 6-10 12L2 9zM2 9h20M12 21L8 9l4-6 4 6-4 12z"/>' },
    perfect_sovereign: { bg: 'rgba(234,179,8,.18)', col: '#fde047', svg: '<path d="M12 2l3 6 6 1-4.5 4.5L18 20l-6-3-6 3 1.5-6.5L3 9l6-1z"/>' },
    ear_master: { bg: 'rgba(56,189,248,.18)', col: '#7dd3fc', svg: '<path d="M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>' },
    ear_god: { bg: 'rgba(245,158,11,.18)', col: '#fbbf24', svg: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3M8 22h8"/>' },
    context_hero: { bg: 'rgba(244,114,182,.18)', col: '#f472b6', svg: '<path d="M20.2 6 3 11l-.9-3 17.2-5zM4 11v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9zM4 15h16M8 11v4M12 11v4M16 11v4"/>' },
    context_god: { bg: 'rgba(168,85,247,.18)', col: '#c084fc', svg: '<circle cx="7" cy="7" r="4"/><circle cx="17" cy="7" r="4"/><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="16" r="2.5"/>' },
    hard_conqueror: { bg: 'rgba(249,115,22,.18)', col: '#fdba74', svg: '<path d="M6 18h8M10 14v4M10 2a2 2 0 0 1 2 2v7M6 6h8M14 18a4 4 0 0 0 4-4V7M18 7l2-2M18 7l-2-2"/>' },
    hard_annihilator: { bg: 'rgba(239,68,68,.18)', col: '#fca5a5', svg: '<path d="M12 2v4M4.93 4.93l2.83 2.83M2 12h4M4.93 19.07l2.83-2.83M12 22v-4M19.07 19.07l-2.83-2.83M22 12h-4M19.07 4.93l-2.83 2.83"/>' },
    streak_3: { bg: 'rgba(249,115,22,.18)', col: '#fdba74', svg: '<path d="M12 2c1.5 3 4 4.5 4 8a6 6 0 0 1-12 0c0-3.5 2.5-5 4-8 1 2 2 3 4 0z"/>' },
    streak_7: { bg: 'rgba(234,179,8,.18)', col: '#fde047', svg: '<path d="M13 2L3 14h8v8l10-12h-8z"/>' },
    streak_30: { bg: 'rgba(239,68,68,.18)', col: '#f87171', svg: '<polygon points="12 2 15 9 22 12 15 15 12 22 9 15 2 12 9 9 12 2"/>' },
    exp_bronze: { bg: 'rgba(180,83,9,.18)', col: '#d97706', svg: '<circle cx="12" cy="14" r="6"/><path d="M8.5 8.5L5 3h14l-3.5 5.5"/>' },
    exp_silver: { bg: 'rgba(148,163,184,.18)', col: '#cbd5e1', svg: '<circle cx="12" cy="14" r="6"/><path d="M8.5 8.5L5 3h14l-3.5 5.5M12 12v4"/>' },
    exp_gold: { bg: 'rgba(245,158,11,.18)', col: '#fbbf24', svg: '<circle cx="12" cy="14" r="6"/><path d="M8.5 8.5L5 3h14l-3.5 5.5M12 11l1 2 2 .5-1.5 1.5.5 2-2-1-2 1 .5-2L9 13.5l2-.5z"/>' },
    exp_legend: { bg: 'rgba(168,85,247,.18)', col: '#c084fc', svg: '<path d="M3 18h18l-1.6-9-4.9 3.4L12 6l-2.5 6.4L4.6 9 3 18z"/><circle cx="12" cy="5" r="1.5"/><circle cx="4.5" cy="8" r="1.5"/><circle cx="19.5" cy="8" r="1.5"/>' },
    exp_deity: { bg: 'rgba(234,179,8,.22)', col: '#fde047', svg: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>' }
};

const ACHIEVEMENTS = [
    { id: 'first_step', titleKey: 'ach_first_step_title', descKey: 'ach_first_step_desc' },
    { id: 'game_rookie', titleKey: 'ach_game_rookie_title', descKey: 'ach_game_rookie_desc' },
    { id: 'perfect_game', titleKey: 'ach_perfect_game_title', descKey: 'ach_perfect_game_desc' },
    { id: 'phrasal_explorer', titleKey: 'ach_phrasal_explorer_title', descKey: 'ach_phrasal_explorer_desc' },
    { id: 'idiom_hunter', titleKey: 'ach_idiom_hunter_title', descKey: 'ach_idiom_hunter_desc' },
    { id: 'collocation_seeker', titleKey: 'ach_collocation_seeker_title', descKey: 'ach_collocation_seeker_desc' },
    { id: 'word_hunter', titleKey: 'ach_word_hunter_title', descKey: 'ach_word_hunter_desc' },
    { id: 'hard_conqueror', titleKey: 'ach_hard_conqueror_title', descKey: 'ach_hard_conqueror_desc' },
    { id: 'streak_3', titleKey: 'ach_streak_3_title', descKey: 'ach_streak_3_desc' },
    { id: 'exp_bronze', titleKey: 'ach_exp_bronze_title', descKey: 'ach_exp_bronze_desc' },
    { id: 'speed_player', titleKey: 'ach_speed_player_title', descKey: 'ach_speed_player_desc' },
    { id: 'a1_explorer', titleKey: 'ach_a1_explorer_title', descKey: 'ach_a1_explorer_desc' },
    { id: 'ear_master', titleKey: 'ach_ear_master_title', descKey: 'ach_ear_master_desc' },
    { id: 'context_hero', titleKey: 'ach_context_hero_title', descKey: 'ach_context_hero_desc' },
    { id: 'phrasal_master', titleKey: 'ach_phrasal_master_title', descKey: 'ach_phrasal_master_desc' },
    { id: 'idiom_master', titleKey: 'ach_idiom_master_title', descKey: 'ach_idiom_master_desc' },
    { id: 'collocation_master', titleKey: 'ach_collocation_master_title', descKey: 'ach_collocation_master_desc' },
    { id: 'c1_polymath', titleKey: 'ach_c1_polymath_title', descKey: 'ach_c1_polymath_desc' },
    { id: 'word_collector', titleKey: 'ach_word_collector_title', descKey: 'ach_word_collector_desc' },
    { id: 'b1_scholar', titleKey: 'ach_b1_scholar_title', descKey: 'ach_b1_scholar_desc' },
    { id: 'perfectionist', titleKey: 'ach_perfectionist_title', descKey: 'ach_perfectionist_desc' },
    { id: 'game_addict', titleKey: 'ach_game_addict_title', descKey: 'ach_game_addict_desc' },
    { id: 'streak_7', titleKey: 'ach_streak_7_title', descKey: 'ach_streak_7_desc' },
    { id: 'hard_annihilator', titleKey: 'ach_hard_annihilator_title', descKey: 'ach_hard_annihilator_desc' },
    { id: 'phrasal_guru', titleKey: 'ach_phrasal_guru_title', descKey: 'ach_phrasal_guru_desc' },
    { id: 'idiom_sage', titleKey: 'ach_idiom_sage_title', descKey: 'ach_idiom_sage_desc' },
    { id: 'collocation_architect', titleKey: 'ach_collocation_architect_title', descKey: 'ach_collocation_architect_desc' },
    { id: 'exp_silver', titleKey: 'ach_exp_silver_title', descKey: 'ach_exp_silver_desc' },
    { id: 'word_expert', titleKey: 'ach_word_expert_title', descKey: 'ach_word_expert_desc' },
    { id: 'perfect_sovereign', titleKey: 'ach_perfect_sovereign_title', descKey: 'ach_perfect_sovereign_desc' },
    { id: 'game_champion', titleKey: 'ach_game_champion_title', descKey: 'ach_game_champion_desc' },
    { id: 'ear_god', titleKey: 'ach_ear_god_title', descKey: 'ach_ear_god_desc' },
    { id: 'context_god', titleKey: 'ach_context_god_title', descKey: 'ach_context_god_desc' },
    { id: 'exp_gold', titleKey: 'ach_exp_gold_title', descKey: 'ach_exp_gold_desc' },
    { id: 'streak_30', titleKey: 'ach_streak_30_title', descKey: 'ach_streak_30_desc' },
    { id: 'word_master', titleKey: 'ach_word_master_title', descKey: 'ach_word_master_desc' },
    { id: 'game_grandmaster', titleKey: 'ach_game_grandmaster_title', descKey: 'ach_game_grandmaster_desc' },
    { id: 'exp_legend', titleKey: 'ach_exp_legend_title', descKey: 'ach_exp_legend_desc' },
    { id: 'word_legend', titleKey: 'ach_word_legend_title', descKey: 'ach_word_legend_desc' },
    { id: 'word_titan', titleKey: 'ach_word_titan_title', descKey: 'ach_word_titan_desc' },
    { id: 'word_god', titleKey: 'ach_word_god_title', descKey: 'ach_word_god_desc' },
    { id: 'exp_deity', titleKey: 'ach_exp_deity_title', descKey: 'ach_exp_deity_desc' },
];

function checkAndAwardAchievements(ctx) {
    chrome.storage.local.get({ savedWords: [], achievements: {}, gameStats: {}, srsStreakStats: { currentStreak: 0, lastStudyDate: '', bestStreak: 0 }, achievementBaseline: {} }, ({ savedWords, achievements, gameStats, srsStreakStats, achievementBaseline }) => {
        const wordCount = savedWords.length;
        const legacyMax = savedWords.reduce((m, w) => Math.max(m, w.streak ?? 0), 0);
        const srsStreak = Math.max(srsStreakStats.currentStreak || 0, legacyMax);
        const expPoints = gameStats.totalExp || 0;

        const phrasalCount = savedWords.filter(w => typeof PHRASAL_VERBS_DB !== 'undefined' && PHRASAL_VERBS_DB[w.word.toLowerCase()]).length;
        const idiomCount = savedWords.filter(w => typeof IDIOMS_DB !== 'undefined' && IDIOMS_DB[w.word.toLowerCase()]).length;
        const collocationCount = savedWords.filter(w => {
            const lower = w.word.toLowerCase();
            const isP = typeof PHRASAL_VERBS_DB !== 'undefined' && PHRASAL_VERBS_DB[lower];
            const isI = typeof IDIOMS_DB !== 'undefined' && IDIOMS_DB[lower];
            return !isP && !isI && w.word.trim().includes(' ');
        }).length;
        const hardCount = savedWords.filter(w => w.hard).length;
        const a1a2Count = savedWords.filter(w => w.cefrLevel === 'A1' || w.cefrLevel === 'A2').length;
        const b1b2Count = savedWords.filter(w => w.cefrLevel === 'B1' || w.cefrLevel === 'B2').length;
        const c1c2Count = savedWords.filter(w => w.cefrLevel === 'C1' || w.cefrLevel === 'C2').length;

        // Sözlüğe dayalı başarımlar (kelime sayısı, CEFR, phrasal/deyim/eş dizim, zor etiket)
        // "Oyun ve Başarımları Sıfırla" ile sıfırlandığında, sözlük silinmediği için ham sayı
        // hâlâ eşiği geçiyor olabilir — bu yüzden sıfırlama anında donan taban çizgisini düşüyoruz,
        // böylece başarım ancak sıfırlamadan SONRAKİ yeni ilerlemeyle yeniden kazanılır.
        const eff = (raw, key) => Math.max(0, raw - (achievementBaseline[key] || 0));
        const effWordCount = eff(wordCount, 'wordCount');
        const effPhrasalCount = eff(phrasalCount, 'phrasalCount');
        const effIdiomCount = eff(idiomCount, 'idiomCount');
        const effCollocationCount = eff(collocationCount, 'collocationCount');
        const effHardCount = eff(hardCount, 'hardCount');
        const effA1A2Count = eff(a1a2Count, 'a1a2Count');
        const effB1B2Count = eff(b1b2Count, 'b1b2Count');
        const effC1C2Count = eff(c1c2Count, 'c1c2Count');

        const checks = {
            first_step: effWordCount >= 1, word_hunter: effWordCount >= 10, word_collector: effWordCount >= 50,
            word_expert: effWordCount >= 150, word_master: effWordCount >= 300, word_legend: effWordCount >= 750,
            word_titan: effWordCount >= 1000, word_god: effWordCount >= 1500,
            perfect_game: (gameStats.perfectGames || 0) >= 1, perfectionist: (gameStats.perfectGames || 0) >= 10, perfect_sovereign: (gameStats.perfectGames || 0) >= 30,
            game_rookie: (gameStats.totalGamesPlayed || 0) >= 1, speed_player: (gameStats.totalGamesPlayed || 0) >= 20,
            game_addict: (gameStats.totalGamesPlayed || 0) >= 100, game_champion: (gameStats.totalGamesPlayed || 0) >= 250, game_grandmaster: (gameStats.totalGamesPlayed || 0) >= 500,
            ear_master: (gameStats.dictationCorrect || 0) >= 25, ear_god: (gameStats.dictationCorrect || 0) >= 100,
            context_hero: (gameStats.contextCorrect || 0) >= 25, context_god: (gameStats.contextCorrect || 0) >= 100,
            hard_conqueror: effHardCount >= 10, hard_annihilator: effHardCount >= 30,
            a1_explorer: effA1A2Count >= 25,
            b1_scholar: effB1B2Count >= 35,
            c1_polymath: effC1C2Count >= 15,
            phrasal_explorer: effPhrasalCount >= 5,
            phrasal_master: effPhrasalCount >= 15,
            phrasal_guru: effPhrasalCount >= 35,
            idiom_hunter: effIdiomCount >= 5,
            idiom_master: effIdiomCount >= 15,
            idiom_sage: effIdiomCount >= 30,
            collocation_seeker: effCollocationCount >= 5,
            collocation_master: effCollocationCount >= 15,
            collocation_architect: effCollocationCount >= 30,
            streak_3: srsStreak >= 5, streak_7: srsStreak >= 14, streak_30: srsStreak >= 30,
            exp_bronze: expPoints >= 500, exp_silver: expPoints >= 2000, exp_gold: expPoints >= 5000, exp_legend: expPoints >= 10000, exp_deity: expPoints >= 25000,
        };
        const toAward = [];
        ACHIEVEMENTS.forEach(ach => { if (!achievements[ach.id] && checks[ach.id]) {
            achievements[ach.id] = { earned: true, earnedAt: Date.now() };
            toAward.push(ach);
        } });
        if (toAward.length > 0) {
            achievements.timestamp = Date.now();
            chrome.storage.local.set({ achievements }, () => {
                addExp(toAward.length * 100, null, 'user_exp_achievement');
                toAward.forEach((ach, idx) => setTimeout(() => showAchievementToast(ach), idx * 3500));
                if (typeof renderAchievementsTab === 'function') {
                    renderAchievementsTab();
                }
            });
        }
    });
}

function showAchievementToast(ach) {
    if (window.HapticsService) window.HapticsService.celebrate();
    const toast = document.getElementById('achievement-toast');
    const iconEl = document.getElementById('achievement-toast-icon');
    const titleEl = document.getElementById('achievement-toast-title');
    const labelEl = toast ? toast.querySelector('.achievement-toast-label') : null;
    if (!toast || !iconEl || !titleEl)
        return;
    if (labelEl) {
        labelEl.textContent = getMessage('achievement_unlocked_title') || getMessage('user_exp_achievement') || 'Başarım Kazanıldı!';
    }
    const meta = ACH_ICONS[ach.id] || { bg: 'rgba(99,102,241,.18)', col: '#a5b4fc', svg: '<path d="M12 2l3 6 6 1-4.5 4.5L18 20l-6-3-6 3 1.5-6.5L3 9l6-1z"/>' };
    iconEl.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="${meta.col}" stroke-width="2">${meta.svg}</svg>`;
    titleEl.textContent = getMessage(ach.titleKey) || ach.id;
    toast.style.display = 'flex';
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => { toast.style.display = 'none'; }, 400); }, 3000);
}

function renderAchievementsTab() {
    setupAchievementsScroll();
    const grid = document.getElementById('achievements-grid');
    const expDisplay = document.getElementById('user-exp-display');
    const expLevel = document.getElementById('user-exp-level');
    const expBar = document.getElementById('user-exp-bar');
    const countLabel = document.getElementById('achievements-count-label');
    if (!grid)
        return;
    chrome.storage.local.get({ achievements: {}, gameStats: {} }, ({ achievements, gameStats }) => {
        const totalExp = gameStats.totalExp || 0;
        const level = Math.floor(totalExp / 1000) + 1;
        const expInCurrentLevel = totalExp % 1000;
        const progressPercent = Math.min(100, Math.round((expInCurrentLevel / 1000) * 100));

        if (expDisplay)
            expDisplay.textContent = totalExp.toLocaleString();
        if (expLevel) {
            const levelWord = getMessage('profile_level_title') || 'Seviye';
            expLevel.textContent = `${levelWord} ${level}`;
        }
        if (expBar)
            expBar.style.width = `${progressPercent}%`;

        let earnedCount = 0;
        grid.innerHTML = '';
        ACHIEVEMENTS.forEach(ach => {
            const isEarned = achievements[ach.id] && achievements[ach.id].earned;
            if (isEarned) earnedCount++;
            const currentLang = document.documentElement.lang || 'tr';
            const earnedAt = isEarned ? new Date(achievements[ach.id].earnedAt).toLocaleDateString(currentLang, { day: 'numeric', month: 'short', year: 'numeric' }) : null;
            const title = getMessage(ach.titleKey) || ach.id;
            const desc = getMessage(ach.descKey) || '';

            const badge = document.createElement('div');
            badge.className = `ach-badge ${isEarned ? 'earned' : 'locked'}`;
            const tooltip = isEarned 
                ? `${title}: ${desc} (${getMessage('achievement_earned_on') || 'Kazanıldı:'} ${earnedAt})`
                : `${title}: ${desc} (${getMessage('achievement_locked') || 'Kilitli'})`;
            badge.setAttribute('title', tooltip);

            const meta = ACH_ICONS[ach.id] || { bg: 'rgba(99,102,241,.18)', col: '#a5b4fc', svg: '<path d="M12 2l3 6 6 1-4.5 4.5L18 20l-6-3-6 3 1.5-6.5L3 9l6-1z"/>' };

            badge.innerHTML = `
                <div class="ach-icon" style="${isEarned ? `background:linear-gradient(135deg, ${meta.bg.replace('.18', '.26').replace('.22', '.3')}, ${meta.bg.replace('.18', '.08').replace('.22', '.1')});border-color:${meta.col}60;color:${meta.col};box-shadow:0 4px 12px -2px ${meta.col}35, inset 0 1px 1px rgba(255,255,255,0.28);` : ''}">
                    ${isEarned ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="${meta.col}" stroke-width="2">${meta.svg}</svg>` : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>'}
                </div>
                <div class="ach-title">${title}</div>
            `;
            grid.appendChild(badge);
        });

        if (countLabel) {
            const achWord = getMessage('achievements_title') || 'Başarımlar';
            countLabel.textContent = `${achWord} · ${earnedCount} / ${ACHIEVEMENTS.length}`;
        }
    });
}
const CEFR_COLORS = (typeof GLOBAL_CEFR_COLORS !== 'undefined') ? GLOBAL_CEFR_COLORS : { 'A1': '#4ade80', 'A2': '#16a34a', 'B1': '#fde047', 'B2': '#ca8a04', 'C1': '#f87171', 'C2': '#b91c1c', 'phrasal': '#c084fc', 'Phrasal': '#c084fc', 'Idiom': '#fb923c', 'COL': '#38bdf8', '??': '#64748b' };
function renderStatsTab() {
    chrome.storage.local.get({ savedWords: [], gameStats: {} }, ({ savedWords, gameStats }) => {
        renderGameStatsCards(gameStats);
        renderVocabGrowthChart(savedWords);
        // CEFR seviyeleri storage'da tutulmaz, anlık sorgu gerekiyor
        const uniqueWords = [...new Set(savedWords.map(w => w.word.toLowerCase()))];
        if (uniqueWords.length === 0) {
            renderCefrRingChart([]);
            return;
        }
        chrome.runtime.sendMessage({ action: 'batch_lookup_cefr', words: uniqueWords }, (res) => {
            const cefrMap = res?.cefrMap || {};
            const annotated = savedWords.map(w => {
                const wl = w.word.toLowerCase();
                const isPhrasal = typeof PHRASAL_VERBS_DB !== 'undefined' && PHRASAL_VERBS_DB[wl];
                const isIdiom = typeof IDIOMS_DB !== 'undefined' && IDIOMS_DB[wl];
                const isCollocation = wl.trim().includes(' ') && !isPhrasal && !isIdiom;
                let cefrLevel;
                if (isPhrasal) {
                    cefrLevel = 'Phrasal';
                } else if (isIdiom) {
                    cefrLevel = 'Idiom';
                } else if (isCollocation) {
                    cefrLevel = 'COL';
                } else {
                    cefrLevel = cefrMap[wl] || '??';
                }
                return { ...w, cefrLevel };
            });
            renderCefrRingChart(annotated);
        });
    });
}
function renderGameStatsCards(gameStats) {
    const container = document.getElementById('stats-game-cards');
    if (!container)
        return;
    const gameTypes = ['multiple_choice', 'fill_blank', 'scramble', 'match', 'dictation', 'context_choice'];
    let totalCorrect = 0, totalQ = 0;
    gameTypes.forEach(t => { totalCorrect += gameStats[`game_${t}_correct`] || 0; totalQ += gameStats[`game_${t}_questions`] || 0; });
    const avgAccuracy = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;
    const totalPlayed = gameStats.totalGamesPlayed || 0;
    const maxScore = gameStats.bestScore || 0;

    container.innerHTML = `
        <div class="stat-card">
            <div class="stat-card-top">
                <div class="stat-icon-badge stat-icon-green">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div class="stat-num stat-num-green">${totalQ > 0 ? `${avgAccuracy}%` : '—'}</div>
            </div>
            <div class="stat-label">${getMessage('stats_avg_accuracy') || 'Ort. Başarı'}</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-top">
                <div class="stat-icon-badge stat-icon-indigo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="4"/><path d="M6 12h4M8 10v4M15 11h.01M18 13h.01"/></svg>
                </div>
                <div class="stat-num stat-num-indigo">${totalPlayed > 0 ? totalPlayed : '—'}</div>
            </div>
            <div class="stat-label">${getMessage('stats_total_games') || 'Oynanan Oyun'}</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-top">
                <div class="stat-icon-badge stat-icon-amber">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 22V16.5M14 22V16.5M8 4h8a4 4 0 0 1 4 4v2a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6V8a4 4 0 0 1 4-4z"/></svg>
                </div>
                <div class="stat-num stat-num-amber">${maxScore > 0 ? maxScore : '—'}</div>
            </div>
            <div class="stat-label">${getMessage('stats_best_score') || 'En Yüksek Skor'}</div>
        </div>
    `;
}
function renderCefrRingChart(savedWords) {
    const canvas = document.getElementById('stats-cefr-canvas'), legend = document.getElementById('stats-cefr-legend');
    if (!canvas || !legend)
        return;
    const size = 140;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext('2d');
    ctx.resetTransform?.();
    ctx.scale(dpr, dpr);

    const counts = {};
    savedWords.forEach(w => { const lvl = w.cefrLevel || '??'; counts[lvl] = (counts[lvl] || 0) + 1; });
    const total = savedWords.length;
    if (total === 0) {
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = 'rgba(99,102,241,0.12)';
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
        ctx.fill();
        legend.innerHTML = `<div class="stats-no-data">${getMessage('stats_no_data') || 'Henüz kayıtlı kelime yok.'}</div>`;
        return;
    }
    const levels = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const cx = size / 2, cy = size / 2, outerR = size / 2 - 8, innerR = outerR * 0.58;
    let startAngle = -Math.PI / 2;
    ctx.clearRect(0, 0, size, size);
    levels.forEach(([level, count]) => {
        const slice = (count / total) * Math.PI * 2, color = CEFR_COLORS[level] || '#64748b';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, outerR, startAngle, startAngle + slice);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        startAngle += slice;
    });
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = '#18181b';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(size * 0.16)}px Outfit,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total, cx, cy - 7);
    ctx.font = `700 ${Math.floor(size * 0.085)}px Outfit,sans-serif`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText((getMessage('word_count_lbl') || 'kelime').toLowerCase(), cx, cy + 13);
    legend.innerHTML = levels.map(([level, count]) => {
        const pct = Math.round((count / total) * 100), color = CEFR_COLORS[level] || '#64748b';
        return `
            <div class="stats-cefr-chip">
                <span class="stats-cefr-dot" style="background:${color};box-shadow:0 0 6px ${color}80;"></span>
                <span class="stats-cefr-name">${level}</span>
                <span class="stats-cefr-count">${count} <small>(${pct}%)</small></span>
            </div>
        `;
    }).join('');
}
function renderVocabGrowthChart(savedWords) {
    const canvas = document.getElementById('stats-growth-canvas');
    if (!canvas)
        return;

    const draw = () => {
        const rect = canvas.getBoundingClientRect();
        const W = Math.floor(rect.width) || canvas.offsetWidth || 260;
        const H = 130;
        const dpr = window.devicePixelRatio || 1;

        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.height = `${H}px`;

        const ctx = canvas.getContext('2d');
        ctx.resetTransform?.();
        ctx.scale(dpr, dpr);

        const now = Date.now(), DAY = 86400000, days = 30;
        const counts = new Array(days).fill(0);
        savedWords.forEach(w => {
            const addedTime = w.createdAt || w.timestamp;
            if (!addedTime) return;
            const d = Math.floor((now - addedTime) / DAY);
            if (d >= 0 && d < days)
                counts[days - 1 - d]++;
        });
        const maxVal = Math.max(...counts, 1);
        const pad = { top: 14, right: 14, bottom: 24, left: 26 };
        const chartW = W - pad.left - pad.right, chartH = H - pad.top - pad.bottom;
        ctx.clearRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = pad.top + chartH - (i / 4) * chartH;
            ctx.beginPath();
            ctx.moveTo(pad.left, y);
            ctx.lineTo(pad.left + chartW, y);
            ctx.stroke();
        }
        const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
        gradient.addColorStop(0, 'rgba(99,102,241,0.35)');
        gradient.addColorStop(1, 'rgba(99,102,241,0.01)');
        const stepX = chartW / (days - 1);
        ctx.beginPath();
        counts.forEach((val, i) => { const x = pad.left + i * stepX, y = pad.top + chartH - (val / maxVal) * chartH; if (i === 0)
            ctx.moveTo(x, y);
        else
            ctx.lineTo(x, y); });
        const lastX = pad.left + (days - 1) * stepX;
        ctx.lineTo(lastX, pad.top + chartH);
        ctx.lineTo(pad.left, pad.top + chartH);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.beginPath();
        counts.forEach((val, i) => { const x = pad.left + i * stepX, y = pad.top + chartH - (val / maxVal) * chartH; if (i === 0)
            ctx.moveTo(x, y);
        else
            ctx.lineTo(x, y); });
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2.2;
        ctx.lineJoin = 'round';
        ctx.stroke();
        counts.forEach((val, i) => {
            if (val === 0)
                return;
            const x = pad.left + i * stepX, y = pad.top + chartH - (val / maxVal) * chartH;
            ctx.beginPath();
            ctx.arc(x, y, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = '#a5b4fc';
            ctx.fill();
        });
        ctx.fillStyle = '#94a3b8';
        ctx.font = '700 11px Outfit,sans-serif';
        ctx.textAlign = 'center';
        for (let i = 0; i < days; i += 7) {
            const x = pad.left + i * stepX, daysBack = days - 1 - i;
            ctx.fillText(daysBack === 0 ? (getMessage('srs_status_today') || 'Bugün') : `-${daysBack}d`, x, H - 6);
        }
        ctx.textAlign = 'right';
        ctx.fillText(maxVal, pad.left - 4, pad.top + 4);
    };

    draw();

    if (!canvas._growthResizeObs) {
        canvas._growthResizeObs = new ResizeObserver(() => {
            draw();
        });
        canvas._growthResizeObs.observe(canvas.parentElement || canvas);
    }
}
