// ── Review Alt Sekmeleri ──────────────────────────────────────────────────────
let activeConfirmCallback = null;
function initReviewSubtabs() {
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
        });
    }
    const exitBtn = document.getElementById('game-exit-btn');
    if (exitBtn) {
        exitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showCustomConfirm("game_quit_confirm", () => { activeGame.type = null; loadGamesHub(); });
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
            showCustomConfirm("game_quit_confirm", () => { activeGame.type = null; loadGamesHub(); });
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
function showCustomConfirm(messageKey, onConfirm, okTextKey = "game_btn_quit", cancelTextKey = "game_btn_cancel") {
    const overlay = document.getElementById('custom-confirm-overlay');
    const msgEl = document.getElementById('custom-confirm-message');
    const okBtn = document.getElementById('custom-confirm-ok');
    const cancelBtn = document.getElementById('custom-confirm-cancel');
    activeConfirmCallback = onConfirm;
    if (!overlay || !msgEl || !okBtn || !cancelBtn) {
        if (confirm(getMessage(messageKey) || "Emin misiniz?")) {
            if (onConfirm)
                onConfirm();
        }
        return;
    }
    msgEl.textContent = getMessage(messageKey) || "Oyundan çıkmak istediğinize emin misiniz?";
    okBtn.textContent = getMessage(okTextKey) || "Çık";
    cancelBtn.textContent = getMessage(cancelTextKey) || "Vazgeç";
    overlay.style.display = 'flex';
}
// ── Oyun State & Hub ──────────────────────────────────────────────────────────
let activeGame = {
    type: null, words: [], currentIndex: 0, score: 0,
    selectedTile: null, matchedWords: [], scrambleInput: [], skippedWords: []
};
function loadGamesHub() {
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
    chrome.storage.local.get({ savedWords: [], licenseType: 'FREE', googleSyncEmail: '' }, ({ savedWords, licenseType, googleSyncEmail }) => {
        const container = document.getElementById('review-games-content');
        const existingEmpty = container.querySelector('.games-empty-state');
        if (existingEmpty)
            existingEmpty.remove();
        if (statsContainer)
            statsContainer.style.display = 'flex';
        renderStatsTab();
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
        const isPremium = !!googleSyncEmail && licenseType !== 'FREE';
        document.querySelectorAll('.game-card').forEach(card => {
            const gameType = card.dataset.game;
            const isPremiumGame = gameType !== 'multiple_choice' && gameType !== 'fill_blank';
            const isLocked = isPremiumGame && !isPremium;

            const newCard = card.cloneNode(true);
            if (isLocked) {
                newCard.classList.add('locked');
            } else {
                newCard.classList.remove('locked');
            }

            card.parentNode.replaceChild(newCard, card);
            newCard.addEventListener('click', () => {
                if (isLocked) {
                    if (typeof showPremiumModal === 'function') {
                        showPremiumModal(
                            getMessage("premium_modal_title") || "Premium Özellik",
                            getMessage("premium_game_locked_desc") || "Bu oyunu oynayabilmek için Premium üyeliğe yükseltmeniz gerekmektedir."
                        );
                    }
                    return;
                }
                startMiniGame(gameType, savedWords);
            });
        });
    });
}
function startMiniGame(gameType, savedWords) {
    let eligibleWords = savedWords;
    if (gameType === 'context_choice') {
        eligibleWords = savedWords.filter(w => w.context && w.context.trim() && w.context.toLowerCase().includes(w.word.toLowerCase()));
        if (eligibleWords.length < 4) {
            const msg = getMessage('game_context_no_words') || 'Bu oyun için cümlesi olan en az 4 kelime gerekli.';
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
    }
    activeGame.type = gameType;
    activeGame.currentIndex = 0;
    activeGame.score = 0;
    activeGame.selectedTile = null;
    activeGame.matchedWords = [];
    activeGame.scrambleInput = [];
    activeGame.skippedWords = [];
    let deck = gameType === 'context_choice' ? [...eligibleWords] : [...savedWords];
    if (gameType === 'fill_blank') {
        const withCtx = deck.filter(w => w.context && w.context.trim() && w.context.toLowerCase().includes(w.word.toLowerCase()));
        const withoutCtx = deck.filter(w => !(w.context && w.context.trim() && w.context.toLowerCase().includes(w.word.toLowerCase())));
        deck = [...withCtx, ...withoutCtx];
    }
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    activeGame.words = deck.slice(0, Math.min(10, deck.length));
    document.getElementById('games-hub').style.display = 'none';
    document.getElementById('game-play-area').style.display = 'flex';
    const statsContainer = document.getElementById('games-stats-container');
    if (statsContainer)
        statsContainer.style.display = 'none';
    const subtabs = document.getElementById('review-subtabs');
    if (subtabs)
        subtabs.style.display = 'none';
    renderGameQuestion();
}
// ── Oyun Soru Yöneticisi ──────────────────────────────────────────────────────
function renderGameQuestion() {
    const stage = document.getElementById('game-stage');
    stage.innerHTML = '';
    const totalQuestions = activeGame.type === 'match' ? Math.ceil(activeGame.words.length / 5) : activeGame.words.length;
    const progressPercent = activeGame.type === 'match'
        ? (activeGame.words.length > 0 ? (activeGame.score / activeGame.words.length) * 100 : 0)
        : (activeGame.currentIndex / totalQuestions) * 100;
    document.getElementById('game-progress-bar').style.width = `${progressPercent}%`;
    const scoreText = getMessage("game_score_lbl") || "Skor: {score}";
    document.getElementById('game-play-score').textContent = scoreText.replace('{score}', activeGame.score);
    const typeToKey = { multiple_choice: 'game_mc_title', fill_blank: 'game_blank_title', scramble: 'game_scramble_title', match: 'game_match_title', dictation: 'game_dictation_title', context_choice: 'game_context_title' };
    document.getElementById('game-play-title').textContent = getMessage(typeToKey[activeGame.type] || '') || activeGame.type;
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
        const distractors = [...new Set(savedWords.filter(w => w.word.toLowerCase() !== target.word.toLowerCase()).map(w => w.translation))].slice(0, 3);
        while (distractors.length < 3)
            distractors.push("—");
        const options = [target.translation, ...distractors];
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }
        const mcDiv = document.createElement('div');
        mcDiv.className = 'mc-stage';
        mcDiv.innerHTML = `<div class="mc-word">${target.word}</div><div class="mc-choices">${options.map((opt, i) => `<button class="mc-btn" data-opt="${opt}"><span class="mc-btn-badge">${i + 1}</span>${opt}</button>`).join('')}</div>`;
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
        fbDiv.innerHTML = `<div class="blank-sentence">"${sentence}"</div><div class="blank-hint">Türkçe Çeviri: <strong>"${target.translation}"</strong></div><div class="mc-choices" style="margin-top:6px;">${options.map((opt, i) => `<button class="mc-btn" data-opt="${opt}"><span class="mc-btn-badge">${i + 1}</span>${opt}</button>`).join('')}</div>`;
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
    ${hintSentence ? `<div class="blank-sentence" style="min-height:unset;">"${hintSentence}"</div>` : ''}
    <div class="blank-hint" style="margin-bottom:4px;">Türkçe Çeviri: <strong>"${target.translation}"</strong></div>
    <div class="scramble-input-box" id="scramble-input-box"></div>
    <div class="scramble-tiles" id="scramble-tiles">${scrambled.map((char, index) => `<button class="scramble-tile" data-index="${index}" data-char="${char}">${char}</button>`).join('')}</div>
    <div class="scramble-actions">
      <button class="scramble-btn clear-btn" id="scramble-clear-btn">${getMessage("game_btn_clear") || "Temizle"}</button>
      <button class="scramble-btn check-btn" id="scramble-check-btn" disabled>${getMessage("game_btn_check") || "Kontrol Et"}</button>
      <button class="scramble-btn skip-btn" id="scramble-skip-btn">${getMessage("game_btn_skip") || "Atla"}</button>
    </div>
    <div id="scramble-result-msg"></div>
  `;
    stage.appendChild(scrDiv);
    const inputBox = scrDiv.querySelector('#scramble-input-box');
    const checkBtn = scrDiv.querySelector('#scramble-check-btn');
    const clearBtn = scrDiv.querySelector('#scramble-clear-btn');
    const skipBtn = scrDiv.querySelector('#scramble-skip-btn');
    const resultMsg = scrDiv.querySelector('#scramble-result-msg');
    function updateScrambleUI() {
        inputBox.innerHTML = '';
        for (let i = 0; i < cleanWord.length; i++) {
            const spot = document.createElement('div');
            spot.className = 'scramble-input-letter';
            if (i < activeGame.scrambleInput.length) {
                spot.textContent = activeGame.scrambleInput[i].char;
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
            resultMsg.innerHTML = `<div class="scramble-correct-answer" style="background:rgba(16,185,129,0.15);color:var(--green);border-color:var(--green);">✨ Doğru! (Correct!)</div>`;
            playSoundEffect('correct');
            handleGameAnswer(true, target);
            setTimeout(() => { activeGame.currentIndex++; renderGameQuestion(); }, 1500);
        }
        else {
            resultMsg.innerHTML = `<div class="scramble-correct-answer" style="background:rgba(239,68,68,0.15);color:var(--red);border-color:var(--red);">✗ Yanlış! Doğrusu: <strong>${cleanWord}</strong></div>`;
            playSoundEffect('wrong');
            handleGameAnswer(false, target);
            const continueBtn = document.createElement('button');
            continueBtn.id = 'scramble-continue-btn';
            continueBtn.className = 'scramble-btn check-btn';
            continueBtn.style.marginTop = '8px';
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
      <div class="match-col" id="match-english-col">${englishItems.map((item, idx) => `<div class="match-tile${activeGame.matchedWords?.includes(item.id) ? ' matched' : ''}" data-side="en" data-id="${item.id}"><span class="match-key-badge">${idx + 1}</span> ${item.text}</div>`).join('')}</div>
      <div class="match-col" id="match-turkish-col">${turkishItems.map((item, idx) => `<div class="match-tile${activeGame.matchedWords?.includes(item.id) ? ' matched' : ''}" data-side="tr" data-id="${item.id}"><span class="match-key-badge">${idx === 4 ? 0 : idx + 6}</span> ${item.text}</div>`).join('')}</div>
    </div>`;
    stage.appendChild(matchDiv);
    let selectedTile = null;
    matchDiv.querySelectorAll('.match-tile').forEach(tile => {
        tile.addEventListener('click', () => {
            if (tile.classList.contains('matched') || tile.classList.contains('error'))
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
                    const scoreText = getMessage("game_score_lbl") || "Skor: {score}";
                    document.getElementById('game-play-score').textContent = scoreText.replace('{score}', activeGame.score);
                    document.getElementById('game-progress-bar').style.width = `${activeGame.words.length > 0 ? (activeGame.score / activeGame.words.length) * 100 : 0}%`;
                    if (matchDiv.querySelectorAll('.match-tile.matched').length === roundWords.length * 2) {
                        setTimeout(() => { activeGame.currentIndex++; renderGameQuestion(); }, 1000);
                    }
                }
                else {
                    const t1 = selectedTile, t2 = tile;
                    t1.classList.remove('selected');
                    t1.classList.add('error');
                    t2.classList.add('error');
                    selectedTile = null;
                    playSoundEffect('wrong');
                    if (currentWordItem)
                        handleGameAnswer(false, currentWordItem);
                    setTimeout(() => { t1.classList.remove('error'); t2.classList.remove('error'); }, 600);
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
    if (isCorrect) {
        addExp(5, null, '');
        return;
    }
    chrome.storage.local.get({ savedWords: [] }, ({ savedWords }) => {
        const idx = savedWords.findIndex(w => w.word.toLowerCase() === targetWordItem.word.toLowerCase());
        if (idx !== -1) {
            let againCount = savedWords[idx].againCount ?? 0;
            againCount++;
            savedWords[idx] = { ...savedWords[idx], againCount, hard: againCount >= 3 };
            chrome.storage.local.set({ savedWords }, () => { updateReviewBadge(); });
        }
    });
}
function showGameResult(totalQuestions) {
    const stage = document.getElementById('game-stage');
    stage.innerHTML = '';
    const maxPossibleScore = activeGame.type === 'match' ? activeGame.words.length : totalQuestions;
    const isPerfect = activeGame.score === maxPossibleScore && maxPossibleScore > 0;
    chrome.storage.local.get({ gameStats: {} }, ({ gameStats }) => {
        gameStats.totalGamesPlayed = (gameStats.totalGamesPlayed || 0) + 1;
        gameStats.totalCorrect = (gameStats.totalCorrect || 0) + activeGame.score;
        if (isPerfect)
            gameStats.perfectGames = (gameStats.perfectGames || 0) + 1;
        gameStats.bestScore = Math.max(gameStats.bestScore || 0, activeGame.score);
        const prefix = `game_${activeGame.type}`;
        gameStats[`${prefix}_played`] = (gameStats[`${prefix}_played`] || 0) + 1;
        gameStats[`${prefix}_correct`] = (gameStats[`${prefix}_correct`] || 0) + activeGame.score;
        gameStats[`${prefix}_questions`] = (gameStats[`${prefix}_questions`] || 0) + maxPossibleScore;
        gameStats[`${prefix}_highScore`] = Math.max(gameStats[`${prefix}_highScore`] || 0, activeGame.score);
        chrome.storage.local.set({ gameStats }, () => {
            addExp(isPerfect ? 50 : 20, null, 'user_exp_game_completed');
            setTimeout(() => checkAndAwardAchievements({ type: 'game_end' }), 500);
        });
    });
    playSoundEffect('complete');
    const resDiv = document.createElement('div');
    resDiv.className = 'game-result-container';
    let skippedHtml = '';
    if (activeGame.skippedWords && activeGame.skippedWords.length > 0) {
        skippedHtml = `<div style="margin-top:15px;font-weight:700;font-size:13px;color:var(--text);text-align:left;">⭐️ Atlanan Kelimeler:</div>
      <div style="margin-top:6px;max-height:150px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding:4px;border-radius:6px;border:1px dashed var(--border);background:rgba(0,0,0,0.15);">
        ${activeGame.skippedWords.map(w => `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:var(--surface2);border-radius:4px;font-size:12px;border-left:3px solid #f59e0b;"><span style="font-weight:700;color:var(--text);">${w.word}</span><span style="color:var(--text-muted);font-style:italic;">${w.translation}</span></div>`).join('')}
      </div>`;
    }
    resDiv.innerHTML = `
    <div class="game-result-icon">🎉</div>
    <div class="game-result-title">${getMessage("game_result_title") || "Oyun Bitti!"}</div>
    <div class="game-result-score-circle" style="margin:10px auto;">
      <span class="game-result-score-num">${activeGame.score} / ${maxPossibleScore}</span>
      <span class="game-result-score-lbl">Skor</span>
    </div>
    <p class="game-result-desc" style="margin-bottom:15px;">${(getMessage("game_result_score") || "Skorunuz: {score} / {total}").replace('{score}', activeGame.score).replace('{total}', maxPossibleScore)}</p>
    ${skippedHtml}
    <button class="srs-start-btn" id="game-result-back-btn" style="width:100%;margin-top:15px;">${getMessage("game_result_btn_back") || "Oyun Seçimine Dön"}</button>
  `;
    stage.appendChild(resDiv);
    resDiv.querySelector('#game-result-back-btn').addEventListener('click', () => { activeGame.type = null; loadGamesHub(); });
}
// ── Dikte Oyunu ───────────────────────────────────────────────────────────────
function renderDictationQuestion() {
    const stage = document.getElementById('game-stage');
    const target = activeGame.words[activeGame.currentIndex];
    const listenText = (getMessage('game_dictation_listen') || 'Tekrar Dinle').replace(/^🔊\s*/, '');
    const dictDiv = document.createElement('div');
    dictDiv.className = 'dictation-stage';
    dictDiv.innerHTML = `
    <button class="dictation-listen-btn" id="dictation-listen-btn"><span class="dictation-speaker-emoji">🔊</span><span>${listenText}</span></button>
    <div class="dictation-hint">💡 ${target.translation}</div>
    <div class="dictation-input-wrap">
      <input type="text" class="dictation-input" id="dictation-input" placeholder="${getMessage('game_dictation_placeholder') || 'Kelimeyi buraya yazın...'}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
    </div>
    <div class="dictation-actions">
      <button class="dictation-check-btn" id="dictation-check-btn" disabled>${getMessage('game_btn_check') || 'Kontrol Et'}</button>
      <button class="dictation-skip-btn" id="dictation-skip-btn">${getMessage('game_btn_skip') || 'Atla'}</button>
    </div>
    <div id="dictation-result-msg"></div>
  `;
    stage.appendChild(dictDiv);
    const input = dictDiv.querySelector('#dictation-input');
    const checkBtn = dictDiv.querySelector('#dictation-check-btn');
    const skipBtn = dictDiv.querySelector('#dictation-skip-btn');
    const listenBtn = dictDiv.querySelector('#dictation-listen-btn');
    const resultMsg = dictDiv.querySelector('#dictation-result-msg');
    speakWord(target.word, 'en');
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
    listenBtn.addEventListener('click', () => speakWord(target.word, 'en'));
    skipBtn.addEventListener('click', () => {
        if (!activeGame.skippedWords)
            activeGame.skippedWords = [];
        activeGame.skippedWords.push(target);
        handleGameAnswer(false, target);
        activeGame.currentIndex++;
        renderGameQuestion();
    });
    checkBtn.addEventListener('click', () => {
        const correct = input.value.trim().toLowerCase() === target.word.toLowerCase();
        checkBtn.disabled = true;
        skipBtn.disabled = true;
        input.disabled = true;
        input.blur();
        if (correct) {
            input.classList.add('correct-border');
            resultMsg.className = 'dictation-result-msg correct';
            resultMsg.textContent = getMessage('game_dictation_correct') || '✨ Harika, doğru heceleme!';
            activeGame.score++;
            playSoundEffect('correct');
            handleGameAnswer(true, target);
            updateGameStat('dictationCorrect', 1);
            setTimeout(() => { activeGame.currentIndex++; renderGameQuestion(); }, 1500);
        }
        else {
            input.classList.add('wrong-border');
            resultMsg.className = 'dictation-result-msg wrong';
            const msg = (getMessage('game_dictation_wrong') || '✗ Yanlış! Doğrusu: {word}').replace('{word}', target.word);
            resultMsg.textContent = msg;
            playSoundEffect('wrong');
            handleGameAnswer(false, target);
            const continueBtn = document.createElement('button');
            continueBtn.id = 'dictation-continue-btn';
            continueBtn.className = 'dictation-check-btn';
            continueBtn.style.marginTop = '8px';
            continueBtn.textContent = getMessage('game_btn_continue') || 'Devam Et';
            continueBtn.addEventListener('click', () => { activeGame.currentIndex++; renderGameQuestion(); });
            resultMsg.appendChild(continueBtn);
        }
    });
}
// ── Sahne Eşleştirme Oyunu ────────────────────────────────────────────────────
function renderContextChoiceQuestion() {
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
        const ctxDiv = document.createElement('div');
        ctxDiv.className = 'blank-stage';
        ctxDiv.innerHTML = `<div class="blank-sentence">"${sentence}"</div><div class="blank-hint">Türkçe Çeviri: <strong>"${target.translation}"</strong></div><div class="mc-choices" style="margin-top:6px;">${options.map((opt, i) => `<button class="mc-btn" data-opt="${opt}"><span class="mc-btn-badge">${i + 1}</span>${opt}</button>`).join('')}</div>`;
        stage.appendChild(ctxDiv);
        ctxDiv.querySelectorAll('.mc-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const correct = btn.dataset.opt.toLowerCase() === target.word.toLowerCase();
                ctxDiv.querySelectorAll('.mc-btn').forEach(b => b.disabled = true);
                if (correct) {
                    btn.classList.add('correct');
                    activeGame.score++;
                    playSoundEffect('correct');
                    handleGameAnswer(true, target);
                    updateGameStat('contextCorrect', 1);
                }
                else {
                    btn.classList.add('wrong');
                    playSoundEffect('wrong');
                    ctxDiv.querySelectorAll('.mc-btn').forEach(b => { if (b.dataset.opt.toLowerCase() === target.word.toLowerCase())
                        b.classList.add('correct'); });
                    handleGameAnswer(false, target);
                }
                setTimeout(() => { activeGame.currentIndex++; renderGameQuestion(); }, 1300);
            });
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
        chrome.storage.local.set({ gameStats });
    });
}
function addExp(amount, sourceElement = null, reasonKey = '') {
    if (!amount || amount <= 0)
        return;
    chrome.storage.local.get({ gameStats: {} }, ({ gameStats }) => {
        const oldExp = gameStats.totalExp || 0;
        gameStats.totalExp = oldExp + amount;
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
    toast.innerHTML = `<span class="exp-toast-amount">+${amount} XP</span> <span class="exp-toast-reason">${reason}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 2000);
}
// ── Başarımlar ────────────────────────────────────────────────────────────────
const ACHIEVEMENTS = [
    { id: 'first_step', titleKey: 'ach_first_step_title', descKey: 'ach_first_step_desc', emoji: '🌱' },
    { id: 'word_hunter', titleKey: 'ach_word_hunter_title', descKey: 'ach_word_hunter_desc', emoji: '📚' },
    { id: 'word_collector', titleKey: 'ach_word_collector_title', descKey: 'ach_word_collector_desc', emoji: '👑' },
    { id: 'word_expert', titleKey: 'ach_word_expert_title', descKey: 'ach_word_expert_desc', emoji: '🔥' },
    { id: 'word_master', titleKey: 'ach_word_master_title', descKey: 'ach_word_master_desc', emoji: '🏆' },
    { id: 'word_legend', titleKey: 'ach_word_legend_title', descKey: 'ach_word_legend_desc', emoji: '👑' },
    { id: 'word_titan', titleKey: 'ach_word_titan_title', descKey: 'ach_word_titan_desc', emoji: '🌌' },
    { id: 'word_god', titleKey: 'ach_word_god_title', descKey: 'ach_word_god_desc', emoji: '🧠' },
    { id: 'a1_explorer', titleKey: 'ach_a1_explorer_title', descKey: 'ach_a1_explorer_desc', emoji: '🗺️' },
    { id: 'b1_scholar', titleKey: 'ach_b1_scholar_title', descKey: 'ach_b1_scholar_desc', emoji: '📝' },
    { id: 'c1_polymath', titleKey: 'ach_c1_polymath_title', descKey: 'ach_c1_polymath_desc', emoji: '🔮' },
    { id: 'phrasal_master', titleKey: 'ach_phrasal_master_title', descKey: 'ach_phrasal_master_desc', emoji: '📖' },
    { id: 'game_rookie', titleKey: 'ach_game_rookie_title', descKey: 'ach_game_rookie_desc', emoji: '🎮' },
    { id: 'speed_player', titleKey: 'ach_speed_player_title', descKey: 'ach_speed_player_desc', emoji: '⚡' },
    { id: 'game_addict', titleKey: 'ach_game_addict_title', descKey: 'ach_game_addict_desc', emoji: '🎮' },
    { id: 'game_champion', titleKey: 'ach_game_champion_title', descKey: 'ach_game_champion_desc', emoji: '⚔️' },
    { id: 'game_grandmaster', titleKey: 'ach_game_grandmaster_title', descKey: 'ach_game_grandmaster_desc', emoji: '🏆' },
    { id: 'perfect_game', titleKey: 'ach_perfect_game_title', descKey: 'ach_perfect_game_desc', emoji: '🎯' },
    { id: 'perfectionist', titleKey: 'ach_perfectionist_title', descKey: 'ach_perfectionist_desc', emoji: '💎' },
    { id: 'perfect_sovereign', titleKey: 'ach_perfect_sovereign_title', descKey: 'ach_perfect_sovereign_desc', emoji: '👑' },
    { id: 'ear_master', titleKey: 'ach_ear_master_title', descKey: 'ach_ear_master_desc', emoji: '🧏' },
    { id: 'ear_god', titleKey: 'ach_ear_god_title', descKey: 'ach_ear_god_desc', emoji: '🙏️' },
    { id: 'context_hero', titleKey: 'ach_context_hero_title', descKey: 'ach_context_hero_desc', emoji: '🎬' },
    { id: 'context_god', titleKey: 'ach_context_god_title', descKey: 'ach_context_god_desc', emoji: '📽️' },
    { id: 'hard_conqueror', titleKey: 'ach_hard_conqueror_title', descKey: 'ach_hard_conqueror_desc', emoji: '🔬' },
    { id: 'hard_annihilator', titleKey: 'ach_hard_annihilator_title', descKey: 'ach_hard_annihilator_desc', emoji: '🌋' },
    { id: 'streak_3', titleKey: 'ach_streak_3_title', descKey: 'ach_streak_3_desc', emoji: '🔥' },
    { id: 'streak_7', titleKey: 'ach_streak_7_title', descKey: 'ach_streak_7_desc', emoji: '⚡' },
    { id: 'streak_30', titleKey: 'ach_streak_30_title', descKey: 'ach_streak_30_desc', emoji: '🌋' },
    { id: 'exp_bronze', titleKey: 'ach_exp_bronze_title', descKey: 'ach_exp_bronze_desc', emoji: '🥉' },
    { id: 'exp_silver', titleKey: 'ach_exp_silver_title', descKey: 'ach_exp_silver_desc', emoji: '🥈' },
    { id: 'exp_gold', titleKey: 'ach_exp_gold_title', descKey: 'ach_exp_gold_desc', emoji: '🥇' },
    { id: 'exp_legend', titleKey: 'ach_exp_legend_title', descKey: 'ach_exp_legend_desc', emoji: '👑' },
    { id: 'exp_deity', titleKey: 'ach_exp_deity_title', descKey: 'ach_exp_deity_desc', emoji: '🌟' },
];
function checkAndAwardAchievements(ctx) {
    chrome.storage.local.get({ savedWords: [], achievements: {}, gameStats: {}, srsStreakStats: { currentStreak: 0, lastStudyDate: '', bestStreak: 0 } }, ({ savedWords, achievements, gameStats, srsStreakStats }) => {
        const wordCount = savedWords.length;
        const legacyMax = savedWords.reduce((m, w) => Math.max(m, w.streak ?? 0), 0);
        const srsStreak = Math.max(srsStreakStats.currentStreak || 0, legacyMax);
        const expPoints = gameStats.totalExp || 0;
        const checks = {
            first_step: wordCount >= 1, word_hunter: wordCount >= 10, word_collector: wordCount >= 50,
            word_expert: wordCount >= 150, word_master: wordCount >= 300, word_legend: wordCount >= 750,
            word_titan: wordCount >= 1000, word_god: wordCount >= 1500,
            perfect_game: (gameStats.perfectGames || 0) >= 1, perfectionist: (gameStats.perfectGames || 0) >= 10, perfect_sovereign: (gameStats.perfectGames || 0) >= 30,
            game_rookie: (gameStats.totalGamesPlayed || 0) >= 1, speed_player: (gameStats.totalGamesPlayed || 0) >= 20,
            game_addict: (gameStats.totalGamesPlayed || 0) >= 100, game_champion: (gameStats.totalGamesPlayed || 0) >= 250, game_grandmaster: (gameStats.totalGamesPlayed || 0) >= 500,
            ear_master: (gameStats.dictationCorrect || 0) >= 25, ear_god: (gameStats.dictationCorrect || 0) >= 100,
            context_hero: (gameStats.contextCorrect || 0) >= 25, context_god: (gameStats.contextCorrect || 0) >= 100,
            hard_conqueror: savedWords.filter(w => w.hard).length >= 10, hard_annihilator: savedWords.filter(w => w.hard).length >= 30,
            a1_explorer: savedWords.filter(w => w.cefrLevel === 'A1' || w.cefrLevel === 'A2').length >= 25,
            b1_scholar: savedWords.filter(w => w.cefrLevel === 'B1' || w.cefrLevel === 'B2').length >= 35,
            c1_polymath: savedWords.filter(w => w.cefrLevel === 'C1' || w.cefrLevel === 'C2').length >= 15,
            phrasal_master: savedWords.filter(w => typeof PHRASAL_VERBS_DB !== 'undefined' && PHRASAL_VERBS_DB[w.word.toLowerCase()]).length >= 15,
            streak_3: srsStreak >= 5, streak_7: srsStreak >= 14, streak_30: srsStreak >= 30,
            exp_bronze: expPoints >= 500, exp_silver: expPoints >= 2000, exp_gold: expPoints >= 5000, exp_legend: expPoints >= 10000, exp_deity: expPoints >= 25000,
        };
        const toAward = [];
        ACHIEVEMENTS.forEach(ach => { if (!achievements[ach.id] && checks[ach.id]) {
            achievements[ach.id] = { earned: true, earnedAt: Date.now() };
            toAward.push(ach);
        } });
        if (toAward.length > 0) {
            chrome.storage.local.set({ achievements }, () => {
                addExp(toAward.length * 100, null, 'user_exp_achievement');
                toAward.forEach((ach, idx) => setTimeout(() => showAchievementToast(ach), idx * 3500));
            });
        }
    });
}
function showAchievementToast(ach) {
    const toast = document.getElementById('achievement-toast');
    const iconEl = document.getElementById('achievement-toast-icon');
    const titleEl = document.getElementById('achievement-toast-title');
    if (!toast || !iconEl || !titleEl)
        return;
    iconEl.textContent = ach.emoji;
    titleEl.textContent = getMessage(ach.titleKey) || ach.id;
    toast.style.display = 'flex';
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => { toast.style.display = 'none'; }, 400); }, 3000);
}
function renderAchievementsTab() {
    const grid = document.getElementById('achievements-grid');
    const expDisplay = document.getElementById('user-exp-display');
    if (!grid)
        return;
    chrome.storage.local.get({ achievements: {}, gameStats: {} }, ({ achievements, gameStats }) => {
        if (expDisplay)
            expDisplay.textContent = (gameStats.totalExp || 0).toLocaleString();
        grid.innerHTML = '';
        ACHIEVEMENTS.forEach(ach => {
            const earned = achievements[ach.id] && achievements[ach.id].earned;
            const earnedAt = earned ? new Date(achievements[ach.id].earnedAt).toLocaleDateString() : null;
            const card = document.createElement('div');
            card.className = `achievement-card ${earned ? 'earned' : 'locked'}`;
            card.innerHTML = `
        <div class="achievement-card-emoji">${earned ? ach.emoji : '🔒'}</div>
        <div class="achievement-card-title">${getMessage(ach.titleKey) || ach.id}</div>
        <div class="achievement-card-desc">${getMessage(ach.descKey) || ''}</div>
        ${earned ? `<div class="achievement-card-date">${getMessage('achievement_earned_on') || 'Kazanıldı:'} ${earnedAt}</div>` : ''}
      `;
            grid.appendChild(card);
        });
    });
}
// ── İstatistikler ─────────────────────────────────────────────────────────────
const CEFR_COLORS = { 'A1': '#22c55e', 'A2': '#84cc16', 'B1': '#eab308', 'B2': '#f97316', 'C1': '#ef4444', 'C2': '#a855f7', 'phrasal': '#818cf8', '??': '#64748b' };
function renderStatsTab() {
    chrome.storage.local.get({ savedWords: [], gameStats: {} }, ({ savedWords, gameStats }) => {
        renderGameStatsCards(gameStats);
        renderGameBreakdownTable(gameStats);
        renderCefrRingChart(savedWords);
        renderVocabGrowthChart(savedWords);
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
    const cards = [
        { num: gameStats.totalGamesPlayed || 0, labelKey: 'stats_total_games', label: 'Toplam Oyun' },
        { num: gameStats.totalCorrect || 0, labelKey: 'stats_total_correct', label: 'Doğru Cevap' },
        { num: gameStats.bestScore || 0, labelKey: 'stats_best_score', label: 'En Yüksek' },
        { num: totalQ > 0 ? `${avgAccuracy}%` : '-', labelKey: 'stats_avg_accuracy', label: 'Ortalama Başarı' },
        { num: gameStats.perfectGames || 0, labelKey: 'stats_perfect_games', label: 'Kusursuz Oyunlar' },
        { num: (gameStats.totalExp || 0).toLocaleString(), labelKey: 'stats_total_exp', label: 'Toplam EXP' },
    ];
    container.innerHTML = cards.map(c => `<div class="stats-mini-card"><div class="stats-mini-num">${c.num}</div><div class="stats-mini-label">${getMessage(c.labelKey) || c.label}</div></div>`).join('');
}
function renderGameBreakdownTable(gameStats) {
    const tbody = document.getElementById('stats-game-table-body');
    if (!tbody)
        return;
    const games = [
        { type: 'multiple_choice', titleKey: 'game_mc_title', fallback: 'Çoktan Seçmeli' },
        { type: 'fill_blank', titleKey: 'game_blank_title', fallback: 'Boşluk Doldurma' },
        { type: 'scramble', titleKey: 'game_scramble_title', fallback: 'Kelime Karıştırma' },
        { type: 'match', titleKey: 'game_match_title', fallback: 'Kelime Eşleştirme' },
        { type: 'dictation', titleKey: 'game_dictation_title', fallback: 'Dikte' },
        { type: 'context_choice', titleKey: 'game_context_title', fallback: 'Sahne Eşleştirme' },
    ];
    tbody.innerHTML = games.map(g => {
        const p = `game_${g.type}`;
        const played = gameStats[`${p}_played`] || 0, correct = gameStats[`${p}_correct`] || 0, totalQ = gameStats[`${p}_questions`] || 0, highScore = gameStats[`${p}_highScore`] || 0;
        const accuracy = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0;
        const accText = played > 0 ? `${accuracy}%` : '-';
        const accColor = played > 0 ? (accuracy >= 70 ? 'var(--green)' : accuracy >= 40 ? '#f59e0b' : 'var(--red)') : 'var(--text-dim)';
        return `<tr><td style="font-weight:600;color:var(--text);">${getMessage(g.titleKey) || g.fallback}</td><td>${played}</td><td style="color:${accColor};font-weight:700;">${accText}</td><td>${played > 0 ? highScore : '-'}</td></tr>`;
    }).join('');
}
function renderCefrRingChart(savedWords) {
    const canvas = document.getElementById('stats-cefr-canvas'), legend = document.getElementById('stats-cefr-legend');
    if (!canvas || !legend)
        return;
    const ctx = canvas.getContext('2d'), size = canvas.width;
    const counts = {};
    savedWords.forEach(w => { const lvl = w.cefrLevel || '??'; counts[lvl] = (counts[lvl] || 0) + 1; });
    const total = savedWords.length;
    if (total === 0) {
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = 'rgba(99,102,241,0.15)';
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
        ctx.fill();
        legend.innerHTML = `<div class="stats-no-data">${getMessage('stats_no_data') || 'Henüz veri yok.'}</div>`;
        return;
    }
    const levels = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const cx = size / 2, cy = size / 2, outerR = size / 2 - 8, innerR = outerR * 0.55;
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
    ctx.fillStyle = '#111827';
    ctx.fill();
    ctx.fillStyle = '#f1f5f9';
    ctx.font = `bold ${Math.floor(size * 0.14)}px Outfit,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total, cx, cy - 6);
    ctx.font = `${Math.floor(size * 0.08)}px Outfit,sans-serif`;
    ctx.fillStyle = '#64748b';
    ctx.fillText((getMessage('word_count_lbl') || 'kelime').toLowerCase(), cx, cy + 12);
    legend.innerHTML = levels.map(([level, count]) => {
        const pct = Math.round((count / total) * 100), color = CEFR_COLORS[level] || '#64748b';
        return `<div class="stats-legend-item"><span class="stats-legend-dot" style="background:${color}"></span><span>${level}</span><span class="stats-legend-pct">${pct}% (${count})</span></div>`;
    }).join('');
}
function renderVocabGrowthChart(savedWords) {
    const canvas = document.getElementById('stats-growth-canvas');
    if (!canvas)
        return;
    const ctx = canvas.getContext('2d'), W = canvas.offsetWidth || 260, H = 120;
    canvas.width = W;
    canvas.height = H;
    const now = Date.now(), DAY = 86400000, days = 30;
    const counts = new Array(days).fill(0);
    savedWords.forEach(w => { if (!w.timestamp)
        return; const d = Math.floor((now - w.timestamp) / DAY); if (d >= 0 && d < days)
        counts[days - 1 - d]++; });
    const maxVal = Math.max(...counts, 1);
    const pad = { top: 10, right: 10, bottom: 20, left: 24 };
    const chartW = W - pad.left - pad.right, chartH = H - pad.top - pad.bottom;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
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
    gradient.addColorStop(1, 'rgba(99,102,241,0.02)');
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
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();
    counts.forEach((val, i) => {
        if (val === 0)
            return;
        const x = pad.left + i * stepX, y = pad.top + chartH - (val / maxVal) * chartH;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#a5b4fc';
        ctx.fill();
    });
    ctx.fillStyle = '#475569';
    ctx.font = '9px Outfit,sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < days; i += 7) {
        const x = pad.left + i * stepX, daysBack = days - 1 - i;
        ctx.fillText(daysBack === 0 ? 'Bugün' : `-${daysBack}g`, x, H - 5);
    }
    ctx.textAlign = 'right';
    ctx.fillText(maxVal, pad.left - 3, pad.top + 4);
}
