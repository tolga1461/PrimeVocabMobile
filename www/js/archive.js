// ── Yardımcı: TTS (Sesli Okuma) ───────────────────────────────────────────────
// Tarayıcılar sayfa yeni açıldığında getVoices()'ı senkron olarak boş döndürebilir
// (ses listesi arka planda asenkron yükleniyor); bu yüzden gerekirse 'voiceschanged'
// olayını bekleyip gerçek listeyi alıyoruz — aksi halde henüz yüklenmemiş liste
// "hiç ses yok" sanılıp yanlış dildeki bir sesle sessizce konuşulabilir.
function getSpeechVoicesAsync() {
    return new Promise((resolve) => {
        const existing = window.speechSynthesis.getVoices();
        if (existing && existing.length > 0) {
            resolve(existing);
            return;
        }
        let resolved = false;
        const onVoicesChanged = () => {
            if (resolved) return;
            resolved = true;
            window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
            resolve(window.speechSynthesis.getVoices() || []);
        };
        window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
        setTimeout(() => {
            if (resolved) return;
            resolved = true;
            window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
            resolve(window.speechSynthesis.getVoices() || []);
        }, 300);
    });
}

async function speakWord(word, lang) {
    if (!word) return;
    const voiceLang = lang || 'en';

    // 1. Yol: Capacitor Native TTS Eklentisi (Mobil APK için en sağlam yol)
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.TextToSpeech) {
        try {
            await window.Capacitor.Plugins.TextToSpeech.speak({
                text: word,
                lang: voiceLang === 'en' ? 'en-US' : voiceLang,
                rate: 0.9,
                pitch: 1.0,
                volume: 1.0,
                category: 'ambient'
            });
            return;
        } catch (e) {
            console.warn("Capacitor Native TTS failed, trying fallback...", e);
        }
    }

    // 2. Yol: Web SpeechSynthesis API (Tarayıcılar için)
    // Not: Hedef dille eşleşen bir ses motoru yoksa ASLA konuşmuyoruz — aksi halde
    // tarayıcı sistemde kurulu olan alakasız bir sesle (ör. Türkçe) kelimeyi yanlış
    // telaffuz eder ve hata fırlatmadığı için 3. yoldaki doğru online sese hiç geçilmez.
    if (window.speechSynthesis) {
        try {
            const target = voiceLang.toLowerCase().split('-')[0];
            const voices = await getSpeechVoicesAsync();
            const matchingVoices = voices.filter(v => {
                if (!v || !v.lang) return false;
                const vLang = v.lang.toLowerCase().replace('_', '-');
                return vLang === target || vLang.startsWith(target + '-');
            });
            if (voices.length > 0 && matchingVoices.length === 0) {
                console.warn(`[TTS] "${target}" için uygun ses bulunamadı, online yönteme geçiliyor.`);
            } else {
                window.speechSynthesis.cancel();
                const utter = new SpeechSynthesisUtterance(word);
                const selectedVoice = matchingVoices.find(v =>
                    v.name.includes('Natural') || v.name.includes('Google') ||
                    v.name.includes('Premium') || v.name.includes('Enhanced')
                ) || matchingVoices[0];
                if (selectedVoice) {
                    utter.voice = selectedVoice;
                    utter.lang = selectedVoice.lang;
                } else {
                    utter.lang = voiceLang;
                }
                utter.rate = 0.9;
                window.speechSynthesis.speak(utter);
                return;
            }
        } catch (e) {
            console.warn("Web SpeechSynthesis failed, trying online fallback...", e);
        }
    }

    // 3. Yol: Google TTS API (Her şey başarısız olursa internet üzerinden)
    try {
        const audioUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(word)}&tl=${voiceLang}&client=tw-ob`;
        const audio = new Audio(audioUrl);
        await audio.play();
    } catch (e) {
        console.error("All TTS options failed:", e);
    }
}

// ── Yardımcı: Kaynak Popup (ⓘ butonu) ────────────────────────────────────────
function showSourcePopup(anchorEl, item) {
    // Varsa eski popup'ı kaldır
    const existing = document.getElementById('source-popup-bubble');
    if (existing) {
        existing.remove();
        return;
    }

    const src = item.source;
    if (!src) return;

    let lines = [];
    if (src.showTitle) lines.push(`📺 <strong>${esc(src.showTitle)}</strong>`);
    if (src.title && src.title !== src.showTitle) lines.push(`🎬 ${esc(src.title)}`);
    if (src.season != null && src.episode != null) {
        lines.push(`📂 S${String(src.season).padStart(2, '0')} E${String(src.episode).padStart(2, '0')}`);
    } else if (src.season != null) {
        lines.push(`📂 Sezon ${src.season}`);
    }
    if (src.time != null) {
        const totalSec = Math.floor(src.time);
        const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
        const s = (totalSec % 60).toString().padStart(2, '0');
        lines.push(`⏱️ ${m}:${s}`);
    }
    if (lines.length === 0) return;

    const popup = document.createElement('div');
    popup.id = 'source-popup-bubble';
    popup.innerHTML = lines.join('<br>');
    popup.style.cssText = `
        position: fixed;
        background: var(--card-bg, #1e293b);
        color: var(--text-primary, #f1f5f9);
        border: 1px solid var(--border-color, #334155);
        border-radius: 10px;
        padding: 10px 14px;
        font-size: 13px;
        line-height: 1.6;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        z-index: 9999;
        max-width: 240px;
        pointer-events: none;
    `;
    document.body.appendChild(popup);

    // Konumlandır
    const rect = anchorEl.getBoundingClientRect();
    const pw = popup.offsetWidth || 200;
    let left = rect.left - pw + rect.width;
    let top = rect.bottom + 6;
    if (left < 8) left = 8;
    if (top + 120 > window.innerHeight) top = rect.top - 120;
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;

    // Dışarı tıklayınca veya 4 saniye sonra kapat
    const close = () => { popup.remove(); document.removeEventListener('click', close, true); };
    setTimeout(() => document.addEventListener('click', close, true), 10);
    setTimeout(close, 4000);
}

// ── Yardımcı: Kelime Ailesi Çeviri Popup (Masaüstündeki showRowTranslation'ın Mobil Karşılığı) ──
async function showRowTranslation(anchorEl, word) {
    // Varsa eski popup'ı kaldır
    const existing = document.getElementById('translation-popup-bubble');
    if (existing) {
        existing.remove();
        return;
    }

    if (!word) return;

    // Geçici yükleniyor balonu oluştur
    const popup = document.createElement('div');
    popup.id = 'translation-popup-bubble';
    popup.innerHTML = `<span style="opacity: 0.6;">${esc(getMessage('translating_label') || '⏳ Çevriliyor...')}</span>`;
    popup.style.cssText = `
        position: fixed;
        background: var(--card-bg, #1e293b);
        color: var(--text-primary, #f1f5f9);
        border: 1px solid var(--border-color, #334155);
        border-radius: 8px;
        padding: 6px 12px;
        font-size: 12px;
        font-weight: 500;
        box-shadow: 0 4px 16px rgba(0,0,0,0.35);
        z-index: 9999;
        pointer-events: none;
        transition: opacity 0.15s ease;
    `;
    document.body.appendChild(popup);

    // Konumlandır
    const positionPopup = () => {
        const rect = anchorEl.getBoundingClientRect();
        const pw = popup.offsetWidth || 100;
        let left = rect.left + (rect.width / 2) - (pw / 2);
        let top = rect.bottom + 6;
        if (left < 8) left = 8;
        if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
        if (top + 40 > window.innerHeight) top = rect.top - 40;
        popup.style.left = `${left}px`;
        popup.style.top = `${top}px`;
    };
    positionPopup();

    // Dışarı tıklayınca kapatma
    const close = () => { popup.remove(); document.removeEventListener('click', close, true); };
    setTimeout(() => document.addEventListener('click', close, true), 10);

    // Google Translate API ile kelimeyi çevir (hedef dil uygulama dil haritasından gelir)
    const targetLang = await getTranslateTargetLang();
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(word)}`;
    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (data && data[0] && data[0][0] && data[0][0][0]) {
                const trans = data[0][0][0].trim();
                popup.innerHTML = `<strong>${esc(word)}</strong>: ${esc(trans)}`;
                positionPopup();
            } else {
                popup.innerHTML = `<span style="color: #ef4444;">${esc(getMessage('translation_failed') || '⚠️ Çevrilemedi')}</span>`;
            }
        })
        .catch(err => {
            console.error("Translation error:", err);
            popup.innerHTML = `<span style="color: #ef4444;">${esc(getMessage('connection_error_short') || '⚠️ Bağlantı hatası')}</span>`;
        });
}

// ── Arşiv state ───────────────────────────────────────────────────────────────
let archiveFilter = 'all';
let archiveSort = 'newest';
let archiveSearch = '';
let archiveSource = 'all'; // kaynak filtresi
let archiveTag = 'all'; // etiket filtresi

// Virtual scroll state
const expandedIndices = new Set();
const collapsedIndices = new Set();
let virtualWords = [];
let virtualShowFamily = true;
let virtualShowTags = true;
let virtualExpandAll = false;
let virtualCefrMap = {};
let virtualLicenseType = 'FREE';
let itemOffsets = [];
let totalScrollHeight = 0;
let scrollListenerAttached = false;
let lastScrollTop = 0;
let headerCollapsed = false;
let archiveAccumulatedDelta = 0;
let archiveLastDirection = null;
let isResettingScroll = false;
let isTogglingDetails = false;

function throttle(fn, ms) {
    let last = 0;
    let rafId = null;
    return function (...args) {
        const now = Date.now();
        if (now - last >= ms) {
            last = now;
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => { fn.apply(this, args); rafId = null; });
        }
    };
}

function resetArchiveScrollState() {
    lastScrollTop = 0;
    headerCollapsed = false;
    archiveAccumulatedDelta = 0;
    archiveLastDirection = null;
    const appContainer = document.querySelector('.app');
    if (appContainer) appContainer.classList.remove('nav-hidden');
}



// ── Arşiv Yükle & Popover Güncelleyiciler ──────────────────────────────────────
function closeAllArchivePopovers() {
    document.querySelectorAll('.level-popover, .sort-popover, .source-popover, .dropdown, .card-menu').forEach(el => {
        el.classList.remove('open');
    });
    document.querySelectorAll('.chip-select').forEach(el => {
        el.classList.remove('open');
    });
}

function loadArchive() {
    const expandToggle = document.getElementById('expandFeatureToggle');
    const familyToggle = document.getElementById('familyFeatureToggle');
    const tagToggle = document.getElementById('tagFeatureToggle');

    const showFamily = familyToggle ? familyToggle.checked : true;
    const showTags = tagToggle ? tagToggle.checked : true;
    const expandAll = expandToggle ? expandToggle.checked : false;

    chrome.storage.local.get({ savedWords: [], licenseType: 'FREE' }, ({ savedWords, licenseType }) => {
        updateSourceDropdown(savedWords);
        updateTagDropdown(savedWords);
        const uniqueWords = [...new Set(savedWords.map(w => w.word.toLowerCase()))];
        chrome.runtime.sendMessage({ action: "batch_lookup_cefr", words: uniqueWords }, (res) => {
            const cefrMap = res?.cefrMap || {};
            renderArchive(savedWords, showFamily, showTags, expandAll, cefrMap, licenseType);
        });
    });
}

function updateTagDropdown(savedWords) {
    const wrap = document.getElementById('tagFilterWrap');
    const popover = document.getElementById('tagPopover');
    const labelEl = document.getElementById('tagSelectLabel');
    const trigger = document.getElementById('tagSelect');
    if (!wrap || !popover) return;

    const tags = [...new Set(savedWords
        .flatMap(w => w.tags || [])
        .filter(t => t && t.trim()))].sort();

    if (tags.length === 0) {
        wrap.style.display = 'none';
        archiveTag = 'all';
        return;
    }

    wrap.style.display = '';
    const current = archiveTag;
    const allFilterLbl = (typeof getMessage === 'function' ? getMessage('filter_all') : '') || 'Tümü';
    const allTagsLbl = (typeof getMessage === 'function' ? getMessage('select_all_tags') : '') || 'Tüm etiketler';

    let html = `<span class="tag-filter-chip ${current === 'all' ? 'on' : ''}" data-label="all">${esc(allFilterLbl)}</span>`;
    tags.forEach(tag => {
        const isSelected = current.trim().toLowerCase() === tag.trim().toLowerCase();
        html += `<span class="tag-filter-chip ${isSelected ? 'on' : ''}" data-label="${esc(tag)}">${esc(tag)}</span>`;
    });
    popover.innerHTML = html;

    if (labelEl) {
        labelEl.textContent = current === 'all' ? allTagsLbl : current;
    }
    if (trigger) {
        trigger.classList.toggle('is-set', current !== 'all');
    }

    // Datalist doldur
    const dl = document.getElementById('global-tags-datalist');
    if (dl) {
        dl.innerHTML = tags.map(t => `<option value="${esc(t)}"></option>`).join('');
    }

    popover.querySelectorAll('.tag-filter-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            e.stopPropagation();
            archiveTag = chip.dataset.label;
            closeAllArchivePopovers();
            loadArchive();
        });
    });
}

function updateSourceDropdown(savedWords) {
    const wrap = document.getElementById('sourceSelectWrap');
    const popover = document.getElementById('sourcePopover');
    const labelEl = document.getElementById('sourceSelectLabel');
    const trigger = document.getElementById('sourceSelect');
    if (!wrap || !popover) return;

    const sourcedWords = savedWords.filter(w => w.source && (w.source.title || w.source.showTitle));
    if (sourcedWords.length === 0) {
        wrap.style.display = 'none';
        archiveSource = 'all';
        return;
    }

    wrap.style.display = '';
    const groupInfo = {};
    sourcedWords.forEach(w => {
        const src = w.source;
        const showTitle = (src.showTitle || '').trim();
        const season = src.season != null ? src.season : null;
        const title = src.title;
        let key;
        if (showTitle && season !== null) {
            key = `${showTitle}::season::${season}`;
        } else if (showTitle) {
            key = `${showTitle}::title::${title}`;
        } else {
            key = title;
        }
        if (!groupInfo[key]) {
            groupInfo[key] = {
                key,
                title,
                showTitle: showTitle || null,
                season,
                isSeason: !!(showTitle && season !== null),
                count: 0
            };
        }
        groupInfo[key].count++;
    });

    const shows = {};
    const standalone = [];
    Object.values(groupInfo).forEach(info => {
        if (info.showTitle) {
            const showName = info.showTitle;
            if (!shows[showName]) shows[showName] = [];
            shows[showName].push(info);
        } else {
            standalone.push(info);
        }
    });

    const sortedShowNames = Object.keys(shows).sort((a, b) => a.localeCompare(b));
    standalone.sort((a, b) => (a.title || '').localeCompare(b.title || ''));

    const allSourcesLbl = (typeof getMessage === 'function' ? getMessage('select_all_sources') : '') || 'Tüm kaynaklar';
    let html = `<button type="button" class="source-opt ${archiveSource === 'all' ? 'on' : ''}" data-val="all" data-label="${esc(allSourcesLbl)}">
        <span>${PV_ICONS.video}${esc(allSourcesLbl)}</span>
        <span class="count">${savedWords.length}</span>
    </button>`;

    const seasonLbl = (typeof getMessage === 'function' ? getMessage('season_label') : '') || 'Sezon';
    sortedShowNames.forEach(showName => {
        const entries = shows[showName];
        entries.sort((a, b) => (a.season ?? 999) - (b.season ?? 999));
        const totalCount = sourcedWords.filter(w => (w.source?.showTitle || '').trim() === showName).length;
        const isShowSelected = archiveSource === `show:${showName}`;
        html += `<button type="button" class="source-opt ${isShowSelected ? 'on' : ''}" data-val="show:${showName}" data-label="${esc(showName)}">
            <span>${PV_ICONS.video}${esc(showName)}</span>
            <span class="count">${totalCount}</span>
        </button>`;

        entries.forEach(info => {
            if (info.isSeason) {
                const seasonVal = `showseason:${showName}::${info.season}`;
                const isSeasonSelected = archiveSource === seasonVal;
                html += `<button type="button" class="source-opt source-opt-sub ${isSeasonSelected ? 'on' : ''}" data-val="${seasonVal}" data-label="${esc(showName)} · ${seasonLbl} ${info.season}">
                    <span>↳ ${seasonLbl} ${info.season}</span>
                    <span class="count">${info.count}</span>
                </button>`;
            }
        });
    });

    standalone.forEach(info => {
        const titleVal = `title:${info.title}`;
        const isTitleSelected = archiveSource === titleVal;
        html += `<button type="button" class="source-opt ${isTitleSelected ? 'on' : ''}" data-val="${titleVal}" data-label="${esc(info.title)}">
            <span>${PV_ICONS.video}${esc(info.title)}</span>
            <span class="count">${info.count}</span>
        </button>`;
    });

    popover.innerHTML = html;

    if (labelEl) {
        if (archiveSource === 'all') {
            labelEl.textContent = allSourcesLbl;
        } else {
            const activeBtn = popover.querySelector(`.source-opt[data-val="${CSS.escape(archiveSource)}"]`);
            if (activeBtn) labelEl.textContent = activeBtn.dataset.label;
        }
    }
    if (trigger) {
        trigger.classList.toggle('is-set', archiveSource !== 'all');
    }

    popover.querySelectorAll('.source-opt').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            archiveSource = btn.dataset.val;
            if (labelEl) labelEl.textContent = btn.dataset.label;
            if (trigger) trigger.classList.toggle('is-set', archiveSource !== 'all');
            closeAllArchivePopovers();
            loadArchive();
        });
    });
}
function renderArchive(savedWords, showFamily = true, showTags = true, expandAll = false, cefrMap = {}, licenseType = 'FREE') {
    isTogglingDetails = true;
    setTimeout(() => {
        isTogglingDetails = false;
    }, 150);
    const wordList = document.getElementById('word-list');
    const emptyState = document.getElementById('empty-archive');
    const countEl = document.getElementById('archive-count');
    if (!wordList || !emptyState)
        return;

    // Render limit bar (Not needed on mobile since all users are premium)
    const limitContainer = document.getElementById('archive-limit-container');
    if (limitContainer) {
        limitContainer.style.display = 'none';
        limitContainer.innerHTML = '';
    }

    virtualLicenseType = licenseType;

    // Sıralama
    let words = [...savedWords];
    if (archiveSort === 'newest') {
        words.sort((a, b) => (b.createdAt || b.timestamp || 0) - (a.createdAt || a.timestamp || 0));
    }
    else if (archiveSort === 'oldest') {
        words.sort((a, b) => (a.createdAt || a.timestamp || 0) - (b.createdAt || b.timestamp || 0));
    }
    else if (archiveSort === 'az')
        words.sort((a, b) => a.word.localeCompare(b.word));
    else if (archiveSort === 'za')
        words.sort((a, b) => b.word.localeCompare(a.word));

    // FREE kullanıcılar için son 20 kelimenin sınırını belirleyelim
    // savedWords dizisine yeni eklenen kelimeler en başa unshift ile eklenmektedir.
    // Dolayısıyla dizinin ilk 20 elemanı (indeks 0'dan 19'a kadar) en yeni kelimelerdir ve aktif kalmalıdır.
    const activeCutoffCount = 20;

    // CEFR seviyesini ekle ve aktiflik durumunu belirle
    words = words.map((item) => {
        const originalIndex = savedWords.indexOf(item);
        const isActive = licenseType !== 'FREE' || originalIndex < activeCutoffCount;
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
            originalIndex, // silme için orijinal index
            isActive
        };
    });
    // Filtre
    if (archiveFilter === 'hard') {
        words = words.filter(item => item.hard === true);
    }
    else if (archiveFilter === 'phrasal') {
        words = words.filter(item => typeof PHRASAL_VERBS_DB !== 'undefined' && PHRASAL_VERBS_DB[item.word.toLowerCase()]);
    }
    else if (archiveFilter === 'idiom') {
        words = words.filter(item => typeof IDIOMS_DB !== 'undefined' && IDIOMS_DB[item.word.toLowerCase()]);
    }
    else if (archiveFilter === 'collocation' || archiveFilter === 'COL') {
        words = words.filter(item => item.cefrLevel === 'COL');
    }
    else if (archiveFilter !== 'all') {
        words = words.filter(item => item.cefrLevel === archiveFilter);
    }
    // Arama
    const q = archiveSearch.trim().toLowerCase();
    if (q) {
        words = words.filter(item => item.word.toLowerCase().includes(q) ||
            (item.translation || '').toLowerCase().includes(q));
    }
    // Kaynak filtresi
    if (archiveSource !== 'all') {
        if (archiveSource.startsWith('show:')) {
            const showName = archiveSource.substring(5);
            words = words.filter(item => (item.source?.showTitle || '').trim() === showName);
        }
        else if (archiveSource.startsWith('showseason:')) {
            // "showseason:Breaking Bad::1" veya "showseason:Breaking Bad::__none__" formatı
            const payload = archiveSource.substring(11);
            const sepIdx = payload.lastIndexOf('::');
            const showName = payload.slice(0, sepIdx);
            const seasonStr = payload.slice(sepIdx + 2);
            if (seasonStr === '__none__') {
                // Sezon bilgisi olmayan bölümler
                words = words.filter(item => (item.source?.showTitle || '').trim() === showName &&
                    item.source?.season == null);
            }
            else {
                const seasonNum = parseInt(seasonStr, 10);
                words = words.filter(item => (item.source?.showTitle || '').trim() === showName &&
                    item.source?.season === seasonNum);
            }
        }
        else if (archiveSource.startsWith('title:')) {
            const titleName = archiveSource.substring(6);
            words = words.filter(item => item.source?.title === titleName);
        }
        else {
            // Legacy/Fallback
            words = words.filter(item => item.source?.title === archiveSource);
        }
    }
    // Etiket filtresi
    if (archiveTag !== 'all') {
        const targetTag = archiveTag.trim().toLowerCase();
        words = words.filter(item => item.tags && item.tags.some(t => (t || '').trim().toLowerCase() === targetTag));
    }
    if (countEl)
        countEl.textContent = '';
    const searchInput = document.getElementById('archive-search');
    if (searchInput) {
        if (savedWords.length > 0) {
            const template = getMessage("search_placeholder_dynamic") || "{count} kelime içinde ara...";
            searchInput.placeholder = template.replace("{count}", savedWords.length);
        }
        else {
            searchInput.placeholder = getMessage("search_placeholder") || "Kelime ara...";
        }
    }
    // Initialize virtual list variables
    virtualWords = words;
    virtualShowFamily = showFamily;
    virtualShowTags = showTags;
    if (virtualExpandAll !== expandAll) {
        expandedIndices.clear();
        collapsedIndices.clear();
    }
    virtualExpandAll = expandAll;
    virtualCefrMap = cefrMap;

    wordList.querySelectorAll('.word-card, .word-item, .no-results').forEach(el => el.remove());
    const spacer = document.getElementById('word-list-spacer');
    if (spacer) spacer.remove();

    if (savedWords.length === 0) {
        emptyState.style.display = '';
        return;
    }

    emptyState.style.display = 'none';

    if (words.length === 0) {
        const noResDiv = document.createElement('div');
        noResDiv.className = 'empty-state no-results';
        const noMatchTitle = getMessage('archive_no_match_title') || 'Eşleşen kelime bulunamadı';
        const noMatchHelp = getMessage('archive_no_match_help') || 'Filtreleri veya arama terimini değiştirmeyi deneyin';
        noResDiv.innerHTML = `
            <div class="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="36" height="36">
                    <circle cx="11" cy="11" r="7"/>
                    <path d="m21 21-4.3-4.3"/>
                </svg>
            </div>
            <p style="font-size:14px;font-weight:600;color:var(--text-secondary);margin:8px 0 4px 0;">${esc(noMatchTitle)}</p>
            <small style="font-size:12px;color:var(--text-muted);">${esc(noMatchHelp)}</small>
        `;
        wordList.appendChild(noResDiv);
        return;
    }

    const hardBadgeLbl = getMessage('archive_hard_badge_label') || 'ZOR';
    const inactiveBadgeLbl = getMessage('archive_inactive_badge_label') || 'PASİF';
    const inactiveBadgeTitle = getMessage('archive_inactive_badge_title') || 'Limit dışı (Altyazıda taranmaz)';
    const removeTagTooltip = getMessage('archive_remove_tag_tooltip') || 'Etiketi kaldır';
    const clickForTrans = getMessage('archive_click_for_translation') || 'çevirisi için tıkla';
    const editTooltip = getMessage('tooltip_double_click_edit') || 'Düzenlemek için çift tıkla';
    const speakTooltip = getMessage('tooltip_speak') || 'Seslendir';
    const cardToolsTooltip = getMessage('archive_card_tools_tooltip') || 'İşlemler';
    const addTagLbl = getMessage('archive_card_add_tag') || 'Etiket ekle';
    const markHardLbl = getMessage('archive_card_mark_hard') || 'Zor Olarak İşaretle';
    const unmarkHardLbl = getMessage('archive_card_unmark_hard') || 'Zor İşaretini Kaldır';
    const deleteLbl = getMessage('archive_card_delete') || 'Sil';

    words.forEach((item) => {
        const isPhrasal = typeof PHRASAL_VERBS_DB !== 'undefined' && PHRASAL_VERBS_DB[item.word.toLowerCase()];
        const isIdiom = typeof IDIOMS_DB !== 'undefined' && IDIOMS_DB[item.word.toLowerCase()];
        const isColloc = item.cefrLevel === 'COL';
        
        let typeColor = (typeof getCEFRColor === 'function') ? getCEFRColor(item.cefrLevel) : '#64748b';
        if (isPhrasal) typeColor = (typeof getCEFRColor === 'function') ? getCEFRColor('Phrasal') : '#c084fc';
        else if (isIdiom) typeColor = (typeof getCEFRColor === 'function') ? getCEFRColor('Idiom') : '#fb923c';
        else if (isColloc) typeColor = (typeof getCEFRColor === 'function') ? getCEFRColor('COL') : '#38bdf8';
        const badgeType = isPhrasal ? 'Phrasal' : (isIdiom ? 'Idiom' : (isColloc ? 'COL' : (item.cefrLevel || '')));
        const pipColor = typeColor;
        const badgeHtml = (typeof getCEFRBadgeHTML === 'function') ? getCEFRBadgeHTML(badgeType) : '';

        let hardBadgeHtml = item.hard ? `<span class="word-badge" style="background:rgba(239,68,68,.18);color:#fca5b3"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>${esc(hardBadgeLbl)}</span>` : '';
        let inactiveBadgeHtml = !item.isActive ? `<span class="word-badge is-inactive-badge" title="${esc(inactiveBadgeTitle)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="10" height="10"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>${esc(inactiveBadgeLbl)}</span>` : '';

        let tagPillsHtml = '';
        if (showTags && item.tags && item.tags.length) {
            tagPillsHtml = item.tags.map(t => `<span class="tag-pill">${esc(t)}<button type="button" class="tag-pill-remove" data-tag="${esc(t)}" title="${esc(removeTagTooltip)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M18 6 6 18M6 6l12 12"/></svg></button></span>`).join('');
        }

        let familyHtml = '';
        if (showFamily && Array.isArray(item.wordFamily) && item.wordFamily.length) {
            const famLbl = getMessage('archive_word_family_lbl') || 'Kelime Ailesi';
            familyHtml = `<div class="word-family-wrap">
              <div class="word-family-inner">
                <div class="word-family-row">
                    <div class="family-label-wrap">
                        <svg class="family-label-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        <span class="family-label">${esc(famLbl.replace(/:\s*$/, ''))}:</span>
                    </div>
                    <div class="family-chips-wrap">
                        ${item.wordFamily.map(w => `<span class="family-chip" data-word="${esc(w)}" title="${esc(w)} (${esc(clickForTrans)})">${esc(w)}</span>`).join('')}
                    </div>
                </div>
              </div>
            </div>`;
        }

        const isExpanded = expandAll ? !collapsedIndices.has(item.originalIndex) : expandedIndices.has(item.originalIndex);
        const isInactive = (typeof item.isActive !== 'undefined') ? !item.isActive : false;

        let scenePillHtml = '';
        if (item.source && (item.source.title || item.source.showTitle)) {
            const src = item.source;
            const displayTitle = src.showTitle || src.title;
            const timeStr = src.time != null ? (typeof formatTime === 'function' ? formatTime(src.time) : `${Math.floor(src.time / 60)}:${String(Math.floor(src.time % 60)).padStart(2, '0')}`) : null;
            
            const rawUrl = (src.url || '').toLowerCase();
            const rawPlatform = (src.platform || item.platform || '').toLowerCase();
            let platformName = 'Video';
            let platformClass = 'platform-generic';
            let platformSvg = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="13" rx="2.5"/><polygon points="10 8 16 11.5 10 15 10 8" fill="currentColor" stroke="none"/></svg>`;
            
            if (rawPlatform === 'youtube' || rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be')) {
                platformName = 'YouTube';
                platformClass = 'platform-yt';
                platformSvg = `<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M21.58 7.19a2.5 2.5 0 0 0-1.76-1.77C18.26 5 12 5 12 5s-6.26 0-7.82.42A2.5 2.5 0 0 0 2.42 7.2C2 8.76 2 12 2 12s0 3.24.42 4.81a2.5 2.5 0 0 0 1.76 1.77C5.74 19 12 19 12 19s6.26 0 7.82-.42a2.5 2.5 0 0 0 1.76-1.77C22 15.24 22 12 22 12s0-3.24-.42-4.81zM10 15V9l5.2 3-5.2 3z"/></svg>`;
            } else if (rawPlatform === 'netflix' || rawUrl.includes('netflix.com')) {
                platformName = 'Netflix';
                platformClass = 'platform-netflix';
                platformSvg = `<svg viewBox="0 0 24 24" width="10" height="11" fill="currentColor"><path d="M5.5 3h3.5v18H5.5z" opacity="0.75"/><path d="M15 3h3.5v18H15z" opacity="0.75"/><path d="M5.5 3h3.8l9.2 17.5V21H15L5.5 3.5V3z"/></svg>`;
            } else if (rawPlatform === 'prime' || rawPlatform === 'amazon' || rawUrl.includes('primevideo.com') || rawUrl.includes('amazon.')) {
                platformName = 'Prime Video';
                platformClass = 'platform-prime';
                platformSvg = `<svg viewBox="0 0 24 24" width="12" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="13" rx="2.5"/><polygon points="10 8 16 11.5 10 15 10 8" fill="currentColor" stroke="none"/><path d="M5 20c4.5 2 9.5 2 14 0"/></svg>`;
            }

            let epTag = '';
            if (src.season != null && src.episode != null) {
                epTag = `S${String(src.season).padStart(2, '0')}E${String(src.episode).padStart(2, '0')}`;
            } else if (src.season != null) {
                epTag = `S${String(src.season).padStart(2, '0')}`;
            }

            scenePillHtml = `
                <span class="card-scene-pill ${platformClass}">
                    <span class="csp-icon">${platformSvg}</span>
                    <span class="csp-title">${esc(displayTitle)}</span>
                    ${epTag ? `<span class="csp-ep">${esc(epTag)}</span>` : ''}
                    ${timeStr ? `<span class="csp-time">${esc(timeStr)}</span>` : ''}
                </span>
            `;
        }

        const div = document.createElement('div');
        div.className = `word-card ${isExpanded ? 'expanded' : ''} ${isInactive ? 'is-inactive-word' : ''}`;
        div.dataset.index = item.originalIndex;

        div.innerHTML = `
            <div class="word-card-top">
                <button type="button" class="expand-chevron">${PV_ICONS.chevronDown}</button>
                <div class="type-pip" style="background:${pipColor}"></div>
                <div class="word-main">
                    <div class="word-head">
                        <span class="word-en">${esc(item.word)}</span>
                        ${badgeHtml}
                        ${hardBadgeHtml}
                        ${inactiveBadgeHtml}
                        ${tagPillsHtml}
                    </div>
                    <div class="word-tr" title="${esc(editTooltip)}" data-i18n-title="tooltip_double_click_edit">${esc(item.translation || '—')}</div>
                </div>
                <div class="word-actions">
                    <button type="button" class="speak-btn-v2" title="${esc(speakTooltip)}" data-i18n-title="tooltip_speak">
                        ${PV_ICONS.speaker}
                    </button>
                    <button type="button" class="card-menu-btn" title="${esc(cardToolsTooltip)}" data-i18n-title="archive_card_tools_tooltip">
                        ${PV_ICONS.moreVertical}
                    </button>
                    <div class="card-menu">
                        <button type="button" class="dropdown-item card-add-tag-item">
                            ${PV_ICONS.tag}
                            <span>${esc(addTagLbl)}</span>
                        </button>
                        <button type="button" class="dropdown-item card-hard-item">
                            ${PV_ICONS.flameHard}
                            <span>${item.hard ? esc(unmarkHardLbl) : esc(markHardLbl)}</span>
                        </button>
                        <div class="dropdown-sep"></div>
                        <button type="button" class="dropdown-item danger card-delete-item">
                            ${PV_ICONS.trash}
                            <span>${esc(deleteLbl)}</span>
                        </button>
                    </div>
                </div>
            </div>
            <div class="word-detail-wrap"><div class="word-detail-inner">
                ${item.context ? `<div class="word-ctx">"${esc(item.context)}"</div>` : ''}
                ${scenePillHtml}
                ${familyHtml}
            </div></div>
        `;

        bindCardEvents(div, item);
        wordList.appendChild(div);
    });

    if (!scrollListenerAttached) {
        const appContainer = document.querySelector('.app');
        const panelEl = document.getElementById('panel-archive');

        const handleArchiveScroll = throttle(() => {
            if (isTogglingDetails) return;
            if (!panelEl) return;

            const maxScroll = Math.max(0, panelEl.scrollHeight - panelEl.clientHeight);
            const currentScrollTop = Math.min(Math.max(0, panelEl.scrollTop), maxScroll);

            // If page is short, keep bars visible
            if (maxScroll <= 80) {
                if (appContainer && appContainer.classList.contains('nav-hidden')) {
                    appContainer.classList.remove('nav-hidden');
                }
                headerCollapsed = false;
                archiveAccumulatedDelta = 0;
                lastScrollTop = currentScrollTop;
                return;
            }

            // 1. Twitter behavior: Always show when at the very top (within 15px)
            if (currentScrollTop <= 15) {
                if (headerCollapsed) {
                    headerCollapsed = false;
                    if (appContainer) appContainer.classList.remove('nav-hidden');
                }
                archiveAccumulatedDelta = 0;
                archiveLastDirection = null;
                lastScrollTop = currentScrollTop;
                return;
            }

            // 2. Twitter behavior: Ignore rubber-band bounce near bottom
            const isNearBottom = (currentScrollTop + panelEl.clientHeight >= panelEl.scrollHeight - 35);
            if (isNearBottom) {
                lastScrollTop = currentScrollTop;
                return;
            }

            const delta = currentScrollTop - lastScrollTop;
            lastScrollTop = currentScrollTop;

            // Ignore microscopic jitter (< 2px)
            if (Math.abs(delta) < 2) return;

            const currentDirection = delta > 0 ? 'down' : 'up';

            // If user reversed scroll direction, reset accumulated distance
            if (currentDirection !== archiveLastDirection) {
                archiveAccumulatedDelta = 0;
                archiveLastDirection = currentDirection;
            }

            archiveAccumulatedDelta += Math.abs(delta);

            // Close any open popovers if user has intentionally scrolled (> 15px)
            if (archiveAccumulatedDelta > 15 && typeof closeAllArchivePopovers === 'function') {
                closeAllArchivePopovers();
            }

            // 3. Twitter (X) Hysteresis thresholds:
            // Down: Requires continuous downward movement of at least 32px AND beyond top margin (50px)
            // Up: Responsive reappearance after at least 14px of continuous upward movement
            if (currentDirection === 'down') {
                if (archiveAccumulatedDelta >= 32 && currentScrollTop > 50) {
                    if (!headerCollapsed) {
                        headerCollapsed = true;
                        if (appContainer) appContainer.classList.add('nav-hidden');
                    }
                }
            } else {
                if (archiveAccumulatedDelta >= 14) {
                    if (headerCollapsed) {
                        headerCollapsed = false;
                        if (appContainer) appContainer.classList.remove('nav-hidden');
                    }
                }
            }
        }, 25);

        if (panelEl) {
            panelEl.addEventListener('scroll', handleArchiveScroll, { passive: true });
        }
        scrollListenerAttached = true;
    }
}

function bindCardEvents(card, item) {
    // Akordeon aç / kapa
    card.addEventListener('click', (e) => {
        // Metin seçimi yapıldıysa kartı kapatma
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) return;

        // Butonlara, açık input'a, etiket silmeye veya bağlam cümlesine tıklandıysa kartı açıp kapatma
        if (e.target.closest('.word-actions') || e.target.closest('input') ||
            e.target.closest('.family-chip') || e.target.closest('.tag-pill-remove') ||
            e.target.closest('.word-ctx') || e.target.closest('.card-scene-pill')) return;

        const isExpanded = card.classList.toggle('expanded');
        if (isExpanded) {
            expandedIndices.add(item.originalIndex);
            collapsedIndices.delete(item.originalIndex);
        } else {
            expandedIndices.delete(item.originalIndex);
            collapsedIndices.add(item.originalIndex);
        }
    });

    // Seslendir
    const speakBtn = card.querySelector('.speak-btn-v2');
    if (speakBtn) {
        speakBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            speakWord(item.word, item.lang || 'en');
        });
    }

    // Kart 3 nokta menüsü
    const menuBtn = card.querySelector('.card-menu-btn');
    const menu = card.querySelector('.card-menu');
    if (menuBtn && menu) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const willOpen = !menu.classList.contains('open');
            closeAllArchivePopovers();
            if (willOpen) {
                menu.classList.add('open');
            }
        });
    }

    // Kart Menü: Etiket Ekle
    const addTagItem = card.querySelector('.card-add-tag-item');
    if (addTagItem) {
        addTagItem.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllArchivePopovers();
            promptAddTagToCard(card, item);
        });
    }

    // Kart Menü: Zor İşaretle / Kaldır
    const hardItem = card.querySelector('.card-hard-item');
    if (hardItem) {
        hardItem.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllArchivePopovers();
            chrome.storage.local.get({ savedWords: [] }, ({ savedWords }) => {
                const targetWord = (item.word || '').trim().toLowerCase();
                let updated = false;
                savedWords.forEach((w) => {
                    if (w && w.word && w.word.trim().toLowerCase() === targetWord) {
                        w.hard = !w.hard;
                        w.hardStreak = 0;
                        w.wrongStreak = 0;
                        w.updatedAt = Date.now();
                        updated = true;
                    }
                });
                if (updated) {
                    chrome.storage.local.set({ savedWords }, () => {
                        loadArchive();
                    });
                }
            });
        });
    }



    // Kart Menü: Sil
    const deleteItem = card.querySelector('.card-delete-item');
    if (deleteItem) {
        deleteItem.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllArchivePopovers();
            deleteWord(item.originalIndex);
        });
    }

    // Etiket Kaldır
    card.querySelectorAll('.tag-pill-remove').forEach(rmBtn => {
        rmBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const tagToRemove = (rmBtn.dataset.tag || '').trim().toLowerCase();
            const targetWord = (item.word || '').trim().toLowerCase();
            chrome.storage.local.get({ savedWords: [] }, ({ savedWords }) => {
                let updated = false;
                savedWords.forEach((w) => {
                    if (w && w.word && w.word.trim().toLowerCase() === targetWord) {
                        if (Array.isArray(w.tags)) {
                            const prevLen = w.tags.length;
                            w.tags = w.tags.filter(t => (t || '').trim().toLowerCase() !== tagToRemove);
                            if (w.tags.length !== prevLen) {
                                w.updatedAt = Date.now();
                                updated = true;
                            }
                        }
                    }
                });
                if (updated) {
                    chrome.storage.local.set({ savedWords }, () => {
                        loadArchive();
                    });
                }
            });
        });
    });

    // Aile kelimesine tıklayınca çeviri
    card.querySelectorAll('.family-chip').forEach(fw => {
        fw.addEventListener('click', (e) => {
            e.stopPropagation();
            showRowTranslation(fw, fw.dataset.word);
        });
    });

    // Çeviri Düzenleme (Çift tıkla)
    const transEl = card.querySelector('.word-tr');
    if (transEl) {
        transEl.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            if (transEl.querySelector('input')) return;
            const currentText = item.translation || '';
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'word-edit-input';
            input.value = currentText === '—' ? '' : currentText;
            input.style.cssText = 'background:var(--surface-2); border:1px solid var(--accent); color:var(--text); font-size:13px; font-weight:600; padding:2px 6px; border-radius:4px; width:100%; outline:none; font-family:var(--font);';
            transEl.textContent = '';
            transEl.appendChild(input);
            input.focus();
            input.select();

            let finished = false;
            const saveEdit = () => {
                if (finished) return;
                finished = true;
                const newText = input.value.trim();
                if (newText && newText !== currentText) {
                    chrome.storage.local.get({ savedWords: [] }, ({ savedWords }) => {
                        const targetWord = (item.word || '').trim().toLowerCase();
                        let updated = false;
                        savedWords.forEach((w) => {
                            if (w && w.word && w.word.trim().toLowerCase() === targetWord) {
                                w.translation = newText;
                                w.updatedAt = Date.now();
                                updated = true;
                            }
                        });
                        if (updated) {
                            chrome.storage.local.set({ savedWords }, () => {
                                loadArchive();
                            });
                        }
                    });
                } else {
                    transEl.textContent = currentText || '—';
                }
            };
            input.addEventListener('keydown', (evt) => {
                if (evt.key === 'Enter') saveEdit();
                if (evt.key === 'Escape') {
                    finished = true;
                    transEl.textContent = currentText || '—';
                }
            });
            input.addEventListener('blur', saveEdit);
        });
    }
}

function promptAddTagToCard(card, item) {
    const wordHead = card.querySelector('.word-head');
    if (!wordHead || wordHead.querySelector('.tag-add-input')) return;

    const input = document.createElement('input');
    input.className = 'tag-add-input';
    input.placeholder = getMessage('archive_tag_placeholder') || 'etiket…';
    input.style.cssText = 'font-size:9px;font-weight:700;padding:1px 6px;border-radius:8px;background:var(--surface-2);border:1px solid var(--accent);color:var(--text);width:64px;font-family:var(--font);outline:none;';
    wordHead.appendChild(input);
    input.focus();

    chrome.storage.local.get({ savedWords: [] }, ({ savedWords }) => {
        const currentTags = (item.tags || []).map(t => (t || '').trim().toLowerCase());
        const existingTags = [...new Set(savedWords.flatMap(w => w.tags || []))]
            .filter(t => t && t.trim() && !currentTags.includes(t.trim().toLowerCase()));

        let suggestPopup = null;
        const removeSuggest = () => {
            if (suggestPopup) {
                suggestPopup.remove();
                suggestPopup = null;
            }
        };

        let isCommitted = false;
        const commitTag = (forcedVal) => {
            if (isCommitted) return;
            isCommitted = true;
            removeSuggest();
            const rawVal = forcedVal !== undefined ? forcedVal : input.value;
            const val = (rawVal || '').trim();
            input.remove();
            if (val) {
                chrome.storage.local.get({ savedWords: [] }, (res) => {
                    const wordsList = res.savedWords || [];
                    const targetWord = (item.word || '').trim().toLowerCase();
                    let updated = false;
                    wordsList.forEach(w => {
                        if (w && w.word && w.word.trim().toLowerCase() === targetWord) {
                            if (!Array.isArray(w.tags)) w.tags = [];
                            if (!w.tags.some(t => t.toLowerCase() === val.toLowerCase())) {
                                w.tags.push(val);
                                w.updatedAt = Date.now();
                                updated = true;
                            }
                        }
                    });
                    if (updated) {
                        chrome.storage.local.set({ savedWords: wordsList }, () => {
                            loadArchive();
                        });
                    }
                });
            }
        };

        if (existingTags.length > 0) {
            suggestPopup = document.createElement('div');
            suggestPopup.className = 'tag-suggest-popup';
            const rect = input.getBoundingClientRect();
            suggestPopup.style.left = `${Math.min(rect.left, window.innerWidth - 180)}px`;
            suggestPopup.style.top = `${rect.bottom + 4}px`;
            const suggestLbl = getMessage('archive_existing_tags_lbl') || 'Mevcut Etiketler';
            suggestPopup.innerHTML = `
                <div class="tag-suggest-label">${esc(suggestLbl)}</div>
                <div class="tag-suggest-chips">
                    ${existingTags.slice(0, 8).map(t => `<span class="tag-suggest-chip" data-tag="${esc(t)}">${esc(t)}</span>`).join('')}
                </div>
            `;
            document.body.appendChild(suggestPopup);

            suggestPopup.querySelectorAll('.tag-suggest-chip').forEach(chip => {
                chip.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    commitTag(chip.dataset.tag);
                });
            });
        }

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                commitTag();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                isCommitted = true;
                removeSuggest();
                input.remove();
            }
        });

        input.addEventListener('blur', () => {
            setTimeout(() => {
                if (!isCommitted) commitTag();
            }, 180);
        });
    });
}
function deleteWord(index, onCancel = null) {
    chrome.storage.sync.get({ settings: { deleteConfirm: true } }, ({ settings }) => {
        const needsConfirm = settings ? settings.deleteConfirm !== false : true;
        const proceedWithDelete = () => {
            chrome.storage.local.get({ savedWords: [] }, ({ savedWords }) => {
                const deletedItem = savedWords[index];
                if (deletedItem && deletedItem.word) {
                    trackDeletedWord(deletedItem.word);
                }
                savedWords.splice(index, 1);
                chrome.storage.local.set({ savedWords }, () => {
                    loadArchive();
                    updateArchiveBadge();
                    if (deletedItem) {
                        const cleanDeletedWord = deletedItem.word.toLowerCase();
                        document.querySelectorAll('.word-chip').forEach(c => {
                            const cleanChipWord = c.textContent.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '');
                            if (cleanChipWord === cleanDeletedWord)
                                c.classList.remove('word-saved');
                        });
                    }
                });
            });
        };

        if (needsConfirm) {
            if (typeof showCustomConfirm === 'function') {
                showCustomConfirm("archive_delete_word_confirm", proceedWithDelete, "btn_delete_confirm_ok", "game_btn_cancel", onCancel);
            } else {
                if (confirm(getMessage("archive_delete_word_confirm") || "Bu kelimeyi silmek istediğinize emin misiniz?")) {
                    proceedWithDelete();
                } else if (onCancel) {
                    onCancel();
                }
            }
        } else {
            proceedWithDelete();
        }
    });
}
function toggleLearnWord(index) {
    chrome.storage.local.get({ savedWords: [] }, ({ savedWords }) => {
        const item = savedWords[index];
        if (item) {
            item.learned = !item.learned;
            item.timestamp = Date.now();
            chrome.storage.local.set({ savedWords }, () => {
                loadArchive();
                updateReviewBadge();
            });
        }
    });
}
function updateArchiveBadge() {
    chrome.storage.local.get({ savedWords: [] }, ({ savedWords }) => {
        const badge = document.getElementById('archive-badge');
        if (!badge)
            return;
        if (savedWords.length > 0) {
            badge.textContent = savedWords.length;
            badge.style.display = '';
        }
        else {
            badge.style.display = 'none';
        }
    });
}
// ── Filtreler, Popover'lar ve Araçlar Menüsü Başlatıcı ──────────────────────────
function initArchiveControls() {
    // Seviye Popover
    const lvlSelect = document.getElementById('lvlSelect');
    const lvlPopover = document.getElementById('lvlPopover');
    const lvlSelectLabel = document.getElementById('lvlSelectLabel');
    if (lvlSelect && lvlPopover) {
        lvlSelect.addEventListener('click', (e) => {
            e.stopPropagation();
            const willOpen = !lvlPopover.classList.contains('open');
            closeAllArchivePopovers();
            if (willOpen) {
                lvlPopover.classList.add('open');
                lvlSelect.classList.add('open');
            }
        });
        lvlPopover.querySelectorAll('.lvl-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.stopPropagation();
                lvlPopover.querySelectorAll('.lvl-chip').forEach(c => c.classList.remove('on'));
                chip.classList.add('on');
                archiveFilter = chip.dataset.level;
                const textLabel = chip.querySelector('[data-i18n]') 
                    ? chip.querySelector('[data-i18n]').textContent 
                    : (chip.dataset.i18n ? (getMessage(chip.dataset.i18n) || chip.dataset.label) : (chip.dataset.label || chip.textContent.trim()));
                if (lvlSelectLabel) lvlSelectLabel.textContent = textLabel;
                const c = chip.style.getPropertyValue('--c') || '#6366f1';
                if (archiveFilter === 'all') {
                    lvlSelect.classList.remove('is-set');
                    lvlSelect.style.removeProperty('--c');
                } else {
                    lvlSelect.classList.add('is-set');
                    lvlSelect.style.setProperty('--c', c);
                }
                closeAllArchivePopovers();
                loadArchive();
            });
        });
    }

    // Sıralama Popover
    const sortSelect = document.getElementById('sortSelect');
    const sortPopover = document.getElementById('sortPopover');
    const sortSelectLabel = document.getElementById('sortSelectLabel');
    if (sortSelect && sortPopover) {
        sortSelect.addEventListener('click', (e) => {
            e.stopPropagation();
            const willOpen = !sortPopover.classList.contains('open');
            closeAllArchivePopovers();
            if (willOpen) {
                sortPopover.classList.add('open');
                sortSelect.classList.add('open');
            }
        });
        sortPopover.querySelectorAll('.sort-opt').forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                sortPopover.querySelectorAll('.sort-opt').forEach(o => o.classList.remove('on'));
                opt.classList.add('on');
                archiveSort = opt.dataset.sort;
                if (sortSelectLabel) sortSelectLabel.textContent = opt.querySelector('span')?.textContent || opt.dataset.label;
                closeAllArchivePopovers();
                loadArchive();
            });
        });
    }

    // Kaynak Popover Trigger
    const sourceSelect = document.getElementById('sourceSelect');
    const sourcePopover = document.getElementById('sourcePopover');
    if (sourceSelect && sourcePopover) {
        sourceSelect.addEventListener('click', (e) => {
            e.stopPropagation();
            const willOpen = !sourcePopover.classList.contains('open');
            closeAllArchivePopovers();
            if (willOpen) {
                sourcePopover.classList.add('open');
                sourceSelect.classList.add('open');
            }
        });
    }

    // Etiket Popover Trigger
    const tagSelect = document.getElementById('tagSelect');
    const tagPopover = document.getElementById('tagPopover');
    if (tagSelect && tagPopover) {
        tagSelect.addEventListener('click', (e) => {
            e.stopPropagation();
            const willOpen = !tagPopover.classList.contains('open');
            closeAllArchivePopovers();
            if (willOpen) {
                tagPopover.classList.add('open');
                tagSelect.classList.add('open');
            }
        });
    }

    // Araçlar Menüsü (⋯)
    const toolsBtn = document.getElementById('toolsBtn');
    const toolsMenu = document.getElementById('toolsMenu');
    if (toolsBtn && toolsMenu) {
        toolsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const willOpen = !toolsMenu.classList.contains('open');
            closeAllArchivePopovers();
            if (willOpen) {
                toolsMenu.classList.add('open');
            }
        });
    }

    // Stop propagation on dropdown switch toggles
    document.querySelectorAll('#toolsMenu .switch2').forEach(sw => {
        sw.addEventListener('click', (e) => e.stopPropagation());
    });

    // Toggle: Tüm Detayları Aç
    const expandToggle = document.getElementById('expandFeatureToggle');
    if (expandToggle) {
        expandToggle.addEventListener('change', (e) => {
            virtualExpandAll = e.target.checked;
            expandedIndices.clear();
            collapsedIndices.clear();
            document.querySelectorAll('.word-card').forEach(c => {
                c.classList.toggle('expanded', e.target.checked);
            });
        });
    }

    // Toggle: Kelime Ailesi
    const familyToggle = document.getElementById('familyFeatureToggle');
    if (familyToggle) {
        familyToggle.checked = true;
        document.getElementById('panel-archive')?.classList.add('family-on');
        familyToggle.addEventListener('change', (e) => {
            virtualShowFamily = e.target.checked;
            document.getElementById('panel-archive')?.classList.toggle('family-on', e.target.checked);
        });
    }

    // Toggle: Kelime Etiketleme
    const tagToggle = document.getElementById('tagFeatureToggle');
    if (tagToggle) {
        tagToggle.checked = true;
        tagToggle.addEventListener('change', (e) => {
            virtualShowTags = e.target.checked;
            document.querySelectorAll('.tag-pill').forEach(p => p.style.display = e.target.checked ? '' : 'none');
        });
    }

    // Menü Butonları
    const flashcardBtn = document.getElementById('flashcard-btn');
    if (flashcardBtn) {
        flashcardBtn.addEventListener('click', () => {
            closeAllArchivePopovers();
        });
    }

    const refreshFamBtn = document.getElementById('refresh-families-btn');
    if (refreshFamBtn) {
        refreshFamBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllArchivePopovers();
            chrome.storage.local.get({ savedWords: [] }, ({ savedWords }) => {
                if (!savedWords || savedWords.length === 0) {
                    if (typeof showCustomAlert === 'function') {
                        showCustomAlert(getMessage('toast_no_words_to_refresh') || 'Yenilenecek kelime bulunamadı.');
                    }
                    return;
                }
                const wordsToLookup = savedWords.map(w => w.word);
                chrome.runtime.sendMessage({ action: "batch_lookup_family", words: wordsToLookup }, (res) => {
                    if (res && res.familyMap) {
                        savedWords.forEach(item => {
                            const fam = res.familyMap[item.word.toLowerCase()];
                            if (fam && Array.isArray(fam)) {
                                item.wordFamily = fam;
                            }
                        });
                        chrome.storage.local.set({ savedWords }, () => {
                            loadArchive();
                        });
                    }
                });
            });
        });
    }

    const clearBtn = document.getElementById('clear-btn');
    console.log('[ClearBtn] found:', !!clearBtn);
    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('[ClearBtn] clicked — opening confirm modal');
            closeAllArchivePopovers();

            let overlay = document.getElementById('custom-confirm-overlay');
            const titleEl = document.getElementById('custom-confirm-title');
            const msgEl = document.getElementById('custom-confirm-message');
            const okBtn = document.getElementById('custom-confirm-ok');
            const cancelBtn = document.getElementById('custom-confirm-cancel');

            if (!overlay) {
                if (confirm(getMessage('archive_clear_confirm') || 'Tüm kayıtlı kelimeleri silmek istediğinize emin misiniz?')) {
                    doClearDictionary();
                }
                return;
            }

            // Move overlay directly under document.body so no parent container (like #panel-settings) can hide it
            if (overlay.parentElement !== document.body) {
                document.body.appendChild(overlay);
            }

            if (titleEl) titleEl.textContent = getMessage('archive_clear_title') || 'Sözlüğü Temizle';
            if (msgEl) msgEl.textContent = getMessage('archive_clear_confirm') || 'Tüm kayıtlı kelimeleri silmek istediğinize emin misiniz?';
            if (okBtn) okBtn.textContent = getMessage('game_btn_clear') || 'Temizle';
            if (cancelBtn) cancelBtn.textContent = getMessage('game_btn_cancel') || 'Vazgeç';

            overlay.style.cssText = 'display: flex !important; z-index: 9999999 !important; position: fixed !important; inset: 0 !important; background: rgba(4, 7, 15, 0.76) !important; align-items: center !important; justify-content: center !important; padding: 20px !important;';
            console.log('[ClearBtn] overlay display set to flex directly under document.body');

            function onOkClick(ev) {
                if (ev) ev.stopPropagation();
                console.log('[ClearBtn] OK clicked — running doClearDictionary');
                overlay.style.display = 'none';
                okBtn.removeEventListener('click', onOkClick);
                cancelBtn.removeEventListener('click', onCancelClick);
                doClearDictionary();
            }
            function onCancelClick(ev) {
                if (ev) ev.stopPropagation();
                console.log('[ClearBtn] Cancel clicked');
                overlay.style.display = 'none';
                okBtn.removeEventListener('click', onOkClick);
                cancelBtn.removeEventListener('click', onCancelClick);
            }
            if (okBtn) okBtn.addEventListener('click', onOkClick);
            if (cancelBtn) cancelBtn.addEventListener('click', onCancelClick);
        });
    }

    function doClearDictionary() {
        chrome.storage.local.get({
            savedWords: [],
            deletedWords: [],
            srsStreakStats: { currentStreak: 0, lastStudyDate: '', bestStreak: 0 }
        }, ({ savedWords, deletedWords, srsStreakStats }) => {
            let { currentStreak, lastStudyDate, bestStreak } = srsStreakStats || {};
            const legacyMaxStreak = (savedWords || []).reduce((m, w) => Math.max(m, w.streak ?? 0), 0);

            const now = Date.now();
            const deletionMap = new Map();
            (deletedWords || []).forEach(item => deletionMap.set(item.word, item.deletedAt));
            (savedWords || []).forEach(item => {
                if (item && item.word) {
                    deletionMap.set(item.word.toLowerCase().trim(), now);
                }
            });
            let updatedDeletedWords = Array.from(deletionMap.entries()).map(([word, deletedAt]) => ({ word, deletedAt }));
            if (updatedDeletedWords.length > 1000) {
                updatedDeletedWords = updatedDeletedWords.slice(updatedDeletedWords.length - 1000);
            }

            const updates = { savedWords: [], deletedWords: updatedDeletedWords };
            if ((currentStreak === 0 || !currentStreak) && legacyMaxStreak > 0) {
                const today = new Date().toDateString();
                srsStreakStats.currentStreak = legacyMaxStreak;
                srsStreakStats.lastStudyDate = today;
                srsStreakStats.bestStreak = Math.max(bestStreak || 0, legacyMaxStreak);
                updates.srsStreakStats = srsStreakStats;
            }
            chrome.storage.local.set(updates, () => {
                loadArchive();
                updateArchiveBadge();
                document.querySelectorAll('.word-chip').forEach(c => c.classList.remove('word-saved'));
            });
        });
    }

    // Arama & Temizleme Butonu
    const searchInput = document.getElementById('archive-search');
    const searchClearBtn = document.getElementById('archive-search-clear');
    if (searchInput) {
        const updateClearBtn = () => {
            if (searchClearBtn) {
                searchClearBtn.style.display = searchInput.value.length > 0 ? 'flex' : 'none';
            }
        };

        searchInput.addEventListener('input', (e) => {
            archiveSearch = e.target.value;
            updateClearBtn();
            loadArchive();
        });

        if (searchClearBtn) {
            searchClearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                searchInput.value = '';
                archiveSearch = '';
                updateClearBtn();
                searchInput.focus();
                loadArchive();
            });
        }
    }

    // Dışarı tıklandığında popover'ları kapat
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.chip-select-wrap') && !e.target.closest('.tools-wrap') && !e.target.closest('.card-actions') && !e.target.closest('.tag-suggest-popup')) {
            closeAllArchivePopovers();
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initArchiveControls);
} else {
    initArchiveControls();
}
