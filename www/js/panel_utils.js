function localizeHtml() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = getMessage(key);
        if (val)
            el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        const val = getMessage(key);
        if (val)
            el.title = val;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const val = getMessage(key);
        if (val)
            el.placeholder = val;
    });
}
function showToast(msg, duration = 2800) {
    let toast = document.getElementById('primevocab-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'primevocab-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.remove('toast-hide');
    toast.classList.add('toast-show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.classList.remove('toast-show');
        toast.classList.add('toast-hide');
    }, duration);
}
// Sound Effects Synthesizer (Premium Chimes - Web Audio API)
function playSoundEffect(type) {
    const gamesSoundToggle = document.getElementById('games-sound-toggle');
    if (gamesSoundToggle && !gamesSoundToggle.checked)
        return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const now = ctx.currentTime;
        if (type === 'correct') {
            // Premium warm Major triad chime (E5, G#5, B5) with soft attack & decay
            const freqs = [659.25, 830.61, 987.77];
            freqs.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.04);
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(1500, now);
                filter.frequency.exponentialRampToValueAtTime(400, now + 0.3);
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.04, now + idx * 0.04 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.35);
                osc.start(now + idx * 0.04);
                osc.stop(now + idx * 0.04 + 0.35);
            });
        }
        else if (type === 'wrong') {
            // Gentle, low-frequency muted double-thud warning (A2, E2)
            const freqs = [110.00, 82.41];
            const offsets = [0, 0.08];
            freqs.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + offsets[idx]);
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(180, now + offsets[idx]);
                gain.gain.setValueAtTime(0, now + offsets[idx]);
                gain.gain.linearRampToValueAtTime(0.05, now + offsets[idx] + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, now + offsets[idx] + 0.15);
                osc.start(now + offsets[idx]);
                osc.stop(now + offsets[idx] + 0.15);
            });
        }
        else if (type === 'complete') {
            // Sparkling rising bell arpeggio (C5 -> E5 -> G5 -> A5 -> C6 -> E6)
            const freqs = [523.25, 659.25, 783.99, 880.00, 1046.50, 1318.51];
            freqs.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.06);
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(2000, now + idx * 0.06);
                filter.frequency.exponentialRampToValueAtTime(500, now + idx * 0.06 + 0.5);
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.03, now + idx * 0.06 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.5);
                osc.start(now + idx * 0.06);
                osc.stop(now + idx * 0.06 + 0.5);
            });
        }
    }
    catch (err) {
        console.error("Failed to play sound:", err);
    }
}

function showPremiumModal(title, message) {
    const modal = document.getElementById('premium-modal');
    if (!modal) return;
    
    const titleEl = document.getElementById('premium-modal-title');
    const msgEl = document.getElementById('premium-modal-message');
    
    if (titleEl && title) titleEl.textContent = title;
    if (msgEl && message) msgEl.textContent = message;
    
    modal.style.display = 'flex';
    
    const closeBtn = document.getElementById('premium-modal-close-btn');
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };
    }
    
    const buyBtn = document.getElementById('premium-modal-buy-btn');
    if (buyBtn) {
        buyBtn.onclick = () => {
            modal.style.display = 'none';
            // Lemon Squeezy checkout akışını tetikle
            if (typeof handleBuyPremium === 'function' && typeof LS_URLS !== 'undefined') {
                handleBuyPremium(LS_URLS.MONTHLY, 'MONTHLY');
            } else {
                window.open('https://primevocab.lemonsqueezy.com/checkout/buy/21098d81-25ed-4ded-a487-fb2c9e02d30f', '_blank');
            }
        };
    }
}

/**
 * Tracks a deleted word locally by adding it to a log of deletion tombstones.
 * This log is synced with the cloud to propagate deletions to other devices.
 */
function trackDeletedWord(wordText) {
    if (!wordText) return;
    const cleanWord = wordText.toLowerCase().trim();
    chrome.storage.local.get({ deletedWords: [] }, ({ deletedWords }) => {
        const filtered = deletedWords.filter(item => item.word !== cleanWord);
        filtered.push({ word: cleanWord, deletedAt: Date.now() });
        // Keep the log size under 1000 to prevent local/cloud storage bloat
        if (filtered.length > 1000) {
            filtered.shift();
        }
        chrome.storage.local.set({ deletedWords: filtered });
    });
}
