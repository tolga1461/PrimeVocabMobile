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
function showCustomAlert(messageKey, onOk = null) {
    let overlay = document.getElementById('custom-alert-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'custom-alert-overlay';
        overlay.className = 'custom-confirm-overlay';
        overlay.style.display = 'none';

        const modal = document.createElement('div');
        modal.className = 'custom-confirm-modal';

        const msgEl = document.createElement('div');
        msgEl.id = 'custom-alert-message';
        msgEl.className = 'custom-confirm-body';

        const actions = document.createElement('div');
        actions.className = 'custom-confirm-actions';

        const okBtn = document.createElement('button');
        okBtn.id = 'custom-alert-ok';
        okBtn.className = 'custom-confirm-btn accent';

        actions.appendChild(okBtn);
        modal.appendChild(msgEl);
        modal.appendChild(actions);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        okBtn.addEventListener('click', () => {
            overlay.style.display = 'none';
            if (overlay._callback) {
                overlay._callback();
            }
        });
    }

    const msgEl = document.getElementById('custom-alert-message');
    const okBtn = document.getElementById('custom-alert-ok');

    msgEl.textContent = getMessage(messageKey) || messageKey;
    okBtn.textContent = getMessage('btn_ok') || 'OK';
    overlay._callback = onOk;
    overlay.style.display = 'flex';
}
// Sound Effects Synthesizer (Premium Chimes - Web Audio API)
function playSoundEffect(type) {
    chrome.storage.sync.get({ settings: { gamesSound: true } }, ({ settings }) => {
        if (settings && settings.gamesSound === false)
            return;
        const gamesSoundToggle = document.getElementById('games-sound-toggle');
        if (gamesSoundToggle && !gamesSoundToggle.checked)
            return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const now = ctx.currentTime;
            if (type === 'correct') {
                // Premium warm Major triad chime (E5, G#5, B5) with soft attack & decay - Louder gain (0.2)
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
                    gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.04 + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.35);
                    osc.start(now + idx * 0.04);
                    osc.stop(now + idx * 0.04 + 0.35);
                });
            }
            else if (type === 'wrong') {
                // Audible mid-frequency warning (D4, A3) - Louder gain (0.6) & direct triangle wave (no filter) for clear playback
                const freqs = [293.66, 220.00];
                const offsets = [0, 0.10];
                freqs.forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, now + offsets[idx]);
                    gain.gain.setValueAtTime(0, now);
                    gain.gain.setValueAtTime(0, now + offsets[idx]);
                    gain.gain.linearRampToValueAtTime(0.6, now + offsets[idx] + 0.01);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + offsets[idx] + 0.22);
                    osc.start(now + offsets[idx]);
                    osc.stop(now + offsets[idx] + 0.22);
                });
            }
            else if (type === 'typo') {
                // Soft notification chime (G#5, E5) - Louder gain (0.25)
                const freqs = [830.61, 659.25];
                const offsets = [0, 0.08];
                freqs.forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + offsets[idx]);
                    gain.gain.setValueAtTime(0, now);
                    gain.gain.setValueAtTime(0, now + offsets[idx]);
                    gain.gain.linearRampToValueAtTime(0.25, now + offsets[idx] + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + offsets[idx] + 0.25);
                    osc.start(now + offsets[idx]);
                    osc.stop(now + offsets[idx] + 0.25);
                });
            }
            else if (type === 'complete') {
                // Sparkling rising bell arpeggio (C5 -> E5 -> G5 -> A5 -> C6 -> E6) - Louder gain (0.18)
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
                    gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.06 + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.5);
                    osc.start(now + idx * 0.06);
                    osc.stop(now + idx * 0.06 + 0.5);
                });
            }
        }
        catch (err) {
            console.warn("Failed to play sound:", err);
        }
    });
}

function showPremiumModal(title, message) {
    // Mobil için native/alert sistemi ile bilgilendir
    // Direkt satın alma linki göstermiyoruz (App Store / Play Store politikaları gereği)
    const alertMessage = `${title}\n\n${message}\n\n(Premium üyelik işlemlerini bilgisayarınızdaki Chrome Eklentisi üzerinden profil sekmesini açarak gerçekleştirebilirsiniz.)`;
    alert(alertMessage);
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
