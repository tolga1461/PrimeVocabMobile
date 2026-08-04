// ── SRS Sabitleri ─────────────────────────────────────────────────────────────
const SRS_NEW_INTERVAL = 1;
const SRS_AGAIN_INTERVAL = 0.007; // ~10 dakika
const MIN_EASE = 1.3;
// ── Flash Card State ──────────────────────────────────────────────────────────
let fcDeck = [];
let fcIndex = 0;
let fcScore = 0;
let fcAgainQueue = [];
const fcOverlay = document.getElementById('fc-overlay');
const fcCard = document.getElementById('fc-card');
const fcFront = document.getElementById('fc-front');
const fcBack = document.getElementById('fc-back');
const fcDone = document.getElementById('fc-done');
const fcProgress = document.getElementById('fc-progress');
const fcLevelBadge = document.getElementById('fc-level-badge');
const fcWordEl = document.getElementById('fc-word');
const fcWordBack = document.getElementById('fc-word-back');
const fcTransEl = document.getElementById('fc-translation');
const fcContextEl = document.getElementById('fc-context');
const fcContextBack = document.getElementById('fc-context-back');
const fcDoneSub = document.getElementById('fc-done-sub');
const cefrColorsFC = {
    'A1': '#22c55e', 'A2': '#84cc16', 'B1': '#eab308',
    'B2': '#f97316', 'C1': '#ef4444', 'C2': '#a855f7',
    'COL': '#38bdf8', 'Phrasal': '#c084fc', 'Idiom': '#fb923c', '??': '#64748b'
};
function fcShowCard() {
    const allRemaining = [...fcDeck.slice(fcIndex), ...fcAgainQueue];
    if (allRemaining.length === 0) {
        fcShowDone();
        return;
    }
    let item;
    if (fcIndex < fcDeck.length) {
        item = fcDeck[fcIndex];
    }
    else {
        fcDeck = [...fcAgainQueue];
        fcAgainQueue = [];
        fcIndex = 0;
        if (fcDeck.length === 0) {
            fcShowDone();
            return;
        }
        item = fcDeck[0];
    }
    const total = fcDeck.length + fcAgainQueue.length;
    fcProgress.textContent = `${fcIndex + 1} / ${total}`;
    const level = item.cefrLevel || '??';
    const color = cefrColorsFC[level] || '#64748b';
    fcLevelBadge.textContent = level !== '??' ? level : '';
    fcLevelBadge.style.color = color;
    fcLevelBadge.style.background = color + '22';
    fcLevelBadge.style.border = `1px solid ${color}44`;
    [fcWordEl, fcWordBack].forEach(el => {
        el.innerHTML = '';
        el.appendChild(document.createTextNode(item.word));
        const btn = document.createElement('button');
        btn.className = 'card-speak-btn';
        btn.textContent = '🔊';
        btn.title = getMessage("tooltip_pronounce") || "Telaffuz";
        btn.addEventListener('click', (e) => { e.stopPropagation(); speakWord(item.word, item.lang); });
        el.appendChild(btn);
    });
    fcTransEl.textContent = item.translation || '—';
    fcContextEl.textContent = item.context ? `"${item.context}"` : '';
    fcContextBack.textContent = item.context ? `"${item.context}"` : '';

    const fcWrapFront = document.getElementById('fc-context-trans-wrap');
    const fcWrapBack = document.getElementById('fc-context-back-trans-wrap');
    const fcResFront = document.getElementById('fc-context-trans-result');
    const fcResBack = document.getElementById('fc-context-back-trans-result');
    const fcBtnFront = document.getElementById('fc-context-trans-btn');
    const fcBtnBack = document.getElementById('fc-context-back-trans-btn');

    if (fcResFront) { fcResFront.style.display = 'none'; fcResFront.innerHTML = ''; }
    if (fcResBack) { fcResBack.style.display = 'none'; fcResBack.innerHTML = ''; }
    if (fcBtnFront) { fcBtnFront.style.display = 'inline-flex'; }
    if (fcBtnBack) { fcBtnBack.style.display = 'inline-flex'; }

    if (item.context && item.context.trim()) {
        if (fcWrapFront) fcWrapFront.style.display = 'block';
        if (fcWrapBack) fcWrapBack.style.display = 'block';
    } else {
        if (fcWrapFront) fcWrapFront.style.display = 'none';
        if (fcWrapBack) fcWrapBack.style.display = 'none';
    }

    fcFront.style.display = 'flex';
    fcBack.style.display = 'none';
    fcDone.style.display = 'none';
    fcCard.style.display = 'flex';
    chrome.storage.sync.get({ settings: { autoplaySound: false } }, ({ settings }) => {
        if (settings && settings.autoplaySound) {
            speakWord(item.word, item.lang);
        }
    });
}
function fcShowDone() {
    fcCard.style.display = 'none';
    fcDone.style.display = 'flex';
    const total = fcDeck.length + fcScore;
    fcDoneSub.textContent = getMessage("fc_done_sub").replace("{score}", fcScore).replace("{total}", total);
}
document.getElementById('fc-reveal-btn').addEventListener('click', () => {
    fcFront.style.display = 'none';
    fcBack.style.display = 'flex';
});
document.getElementById('fc-good').addEventListener('click', () => { fcScore++; fcIndex++; fcShowCard(); });
document.getElementById('fc-again').addEventListener('click', () => {
    fcAgainQueue.push(fcDeck[fcIndex]);
    fcIndex++;
    fcShowCard();
});
document.getElementById('fc-close').addEventListener('click', () => { fcOverlay.style.display = 'none'; });
document.getElementById('fc-restart-btn').addEventListener('click', () => {
    fcIndex = 0;
    fcScore = 0;
    fcAgainQueue = [];
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
            if (savedWords.length === 0) {
                showCustomAlert("alert_no_words_dictionary");
                return;
            }
            const filteredWords = (typeof virtualWords !== 'undefined') ? virtualWords : savedWords;
            if (filteredWords.length === 0) {
                showCustomAlert("alert_no_words_filter");
                return;
            }
            let deck = [...filteredWords];
            for (let i = deck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [deck[i], deck[j]] = [deck[j], deck[i]];
            }
            fcDeck = deck;
            fcIndex = 0;
            fcScore = 0;
            fcAgainQueue = [];
            fcOverlay.style.display = 'flex';
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
function srsLoadHome() {
    attachReviewScrollListener();
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
        const subtabs = document.getElementById('review-subtabs');
        if (subtabs)
            subtabs.style.display = '';
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
            document.getElementById('srs-session').style.display = '';
            const subtabs = document.getElementById('review-subtabs');
            if (subtabs)
                subtabs.style.display = 'none';
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
const srsWordsSort = document.getElementById('srs-words-sort');

let srsScrollListenerAttached = false;
let srsLastScrollTop = 0;
let srsHeaderCollapsed = false;

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
        // Clamp scrollTop against overscroll (rubber-band)
        const maxSrsScroll = Math.max(0, srsWordsList.scrollHeight - srsWordsList.clientHeight);
        const currentScrollTop = Math.min(Math.max(0, srsWordsList.scrollTop), maxSrsScroll);
        const appContainer = document.querySelector('.app');
        
        // Prevent scroll bounce / feedback loops on short pages
        const scrollableHeight = maxSrsScroll;
        if (scrollableHeight <= 100) {
            if (appContainer && appContainer.classList.contains('nav-hidden')) {
                appContainer.classList.remove('nav-hidden');
            }
            if (srsHeaderCollapsed) {
                srsWordsOverlay.classList.remove('scrolled');
                srsHeaderCollapsed = false;
            }
            return;
        }

        const isNearBottom = (currentScrollTop + srsWordsList.clientHeight >= srsWordsList.scrollHeight - 120);

        // Auto-hiding header (Twitter style) toggling on .scrolled class
        if (currentScrollTop <= 10) {
            if (srsHeaderCollapsed) {
                srsWordsOverlay.classList.remove('scrolled');
                srsHeaderCollapsed = false;
            }
        } else if (!isNearBottom && Math.abs(currentScrollTop - srsLastScrollTop) > 8) {
            if (currentScrollTop > srsLastScrollTop && currentScrollTop > 40) {
                if (!srsHeaderCollapsed) {
                    srsWordsOverlay.classList.add('scrolled');
                    srsHeaderCollapsed = true;
                }
            } else {
                if (srsHeaderCollapsed) {
                    srsWordsOverlay.classList.remove('scrolled');
                    srsHeaderCollapsed = false;
                }
            }
        }
        
        // Auto-hiding bottom navigation bar (Twitter style) toggling on .app root container
        if (appContainer) {
            if (currentScrollTop <= 10) {
                appContainer.classList.remove('nav-hidden');
            } else if (!isNearBottom && Math.abs(currentScrollTop - srsLastScrollTop) > 8) {
                if (currentScrollTop > srsLastScrollTop && currentScrollTop > 60) {
                    appContainer.classList.add('nav-hidden');
                } else {
                    appContainer.classList.remove('nav-hidden');
                }
            }
        }
        srsLastScrollTop = currentScrollTop;
    }, 50));
    srsScrollListenerAttached = true;
}

if (srsWordsBtn)
    srsWordsBtn.addEventListener('click', () => { 
        srsWordsOverlay.style.display = 'flex'; 
        
        // Reset scroll position and header state on open
        const srsWordsList = document.getElementById('srs-words-list');
        if (srsWordsList) srsWordsList.scrollTop = 0;
        srsWordsOverlay.classList.remove('scrolled');
        srsHeaderCollapsed = false;
        
        // Always ensure bottom navigation bar is visible when overlay opens
        const appContainer = document.querySelector('.app');
        if (appContainer) appContainer.classList.remove('nav-hidden');

        srsLoadWords(); 
        attachSrsScrollListener();
    });
if (srsWordsCloseBtn)
    srsWordsCloseBtn.addEventListener('click', () => { 
        srsWordsOverlay.style.display = 'none'; 
        srsWordsOverlay.classList.remove('scrolled');
        srsHeaderCollapsed = false;
        const appContainer = document.querySelector('.app');
        if (appContainer) appContainer.classList.remove('nav-hidden');
    });
if (srsWordsOverlay) {
    srsWordsOverlay.addEventListener('click', (e) => {
        if (e.target === srsWordsOverlay) {
            srsWordsOverlay.style.display = 'none';
            srsWordsOverlay.classList.remove('scrolled');
            srsHeaderCollapsed = false;
            const appContainer = document.querySelector('.app');
            if (appContainer) appContainer.classList.remove('nav-hidden');
        }
    });
}
if (srsWordsSort)
    srsWordsSort.addEventListener('change', () => { srsLoadWords(); });
function srsLoadWords() {
    const wordsListEl = document.getElementById('srs-words-list');
    if (!wordsListEl)
        return;
    chrome.storage.local.get({ savedWords: [] }, ({ savedWords }) => {
        wordsListEl.innerHTML = '';
        if (savedWords.length === 0) {
            wordsListEl.innerHTML = `<div style="color:var(--text-muted);text-align:center;padding:20px;">${getMessage("srs_no_words_review")}</div>`;
            return;
        }
        const sortVal = srsWordsSort ? srsWordsSort.value : 'time-asc';
        const uniqueWords = [...new Set(savedWords.map(w => w.word.toLowerCase()))];
        chrome.runtime.sendMessage({ action: "batch_lookup_cefr", words: uniqueWords }, (res) => {
            const cefrMap = res?.cefrMap || {};
            let words = savedWords.map((item, originalIndex) => {
                const wl = item.word.toLowerCase();
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
                return {
                    ...item,
                    cefrLevel,
                    originalIndex
                };
            });
            if (sortVal === 'alphabetical') {
                words.sort((a, b) => a.word.localeCompare(b.word));
            }
            else if (sortVal === 'learned-first') {
                words.sort((a, b) => (b.learned ? 1 : 0) - (a.learned ? 1 : 0));
            }
            else if (sortVal === 'new-first') {
                words.sort((a, b) => (!(b.reviewCount > 0) ? 1 : 0) - (!(a.reviewCount > 0) ? 1 : 0));
            }
            else {
                words.sort((a, b) => {
                    if (a.learned && !b.learned)
                        return 1;
                    if (!a.learned && b.learned)
                        return -1;
                    const aTime = a.nextReview || 0, bTime = b.nextReview || 0;
                    return sortVal === 'time-asc' ? aTime - bTime : bTime - aTime;
                });
            }
            const cefrColors = { 'A1': '#22c55e', 'A2': '#84cc16', 'B1': '#eab308', 'B2': '#f97316', 'C1': '#ef4444', 'C2': '#a855f7', 'COL': '#38bdf8', 'Phrasal': '#c084fc', 'Idiom': '#fb923c', '??': '#64748b' };
            words.forEach((item) => {
                const isPhrasal = item.cefrLevel === 'Phrasal';
                const isIdiom = item.cefrLevel === 'Idiom';
                const isCollocation = item.cefrLevel === 'COL';
                let badgeHtml;
                if (isPhrasal) {
                    badgeHtml = `<span class="cefr-badge phrasal-badge srs-word-badge" style="padding:2px 5px;border-radius:4px;font-weight:600;background:#c084fc22;border:1px solid #c084fc44;color:#c084fc;">Phrasal</span>`;
                } else if (isIdiom) {
                    badgeHtml = `<span class="cefr-badge idiom-badge srs-word-badge" style="padding:2px 5px;border-radius:4px;font-weight:600;background:#fb923c22;border:1px solid #fb923c44;color:#fb923c;">Idiom</span>`;
                } else if (isCollocation) {
                    badgeHtml = `<span class="cefr-badge collocation-badge srs-word-badge" style="padding:2px 5px;border-radius:4px;font-weight:600;background:#38bdf822;border:1px solid #38bdf844;color:#38bdf8;">COL</span>`;
                } else {
                    const c = cefrColors[item.cefrLevel] || '#64748b';
                    badgeHtml = `<span class="cefr-badge srs-word-badge" style="color:${c};background:${c}22;border:1px solid ${c}44;padding:2px 5px;border-radius:4px;font-weight:600;">${item.cefrLevel}</span>`;
                }
                let reviewBadgeHtml = '';
                if (item.learned) {
                    reviewBadgeHtml = `<span class="srs-word-status-badge" style="color:#10b981;background:rgba(16,185,129,0.1);padding:2px 6px;border-radius:4px;font-weight:600;border:1px solid rgba(16,185,129,0.2);">${getMessage("srs_status_learned") || '📖 Learned'}</span>`;
                }
                else if (!item.reviewCount || !item.nextReview) {
                    reviewBadgeHtml = `<span class="srs-word-status-badge" style="color:#3b82f6;background:rgba(59,130,246,0.1);padding:2px 6px;border-radius:4px;font-weight:600;border:1px solid rgba(59,130,246,0.2);">${getMessage("srs_status_new") || '🆕 New'}</span>`;
                }
                else {
                    const diffMs = item.nextReview - Date.now();
                    if (diffMs <= 0) {
                        reviewBadgeHtml = `<span class="srs-word-status-badge" style="color:#f59e0b;background:rgba(245,158,11,0.1);padding:2px 6px;border-radius:4px;font-weight:600;border:1px solid rgba(245,158,11,0.2);">${getMessage("srs_status_due") || '⏳ Due'}</span>`;
                    }
                    else {
                        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                        let label = days === 1 ? (getMessage("srs_status_tomorrow") || 'Tomorrow')
                            : days <= 30 ? (getMessage("srs_status_days_later") || '{days}d later').replace('{days}', days)
                                : (getMessage("srs_status_months_later") || '{months}m later').replace('{months}', Math.round(days / 30));
                        reviewBadgeHtml = `<span class="srs-word-status-badge" style="color:#94a3b8;background:rgba(148,163,184,0.1);padding:2px 6px;border-radius:4px;font-weight:600;border:1px solid rgba(148,163,184,0.2);">📅 ${label}</span>`;
                    }
                }
                const div = document.createElement('div');
                div.className = 'srs-word-item';
                div.style.cssText = 'background:var(--surface);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:10px 12px;display:flex;flex-direction:column;gap:4px;';
                div.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="srs-word-item-word" style="font-weight:700;color:#818cf8;">${esc(item.word)}</span>
            ${badgeHtml} ${reviewBadgeHtml}
          </div>
          <label class="custom-checkbox-container">
            <input type="checkbox" class="srs-learned-chk" data-index="${item.originalIndex}" ${item.learned ? 'checked' : ''}>
            <span class="checkmark"></span>
            <span>${getMessage("srs_rate_learned") || 'Öğrendim'}</span>
          </label>
        </div>
        <div class="srs-word-item-translation" style="color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(item.translation || '—')}</div>
      `;
                const chk = div.querySelector('.srs-learned-chk');
                if (chk) {
                    chk.addEventListener('change', () => {
                        // Kelime kartının hafifçe küçülüp silinme animasyonu
                        div.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease';
                        div.style.transform = 'scale(0.96) translateY(2px)';
                        div.style.opacity = '0.5';
                        
                        setTimeout(() => {
                            toggleLearnWordFromSrsList(parseInt(chk.dataset.index));
                        }, 300);
                    });
                }
                wordsListEl.appendChild(div);
            });
        });
    });
}
function toggleLearnWordFromSrsList(index) {
    chrome.storage.local.get({ savedWords: [] }, ({ savedWords }) => {
        const item = savedWords[index];
        if (item) {
            item.learned = !item.learned;
            chrome.storage.local.set({ savedWords }, () => { srsLoadWords(); srsLoadHome(); updateReviewBadge(); });
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
    document.getElementById('srs-session-progress').textContent = `${srsQueueIndex} / ${total}`;
    document.getElementById('srs-session-bar').style.width = `${(srsQueueIndex / total) * 100}%`;
    const emoji = getEmojiForWord(item.word);
    const hintContainer = document.getElementById('srs-card-hint-container');
    const hintBtn2 = document.getElementById('srs-hint-btn');
    const hintEmoji = document.getElementById('srs-card-hint-emoji');
    if (emoji && hintContainer && hintBtn2 && hintEmoji) {
        hintBtn2.style.display = '';
        hintEmoji.style.display = 'none';
        hintEmoji.textContent = '';
        hintContainer.style.display = 'flex';
    }
    else if (hintContainer) {
        hintContainer.style.display = 'none';
    }
    const cefrColors = { 'A1': '#22c55e', 'A2': '#84cc16', 'B1': '#eab308', 'B2': '#f97316', 'C1': '#ef4444', 'C2': '#a855f7', 'COL': '#38bdf8', 'Phrasal': '#c084fc', 'Idiom': '#fb923c', '??': '#64748b' };
    const level = item.cefrLevel || '';
    const color = cefrColors[level] || '#64748b';
    ['srs-card-level', 'srs-card-level-back'].forEach(id => {
        const el = document.getElementById(id);
        el.textContent = level;
        if (level) {
            el.style.cssText = `color:${color};background:${color}22;border:1px solid ${color}44`;
            el.style.display = '';
        }
        else
            el.style.display = 'none';
    });
    ['srs-card-word', 'srs-card-word-back'].forEach(id => {
        const el = document.getElementById(id);
        el.innerHTML = '';
        el.appendChild(document.createTextNode(item.word));
        const btn = document.createElement('button');
        btn.className = 'card-speak-btn';
        btn.textContent = '🔊';
        btn.title = getMessage("tooltip_pronounce") || "Telaffuz";
        btn.addEventListener('click', (e) => { e.stopPropagation(); speakWord(item.word, item.lang); });
        el.appendChild(btn);
    });
    document.getElementById('srs-card-translation').textContent = item.translation || '—';
    const ctx2 = item.context ? `"${item.context}"` : '';
    document.getElementById('srs-card-context').textContent = ctx2;
    document.getElementById('srs-card-context-back').textContent = ctx2;

    const srsWrapFront = document.getElementById('srs-context-trans-wrap');
    const srsWrapBack = document.getElementById('srs-context-back-trans-wrap');
    const srsResFront = document.getElementById('srs-context-trans-result');
    const srsResBack = document.getElementById('srs-context-back-trans-result');
    const srsBtnFront = document.getElementById('srs-context-trans-btn');
    const srsBtnBack = document.getElementById('srs-context-back-trans-btn');

    if (srsResFront) { srsResFront.style.display = 'none'; srsResFront.innerHTML = ''; }
    if (srsResBack) { srsResBack.style.display = 'none'; srsResBack.innerHTML = ''; }
    if (srsBtnFront) { srsBtnFront.style.display = 'inline-flex'; }
    if (srsBtnBack) { srsBtnBack.style.display = 'inline-flex'; }

    if (item.context && item.context.trim()) {
        if (srsWrapFront) srsWrapFront.style.display = 'block';
        if (srsWrapBack) srsWrapBack.style.display = 'block';
    } else {
        if (srsWrapFront) srsWrapFront.style.display = 'none';
        if (srsWrapBack) srsWrapBack.style.display = 'none';
    }
    const intEl = document.getElementById('srs-card-interval');
    if (item.reviewCount > 0) {
        intEl.textContent = getMessage('srs_last_interval', srsIntervalLabel(item.interval ?? 0));
        intEl.style.display = '';
    }
    else
        intEl.style.display = 'none';
    [0, 1, 2, 3].forEach((r, i) => {
        const ids = ['srs-int-again', 'srs-int-hard', 'srs-int-good', 'srs-int-easy'];
        document.getElementById(ids[i]).textContent = srsIntervalLabel(srsCalcNext(item, r).interval);
    });
    document.getElementById('srs-card-front').style.display = 'flex';
    document.getElementById('srs-card-back').style.display = 'none';
    chrome.storage.sync.get({ settings: { autoplaySound: false } }, ({ settings }) => {
        if (settings && settings.autoplaySound) {
            speakWord(item.word, item.lang);
        }
    });
}
document.getElementById('srs-reveal-btn').addEventListener('click', () => {
    document.getElementById('srs-card-front').style.display = 'none';
    document.getElementById('srs-card-back').style.display = 'flex';
});

// ── Google Translate Cümle Çevirisi Event Listeners ──
const srsTransBtn = document.getElementById('srs-context-trans-btn');
if (srsTransBtn) {
    srsTransBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (srsQueue && srsQueue[srsQueueIndex] && srsQueue[srsQueueIndex].context) {
            translateContextSentence(srsQueue[srsQueueIndex].context, document.getElementById('srs-context-trans-result'), srsTransBtn);
        }
    });
}
const srsTransBackBtn = document.getElementById('srs-context-back-trans-btn');
if (srsTransBackBtn) {
    srsTransBackBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (srsQueue && srsQueue[srsQueueIndex] && srsQueue[srsQueueIndex].context) {
            translateContextSentence(srsQueue[srsQueueIndex].context, document.getElementById('srs-context-back-trans-result'), srsTransBackBtn);
        }
    });
}

const fcTransBtn = document.getElementById('fc-context-trans-btn');
if (fcTransBtn) {
    fcTransBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (fcDeck && fcDeck[fcIndex] && fcDeck[fcIndex].context) {
            translateContextSentence(fcDeck[fcIndex].context, document.getElementById('fc-context-trans-result'), fcTransBtn);
        }
    });
}
const fcTransBackBtn = document.getElementById('fc-context-back-trans-btn');
if (fcTransBackBtn) {
    fcTransBackBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (fcDeck && fcDeck[fcIndex] && fcDeck[fcIndex].context) {
            translateContextSentence(fcDeck[fcIndex].context, document.getElementById('fc-context-back-trans-result'), fcTransBackBtn);
        }
    });
}
['again', 'hard', 'good', 'easy'].forEach((r, rating) => {
    document.getElementById(`srs-rate-${r}`).addEventListener('click', () => {
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
        srsQueueIndex++;
        srsShowCard();
    });
});
const srsRateLearned = document.getElementById('srs-rate-learned');
if (srsRateLearned) {
    srsRateLearned.addEventListener('click', () => {
        const item = srsQueue[srsQueueIndex];
        if (srsSessionStats.learned !== undefined)
            srsSessionStats.learned++;
        chrome.storage.local.get({ savedWords: [] }, ({ savedWords }) => {
            const idx = savedWords.findIndex(w => w.word.toLowerCase() === item.word.toLowerCase());
            if (idx !== -1) {
                savedWords[idx].learned = true;
                savedWords[idx].againCount = 0;   // Öğrenildi → zor durumundan çıkar
                savedWords[idx].hard = false;
                savedWords[idx].lastReviewDate = new Date().toDateString();
                savedWords[idx].timestamp = Date.now();
                chrome.storage.local.set({ savedWords }, () => { updateStudyStreak(); });
            }
        });
        srsQueueIndex++;
        srsShowCard();
    });
}
function srsShowResult() {
    document.getElementById('srs-session').style.display = 'none';
    document.getElementById('srs-result').style.display = '';
    const subtabs = document.getElementById('review-subtabs');
    if (subtabs)
        subtabs.style.display = 'none';
    chrome.storage.local.get({ savedWords: [] }, ({ savedWords }) => {
        const due = srsDueItems(savedWords);
        const badge = document.getElementById('review-badge');
        badge.textContent = due.length;
        badge.style.display = due.length > 0 ? '' : 'none';
    });
    const s = srsSessionStats;
    const total = s.again + s.hard + s.good + s.easy + (s.learned || 0);
    document.getElementById('srs-result-stats').innerHTML = `
    <div class="srs-result-row"><span class="srs-result-label">${getMessage("srs_result_total") || "Toplam kart"}</span><span class="srs-result-val">${total}</span></div>
    <div class="srs-result-row srs-col-easy"><span class="srs-result-label">${getMessage("srs_rate_learned") || "Öğrenildi"} 📖</span><span class="srs-result-val">${s.learned || 0}</span></div>
    <div class="srs-result-row srs-col-easy"><span class="srs-result-label">${getMessage("srs_rate_easy") || "Kolay"} ✔</span><span class="srs-result-val">${s.easy}</span></div>
    <div class="srs-result-row srs-col-good"><span class="srs-result-label">${getMessage("srs_rate_good") || "İyi"} ✔</span><span class="srs-result-val">${s.good}</span></div>
    <div class="srs-result-row srs-col-hard"><span class="srs-result-label">${getMessage("srs_rate_hard") || "Zor"}</span><span class="srs-result-val">${s.hard}</span></div>
    <div class="srs-result-row srs-col-again"><span class="srs-result-label">${getMessage("srs_rate_again") || "Bilmedi"}</span><span class="srs-result-val">${s.again}</span></div>
  `;
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
        badge.textContent = total;
        badge.style.display = total > 0 ? '' : 'none';
    });
}
function saveSrsSettings(key, value) {
    chrome.storage.local.get({ srsSettings: { newLimit: 10, sessionLimit: 20 } }, ({ srsSettings }) => {
        srsSettings[key] = value;
        srsSettings.timestamp = Date.now();
        chrome.storage.local.set({ srsSettings }, () => srsLoadHome());
    });
}
document.querySelectorAll('#srs-new-limit-group .setting-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#srs-new-limit-group .setting-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        saveSrsSettings('newLimit', parseInt(btn.dataset.value));
    });
});
document.querySelectorAll('#srs-session-limit-group .setting-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#srs-session-limit-group .setting-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        saveSrsSettings('sessionLimit', parseInt(btn.dataset.value));
    });
});

let reviewScrollListenerAttached = false;
let reviewLastScrollTop = 0;

function attachReviewScrollListener() {
    const panelReview = document.getElementById('panel-review');
    if (!panelReview || reviewScrollListenerAttached) return;

    panelReview.addEventListener('scroll', srsThrottle(() => {
        // Clamp scrollTop against overscroll (rubber-band)
        const maxReviewScroll = Math.max(0, panelReview.scrollHeight - panelReview.clientHeight);
        const currentScrollTop = Math.min(Math.max(0, panelReview.scrollTop), maxReviewScroll);
        const appContainer = document.querySelector('.app');
        
        // Prevent scroll bounce / feedback loops on short pages
        const scrollableHeight = maxReviewScroll;
        if (scrollableHeight <= 100) {
            if (appContainer && appContainer.classList.contains('nav-hidden')) {
                appContainer.classList.remove('nav-hidden');
            }
            return;
        }

        const isNearBottom = (currentScrollTop + panelReview.clientHeight >= panelReview.scrollHeight - 120);

        if (appContainer) {
            if (currentScrollTop <= 10) {
                appContainer.classList.remove('nav-hidden');
            } else if (!isNearBottom && Math.abs(currentScrollTop - reviewLastScrollTop) > 8) {
                if (currentScrollTop > reviewLastScrollTop && currentScrollTop > 60) {
                    appContainer.classList.add('nav-hidden');
                } else {
                    appContainer.classList.remove('nav-hidden');
                }
            }
        }
        reviewLastScrollTop = currentScrollTop;
    }, 50));
    reviewScrollListenerAttached = true;
}
