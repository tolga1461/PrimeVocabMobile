// ── SRS Sabitleri ─────────────────────────────────────────────────────────────
const SRS_NEW_INTERVAL = 1;
const SRS_AGAIN_INTERVAL = 0.007; // ~10 dakika
const MIN_EASE = 1.3;
// ── Flash Card State ──────────────────────────────────────────────────────────
let fcDeck = [];
let fcInitialDeck = [];
let fcIndex = 0;
let fcCorrect = 0;
let fcAgainItems = [];

function fcShowCard() {
    const outer = document.getElementById('fc-flip-outer');
    const inner = document.getElementById('fc-flip-inner');
    const done = document.getElementById('fc-done');
    const progress = document.getElementById('fc-progress');
    const progressBack = document.getElementById('fc-progress-back');
    const lvlFront = document.getElementById('fc-level-badge');
    const lvlBack = document.getElementById('fc-level-badge-back');
    const wordFront = document.getElementById('fc-word');
    const wordBack = document.getElementById('fc-word-back');
    const trans = document.getElementById('fc-translation');
    const ctxFront = document.getElementById('fc-context');
    const ctxBack = document.getElementById('fc-context-back');

    if (fcIndex >= fcDeck.length) {
        fcShowDone();
        return;
    }
    const item = fcDeck[fcIndex];
    const total = fcDeck.length;
    const progText = `${fcIndex + 1} / ${total}`;
    if (progress) progress.textContent = progText;
    if (progressBack) progressBack.textContent = progText;

    const wl = (item.word || '').toLowerCase();
    const isPhrasal = typeof PHRASAL_VERBS_DB !== 'undefined' && PHRASAL_VERBS_DB[wl];
    const isIdiom = typeof IDIOMS_DB !== 'undefined' && IDIOMS_DB[wl];
    const isColloc = item.cefrLevel === 'COL';
    const level = isPhrasal ? 'PHRASAL' : (isIdiom ? (getMessage('badge_idiom') || 'DEYİM') : (isColloc ? (getMessage('badge_collocation') || 'COL') : (item.cefrLevel || '??')));
    const color = (typeof getCEFRColor === 'function') ? getCEFRColor(level) : '#64748b';
    const badgeText = level !== '??' ? level : '';
    const badgeBg = `color-mix(in srgb, ${color} 18%, transparent)`;
    const badgeBd = `color-mix(in srgb, ${color} 35%, transparent)`;
    [lvlFront, lvlBack].forEach(b => {
        if (b) {
            b.textContent = badgeText;
            b.style.color = color;
            b.style.background = badgeBg;
            b.style.border = `1px solid ${badgeBd}`;
        }
    });

    const speakerSvg = (typeof PV_ICONS !== 'undefined' && PV_ICONS.speaker)
        ? PV_ICONS.speaker
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;

    [wordFront, wordBack].forEach(el => {
        if (!el) return;
        el.innerHTML = '';
        el.appendChild(document.createTextNode(item.word));
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'card-speak-btn';
        btn.innerHTML = speakerSvg;
        btn.title = getMessage("tooltip_pronounce") || "Telaffuz et";
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof speakWord === 'function') speakWord(item.word, item.lang);
        });
        el.appendChild(btn);
    });

    if (trans) trans.textContent = item.translation || '—';
    if (ctxFront) ctxFront.textContent = item.context ? `"${item.context}"` : '';
    if (ctxBack) ctxBack.textContent = item.context ? `"${item.context}"` : '';

    if (inner) inner.classList.remove('flipped');
    if (outer) outer.style.display = 'block';
    if (done) done.style.display = 'none';

    chrome.storage.sync.get({ settings: { autoplaySound: false } }, ({ settings }) => {
        if (settings && settings.autoplaySound) {
            if (typeof speakWord === 'function') speakWord(item.word, item.lang);
        }
    });
}

function fcShowDone() {
    const outer = document.getElementById('fc-flip-outer');
    const done = document.getElementById('fc-done');
    const doneSub = document.getElementById('fc-done-sub');
    if (outer) outer.style.display = 'none';
    if (done) done.style.display = 'flex';

    const total = fcDeck.length;
    const incorrect = total - fcCorrect;
    const accuracy = total > 0 ? Math.round((fcCorrect / total) * 100) : 0;

    const statsGrid = document.getElementById('fc-done-stats');
    const totalLbl = getMessage('fc_stat_total') || 'Toplam';
    const rememberedLbl = getMessage('fc_stat_remembered') || 'Bildim';
    const accuracyLbl = getMessage('fc_stat_accuracy') || 'Başarı';
    const safeEsc = (typeof esc === 'function') ? esc : (s => String(s || ''));

    if (statsGrid) {
        statsGrid.innerHTML = `
            <div class="srs-stat-box" style="background: rgba(165, 180, 252, 0.1); border: 1px solid rgba(165, 180, 252, 0.2); border-radius: 12px; padding: 10px; display: flex; flex-direction: column; align-items: center; gap: 4px;">
                <span class="srs-stat-val" style="color: #a5b4fc; font-size: 20px; font-weight: 800;">${total}</span>
                <span class="srs-stat-label" style="font-size: 11px; opacity: 0.8;">${safeEsc(totalLbl)}</span>
            </div>
            <div class="srs-stat-box" style="background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.2); border-radius: 12px; padding: 10px; display: flex; flex-direction: column; align-items: center; gap: 4px;">
                <span class="srs-stat-val" style="color: #4ade80; font-size: 20px; font-weight: 800;">${fcCorrect}</span>
                <span class="srs-stat-label" style="font-size: 11px; opacity: 0.8;">${safeEsc(rememberedLbl)}</span>
            </div>
            <div class="srs-stat-box" style="background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 12px; padding: 10px; display: flex; flex-direction: column; align-items: center; gap: 4px;">
                <span class="srs-stat-val" style="color: ${accuracy >= 70 ? '#38bdf8' : '#fb923c'}; font-size: 20px; font-weight: 800;">%${accuracy}</span>
                <span class="srs-stat-label" style="font-size: 11px; opacity: 0.8;">${safeEsc(accuracyLbl)}</span>
            </div>
        `;
    }
    if (doneSub) {
        if (accuracy === 100) {
            const tpl = getMessage('fc_done_perfect') || 'Kusursuz! {total} kelimenin tamamını bildin.';
            doneSub.textContent = tpl.replace('{total}', total);
        } else if (incorrect > 0) {
            const tpl = getMessage('fc_done_mixed') || '{total} kelimeden {correct} doğru yaptın ({incorrect} tekrar gereken).';
            doneSub.textContent = tpl.replace('{total}', total).replace('{correct}', fcCorrect).replace('{incorrect}', incorrect);
        } else {
            const tpl = getMessage('fc_done_completed') || '{total} kelimelik pratik oturumunu tamamladın.';
            doneSub.textContent = tpl.replace('{total}', total);
        }
    }
    if (window.HapticsService) {
        if (accuracy === 100) window.HapticsService.celebrate();
        else window.HapticsService.tap();
    }

    const retryAgainBtn = document.getElementById('fc-retry-missed-btn');
    if (retryAgainBtn) {
        if (fcAgainItems.length > 0) {
            retryAgainBtn.style.display = 'flex';
            const retrySpan = retryAgainBtn.querySelector('span');
            const retryTpl = getMessage('fc_retry_missed_count') || 'Bilemediklerimi Tekrar Et ({count})';
            if (retrySpan) retrySpan.textContent = retryTpl.replace('{count}', fcAgainItems.length);
        } else {
            retryAgainBtn.style.display = 'none';
        }
    }
}

document.getElementById('fc-reveal-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (window.HapticsService) window.HapticsService.flip();
    const inner = document.getElementById('fc-flip-inner');
    if (inner) inner.classList.add('flipped');
});
document.getElementById('fc-good')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (window.HapticsService) window.HapticsService.success();
    fcCorrect++;
    fcIndex++;
    const inner = document.getElementById('fc-flip-inner');
    if (inner) inner.classList.remove('flipped');
    setTimeout(() => {
        fcShowCard();
    }, 180);
});
document.getElementById('fc-again')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (window.HapticsService) window.HapticsService.tap();
    if (fcDeck[fcIndex]) {
        fcAgainItems.push(fcDeck[fcIndex]);
    }
    fcIndex++;
    const inner = document.getElementById('fc-flip-inner');
    if (inner) inner.classList.remove('flipped');
    setTimeout(() => {
        fcShowCard();
    }, 180);
});
document.getElementById('fc-close')?.addEventListener('click', () => {
    const overlay = document.getElementById('fc-overlay');
    if (overlay) overlay.style.display = 'none';
});
document.getElementById('fc-close-back')?.addEventListener('click', () => {
    const overlay = document.getElementById('fc-overlay');
    if (overlay) overlay.style.display = 'none';
});
document.getElementById('fc-done-close-btn')?.addEventListener('click', () => {
    const overlay = document.getElementById('fc-overlay');
    if (overlay) overlay.style.display = 'none';
});
document.getElementById('fc-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'fc-overlay') {
        e.target.style.display = 'none';
    }
});
document.getElementById('fc-restart-btn')?.addEventListener('click', () => {
    fcDeck = [...fcInitialDeck];
    fcIndex = 0;
    fcCorrect = 0;
    fcAgainItems = [];
    for (let i = fcDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [fcDeck[i], fcDeck[j]] = [fcDeck[j], fcDeck[i]];
    }
    fcShowCard();
});
document.getElementById('fc-retry-missed-btn')?.addEventListener('click', () => {
    if (fcAgainItems.length === 0) return;
    fcDeck = [...fcAgainItems];
    fcIndex = 0;
    fcCorrect = 0;
    fcAgainItems = [];
    for (let i = fcDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [fcDeck[i], fcDeck[j]] = [fcDeck[j], fcDeck[i]];
    }
    fcShowCard();
});

const flashcardBtn = document.getElementById('flashcard-btn');
if (flashcardBtn) {
    flashcardBtn.addEventListener('click', () => {
        chrome.storage.local.get({ savedWords: [] }, ({ savedWords }) => {
            if (!savedWords || savedWords.length === 0) {
                if (typeof showCustomAlert === 'function') {
                    showCustomAlert(getMessage('alert_no_words_dictionary') || 'Sözlüğünüzde henüz kelime yok.');
                } else {
                    alert(getMessage('alert_no_words_dictionary') || 'Sözlüğünüzde henüz kelime yok.');
                }
                return;
            }
            const filteredWords = (typeof virtualWords !== 'undefined' && virtualWords.length > 0) ? virtualWords : savedWords;
            if (!filteredWords || filteredWords.length === 0) {
                if (typeof showCustomAlert === 'function') {
                    showCustomAlert(getMessage('alert_no_words_filter') || 'Mevcut filtrede kelime bulunamadı.');
                } else {
                    alert(getMessage('alert_no_words_filter') || 'Mevcut filtrede kelime bulunamadı.');
                }
                return;
            }
            let deck = [...filteredWords];
            for (let i = deck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [deck[i], deck[j]] = [deck[j], deck[i]];
            }
            deck.forEach(item => {
                const wl = (item.word || '').toLowerCase();
                const isPhrasal = typeof PHRASAL_VERBS_DB !== 'undefined' && PHRASAL_VERBS_DB[wl];
                const isIdiom = typeof IDIOMS_DB !== 'undefined' && IDIOMS_DB[wl];
                const isCollocation = wl.trim().includes(' ') && !isPhrasal && !isIdiom;

                let cefrLevel = item.cefrLevel || '??';
                if (isPhrasal) cefrLevel = 'Phrasal';
                else if (isIdiom) cefrLevel = 'Idiom';
                else if (isCollocation) cefrLevel = 'COL';

                item.cefrLevel = cefrLevel;
            });
            fcInitialDeck = [...deck];
            fcDeck = deck;
            fcIndex = 0;
            fcCorrect = 0;
            fcAgainItems = [];
            const overlay = document.getElementById('fc-overlay');
            if (overlay) overlay.style.display = 'flex';
            fcShowCard();
        });
    });
}
// ── SRS Algoritması ───────────────────────────────────────────────────────────
function srsInitItem(item) {
    return {
        interval: item.interval ?? 0,
        easeFactor: item.easeFactor ?? 2.5,
        nextReview: item.nextReview ?? 0,
        reviewCount: item.reviewCount ?? 0,
        streak: item.streak ?? 0,
    };
}
function srsCalcNext(item, rating) {
    let { interval, easeFactor, streak } = srsInitItem(item);
    if (rating === 0) {
        // Bilmedim: 10 dakika sonra tekrar sor
        streak = 0;
        interval = SRS_AGAIN_INTERVAL;
        easeFactor = Math.max(MIN_EASE, easeFactor - 0.2);
    }
    else if (rating === 1) {
        // Zor: 1 gün sonra tekrar sor
        streak = 1;
        interval = 1;
        easeFactor = Math.max(MIN_EASE, easeFactor - 0.15);
    }
    else if (rating === 2) {
        // İyi: 3 gün sonra tekrar sor
        streak = (streak ?? 0) + 1;
        interval = 3;
    }
    else {
        // Kolay: 7 gün sonra tekrar sor
        streak = (streak ?? 0) + 1;
        interval = 7;
        easeFactor = Math.min(3.0, easeFactor + 0.15);
    }
    return {
        interval, easeFactor,
        nextReview: Date.now() + interval * 86400000,
        reviewCount: (item.reviewCount ?? 0) + 1,
        streak,
    };
}
function updateStudyStreak() {
    const today = new Date().toDateString();
    chrome.storage.local.get({ srsStreakStats: { currentStreak: 0, lastStudyDate: '', bestStreak: 0 } }, ({ srsStreakStats }) => {
        let { currentStreak, lastStudyDate, bestStreak } = srsStreakStats;
        if (lastStudyDate === today)
            return;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();
        currentStreak = (lastStudyDate === yesterdayStr) ? currentStreak + 1 : 1;
        lastStudyDate = today;
        bestStreak = Math.max(bestStreak, currentStreak);
        chrome.storage.local.set({ srsStreakStats: { currentStreak, lastStudyDate, bestStreak, timestamp: Date.now() } }, () => {
            const streakEl = document.getElementById('srs-streak-count');
            if (streakEl)
                streakEl.textContent = currentStreak;
            const bestContainer = document.getElementById('srs-best-streak-container');
            if (bestContainer) {
                if (bestStreak > 0) {
                    bestContainer.textContent = (getMessage("srs_best_streak") || "Best: {count} 🏆").replace('{count}', bestStreak);
                    bestContainer.style.display = 'block';
                }
                else {
                    bestContainer.style.display = 'none';
                }
            }
        });
    });
}
function srsIntervalLabel(d) {
    if (d < 0.1)
        return getMessage("interval_10m") || '10m';
    if (d < 1)
        return `${Math.round(d * 24)}${getMessage("interval_hours_abbr") || 'h'}`;
    if (d < 30)
        return `${Math.round(d)}${getMessage("interval_days_abbr") || 'd'}`;
    if (d < 365)
        return `${Math.round(d / 30)}${getMessage("interval_months_abbr") || 'mo'}`;
    return `${(d / 365).toFixed(1)}${getMessage("interval_years_abbr") || 'y'}`;
}
function srsDueItems(savedWords) {
    const now = Date.now();
    return savedWords.filter(item => {
        if (item.learned) return false;
        // Yeni kartlar (reviewCount=0) reviewDue'ya değil newAvailable havuzuna aittir;
        // bunları "vadesi geçti" saymak badge sayacını haksız yere şişirir.
        if ((item.reviewCount ?? 0) === 0) return false;
        return (item.nextReview ?? 0) <= now;
    });
}
let srsQueue = [];
let srsQueueIndex = 0;
let srsSessionStats = { again: 0, hard: 0, good: 0, easy: 0, learned: 0 };
// ── SRS Ana Sayfa ─────────────────────────────────────────────────────────────
function srsLoadHome(preserveNav = false) {
    attachReviewScrollListener();
    // Çalışma Listesi (srs-words-overlay) açıkken bu fonksiyon arka planda tetiklenirse
    // (ör. bir kelimenin "öğrenildi" tikini değiştirince) nav-hidden durumunu bozmasın —
    // o zaman ekranda görünen ve scroll'u yöneten katman Antrenman sekmesi değil, overlay'dir.
    const srsOverlay = document.getElementById('srs-words-overlay');
    const isOverlayOpen = srsOverlay && srsOverlay.style.display === 'flex';
    if (!preserveNav && !isOverlayOpen) {
        const scrollTarget = document.getElementById('review-training-content') || document.getElementById('panel-review');
        const isScrolledDown = scrollTarget && scrollTarget.scrollTop > 25;
        if (!isScrolledDown) {
            const appContainer = document.querySelector('.app');
            if (appContainer) appContainer.classList.remove('nav-hidden', 'review-nav-hidden');
        }
    }
    chrome.storage.local.get({
        savedWords: [],
        srsSettings: { newLimit: 10, sessionLimit: 20 },
        srsStreakStats: { currentStreak: 0, lastStudyDate: '', bestStreak: 0 }
    }, ({ savedWords, srsSettings, srsStreakStats }) => {
        const now = Date.now();
        const today = new Date().toDateString();
        // "Again" oyu alan ve bugün cevaplanan kartlar (interval < 1 gün = intraday öğrenme)
        // ana sayfa sayacını şişirmemek için reviewDue dışında tutulur;
        // bir sonraki oturumda otomatik olarak tekrar kuyruğa girer.
        const reviewDue = savedWords.filter(w =>
            !w.learned &&
            (w.reviewCount ?? 0) > 0 &&
            (w.nextReview ?? 0) <= now
        );
        const newCards = savedWords.filter(w => !w.learned && (w.reviewCount ?? 0) === 0);
        const introducedToday = savedWords.filter(w => !w.learned && (w.reviewCount ?? 0) > 0 && w.firstReviewDate === today).length;
        const newLimit = srsSettings.newLimit ?? 10;
        const newAvailable = newLimit === 0 ? newCards.length : Math.max(0, Math.min(newCards.length, newLimit - introducedToday));
        const totalDue = reviewDue.length + newAvailable;
        document.getElementById('srs-due-count').textContent = totalDue;
        document.getElementById('srs-total-count').textContent = savedWords.length;
        let currentStreak = srsStreakStats.currentStreak || 0;
        const legacyMaxStreak = savedWords.reduce((m, w) => Math.max(m, w.streak ?? 0), 0);
        if (!srsStreakStats.lastStudyDate && legacyMaxStreak > 0) {
            currentStreak = legacyMaxStreak;
            srsStreakStats.currentStreak = legacyMaxStreak;
            srsStreakStats.lastStudyDate = today;
            srsStreakStats.bestStreak = Math.max(srsStreakStats.bestStreak || 0, legacyMaxStreak);
            srsStreakStats.timestamp = Date.now();
            chrome.storage.local.set({ srsStreakStats });
        }
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();
        let displayStreak = currentStreak;
        if (srsStreakStats.lastStudyDate && srsStreakStats.lastStudyDate !== today && srsStreakStats.lastStudyDate !== yesterdayStr) {
            displayStreak = 0;
        }
        document.getElementById('srs-streak-count').textContent = displayStreak;
        const bestStreak = srsStreakStats.bestStreak || 0;
        const bestContainer = document.getElementById('srs-best-streak-container');
        if (bestContainer) {
            if (bestStreak > 0) {
                bestContainer.textContent = (getMessage("srs_best_streak") || "Best: {count} 🏆").replace('{count}', bestStreak);
                bestContainer.style.display = 'block';
            }
            else {
                bestContainer.style.display = 'none';
            }
        }
        const badge = document.getElementById('review-badge');
        if (totalDue > 0) {
            badge.textContent = totalDue;
            badge.style.display = '';
        }
        else
            badge.style.display = 'none';
        const notDue = savedWords.filter(w => !w.learned && (w.reviewCount ?? 0) > 0 && (w.nextReview ?? 0) > now);
        const nextInfo = document.getElementById('srs-next-info');
        if (notDue.length > 0 && totalDue === 0) {
            const inMs = Math.min(...notDue.map(w => w.nextReview)) - now;
            const inH = inMs / 3600000;
            const lbl = getMessage("srs_next_card") || "Next card: ";
            const timeStr = inH < 1
                ? (getMessage("srs_next_in_minutes") || "{count}m later").replace('{count}', Math.round(inMs / 60000))
                : inH < 24
                    ? (getMessage("srs_next_in_hours") || "{count}h later").replace('{count}', Math.round(inH))
                    : (getMessage("srs_next_in_days") || "{count}d later").replace('{count}', Math.round(inH / 24));
            document.getElementById('srs-next-text').textContent = `${lbl}${timeStr}`;
            nextInfo.style.display = '';
        }
        else {
            nextInfo.style.display = 'none';
        }
        document.getElementById('srs-home').style.display = '';
        document.getElementById('srs-session').style.display = 'none';
        document.getElementById('srs-result').style.display = 'none';
        const cardStage = document.getElementById('srs-card-stage');
        if (cardStage) cardStage.style.display = 'flex';
        const gamePlayArea = document.getElementById('game-play-area');
        const isGamePlaying = gamePlayArea && gamePlayArea.style.display !== 'none';
        if (!isGamePlaying) {
            const subtabs = document.getElementById('review-subtabs');
            if (subtabs)
                subtabs.style.display = '';
        }
        const emptyEl = document.getElementById('srs-empty');
        const startBtn = document.getElementById('srs-start-btn');
        if (savedWords.length === 0) {
            emptyEl.style.display = '';
            document.getElementById('srs-empty-next').textContent = getMessage("srs_add_words_first") || 'Add words to your dictionary.';
            startBtn.style.display = 'none';
        }
        else if (totalDue === 0) {
            emptyEl.style.display = '';
            document.getElementById('srs-empty-next').textContent =
                newCards.length > 0 && newAvailable === 0
                    ? (getMessage("srs_new_cards_done") || `Today's new cards limit reached. Continue tomorrow!`).replace('{limit}', newLimit)
                    : '';
            startBtn.style.display = 'none';
        }
        else {
            emptyEl.style.display = 'none';
            startBtn.style.display = '';
        }
        document.querySelectorAll('#srs-new-limit-group .setting-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.value) === newLimit);
        });
        document.querySelectorAll('#srs-session-limit-group .setting-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.value) === (srsSettings.sessionLimit ?? 20));
        });
        srsUpdateSegmentedThumbs();
        srsRenderHeatmap(savedWords);
        srsRenderWeeklyChart(savedWords);
        const srsWordsOverlay = document.getElementById('srs-words-overlay');
        if (srsWordsOverlay && srsWordsOverlay.style.display !== 'none')
            srsLoadWords();
    });
}
// ── Heatmap ───────────────────────────────────────────────────────────────────
function srsRenderHeatmap(savedWords) {
    const section = document.getElementById('srs-heatmap-section');
    const grid = document.getElementById('srs-heatmap-grid');
    if (!section || !grid)
        return;
    const reviewed = savedWords.filter(w => (w.reviewCount ?? 0) > 0);
    if (reviewed.length === 0) {
        section.style.display = 'none';
        return;
    }
    section.style.display = '';
    const DAYS = 84, msDay = 86400000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    const activityMap = {};
    reviewed.forEach(w => {
        let dayStart;
        if (w.lastReviewDate) {
            dayStart = new Date(w.lastReviewDate).getTime();
        } else {
            const reviewedAt = (w.nextReview ?? 0) - (w.interval ?? 1) * msDay;
            const d = new Date(reviewedAt);
            d.setHours(0, 0, 0, 0);
            dayStart = d.getTime();
        }
        activityMap[dayStart] = (activityMap[dayStart] || 0) + 1;
    });
    const maxCount = Math.max(1, ...Object.values(activityMap));
    grid.innerHTML = '';
    const startOffset = (today.getDay() + 6) % 7;
    const startDay = todayMs - (DAYS + startOffset) * msDay;
    for (let d = 0; d < DAYS + startOffset + 1; d++) {
        const dayMs = startDay + d * msDay;
        const count = activityMap[dayMs] || 0;
        const isFuture = dayMs > todayMs;
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        if (isFuture || d < startOffset) {
            cell.style.opacity = '0';
        }
        else {
            const intensity = count === 0 ? 0 : Math.ceil((count / maxCount) * 4);
            cell.dataset.count = count;
            cell.style.background = `var(--hm-${intensity})`;
            if (count > 0) {
                const date = new Date(dayMs);
                cell.title = (getMessage("heatmap_tooltip") || "{date}: {count} kart").replace("{date}", date.toLocaleDateString()).replace("{count}", count);
            }
        }
        grid.appendChild(cell);
    }
}
// ── Haftalık Chart ────────────────────────────────────────────────────────────
function srsRenderWeeklyChart(savedWords) {
    const section = document.getElementById('srs-weekly-chart-section');
    if (!section)
        return;
    if (savedWords.length === 0) {
        section.style.display = 'none';
        return;
    }
    const msWeek = 7 * 86400000, now = Date.now();
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
        const weekStart = now - (i + 1) * msWeek, weekEnd = now - i * msWeek;
        weeks.push({ count: savedWords.filter(w => w.timestamp >= weekStart && w.timestamp < weekEnd).length });
    }
    const maxCount = Math.max(1, ...weeks.map(w => w.count));
    if (!weeks.some(w => w.count > 0)) {
        section.style.display = 'none';
        return;
    }
    section.style.display = '';
    const thisWeek = weeks[7].count, lastWeek = weeks[6].count;
    const summaryEl = document.getElementById('srs-chart-summary');
    if (summaryEl) {
        summaryEl.textContent = lastWeek > 0
            ? (getMessage("srs_chart_summary_comparison") || `This week: {thisWeek} words • Last week: {lastWeek}`).replace('{thisWeek}', thisWeek).replace('{lastWeek}', lastWeek)
            : (getMessage("srs_chart_summary_single") || `{thisWeek} words added this week`).replace('{thisWeek}', thisWeek);
    }
    const canvas = document.getElementById('srs-weekly-canvas');
    if (!canvas)
        return;
    requestAnimationFrame(() => {
        const dpr = window.devicePixelRatio || 1;
        const W = canvas.offsetWidth || 260, H = 80;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, W, H);
        const barCount = weeks.length, barGap = 4, labelH = 16, chartH = H - labelH;
        const barW = (W - barGap * (barCount - 1)) / barCount;
        weeks.forEach((week, i) => {
            const x = i * (barW + barGap);
            const barHeight = week.count === 0 ? 2 : Math.max(4, (week.count / maxCount) * (chartH - 18));
            const y = chartH - barHeight;
            const isThis = i === barCount - 1;
            ctx.fillStyle = isThis ? '#6366f1' : (week.count > 0 ? '#1e293b' : '#0f172a');
            ctx.beginPath();
            ctx.roundRect(x, y, barW, barHeight, 3);
            ctx.fill();
            if (week.count > 0) {
                ctx.fillStyle = isThis ? '#c7d2fe' : '#475569';
                ctx.font = `600 ${Math.max(9, Math.floor(barW * 0.38))}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(week.count, x + barW / 2, Math.max(y - 2, 12));
            }
            const weekLabel = i === barCount - 1 ? getMessage("chart_this_week") : `${barCount - 1 - i}${getMessage("chart_week_abbr")}`;
            ctx.fillStyle = isThis ? '#818cf8' : '#334155';
            ctx.font = '500 9px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(weekLabel, x + barW / 2, H - 2);
        });
    });
}
// ── SRS Başlatma & Kart Gösterimi ─────────────────────────────────────────────
document.getElementById('srs-start-btn').addEventListener('click', () => {
    chrome.storage.local.get({
        savedWords: [],
        srsSettings: { newLimit: 10, sessionLimit: 20 },
        licenseType: 'FREE',
        srsDailySessions: { date: '', count: 0 }
    }, ({ savedWords, srsSettings, licenseType, srsDailySessions }) => {
        const now = Date.now(), today = new Date().toDateString();
        


        // Oturum başlatılırken: bugün öğrenme aşamasındaki (Again alan, interval<1) kartlar
        // tekrar kuyruğa girmesin — ana sayfa sayacının mantkıyla tutarlı olsun.
        const reviewDue = savedWords.filter(w =>
            !w.learned &&
            (w.reviewCount ?? 0) > 0 &&
            (w.nextReview ?? 0) <= now
        );
        const newCards = savedWords.filter(w => !w.learned && (w.reviewCount ?? 0) === 0);
        const introducedToday = savedWords.filter(w => !w.learned && (w.reviewCount ?? 0) > 0 && w.firstReviewDate === today).length;
        const newLimit = srsSettings.newLimit ?? 10;
        const newSlots = newLimit === 0 ? newCards.length : Math.max(0, newLimit - introducedToday);
        const newToday = newCards.slice(0, newSlots);
        let deck = [...reviewDue, ...newToday];
        if (!deck.length)
            return;

        // If not Premium, increment daily session count
        if (licenseType === 'FREE') {
            const newCount = srsDailySessions.date === today ? srsDailySessions.count + 1 : 1;
            chrome.storage.local.set({ srsDailySessions: { date: today, count: newCount } });
        }

        const sessionLimit = srsSettings.sessionLimit ?? 20;
        if (sessionLimit > 0)
            deck = deck.slice(0, sessionLimit);
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        const uniqueWords = [...new Set(deck.map(w => w.word.toLowerCase()))];
        chrome.runtime.sendMessage({ action: "batch_lookup_cefr", words: uniqueWords }, (res) => {
            const cefrMap = res?.cefrMap || {};
            deck.forEach(item => {
                const wl = item.word.toLowerCase();
                const isPhrasal = typeof PHRASAL_VERBS_DB !== 'undefined' && PHRASAL_VERBS_DB[wl];
                const isIdiom = typeof IDIOMS_DB !== 'undefined' && IDIOMS_DB[wl];
                const isCollocation = wl.trim().includes(' ') && !isPhrasal && !isIdiom;
                if (isPhrasal) {
                    item.cefrLevel = 'Phrasal';
                } else if (isIdiom) {
                    item.cefrLevel = 'Idiom';
                } else if (isCollocation) {
                    item.cefrLevel = 'COL';
                } else {
                    item.cefrLevel = cefrMap[wl] || '';
                }
            });
            srsQueue = deck;
            srsQueueIndex = 0;
            srsSessionStats = { again: 0, hard: 0, good: 0, easy: 0, learned: 0 };
            document.getElementById('srs-home').style.display = 'none';
            document.getElementById('srs-result').style.display = 'none';
            const cardStage = document.getElementById('srs-card-stage');
            if (cardStage) cardStage.style.display = 'flex';
            const hintEl = document.getElementById('srs-persistent-bottom-hint');
            if (hintEl) hintEl.style.display = 'flex';
            document.getElementById('srs-session').style.display = '';
            const subtabs = document.getElementById('review-subtabs');
            if (subtabs)
                subtabs.style.display = 'none';
            const appContainer = document.querySelector('.app');
            if (appContainer) appContainer.classList.remove('nav-hidden', 'review-nav-hidden');
            srsShowCard();
        });
    });
});
document.getElementById('srs-quit-btn').addEventListener('click', srsLoadHome);
document.getElementById('srs-back-btn').addEventListener('click', srsLoadHome);

// ── Çalışma Listesi Overlay ───────────────────────────────────────────────────
const srsWordsBtn = document.getElementById('srs-words-btn');
const srsWordsOverlay = document.getElementById('srs-words-overlay');
const srsWordsCloseBtn = document.getElementById('srs-words-close-btn');
const srsWordsSearchInput = document.getElementById('srs-words-search');
const srsWordsSearchClear = document.getElementById('srs-words-search-clear');
const srsSortSelect = document.getElementById('srs-sort-select');
const srsSortPopover = document.getElementById('srs-sort-popover');
const srsSortLabel = document.getElementById('srs-sort-label');

let currentSrsSort = 'time-asc';
let srsWordsSearchQuery = '';
let srsLoadWordsSeq = 0;
let srsScrollListenerAttached = false;
let srsLastScrollTop = 0;
let srsHeaderCollapsed = false;
let srsAccumulatedDelta = 0;
let srsLastDirection = null;

function srsThrottle(fn, ms) {
    let last = 0;
    return function (...args) {
        const now = Date.now();
        if (now - last >= ms) {
            last = now;
            fn(...args);
        }
    };
}

function attachSrsScrollListener() {
    const srsWordsList = document.getElementById('srs-words-list');
    if (!srsWordsList || !srsWordsOverlay || srsScrollListenerAttached) return;

    srsWordsList.addEventListener('scroll', srsThrottle(() => {
        const maxSrsScroll = Math.max(0, srsWordsList.scrollHeight - srsWordsList.clientHeight);
        const currentScrollTop = Math.min(Math.max(0, srsWordsList.scrollTop), maxSrsScroll);
        const appContainer = document.querySelector('.app');

        // Close sort popover if user scrolled
        if (srsSortPopover && srsSortPopover.classList.contains('open')) {
            srsSortPopover.classList.remove('open');
            if (srsSortSelect) srsSortSelect.classList.remove('active');
        }

        // If list is short, keep bars visible
        if (maxSrsScroll <= 80) {
            if (appContainer && appContainer.classList.contains('nav-hidden')) {
                appContainer.classList.remove('nav-hidden');
            }
            srsWordsOverlay.classList.remove('nav-hidden');
            srsHeaderCollapsed = false;
            srsAccumulatedDelta = 0;
            srsLastScrollTop = currentScrollTop;
            return;
        }

        // 1. Twitter behavior: Always show when at the very top (within 15px)
        if (currentScrollTop <= 15) {
            if (srsHeaderCollapsed || (appContainer && appContainer.classList.contains('nav-hidden'))) {
                srsHeaderCollapsed = false;
                if (appContainer) appContainer.classList.remove('nav-hidden');
                srsWordsOverlay.classList.remove('nav-hidden');
            }
            srsAccumulatedDelta = 0;
            srsLastDirection = null;
            srsLastScrollTop = currentScrollTop;
            return;
        }

        // 2. Twitter behavior: Ignore rubber-band bounce near bottom
        const isNearBottom = (currentScrollTop + srsWordsList.clientHeight >= srsWordsList.scrollHeight - 35);
        if (isNearBottom) {
            srsLastScrollTop = currentScrollTop;
            return;
        }

        const delta = currentScrollTop - srsLastScrollTop;
        srsLastScrollTop = currentScrollTop;

        // Ignore microscopic jitter (< 2px)
        if (Math.abs(delta) < 2) return;

        const currentDirection = delta > 0 ? 'down' : 'up';
        if (currentDirection !== srsLastDirection) {
            srsAccumulatedDelta = 0;
            srsLastDirection = currentDirection;
        }

        srsAccumulatedDelta += Math.abs(delta);

        // 3. Twitter (X) Hysteresis thresholds:
        // Down: Continuous movement >= 32px AND scrollTop > 50px
        // Up: Responsive reappearance after >= 14px of upward movement
        if (appContainer) {
            if (currentDirection === 'down') {
                if (srsAccumulatedDelta >= 32 && currentScrollTop > 50) {
                    if (!srsHeaderCollapsed) {
                        srsHeaderCollapsed = true;
                        appContainer.classList.add('nav-hidden');
                        srsWordsOverlay.classList.add('nav-hidden');
                    }
                }
            } else {
                if (srsAccumulatedDelta >= 14) {
                    if (srsHeaderCollapsed) {
                        srsHeaderCollapsed = false;
                        appContainer.classList.remove('nav-hidden');
                        srsWordsOverlay.classList.remove('nav-hidden');
                    }
                }
            }
        }
    }, 25), { passive: true });
    srsScrollListenerAttached = true;
}

if (srsWordsBtn) {
    srsWordsBtn.addEventListener('click', () => { 
        srsWordsOverlay.style.display = 'flex'; 
        const srsWordsList = document.getElementById('srs-words-list');
        if (srsWordsList) srsWordsList.scrollTop = 0;
        srsWordsOverlay.classList.remove('nav-hidden');
        srsWordsOverlay.classList.remove('scrolled');
        srsHeaderCollapsed = false;
        srsAccumulatedDelta = 0;
        srsLastDirection = null;
        srsLastScrollTop = 0;
        
        const appContainer = document.querySelector('.app');
        if (appContainer) appContainer.classList.remove('nav-hidden');

        // Dynamically measure exact controls height for smooth collapse
        const srsControls = document.getElementById('srs-overlay-controls');
        if (srsControls && srsWordsOverlay) {
            const h = srsControls.offsetHeight + 10;
            srsWordsOverlay.style.setProperty('--srs-controls-h', `${h}px`);
        }

        srsLoadWords(); 
        attachSrsScrollListener();
    });
}

if (srsWordsCloseBtn) {
    srsWordsCloseBtn.addEventListener('click', () => { 
        srsWordsOverlay.style.display = 'none'; 
        srsWordsOverlay.classList.remove('nav-hidden');
        srsWordsOverlay.classList.remove('scrolled');
        srsHeaderCollapsed = false;
        const appContainer = document.querySelector('.app');
        if (appContainer) appContainer.classList.remove('nav-hidden');
    });
}

if (srsWordsOverlay) {
    srsWordsOverlay.addEventListener('click', (e) => {
        if (e.target === srsWordsOverlay) {
            srsWordsOverlay.style.display = 'none';
            srsWordsOverlay.classList.remove('nav-hidden');
            srsWordsOverlay.classList.remove('scrolled');
            srsHeaderCollapsed = false;
            const appContainer = document.querySelector('.app');
            if (appContainer) appContainer.classList.remove('nav-hidden');
        }
    });
}

// Arama & Temizle
if (srsWordsSearchInput) {
    srsWordsSearchInput.addEventListener('input', () => {
        srsWordsSearchQuery = srsWordsSearchInput.value.trim().toLowerCase();
        if (srsWordsSearchClear) {
            srsWordsSearchClear.style.display = srsWordsSearchQuery ? 'flex' : 'none';
        }
        srsLoadWords();
    });
}

if (srsWordsSearchClear) {
    srsWordsSearchClear.addEventListener('click', () => {
        srsWordsSearchInput.value = '';
        srsWordsSearchQuery = '';
        srsWordsSearchClear.style.display = 'none';
        srsLoadWords();
    });
}

// Sıralama Popover'ı
if (srsSortSelect && srsSortPopover) {
    srsSortSelect.addEventListener('click', (e) => {
        e.stopPropagation();
        srsSortPopover.classList.toggle('open');
    });

    srsSortPopover.querySelectorAll('.sort-opt').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentSrsSort = btn.dataset.sort;
            srsSortPopover.querySelectorAll('.sort-opt').forEach(b => b.classList.toggle('on', b === btn));
            if (srsSortLabel) {
                // data-label yerine localize edilmiş [data-i18n] span'ini tercih et — aksi halde etiket hep Türkçe kalır.
                const localizedLabel = btn.querySelector('[data-i18n]')?.textContent.trim();
                srsSortLabel.textContent = localizedLabel || btn.dataset.label || btn.textContent.trim();
            }
            srsSortPopover.classList.remove('open');
            srsLoadWords();
        });
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#srs-sort-select') && !e.target.closest('#srs-sort-popover')) {
            srsSortPopover.classList.remove('open');
        }
    });
}

function srsLoadWords() {
    const wordsListEl = document.getElementById('srs-words-list');
    const totalBadge = document.getElementById('srs-words-total-badge');
    if (!wordsListEl) return;

    const currentSeq = ++srsLoadWordsSeq;
    chrome.storage.local.get({ savedWords: [] }, ({ savedWords }) => {
        if (currentSeq !== srsLoadWordsSeq) return;
        if (savedWords.length === 0) {
            if (totalBadge) totalBadge.textContent = '0';
            wordsListEl.innerHTML = `<div style="color:var(--text-muted);text-align:center;padding:24px;font-size:12.5px;font-weight:600;">${getMessage("srs_no_words_review") || 'Henüz kayıtlı kelime bulunmuyor.'}</div>`;
            return;
        }

        const sortVal = currentSrsSort || 'time-asc';
        const uniqueWords = [...new Set(savedWords.map(w => w.word.toLowerCase()))];
        chrome.runtime.sendMessage({ action: "batch_lookup_cefr", words: uniqueWords }, (res) => {
            if (currentSeq !== srsLoadWordsSeq) return;
            const cefrMap = res?.cefrMap || {};
            let words = savedWords.map((item, originalIndex) => {
                const wl = item.word.toLowerCase();
                const isPhrasal = typeof PHRASAL_VERBS_DB !== 'undefined' && PHRASAL_VERBS_DB[wl];
                const isIdiom = typeof IDIOMS_DB !== 'undefined' && IDIOMS_DB[wl];
                const isCollocation = wl.trim().includes(' ') && !isPhrasal && !isIdiom;

                let cefrLevel = '??';
                if (isPhrasal) cefrLevel = 'PHRASAL';
                else if (isIdiom) cefrLevel = 'DEYİM';
                else if (isCollocation) cefrLevel = 'COL';
                else cefrLevel = (cefrMap[wl] || '??').toUpperCase();

                return {
                    ...item,
                    cefrLevel,
                    originalIndex
                };
            });

            if (srsWordsSearchQuery) {
                words = words.filter(item => {
                    const w = (item.word || '').toLowerCase();
                    const tr = (item.translation || '').toLowerCase();
                    return w.includes(srsWordsSearchQuery) || tr.includes(srsWordsSearchQuery);
                });
            }

            if (totalBadge) totalBadge.textContent = words.length;

            if (words.length === 0) {
                wordsListEl.innerHTML = `<div style="color:var(--text-muted);text-align:center;padding:24px;font-size:12.5px;font-weight:600;">${srsWordsSearchQuery ? (getMessage("search_no_results") || 'Eşleşen kelime bulunamadı.') : (getMessage("srs_no_words_review") || 'Henüz kayıtlı kelime bulunmuyor.')}</div>`;
                return;
            }

            if (sortVal === 'alphabetical') {
                words.sort((a, b) => a.word.localeCompare(b.word));
            } else if (sortVal === 'learned-first') {
                words.sort((a, b) => (b.learned ? 1 : 0) - (a.learned ? 1 : 0));
            } else if (sortVal === 'new-first') {
                words.sort((a, b) => (!(b.reviewCount > 0) ? 1 : 0) - (!(a.reviewCount > 0) ? 1 : 0));
            } else {
                words.sort((a, b) => {
                    if (a.learned && !b.learned) return 1;
                    if (!a.learned && b.learned) return -1;
                    const aTime = a.nextReview || 0, bTime = b.nextReview || 0;
                    return sortVal === 'time-asc' ? aTime - bTime : bTime - aTime;
                });
            }

            const frag = document.createDocumentFragment();
            words.forEach((item) => {
                const isPhrasal = typeof PHRASAL_VERBS_DB !== 'undefined' && PHRASAL_VERBS_DB[item.word.toLowerCase()];
                const isIdiom = typeof IDIOMS_DB !== 'undefined' && IDIOMS_DB[item.word.toLowerCase()];
                const isColloc = item.cefrLevel === 'COL';
                const badgeType = isPhrasal ? 'Phrasal' : (isIdiom ? 'Idiom' : (isColloc ? 'COL' : (item.cefrLevel || '')));
                
                let typeColor = (typeof getCEFRColor === 'function') ? getCEFRColor(badgeType) : '#64748b';
                const badgeHtml = (typeof getCEFRBadgeHTML === 'function') 
                    ? getCEFRBadgeHTML(badgeType) 
                    : `<span class="word-badge" style="background:color-mix(in srgb, ${typeColor} 18%, transparent);color:${typeColor}">${esc(item.cefrLevel || '')}</span>`;

                let duePillHtml = '';
                if (item.learned) {
                    duePillHtml = `<span class="due-pill due-learned"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M20 6L9 17l-5-5"/></svg>${getMessage("srs_status_learned") || 'Öğrenildi'}</span>`;
                } else if (!item.reviewCount || !item.nextReview) {
                    duePillHtml = `<span class="due-pill due-new"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>${getMessage("srs_status_new") || 'Yeni'}</span>`;
                } else {
                    const diffMs = item.nextReview - Date.now();
                    if (diffMs <= 0) {
                        duePillHtml = `<span class="due-pill due-today"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>${getMessage("srs_status_today") || 'Bugün'}</span>`;
                    } else {
                        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                        let label = days === 1 ? (getMessage("srs_status_tomorrow") || '1 gün sonra')
                            : days < 7 ? (getMessage("srs_status_days_later") || '{days} gün sonra').replace('{days}', days)
                                : days < 30 ? (getMessage("srs_status_weeks_later") || '{weeks} hafta sonra').replace('{weeks}', Math.round(days / 7))
                                    : (getMessage("srs_status_months_later") || '{months} ay sonra').replace('{months}', Math.round(days / 30));
                        duePillHtml = `<span class="due-pill due-soon"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>${label}</span>`;
                    }
                }

                const div = document.createElement('div');
                div.className = 'srs-word-row';
                div.innerHTML = `
                  <label class="word-check" title="${getMessage('srs_toggle_learned_tooltip') || 'Öğrenildi durumunu değiştir'}">
                    <input type="checkbox" class="srs-learned-toggle" data-word="${esc(item.word)}" ${item.learned ? 'checked' : ''}>
                    <span class="box"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M4 12l5 5L20 6"/></svg></span>
                  </label>
                  <span class="type-pip" style="background:${typeColor}"></span>
                  <div class="srs-word-main">
                    <div class="srs-word-head">
                      <span class="srs-word-en">${esc(item.word)}</span>
                      ${badgeHtml}
                    </div>
                    <div class="srs-word-tr">${esc(item.translation || '—')}</div>
                  </div>
                  <div class="srs-pill-slot">${duePillHtml}</div>
                `;
                const toggle = div.querySelector('.srs-learned-toggle');
                if (toggle) {
                    toggle.addEventListener('change', (e) => {
                        e.stopPropagation();
                        item.learned = e.target.checked;
                        toggleLearnWordFromSrsList(e.target.dataset.word, e.target.checked);
                    });
                }
                frag.appendChild(div);
            });
            wordsListEl.replaceChildren(frag);
        });
    });
}

function toggleLearnWordFromSrsList(targetWord, isLearned) {
    chrome.storage.local.get({ savedWords: [] }, ({ savedWords }) => {
        const idx = savedWords.findIndex(w => w.word.toLowerCase() === targetWord.toLowerCase());
        if (idx !== -1) {
            savedWords[idx].learned = isLearned;
            savedWords[idx].timestamp = Date.now();
            if (isLearned) {
                savedWords[idx].againCount = 0;
                savedWords[idx].hard = false;
            }
            chrome.storage.local.set({ savedWords }, () => {
                srsLoadWords();
                srsLoadHome();
                updateReviewBadge();
            });
        }
    });
}
// ── SRS Kart Gösterimi ────────────────────────────────────────────────────────
const EMOJI_MAP = {
    "table": "🪵", "chair": "🪑", "bed": "🛏️", "door": "🚪", "window": "🪟", "key": "🔑", "lock": "🔒", "phone": "📱", "computer": "💻", "television": "📺",
    "book": "📖", "pen": "🖊️", "pencil": "✏️", "bag": "👜", "clock": "⏰", "watch": "⌚", "camera": "📷", "umbrella": "🌂", "paper": "📄", "scissors": "✂️",
    "hammer": "🔨", "knife": "🔪", "fork": "🍴", "spoon": "🥄", "cup": "🥛", "mug": "☕", "plate": "🍽️", "glasses": "👓", "hat": "🎩", "shirt": "👕",
    "pants": "👖", "shoe": "👟", "coat": "🧥", "money": "💵", "card": "💳", "wallet": "👛", "gift": "🎁", "balloon": "🎈", "toy": "🧸", "ball": "⚽",
    "dog": "🐕", "cat": "🐈", "bird": "🐦", "fish": "🐟", "lion": "🦁", "tiger": "🐯", "horse": "🐴", "bear": "🐻", "elephant": "🐘", "monkey": "🐒",
    "mouse": "🐭", "rabbit": "🐰", "frog": "🐸", "bee": "🐝", "spider": "🕷️", "snake": "🐍", "turtle": "🐢",
    "apple": "🍎", "banana": "🍌", "grape": "🍇", "orange": "🍊", "lemon": "🍋", "strawberry": "🍓", "melon": "🍉", "peach": "🍑", "cherry": "🍒",
    "pineapple": "🍍", "coconut": "🥥", "kiwi": "🥝", "potato": "🥔", "carrot": "🥕", "onion": "🧅", "garlic": "🧄", "bread": "🍞", "meat": "🥩",
    "chicken": "🍗", "egg": "🥚", "butter": "🧈", "rice": "🍚", "pasta": "🍝", "burger": "🍔", "fries": "🍟", "cake": "🍰", "cookie": "🍪",
    "chocolate": "🍫", "honey": "🍯", "milk": "🥛", "coffee": "☕", "tea": "🍵", "juice": "🧃", "water": "💧", "wine": "🍷", "beer": "🍺",
    "sun": "☀️", "moon": "🌙", "star": "⭐️", "rain": "🌧️", "snow": "❄", "wind": "💨", "fire": "🔥", "tree": "🌳", "flower": "🌸",
    "grass": "🌿", "leaf": "🍃", "mountain": "⛰️", "river": "🌊", "lake": "🏞", "sea": "🌊", "beach": "🏖️", "desert": "🏜️", "forest": "🌲",
    "road": "🛣️", "bridge": "🌉", "house": "🏠", "building": "🏢", "school": "🏫", "hospital": "🏥", "bank": "🏦", "store": "🏬",
    "restaurant": "🍴", "hotel": "🏨", "park": "🏞", "city": "🏙️", "world": "🌍",
    "car": "🚗", "bus": "🚌", "train": "🚆", "plane": "✈️", "boat": "⛵", "ship": "🚢", "bicycle": "🚲", "motorcycle": "🏍️", "taxi": "🚕",
    "truck": "🚚", "helicopter": "🚁", "rocket": "🚀",
    "baby": "👶", "child": "🧒", "boy": "👦", "girl": "👧", "man": "👨", "woman": "👩", "father": "👨", "mother": "👩", "brother": "👦", "sister": "👧",
    "family": "👪", "doctor": "👨‍⚕️", "nurse": "👩‍⚕️", "teacher": "👨‍🏫", "student": "🧑‍📚", "cook": "👨‍🍳", "police": "👮", "soldier": "💂",
    "writer": "✍️", "artist": "🎨", "singer": "🎤", "actor": "🎭",
    "walk": "🚶", "run": "🏃", "jump": "🦘", "fly": "✈️", "swim": "🏊", "sleep": "😴", "wake": "⏰", "eat": "🍽️", "drink": "🍹", "read": "📖",
    "write": "✍️", "speak": "🗣️", "listen": "🧏", "watch": "📺", "play": "🎮", "sing": "🎤", "dance": "💃", "laugh": "😆", "cry": "😢", "think": "🤔",
    "understand": "💡", "know": "🧠", "build": "🔨", "break": "💔", "buy": "🛒", "sell": "💰", "pay": "💳", "give": "🎁", "take": "🤲", "find": "🔍",
    "lose": "🤷", "search": "🔍", "open": "🔓", "close": "🔒", "start": "▶️", "stop": "⏹️", "wait": "⏳", "wash": "🧼", "clean": "🧹", "cut": "✂️",
    "paint": "🖌️", "bake": "🥖", "drive": "🚗", "ride": "🚲", "travel": "✈️"
};
function getEmojiForWord(word) {
    if (!word)
        return null;
    const w = word.toLowerCase().trim();
    if (EMOJI_MAP[w])
        return EMOJI_MAP[w];
    const candidates = [];
    if (w.endsWith('s') && w.length > 3) {
        if (w.endsWith('ies'))
            candidates.push(w.slice(0, -3) + 'y');
        else if (w.endsWith('es'))
            candidates.push(w.slice(0, -2));
        candidates.push(w.slice(0, -1));
    }
    if (w.endsWith('ing') && w.length > 5) {
        const b = w.slice(0, -3);
        candidates.push(b, b + 'e');
        if (b.length > 2 && b[b.length - 1] === b[b.length - 2])
            candidates.push(b.slice(0, -1));
    }
    if (w.endsWith('ed') && w.length > 4) {
        const b = w.slice(0, -2);
        candidates.push(b, b + 'e');
        if (b.length > 2 && b[b.length - 1] === b[b.length - 2])
            candidates.push(b.slice(0, -1));
    }
    for (const c of candidates) {
        if (EMOJI_MAP[c])
            return EMOJI_MAP[c];
    }
    return null;
}
const srsHintBtn = document.getElementById('srs-hint-btn');
if (srsHintBtn) {
    srsHintBtn.addEventListener('click', () => {
        srsHintBtn.style.display = 'none';
        const hintEmojiContainer = document.getElementById('srs-card-hint-emoji');
        const hintImg = document.getElementById('srs-card-hint-img');
        if (hintEmojiContainer && hintImg) {
            const item = srsQueue[srsQueueIndex];
            const emoji = getEmojiForWord(item?.word);
            if (emoji) {
                const codepoint = [...emoji].map(char => char.codePointAt(0).toString(16)).join('-').toUpperCase();
                hintImg.src = `https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@14.0.0/color/svg/${codepoint}.svg`;
                hintEmojiContainer.style.display = 'block';
            }
        }
    });
}
function srsShowCard() {
    if (srsQueueIndex >= srsQueue.length) {
        srsShowResult();
        return;
    }
    const item = srsQueue[srsQueueIndex];
    const total = srsQueue.length;
    document.getElementById('srs-session-progress').textContent = `${srsQueueIndex + 1} / ${total}`;
    document.getElementById('srs-session-bar').style.width = `${((srsQueueIndex) / total) * 100}%`;

    // 3D Flip Kartı başlangıç durumuna (ön yüz) döndür
    const flipInner = document.getElementById('srs-flip-inner');
    if (flipInner) {
        flipInner.classList.remove('flipped');
    }

    const emoji = getEmojiForWord(item.word);
    const hintContainer = document.getElementById('srs-card-hint-container');
    const hintBtn2 = document.getElementById('srs-hint-btn');
    const hintEmoji = document.getElementById('srs-card-hint-emoji');
    if (emoji && hintContainer && hintBtn2 && hintEmoji) {
        hintBtn2.style.display = '';
        hintEmoji.style.display = 'none';
        hintEmoji.textContent = '';
        hintContainer.style.display = 'flex';
    } else if (hintContainer) {
        hintContainer.style.display = 'none';
    }

    const cefrColors = (typeof GLOBAL_CEFR_COLORS !== 'undefined') ? GLOBAL_CEFR_COLORS : { 'A1': '#4ade80', 'A2': '#16a34a', 'B1': '#fde047', 'B2': '#ca8a04', 'C1': '#f87171', 'C2': '#b91c1c', 'COL': '#38bdf8', 'Phrasal': '#c084fc', 'Idiom': '#fb923c', '??': '#64748b' };
    const level = item.cefrLevel || '';
    const color = cefrColors[level] || '#64748b';
    ['srs-card-level', 'srs-card-level-back'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = level;
        if (level) {
            el.style.cssText = `color:${color};background:${color}22;border:1px solid ${color}44`;
            el.style.display = '';
        } else {
            el.style.display = 'none';
        }
    });

    const intLabel = (item.reviewCount > 0) ? srsIntervalLabel(item.interval ?? 0) : '';
    const intFront = document.getElementById('srs-card-interval');
    const intFrontTxt = document.getElementById('srs-card-interval-text');
    if (intFront && intFrontTxt) {
        intFrontTxt.textContent = intLabel;
        intFront.style.display = intLabel ? 'inline-flex' : 'none';
    }
    const intBack = document.getElementById('srs-card-interval-back');
    const intBackTxt = document.getElementById('srs-card-interval-back-text');
    if (intBack && intBackTxt) {
        intBackTxt.textContent = intLabel;
        intBack.style.display = intLabel ? 'inline-flex' : 'none';
    }

    const speakerSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="14" height="14" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
    ['srs-card-word', 'srs-card-word-back'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = '';
        el.appendChild(document.createTextNode(item.word + ' '));
        const btn = document.createElement('button');
        btn.className = 'card-speak-btn';
        btn.innerHTML = speakerSvg;
        btn.title = getMessage("tooltip_pronounce") || "Telaffuz";
        btn.addEventListener('click', (e) => { e.stopPropagation(); speakWord(item.word, item.lang); });
        el.appendChild(btn);
    });

    document.getElementById('srs-card-translation').textContent = item.translation || '—';
    const ctx2 = item.context ? `"${item.context}"` : '';
    document.getElementById('srs-card-context').textContent = ctx2;
    document.getElementById('srs-card-context-back').textContent = ctx2;

    const srsWrapFront = document.getElementById('srs-context-trans-wrap');
    const srsResFront = document.getElementById('srs-context-trans-result');
    const srsBtnFront = document.getElementById('srs-context-trans-btn');

    if (srsResFront) { srsResFront.style.display = 'none'; srsResFront.innerHTML = ''; }
    if (srsBtnFront) { srsBtnFront.style.display = 'inline-flex'; }

    if (item.context && item.context.trim()) {
        if (srsWrapFront) srsWrapFront.style.display = 'block';
    } else {
        if (srsWrapFront) srsWrapFront.style.display = 'none';
    }

    [0, 1, 2, 3].forEach((r, i) => {
        const ids = ['srs-int-again', 'srs-int-hard', 'srs-int-good', 'srs-int-easy'];
        const targetEl = document.getElementById(ids[i]);
        if (targetEl) targetEl.textContent = srsIntervalLabel(srsCalcNext(item, r).interval);
    });

    chrome.storage.sync.get({ settings: { autoplaySound: false } }, ({ settings }) => {
        if (settings && settings.autoplaySound) {
            speakWord(item.word, item.lang);
        }
    });
}

const revealBtn = document.getElementById('srs-reveal-btn');
if (revealBtn && !revealBtn._listenerBound) {
    revealBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('srs-flip-inner')?.classList.add('flipped');
    });
    revealBtn._listenerBound = true;
}

const frontCard = document.getElementById('srs-card-front');
if (frontCard && !frontCard._listenerBound) {
    frontCard.addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('.card-speak-btn')) return;
        document.getElementById('srs-flip-inner')?.classList.add('flipped');
    });
    frontCard._listenerBound = true;
}

// ── Google Translate Cümle Çevirisi Event Listeners ──
const srsTransBtn = document.getElementById('srs-context-trans-btn');
if (srsTransBtn && !srsTransBtn._listenerBound) {
    srsTransBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (srsQueue && srsQueue[srsQueueIndex] && srsQueue[srsQueueIndex].context) {
            translateContextSentence(srsQueue[srsQueueIndex].context, document.getElementById('srs-context-trans-result'), srsTransBtn);
        }
    });
    srsTransBtn._listenerBound = true;
}


['again', 'hard', 'good', 'easy'].forEach((r, rating) => {
    const btn = document.getElementById(`srs-rate-${r}`);
    if (!btn || btn._listenerBound) return;
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = srsQueue[srsQueueIndex];
        srsSessionStats[r]++;
        if (rating === 0)
            srsQueue.push({ ...item });
        const next = srsCalcNext(item, rating);
        chrome.storage.local.get({ savedWords: [] }, ({ savedWords }) => {
            const idx = savedWords.findIndex(w => w.word.toLowerCase() === item.word.toLowerCase());
            if (idx !== -1) {
                const firstReviewDate = savedWords[idx].firstReviewDate || new Date().toDateString();
                let againCount = (savedWords[idx].againCount ?? 0);
                if (rating === 0) {
                    againCount++;
                } else if (rating === 2) {
                    if (againCount > 0) againCount--;
                } else if (rating === 3) {
                    againCount = 0;
                }
                const hard = againCount >= 3;
                const lastReviewDate = new Date().toDateString();
                savedWords[idx] = { ...savedWords[idx], ...next, firstReviewDate, againCount, hard, lastReviewDate, timestamp: Date.now() };
                chrome.storage.local.set({ savedWords }, () => { updateStudyStreak(); });
            }
        });

        document.getElementById('srs-flip-inner')?.classList.remove('flipped');
        setTimeout(() => {
            srsQueueIndex++;
            srsShowCard();
        }, 120);
    });
    btn._listenerBound = true;
});

const srsRateLearned = document.getElementById('srs-rate-learned');
if (srsRateLearned && !srsRateLearned._listenerBound) {
    srsRateLearned.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = srsQueue[srsQueueIndex];
        if (srsSessionStats.learned !== undefined)
            srsSessionStats.learned++;
        chrome.storage.local.get({ savedWords: [] }, ({ savedWords }) => {
            const idx = savedWords.findIndex(w => w.word.toLowerCase() === item.word.toLowerCase());
            if (idx !== -1) {
                savedWords[idx].learned = true;
                savedWords[idx].againCount = 0;
                savedWords[idx].hard = false;
                savedWords[idx].lastReviewDate = new Date().toDateString();
                savedWords[idx].timestamp = Date.now();
                chrome.storage.local.set({ savedWords }, () => { updateStudyStreak(); });
            }
        });

        document.getElementById('srs-flip-inner')?.classList.remove('flipped');
        setTimeout(() => {
            srsQueueIndex++;
            srsShowCard();
        }, 120);
    });
    srsRateLearned._listenerBound = true;
}

function srsShowResult() {
    // Yalnızca kart alanını ve alt ipucunu gizle; #srs-result zaten #srs-session'ın
    // İÇİNDE bir çocuk element — #srs-session'ın kendisini gizlemek onu da gizleyip
    // sonuç ekranının hiç görünmemesine (boş ekran) neden oluyordu.
    const cardStage = document.getElementById('srs-card-stage');
    if (cardStage) cardStage.style.display = 'none';
    const hintEl = document.getElementById('srs-persistent-bottom-hint');
    if (hintEl) hintEl.style.display = 'none';
    const resultEl = document.getElementById('srs-result');
    if (resultEl) resultEl.style.display = 'flex';
    document.getElementById('srs-session').style.display = 'flex';

    const progressBar = document.getElementById('srs-session-bar');
    if (progressBar) progressBar.style.width = '100%';
    const totalQ = srsQueue.length || 1;
    const progressEl = document.getElementById('srs-session-progress');
    if (progressEl) progressEl.textContent = `${totalQ} / ${totalQ}`;

    const subtabs = document.getElementById('review-subtabs');
    if (subtabs)
        subtabs.style.display = 'none';
    chrome.storage.local.get({ savedWords: [] }, ({ savedWords }) => {
        const due = srsDueItems(savedWords);
        const badge = document.getElementById('review-badge');
        if (badge) {
            badge.textContent = due.length;
            badge.style.display = due.length > 0 ? '' : 'none';
        }
    });
    const s = srsSessionStats;
    const total = s.again + s.hard + s.good + s.easy + (s.learned || 0);

    const statsContainer = document.getElementById('srs-result-stats');
    if (statsContainer) {
        const completed100Lbl = getMessage('srs_stat_completed_100') || '100% Tamamlandı';
        let h = '<div class="srs-stat-box highlight">';
        h += '<div class="srs-stat-label-wrap"><div class="srs-stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div><div><div class="srs-stat-val">' + total + '</div><div class="srs-stat-label">' + esc(getMessage("srs_result_total") || "Toplam Kart") + '</div></div></div>';
        h += '<div style="font-size:11px;font-weight:800;color:#a5b4fc;background:rgba(99,102,241,0.18);border:1px solid rgba(99,102,241,0.3);padding:3px 10px;border-radius:999px;">' + esc(completed100Lbl) + '</div></div>';

        h += '<div class="srs-stat-box" style="border-color:rgba(16,185,129,0.25);background:rgba(16,185,129,0.06)"><div class="srs-stat-val" style="color:#6ee7b7">' + s.easy + '</div><div class="srs-stat-label" style="color:#a7f3d0">' + esc(getMessage("srs_rate_easy") || "Kolay") + '</div></div>';
        h += '<div class="srs-stat-box" style="border-color:rgba(99,102,241,0.25);background:rgba(99,102,241,0.06)"><div class="srs-stat-val" style="color:#a5b4fc">' + s.good + '</div><div class="srs-stat-label" style="color:#c7d2fe">' + esc(getMessage("srs_rate_good") || "İyi") + '</div></div>';
        h += '<div class="srs-stat-box" style="border-color:rgba(245,158,11,0.25);background:rgba(245,158,11,0.06)"><div class="srs-stat-val" style="color:#fcd34d">' + s.hard + '</div><div class="srs-stat-label" style="color:#fde68a">' + esc(getMessage("srs_rate_hard") || "Zor") + '</div></div>';
        h += '<div class="srs-stat-box" style="border-color:rgba(239,68,68,0.25);background:rgba(239,68,68,0.06)"><div class="srs-stat-val" style="color:#fca5a5">' + s.again + '</div><div class="srs-stat-label" style="color:#fecaca">' + esc(getMessage("srs_rate_again") || "Tekrar") + '</div></div>';

        if (s.learned) {
            h += '<div class="srs-stat-box highlight" style="background:rgba(20,184,166,0.08);border-color:rgba(20,184,166,0.25)"><div class="srs-stat-label-wrap"><div class="srs-stat-icon" style="background:rgba(20,184,166,0.2);color:#5eead4"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div><div><div class="srs-stat-val" style="color:#5eead4">' + s.learned + '</div><div class="srs-stat-label" style="color:#99f6e4">' + esc(getMessage("srs_rate_learned") || "Öğrenildi") + '</div></div></div></div>';
        }
        statsContainer.innerHTML = h;
    }
}

const srsResultWordsBtn = document.getElementById('srs-result-words-btn');
if (srsResultWordsBtn && !srsResultWordsBtn._listenerBound) {
    srsResultWordsBtn.addEventListener('click', () => {
        srsLoadHome();
        if (srsWordsOverlay) {
            srsWordsOverlay.style.display = 'flex';
            srsLoadWords();
        }
    });
    srsResultWordsBtn._listenerBound = true;
}

function updateReviewBadge() {
    chrome.storage.local.get({ savedWords: [], srsSettings: { newLimit: 10 } }, ({ savedWords, srsSettings }) => {
        const now = Date.now(), today = new Date().toDateString();
        const reviewDue = savedWords.filter(w =>
            !w.learned &&
            (w.reviewCount ?? 0) > 0 &&
            (w.nextReview ?? 0) <= now
        );
        const newCards = savedWords.filter(w => !w.learned && (w.reviewCount ?? 0) === 0);
        const introducedToday = savedWords.filter(w => !w.learned && (w.reviewCount ?? 0) > 0 && w.firstReviewDate === today).length;
        const newLimit = srsSettings.newLimit ?? 10;
        const newAvailable = newLimit === 0 ? newCards.length : Math.max(0, Math.min(newCards.length, newLimit - introducedToday));
        const total = reviewDue.length + newAvailable;
        const badge = document.getElementById('review-badge');
        if (badge) {
            badge.textContent = total;
            badge.style.display = total > 0 ? '' : 'none';
        }
    });
}

function srsUpdateSegmentedThumbs() {
    requestAnimationFrame(() => {
        document.querySelectorAll('.segmented').forEach(seg => {
            const thumb = seg.querySelector('.seg-thumb');
            const activeBtn = seg.querySelector('.setting-btn.active');
            if (!thumb || !activeBtn) return;
            const left = activeBtn.offsetLeft;
            const width = activeBtn.offsetWidth;
            if (width > 0) {
                thumb.style.left = `${left}px`;
                thumb.style.width = `${width}px`;
            }
        });
    });
}

function saveSrsSettings(key, value) {
    chrome.storage.local.get({ srsSettings: { newLimit: 10, sessionLimit: 20 } }, ({ srsSettings }) => {
        srsSettings[key] = value;
        srsSettings.timestamp = Date.now();
        chrome.storage.local.set({ srsSettings }, () => {
            srsUpdateSegmentedThumbs();
            srsLoadHome(true);
        });
    });
}

document.querySelectorAll('#srs-new-limit-group .setting-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#srs-new-limit-group .setting-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        srsUpdateSegmentedThumbs();
        saveSrsSettings('newLimit', parseInt(btn.dataset.value));
    });
});

document.querySelectorAll('#srs-session-limit-group .setting-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#srs-session-limit-group .setting-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        srsUpdateSegmentedThumbs();
        saveSrsSettings('sessionLimit', parseInt(btn.dataset.value));
    });
});

let reviewScrollListenerAttached = false;
let reviewLastScrollTop = 0;
let reviewAccumulatedDelta = 0;
let reviewLastDirection = null;

function attachReviewScrollListener() {
    if (reviewScrollListenerAttached) return;

    const scrollTargets = [
        document.getElementById('review-training-content'),
        document.getElementById('panel-review')
    ].filter(Boolean);

    if (!scrollTargets.length) return;

    scrollTargets.forEach(target => {
        target.addEventListener('scroll', srsThrottle(() => {
            const maxReviewScroll = Math.max(0, target.scrollHeight - target.clientHeight);
            const currentScrollTop = Math.min(Math.max(0, target.scrollTop), maxReviewScroll);
            const appContainer = document.querySelector('.app');

            if (maxReviewScroll <= 25) {
                if (appContainer && appContainer.classList.contains('review-nav-hidden')) {
                    appContainer.classList.remove('review-nav-hidden');
                }
                reviewAccumulatedDelta = 0;
                reviewLastScrollTop = currentScrollTop;
                return;
            }

            if (currentScrollTop <= 15) {
                if (appContainer && appContainer.classList.contains('review-nav-hidden')) {
                    appContainer.classList.remove('review-nav-hidden');
                }
                reviewAccumulatedDelta = 0;
                reviewLastDirection = null;
                reviewLastScrollTop = currentScrollTop;
                return;
            }

            const isNearBottom = (currentScrollTop + target.clientHeight >= target.scrollHeight - 30);
            if (isNearBottom) {
                reviewLastScrollTop = currentScrollTop;
                return;
            }

            const delta = currentScrollTop - reviewLastScrollTop;
            reviewLastScrollTop = currentScrollTop;

            if (Math.abs(delta) < 2) return;

            const currentDirection = delta > 0 ? 'down' : 'up';
            if (currentDirection !== reviewLastDirection) {
                reviewAccumulatedDelta = 0;
                reviewLastDirection = currentDirection;
            }

            reviewAccumulatedDelta += Math.abs(delta);

            if (appContainer) {
                if (currentDirection === 'down') {
                    if (reviewAccumulatedDelta >= 28 && currentScrollTop > 30) {
                        appContainer.classList.add('review-nav-hidden');
                    }
                } else {
                    if (reviewAccumulatedDelta >= 12) {
                        appContainer.classList.remove('review-nav-hidden');
                    }
                }
            }
        }, 25), { passive: true });
    });
    reviewScrollListenerAttached = true;
}
