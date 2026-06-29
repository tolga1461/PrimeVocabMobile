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
    'B2': '#f97316', 'C1': '#ef4444', 'C2': '#a855f7', '??': '#64748b'
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
        btn.title = 'Telaffuz';
        btn.addEventListener('click', (e) => { e.stopPropagation(); speakWord(item.word, item.lang); });
        el.appendChild(btn);
    });
    fcTransEl.textContent = item.translation || '—';
    fcContextEl.textContent = item.context ? `"${item.context}"` : '';
    fcContextBack.textContent = item.context ? `"${item.context}"` : '';
    fcFront.style.display = 'flex';
    fcBack.style.display = 'none';
    fcDone.style.display = 'none';
    fcCard.style.display = 'flex';
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
document.getElementById('flashcard-btn').addEventListener('click', () => {
    chrome.storage.local.get({ savedWords: [] }, ({ savedWords }) => {
        if (savedWords.length === 0) {
            alert(getMessage("alert_no_words_dictionary"));
            return;
        }
        const uniqueWords = [...new Set(savedWords.map(w => w.word.toLowerCase()))];
        chrome.runtime.sendMessage({ action: "batch_lookup_cefr", words: uniqueWords }, (res) => {
            const cefrMap = res?.cefrMap || {};
            let deck = savedWords.map(item => ({
                ...item,
                cefrLevel: cefrMap[item.word.toLowerCase()] || '??'
            }));
            if (archiveFilter !== 'all')
                deck = deck.filter(item => item.cefrLevel === archiveFilter);
            if (deck.length === 0) {
                alert(getMessage("alert_no_words_filter"));
                return;
            }
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
});
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
        streak = 0;
        interval = SRS_AGAIN_INTERVAL;
        easeFactor = Math.max(MIN_EASE, easeFactor - 0.2);
    }
    else if (rating === 1) {
        streak = 1;
        interval = 1;
        easeFactor = Math.max(MIN_EASE, easeFactor - 0.15);
    }
    else if (rating === 2) {
        streak = (streak ?? 0) + 1;
        if (streak === 1)
            interval = 1;
        else if (streak === 2)
            interval = 6;
        else
            interval = Math.round(interval * easeFactor);
    }
    else {
        streak = (streak ?? 0) + 1;
        if (streak === 1)
            interval = 4;
        else
            interval = Math.round(interval * easeFactor * 1.3);
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
        chrome.storage.local.set({ srsStreakStats: { currentStreak, lastStudyDate, bestStreak } }, () => {
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
        if (item.learned)
            return false;
        if (item.nextReview)
            return item.nextReview <= now;
        return true;
    });
}
let srsQueue = [];
let srsQueueIndex = 0;
let srsSessionStats = { again: 0, hard: 0, good: 0, easy: 0, learned: 0 };
// ── SRS Ana Sayfa ─────────────────────────────────────────────────────────────
function srsLoadHome() {
    chrome.storage.local.get({
        savedWords: [],
        srsSettings: { newLimit: 10, sessionLimit: 20 },
        srsStreakStats: { currentStreak: 0, lastStudyDate: '', bestStreak: 0 }
    }, ({ savedWords, srsSettings, srsStreakStats }) => {
        const now = Date.now();
        const today = new Date().toDateString();
        const reviewDue = savedWords.filter(w => !w.learned && (w.reviewCount ?? 0) > 0 && (w.nextReview ?? 0) <= now);
        const newCards = savedWords.filter(w => !w.learned && (w.reviewCount ?? 0) === 0);
        const introducedToday = savedWords.filter(w => !w.learned && (w.reviewCount ?? 0) > 0 && w.firstReviewDate === today).length;
        const newLimit = srsSettings.newLimit ?? 10;
        const newAvailable = newLimit === 0 ? newCards.length : Math.max(0, Math.min(newCards.length, newLimit - introducedToday));
        const totalDue = reviewDue.length + newAvailable;
        document.getElementById('srs-due-count').textContent = totalDue;
        document.getElementById('srs-total-count').textContent = savedWords.length;
        let currentStreak = srsStreakStats.currentStreak || 0;
        const legacyMaxStreak = savedWords.reduce((m, w) => Math.max(m, w.streak ?? 0), 0);
        if (currentStreak === 0 && legacyMaxStreak > 0) {
            currentStreak = legacyMaxStreak;
            srsStreakStats.currentStreak = legacyMaxStreak;
            srsStreakStats.lastStudyDate = today;
            srsStreakStats.bestStreak = Math.max(srsStreakStats.bestStreak || 0, legacyMaxStreak);
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
            const mAbbr = getMessage("interval_months_abbr") || "mo";
            document.getElementById('srs-next-text').textContent =
                inH < 1 ? `${lbl}${Math.round(inMs / 60000)}${mAbbr === 'ay' ? ' dakika sonra' : 'm later'}` :
                    inH < 24 ? `${lbl}${Math.round(inH)}${mAbbr === 'ay' ? ' saat sonra' : 'h later'}` :
                        `${lbl}${Math.round(inH / 24)}${mAbbr === 'ay' ? ' gün sonra' : 'd later'}`;
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
        const reviewedAt = (w.nextReview ?? 0) - (w.interval ?? 1) * msDay;
        const dayStart = reviewedAt - (reviewedAt % msDay);
        activityMap[dayStart] = (activityMap[dayStart] || 0) + 1;
    });
    const maxCount = Math.max(1, ...Object.values(activityMap));
    grid.innerHTML = '';
    const startOffset = (today.getDay() + 6) % 7;
    const startDay = todayMs - (DAYS - 1 + startOffset) * msDay;
    for (let d = 0; d < DAYS + startOffset; d++) {
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
                cell.title = `${date.toLocaleDateString('tr-TR')}: ${count} kart`;
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
            const barHeight = week.count === 0 ? 2 : Math.max(4, (week.count / maxCount) * (chartH - 12));
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
                ctx.fillText(week.count, x + barW / 2, Math.max(y - 2, 10));
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
        
        if (licenseType === 'FREE') {
            if (srsDailySessions.date === today && srsDailySessions.count >= 2) {
                if (typeof showPremiumModal === 'function') {
                    showPremiumModal(
                        getMessage("premium_modal_title") || "Premium Özellik",
                        "Ücretsiz sürümde günlük en fazla 2 antrenman yapabilirsiniz. Sınırsız antrenman ve diğer premium özellikler için Premium üyeliğe yükseltin."
                    );
                }
                return;
            }
        }

        const reviewDue = savedWords.filter(w => !w.learned && (w.reviewCount ?? 0) > 0 && (w.nextReview ?? 0) <= now);
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
                item.cefrLevel = cefrMap[item.word.toLowerCase()] || '';
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
        const currentScrollTop = srsWordsList.scrollTop;
        
        // Auto-hiding header (Twitter style) toggling on .scrolled class
        if (currentScrollTop <= 10) {
            if (srsHeaderCollapsed) {
                srsWordsOverlay.classList.remove('scrolled');
                srsHeaderCollapsed = false;
            }
        } else if (Math.abs(currentScrollTop - srsLastScrollTop) > 8) {
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
        const appContainer = document.querySelector('.app');
        if (appContainer) {
            if (currentScrollTop <= 10) {
                appContainer.classList.remove('nav-hidden');
            } else if (Math.abs(currentScrollTop - srsLastScrollTop) > 8) {
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
            let words = savedWords.map((item, originalIndex) => ({
                ...item,
                cefrLevel: cefrMap[item.word.toLowerCase()] || '??',
                originalIndex
            }));
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
            const cefrColors = { 'A1': '#22c55e', 'A2': '#84cc16', 'B1': '#eab308', 'B2': '#f97316', 'C1': '#ef4444', 'C2': '#a855f7', '??': '#64748b' };
            words.forEach((item) => {
                const isPhrasal = typeof PHRASAL_VERBS_DB !== 'undefined' && PHRASAL_VERBS_DB[item.word.toLowerCase()];
                let badgeHtml = isPhrasal
                    ? `<span class="cefr-badge phrasal-badge" style="font-size:10px;padding:1px 4px;border-radius:4px;font-weight:600;">Phrasal</span>`
                    : (() => { const c = cefrColors[item.cefrLevel] || '#64748b'; return `<span class="cefr-badge" style="color:${c};background:${c}22;border:1px solid ${c}44;font-size:10px;padding:1px 4px;border-radius:4px;font-weight:600;">${item.cefrLevel}</span>`; })();
                let reviewBadgeHtml = '';
                if (item.learned) {
                    reviewBadgeHtml = `<span style="font-size:10px;color:#10b981;background:rgba(16,185,129,0.1);padding:2px 6px;border-radius:4px;font-weight:600;border:1px solid rgba(16,185,129,0.2);">${getMessage("srs_status_learned") || '📖 Learned'}</span>`;
                }
                else if (!item.reviewCount || !item.nextReview) {
                    reviewBadgeHtml = `<span style="font-size:10px;color:#3b82f6;background:rgba(59,130,246,0.1);padding:2px 6px;border-radius:4px;font-weight:600;border:1px solid rgba(59,130,246,0.2);">${getMessage("srs_status_new") || '🆕 New'}</span>`;
                }
                else {
                    const diffMs = item.nextReview - Date.now();
                    if (diffMs <= 0) {
                        reviewBadgeHtml = `<span style="font-size:10px;color:#f59e0b;background:rgba(245,158,11,0.1);padding:2px 6px;border-radius:4px;font-weight:600;border:1px solid rgba(245,158,11,0.2);">${getMessage("srs_status_due") || '⏳ Due'}</span>`;
                    }
                    else {
                        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                        let label = days === 1 ? (getMessage("srs_status_tomorrow") || 'Tomorrow')
                            : days < 7 ? (getMessage("srs_status_days_later") || '{days}d later').replace('{days}', days)
                                : days < 30 ? (getMessage("srs_status_weeks_later") || '{weeks}w later').replace('{weeks}', Math.round(days / 7))
                                    : (getMessage("srs_status_months_later") || '{months}m later').replace('{months}', Math.round(days / 30));
                        reviewBadgeHtml = `<span style="font-size:10px;color:#94a3b8;background:rgba(148,163,184,0.1);padding:2px 6px;border-radius:4px;font-weight:600;border:1px solid rgba(148,163,184,0.2);">📅 ${label}</span>`;
                    }
                }
                const div = document.createElement('div');
                div.className = 'srs-word-item';
                div.style.cssText = 'background:var(--surface);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:10px 12px;display:flex;flex-direction:column;gap:4px;';
                div.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:14px;font-weight:700;color:#818cf8;">${esc(item.word)}</span>
            ${badgeHtml} ${reviewBadgeHtml}
          </div>
          <label style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-muted);cursor:pointer;user-select:none;">
            <input type="checkbox" class="srs-learned-chk" data-index="${item.originalIndex}" ${item.learned ? 'checked' : ''} style="cursor:pointer;width:14px;height:14px;">
            ${getMessage("srs_rate_learned") || 'Öğrendim'}
          </label>
        </div>
        <div style="font-size:12px;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(item.translation || '—')}</div>
      `;
                const chk = div.querySelector('.srs-learned-chk');
                if (chk)
                    chk.addEventListener('change', (e) => { toggleLearnWordFromSrsList(parseInt(e.target.dataset.index)); });
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
    const cefrColors = { 'A1': '#22c55e', 'A2': '#84cc16', 'B1': '#eab308', 'B2': '#f97316', 'C1': '#ef4444', 'C2': '#a855f7' };
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
        btn.title = 'Telaffuz';
        btn.addEventListener('click', (e) => { e.stopPropagation(); speakWord(item.word, item.lang); });
        el.appendChild(btn);
    });
    document.getElementById('srs-card-translation').textContent = item.translation || '—';
    const ctx2 = item.context ? `"${item.context}"` : '';
    document.getElementById('srs-card-context').textContent = ctx2;
    document.getElementById('srs-card-context-back').textContent = ctx2;
    const intEl = document.getElementById('srs-card-interval');
    if (item.reviewCount > 0) {
        intEl.textContent = `Son aralık: ${srsIntervalLabel(item.interval ?? 0)}`;
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
}
document.getElementById('srs-reveal-btn').addEventListener('click', () => {
    document.getElementById('srs-card-front').style.display = 'none';
    document.getElementById('srs-card-back').style.display = 'flex';
});
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
                if (rating === 0)
                    againCount++;
                const hard = againCount >= 3;
                savedWords[idx] = { ...savedWords[idx], ...next, firstReviewDate, againCount, hard };
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
    <div class="srs-result-row"><span class="srs-result-label">Toplam kart</span><span class="srs-result-val">${total}</span></div>
    <div class="srs-result-row srs-col-easy"><span class="srs-result-label">Öğrenildi 📖</span><span class="srs-result-val">${s.learned || 0}</span></div>
    <div class="srs-result-row srs-col-easy"><span class="srs-result-label">Kolay ✔</span><span class="srs-result-val">${s.easy}</span></div>
    <div class="srs-result-row srs-col-good"><span class="srs-result-label">İyi ✔</span><span class="srs-result-val">${s.good}</span></div>
    <div class="srs-result-row srs-col-hard"><span class="srs-result-label">Zor</span><span class="srs-result-val">${s.hard}</span></div>
    <div class="srs-result-row srs-col-again"><span class="srs-result-label">Bilmedi</span><span class="srs-result-val">${s.again}</span></div>
  `;
}
function updateReviewBadge() {
    chrome.storage.local.get({ savedWords: [], srsSettings: { newLimit: 10 } }, ({ savedWords, srsSettings }) => {
        const now = Date.now(), today = new Date().toDateString();
        const reviewDue = savedWords.filter(w => !w.learned && (w.reviewCount ?? 0) > 0 && (w.nextReview ?? 0) <= now);
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
