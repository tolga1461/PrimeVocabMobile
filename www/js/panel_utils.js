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
    let modal = document.getElementById('custom-premium-alert-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'custom-premium-alert-modal';
        modal.style.cssText = "display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.9); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); z-index:99999; justify-content:center; align-items:center; padding:20px; box-sizing:border-box;";
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div style="background:linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); border:1px solid #eab308; border-radius:16px; padding:28px 24px; max-width:400px; width:100%; text-align:center; box-shadow:0 10px 25px -5px rgba(0,0,0,0.5), 0 0 20px rgba(234, 179, 8, 0.15); box-sizing:border-box; animation: confirmModalEnter 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);">
            <div style="font-size:52px; margin-bottom:16px;">👑</div>
            <h3 style="color:#fef08a; font-family:'Outfit', sans-serif; font-size:20px; font-weight:700; margin:0 0 10px 0;">${title}</h3>
            <p style="color:#cbd5e1; font-family:'Outfit', sans-serif; font-size:13px; line-height:1.7; margin:0 0 16px 0;">
                ${message}
            </p>
            <div style="background:rgba(234,179,8,0.08); border:1px solid rgba(234,179,8,0.2); border-radius:10px; padding:14px; margin:16px 0; text-align:left;">
                <p style="color:#cbd5e1; font-family:'Outfit', sans-serif; font-size:12px; line-height:1.6; margin:0;">
                    Premium üyelik işlemlerini bilgisayarınızdaki <strong>Chrome Eklentisi</strong> üzerinden profil sekmesini açarak gerçekleştirebilirsiniz.
                </p>
            </div>
            <div style="display:flex; flex-direction:column; gap:10px;">
                <button id="custom-premium-alert-close-btn" style="background:linear-gradient(135deg, #334155 0%, #1e293b 100%); border:1px solid #475569; color:#cbd5e1; padding:12px 24px; border-radius:8px; font-family:'Outfit', sans-serif; font-size:14px; cursor:pointer; font-weight:700; text-align:center; width:100%;">
                    Kapat
                </button>
            </div>
        </div>
    `;

    modal.querySelector('#custom-premium-alert-close-btn').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    modal.style.display = 'flex';
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
