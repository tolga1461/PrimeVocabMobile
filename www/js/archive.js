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

function throttle(fn, ms) {
    let last = 0;
    return function (...args) {
        const now = Date.now();
        if (now - last >= ms) {
            last = now;
            fn.apply(this, args);
        }
    };
}

function estimateItemHeight(item, showFamily, showTags, isExpanded) {
    let height = 48; // Header base height on mobile
    if (isExpanded) {
        if (item.context) {
            const charCount = item.context.length;
            const lines = Math.max(1, Math.ceil(charCount / 40));
            height += 12 + (lines * 16.5);
        }
        if (showFamily && Array.isArray(item.wordFamily) && item.wordFamily.length) {
            const totalChars = 14 + item.wordFamily.reduce((sum, w) => sum + w.length + 2, 0);
            const lines = Math.max(1, Math.ceil(totalChars / 40));
            height += 11 + (lines * 15);
        }
    }
    if (showTags) {
        const tags = item.tags || [];
        const totalChars = tags.reduce((sum, t) => sum + t.length + 4, 0) + 5;
        const lines = Math.max(1, Math.ceil(totalChars / 35));
        height += 8 + (lines * 22);
    }
    height += 6; // gap/margin
    return Math.ceil(height);
}

function recalculateOffsets() {
    itemOffsets = [];
    let currentOffset = 210; // Start at 210px to leave clean space for absolute header
    virtualWords.forEach((item) => {
        itemOffsets.push(currentOffset);
        const isExpanded = virtualExpandAll ? !collapsedIndices.has(item.originalIndex) : expandedIndices.has(item.originalIndex);
        currentOffset += estimateItemHeight(item, virtualShowFamily, virtualShowTags, isExpanded);
    });
    totalScrollHeight = currentOffset;
    const spacer = document.getElementById('word-list-spacer');
    if (spacer) {
        spacer.style.height = `${totalScrollHeight}px`;
    }
}

// ── Arşiv ─────────────────────────────────────────────────────────────────────
function loadArchive() {
    const btn = document.getElementById('toggle-family-btn');
    const showFamily = btn ? btn.dataset.familyVisible === 'true' : false;
    const tagsBtn = document.getElementById('toggle-tags-btn');
    const showTags = tagsBtn ? tagsBtn.dataset.tagsVisible === 'true' : true;
    const expandAllBtn = document.getElementById('toggle-expand-all-btn');
    const expandAll = expandAllBtn ? expandAllBtn.dataset.expanded === 'true' : false;
    chrome.storage.local.get({ savedWords: [], licenseType: 'FREE' }, ({ savedWords, licenseType }) => {
        const archiveFilterSelect = document.getElementById('archive-filter-select');
        if (archiveFilterSelect) {
            archiveFilterSelect.value = archiveFilter;
        }
        if (btn) {
            btn.classList.toggle('active', showFamily);
            btn.title = showFamily ? getMessage("tooltip_hide_family") : getMessage("tooltip_show_family");
        }
        if (tagsBtn) {
            tagsBtn.classList.toggle('active', showTags);
            tagsBtn.title = showTags ? getMessage("tooltip_hide_tags") : getMessage("tooltip_show_tags");
        }
        if (expandAllBtn) {
            expandAllBtn.classList.toggle('active', expandAll);
            expandAllBtn.title = expandAll ? getMessage("tooltip_collapse_all") : getMessage("tooltip_expand_all");
        }
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
    const sel = document.getElementById('archive-tag-select');
    if (!sel)
        return;
    const tags = [...new Set(savedWords
            .flatMap(w => w.tags || [])
            .filter(t => t && t.trim()))].sort();
    sel.style.display = 'none';
    const current = archiveTag;
    sel.innerHTML = `<option value="all">${getMessage("all_tags_option") || '🏷️ Tüm etiketler'}</option>`;
    tags.forEach(tag => {
        const count = savedWords.filter(w => w.tags && w.tags.includes(tag)).length;
        const opt = document.createElement('option');
        opt.value = tag;
        opt.textContent = `🏷️ ${tag} (${count})`;
        sel.appendChild(opt);
    });
    sel.value = tags.includes(current) ? current : 'all';
    if (sel.value !== current)
        archiveTag = 'all';
    // Datalist doldur
    const dl = document.getElementById('global-tags-datalist');
    if (dl) {
        dl.innerHTML = tags.map(t => `<option value="${esc(t)}"></option>`).join('');
    }
}
// Kaynak dropdown'unu mevcut kelimelerdeki unique başlıklardan oluştur
function updateSourceDropdown(savedWords) {
    const sel = document.getElementById('archive-source-select');
    if (!sel)
        return;
    const sourcedWords = savedWords.filter(w => w.source && w.source.title && w.source.title.trim());
    if (sourcedWords.length === 0) {
        sel.style.display = 'none';
        sel.innerHTML = '';
        return;
    }
    sel.style.display = 'none';
    // Gruplama anahtarı:
    // – showTitle + season varsa → "ShowName::season::N" (aynı sezondaki tüm bölümleri birleştir)
    // – showTitle var ama season yoksa → "ShowName::title::EpisodeTitle"
    // – showTitle yoksa → title (standalone film)
    const groupInfo = {};
    sourcedWords.forEach(w => {
        const src = w.source;
        const showTitle = (src.showTitle || '').trim();
        const season = src.season != null ? src.season : null;
        const title = src.title;
        let key;
        if (showTitle && season !== null) {
            key = `${showTitle}::season::${season}`;
        }
        else if (showTitle) {
            key = `${showTitle}::title::${title}`;
        }
        else {
            key = title;
        }
        if (!groupInfo[key]) {
            groupInfo[key] = {
                key,
                title, // orijinal başlık (fallback filtre için)
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
            if (!shows[showName])
                shows[showName] = [];
            shows[showName].push(info);
        }
        else {
            standalone.push(info);
        }
    });
    const sortedShowNames = Object.keys(shows).sort((a, b) => a.localeCompare(b));
    standalone.sort((a, b) => a.title.localeCompare(b.title));
    const current = archiveSource;
    sel.innerHTML = `<option value="all">📺 ${getMessage("select_all_sources")} (${savedWords.length})</option>`;
    const validValues = new Set(['all']);
    sortedShowNames.forEach(showName => {
        const entries = shows[showName];
        // Sezon numarasına göre sırala
        entries.sort((a, b) => {
            if (a.season === null && b.season === null)
                return a.title.localeCompare(b.title);
            if (a.season === null)
                return 1; // season yoksa sona
            if (b.season === null)
                return -1;
            return a.season - b.season;
        });
        const seasonEntries = entries.filter(e => e.isSeason);
        const totalCount = sourcedWords.filter(w => (w.source?.showTitle || '').trim() === showName).length;
        if (seasonEntries.length > 0) {
            // Sezon bilgisi olan girdiler var → dizi + sezon alt satırları
            const showOpt = document.createElement('option');
            showOpt.value = `show:${showName}`;
            showOpt.textContent = `📺 ${showName} (${totalCount})`;
            sel.appendChild(showOpt);
            validValues.add(`show:${showName}`);
            seasonEntries.forEach(info => {
                const opt = document.createElement('option');
                opt.value = `showseason:${showName}::${info.season}`;
                const seasonWord = getMessage('season_label') || 'Season';
                opt.textContent = `↳ ${seasonWord} ${info.season} (${info.count})`;
                sel.appendChild(opt);
                validValues.add(opt.value);
            });
            // Sezon bilgisi olmayan (sezon null) bölümler varsa "Diğer" satırı ekle
            const noSeasonCount = sourcedWords.filter(w => (w.source?.showTitle || '').trim() === showName && w.source?.season == null).length;
            if (noSeasonCount > 0) {
                const opt = document.createElement('option');
                opt.value = `showseason:${showName}::__none__`;
                opt.textContent = `↳ ${getMessage('season_other') || 'Diğer'} (${noSeasonCount})`;
                sel.appendChild(opt);
                validValues.add(opt.value);
            }
        }
        else {
            // Hiç sezon bilgisi yok → tüm bölümleri tek show satırı altında göster (alt satır yok)
            const showOpt = document.createElement('option');
            showOpt.value = `show:${showName}`;
            showOpt.textContent = `📺 ${showName} (${totalCount})`;
            sel.appendChild(showOpt);
            validValues.add(`show:${showName}`);
        }
    });
    standalone.forEach(info => {
        const opt = document.createElement('option');
        opt.value = `title:${info.title}`;
        opt.textContent = `📺 ${info.title} (${info.count})`;
        sel.appendChild(opt);
        validValues.add(`title:${info.title}`);
    });
    if (validValues.has(current)) {
        sel.value = current;
    }
    else if (validValues.has(`title:${current}`)) {
        sel.value = `title:${current}`;
        archiveSource = `title:${current}`;
    }
    else {
        sel.value = 'all';
        archiveSource = 'all';
    }
}
function renderArchive(savedWords, showFamily = true, showTags = true, expandAll = false, cefrMap = {}, licenseType = 'FREE') {
    const wordList = document.getElementById('word-list');
    const emptyState = document.getElementById('empty-archive');
    const countEl = document.getElementById('archive-count');
    if (!wordList || !emptyState)
        return;
    
    virtualLicenseType = licenseType;

    // Sıralama
    let words = [...savedWords];
    if (archiveSort === 'newest') {
        // savedWords dizisi zaten unshift yapıldığı için 0. eleman en yenidir. Olduğu gibi bırakıyoruz.
    }
    else if (archiveSort === 'oldest') {
        // En eski olan en üstte gözüksün istendiği için diziyi ters çeviriyoruz.
        words.reverse();
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
        return {
            ...item,
            cefrLevel: cefrMap[item.word.toLowerCase()] || '??',
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
        words = words.filter(item => item.tags && item.tags.includes(archiveTag));
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

    document.querySelectorAll('.word-item').forEach(el => el.remove());
    const noRes = wordList.querySelector('.no-results');
    if (noRes)
        noRes.remove();

    // Create spacer if not exists
    let spacer = document.getElementById('word-list-spacer');
    if (!spacer) {
        spacer = document.createElement('div');
        spacer.id = 'word-list-spacer';
        spacer.style.width = '100%';
        spacer.style.pointerEvents = 'none';
        wordList.appendChild(spacer);
    }

    wordList.style.position = 'relative';

    if (savedWords.length === 0) {
        emptyState.style.display = '';
        spacer.style.height = '0px';
        return;
    }
    emptyState.style.display = 'none';
    if (words.length === 0) {
        spacer.style.height = '0px';
        const noEl = document.createElement('div');
        noEl.className = 'no-results';
        noEl.textContent = 'Eşleşen kelime bulunamadı.';
        wordList.appendChild(noEl);
        return;
    }

    recalculateOffsets();
    updateVirtualScroll();

    if (!scrollListenerAttached) {
        wordList.addEventListener('scroll', throttle(() => {
            updateVirtualScroll();
            
            const scrollTop = wordList.scrollTop;

            // Fluid header sliding on scroll to avoid layout gaps and shifts
            const headerWrap = document.getElementById('archive-header-wrap');
            if (headerWrap) {
                // Slide up in sync with scroll, max 158px
                const translateVal = Math.min(scrollTop, 158);
                headerWrap.style.transform = `translateY(-${translateVal}px)`;
                
                // Adjust opacity in sync with scroll (fade out over the 120px range)
                const opacityVal = Math.max(0, 1 - (scrollTop / 120));
                headerWrap.style.opacity = opacityVal;
                headerWrap.style.pointerEvents = scrollTop > 120 ? 'none' : 'auto';
            }

            const archivePanel = document.getElementById('panel-archive');
            if (archivePanel) {
                if (scrollTop > 35) {
                    archivePanel.classList.add('scrolled');
                } else {
                    archivePanel.classList.remove('scrolled');
                }
            }
            
            // Auto-hiding bottom navigation bar (Twitter style) toggling on .app root container
            const appContainer = document.querySelector('.app');
            if (appContainer) {
                if (scrollTop <= 10) {
                    appContainer.classList.remove('nav-hidden');
                } else if (Math.abs(scrollTop - lastScrollTop) > 8) {
                    if (scrollTop > lastScrollTop && scrollTop > 60) {
                        appContainer.classList.add('nav-hidden');
                    } else {
                        appContainer.classList.remove('nav-hidden');
                    }
                }
                lastScrollTop = scrollTop;
            }
        }, 50));
        scrollListenerAttached = true;
    }
}

function updateVirtualScroll() {
    const wordList = document.getElementById('word-list');
    if (!wordList) return;

    const scrollTop = wordList.scrollTop;
    const clientHeight = wordList.clientHeight;

    let startIndex = 0;
    let endIndex = virtualWords.length - 1;

    for (let i = 0; i < itemOffsets.length; i++) {
        if (itemOffsets[i] + 150 > scrollTop) {
            startIndex = Math.max(0, i - 5);
            break;
        }
    }
    for (let i = startIndex; i < itemOffsets.length; i++) {
        if (itemOffsets[i] - 150 > scrollTop + clientHeight) {
            endIndex = Math.min(virtualWords.length - 1, i + 5);
            break;
        }
    }

    const existingItems = wordList.querySelectorAll('.word-item');
    const renderedMap = new Map();
    existingItems.forEach(el => {
        const idx = parseInt(el.dataset.virtualIndex, 10);
        if (idx < startIndex || idx > endIndex) {
            el.remove();
        } else {
            renderedMap.set(idx, el);
        }
    });

    const cefrColors = {
        'A1': '#22c55e', 'A2': '#84cc16', 'B1': '#eab308',
        'B2': '#f97316', 'C1': '#ef4444', 'C2': '#a855f7', '??': '#64748b'
    };

    for (let i = startIndex; i <= endIndex; i++) {
        if (renderedMap.has(i)) {
            const existingEl = renderedMap.get(i);
            if (existingEl) {
                existingEl.style.top = `${itemOffsets[i]}px`;
                const item = virtualWords[i];
                const isExpanded = virtualExpandAll ? !collapsedIndices.has(item.originalIndex) : expandedIndices.has(item.originalIndex);
                
                existingEl.classList.toggle('word-item-expanded', isExpanded);
                existingEl.classList.toggle('word-item-inactive', !item.isActive);
                const itemHeight = estimateItemHeight(item, virtualShowFamily, virtualShowTags, isExpanded);
                existingEl.style.height = `${itemHeight - 6}px`;
                
                const collapseContent = existingEl.querySelector('.word-item-collapse-content');
                if (collapseContent) {
                    collapseContent.style.display = isExpanded ? 'block' : 'none';
                }
                const toggleIcon = existingEl.querySelector('.expand-toggle-icon');
                if (toggleIcon) {
                    toggleIcon.textContent = isExpanded ? '▼' : '▸';
                }
            }
            continue;
        }

        const item = virtualWords[i];
        const isExpanded = virtualExpandAll ? !collapsedIndices.has(item.originalIndex) : expandedIndices.has(item.originalIndex);

        const isPhrasal = typeof PHRASAL_VERBS_DB !== 'undefined' && PHRASAL_VERBS_DB[item.word.toLowerCase()];
        let badgeHtml = '';
        if (isPhrasal) {
            badgeHtml = `<span class="cefr-badge phrasal-badge">Phrasal</span>`;
        }
        else {
            const color = cefrColors[item.cefrLevel] || '#64748b';
            const tooltipTitle = item.cefrLevel === '??' ? `title="${getMessage("tooltip_cefr_unknown")}"` : '';
            badgeHtml = `<span class="cefr-badge" ${tooltipTitle} style="color:${color};background:${color}22;border:1px solid ${color}44">${item.cefrLevel}</span>`;
        }
        const familyHtml = virtualShowFamily && Array.isArray(item.wordFamily) && item.wordFamily.length
            ? `<div class="word-item-family">${getMessage("archive_word_family_lbl")}${item.wordFamily.map(w => `<span class="family-word" data-word="${esc(w)}">${esc(w)}</span>`).join(', ')}</div>`
            : '';
        const tagsHtml = `
      <div class="word-item-tags" ${virtualShowTags ? '' : 'style="display:none"'}>
        ${(item.tags || []).map(t => `<span class="custom-tag-chip">${esc(t)}<span class="remove-tag-btn" data-tag="${esc(t)}">&times;</span></span>`).join('')}
        <button class="add-tag-btn" title="${getMessage("tooltip_add_tag") || 'Etiket Ekle'}">🏷️ +</button>
        <div class="add-tag-input-container" style="display:none">
          <input type="text" class="add-tag-input" list="global-tags-datalist" placeholder="${getMessage("tag_input_placeholder") || 'Etiket...'}" autocomplete="off">
        </div>
      </div>
    `;

        const div = document.createElement('div');
        let classes = 'word-item';
        if (item.hard) classes += ' word-item-hard';
        if (isExpanded) classes += ' word-item-expanded';
        if (!item.isActive) classes += ' word-item-inactive';
        div.className = classes;
        div.dataset.virtualIndex = i;
        div.style.position = 'absolute';
        div.style.top = `${itemOffsets[i]}px`;
        div.style.left = '0';
        div.style.right = '4px';
        const itemHeight = estimateItemHeight(item, virtualShowFamily, virtualShowTags, isExpanded);
        div.style.height = `${itemHeight - 6}px`; // Subtract margin-bottom gap

        let activeStatusHtml = '';
        if (!item.isActive) {
            activeStatusHtml = `<span class="inactive-sub-badge" title="${getMessage("archive_inactive_badge_title") || 'Ücretsiz sürüm limiti (Son 20 kelime) dışında kaldığı için altyazılarda taranmaz.'}">${getMessage("archive_inactive_badge_label") || '⚠️ Altyazıda Pasif'}</span>`;
        }

        div.innerHTML = `
      <div class="word-item-header">
        <span class="expand-toggle-icon">${isExpanded ? '▼' : '▸'}</span>
        <span class="word-item-word">${esc(item.word)}</span>
        ${item.hard ? `<span class="hard-badge" title="${getMessage("tooltip_hard_badge")}">🔥 Zor</span>` : ''}
        ${badgeHtml}
        ${activeStatusHtml}
        <span class="word-item-trans">${esc(item.translation || '—')}</span>
        <div class="header-actions-right">
          ${item.source?.title ? `<button class="source-btn" title="${esc(item.source.title)}">ⓘ</button>` : ''}
          <button class="speak-btn" title="${getMessage("tooltip_pronounce")}">🔊</button>
          <button class="delete-btn" data-index="${item.originalIndex}" title="${getMessage("tooltip_delete")}">×</button>
        </div>
      </div>
      <div class="word-item-collapse-content" style="${isExpanded ? 'display:block' : 'display:none'}">
        ${item.context
            ? `<div class="word-item-context">${esc(item.context)}</div>`
            : ''}
        ${familyHtml}
      </div>
      ${tagsHtml}
    `;

        bindVirtualItemEvents(div, item, i);
        wordList.appendChild(div);
    }
}

function bindVirtualItemEvents(div, item, virtualIndex) {
    const header = div.querySelector('.word-item-header');
    const collapseContent = div.querySelector('.word-item-collapse-content');
    const toggleIcon = div.querySelector('.expand-toggle-icon');
    if (header && collapseContent) {
        header.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.word-item-trans')) {
                return;
            }
            const isExpanded = virtualExpandAll ? !collapsedIndices.has(item.originalIndex) : expandedIndices.has(item.originalIndex);
            if (isExpanded) {
                if (virtualExpandAll) {
                    collapsedIndices.add(item.originalIndex);
                } else {
                    expandedIndices.delete(item.originalIndex);
                }
            } else {
                if (virtualExpandAll) {
                    collapsedIndices.delete(item.originalIndex);
                } else {
                    expandedIndices.add(item.originalIndex);
                }
            }
            recalculateOffsets();
            updateVirtualScroll();
        });
    }
    const speakBtn = div.querySelector('.speak-btn');
    if (speakBtn) {
        speakBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            speakWord(item.word, item.lang || 'en');
        });
    }
    const sourceBtn = div.querySelector('.source-btn');
    if (sourceBtn && item.source) {
        sourceBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showSourcePopup(sourceBtn, item);
        });
    }
    div.querySelectorAll('.family-word').forEach(fw => {
        fw.addEventListener('click', (e) => {
            e.stopPropagation();
            showRowTranslation(fw, fw.dataset.word);
        });
    });
    const transEl = div.querySelector('.word-item-trans');
    if (transEl) {
        transEl.title = getMessage('tooltip_edit_translation') || 'Düzenlemek için çift tıkla';
        transEl.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            if (transEl.querySelector('input'))
                return;
            const currentText = item.translation || '';
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'word-edit-input';
            input.value = currentText === '—' ? '' : currentText;
            transEl.textContent = '';
            transEl.appendChild(input);
            input.focus();
            input.select();
            let finished = false;
            const saveEdit = () => {
                if (finished)
                    return;
                finished = true;
                const newText = input.value.trim();
                if (newText && newText !== currentText) {
                    chrome.storage.local.get({ savedWords: [] }, ({ savedWords }) => {
                        if (savedWords[item.originalIndex]) {
                            savedWords[item.originalIndex].translation = newText;
                            savedWords[item.originalIndex].timestamp = Date.now();
                            chrome.storage.local.set({ savedWords }, () => {
                                loadArchive();
                            });
                        }
                    });
                }
                else {
                    transEl.textContent = currentText || '—';
                }
            };
            input.addEventListener('keydown', (evt) => {
                if (evt.key === 'Enter') {
                    saveEdit();
                }
                else if (evt.key === 'Escape') {
                    finished = true;
                    transEl.textContent = currentText || '—';
                }
            });
            input.addEventListener('blur', () => {
                saveEdit();
            });
        });
    }
    const addTagBtn = div.querySelector('.add-tag-btn');
    const addTagContainer = div.querySelector('.add-tag-input-container');
    const addTagInput = div.querySelector('.add-tag-input');
    if (addTagBtn && addTagContainer && addTagInput) {
        addTagBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addTagBtn.style.display = 'none';
            addTagContainer.style.display = 'inline-block';
            addTagInput.focus();
        });
        const saveTag = () => {
            const newTag = addTagInput.value.trim().toLowerCase();
            if (newTag) {
                chrome.storage.local.get({ savedWords: [] }, ({ savedWords }) => {
                    const wordObj = savedWords[item.originalIndex];
                    if (wordObj) {
                        if (!wordObj.tags)
                            wordObj.tags = [];
                        if (!wordObj.tags.includes(newTag)) {
                            wordObj.tags.push(newTag);
                            wordObj.timestamp = Date.now();
                            chrome.storage.local.set({ savedWords }, () => {
                                loadArchive();
                            });
                        }
                        else {
                            addTagBtn.style.display = 'inline-block';
                            addTagContainer.style.display = 'none';
                            addTagInput.value = '';
                        }
                    }
                });
            }
            else {
                addTagBtn.style.display = 'inline-block';
                addTagContainer.style.display = 'none';
            }
        };
        addTagInput.addEventListener('keydown', (evt) => {
            if (evt.key === 'Enter') {
                saveTag();
            }
            else if (evt.key === 'Escape') {
                addTagBtn.style.display = 'inline-block';
                addTagContainer.style.display = 'none';
                addTagInput.value = '';
            }
        });
        addTagInput.addEventListener('blur', () => {
            saveTag();
        });
    }
    div.querySelectorAll('.remove-tag-btn').forEach(removeBtn => {
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const tagToRemove = removeBtn.dataset.tag;
            chrome.storage.local.get({ savedWords: [] }, ({ savedWords }) => {
                const wordObj = savedWords[item.originalIndex];
                if (wordObj && wordObj.tags) {
                    wordObj.tags = wordObj.tags.filter(t => t !== tagToRemove);
                    wordObj.timestamp = Date.now();
                    chrome.storage.local.set({ savedWords }, () => {
                        loadArchive();
                    });
                }
            });
        });
    });
    const deleteBtn = div.querySelector('.delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteWord(item.originalIndex);
        });
    }

}
function deleteWord(index) {
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
// ── Toolbar/Filtre/Arama/Sıralama Event Listeners ─────────────────────────────
const clearBtnEl = document.getElementById('clear-btn');
if (clearBtnEl) {
    clearBtnEl.addEventListener('click', () => {
        showCustomConfirm("archive_clear_confirm", () => {
            chrome.storage.local.get({
                savedWords: [],
                deletedWords: [],
                srsStreakStats: { currentStreak: 0, lastStudyDate: '', bestStreak: 0 }
            }, ({ savedWords, deletedWords, srsStreakStats }) => {
                let { currentStreak, lastStudyDate, bestStreak } = srsStreakStats;
                const legacyMaxStreak = savedWords.reduce((m, w) => Math.max(m, w.streak ?? 0), 0);
                
                // Track all cleared words as deleted tombstones
                const now = Date.now();
                const deletionMap = new Map();
                deletedWords.forEach(item => deletionMap.set(item.word, item.deletedAt));
                savedWords.forEach(item => {
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
        }, "game_btn_clear", "game_btn_cancel");
    });
}
const exportBtnEl = document.getElementById('export-btn');
if (exportBtnEl) {
    exportBtnEl.addEventListener('click', () => {
        chrome.storage.local.get({ savedWords: [] }, ({ savedWords }) => {
            if (savedWords.length === 0) {
                alert(getMessage("archive_export_confirm"));
                return;
            }
            showCustomConfirm("archive_csv_backup_warning", () => {
                let csv = '\uFEFF' + getMessage("csv_header") + ',"Source","Time"\n';
                savedWords.forEach(item => {
                    const w = `"${(item.word || '').replace(/"/g, '""')}"`;
                    const t = `"${(item.translation || '').replace(/"/g, '""')}"`;
                    const c = `"${(item.context || '').replace(/"/g, '""')}"`;
                    const h = item.hard ? '1' : '0';
                    const a = String(item.againCount ?? 0);
                    // Kaynak bilgilerini birleştir (Örn: "Fringe - S02E18")
                    let sourceStr = '';
                    if (item.source) {
                        sourceStr = item.source.showTitle || item.source.title || '';
                        if (item.source.season != null && item.source.episode != null) {
                            sourceStr += ` - S${String(item.source.season).padStart(2, '0')}E${String(item.source.episode).padStart(2, '0')}`;
                        }
                        else if (item.source.season != null) {
                            sourceStr += ` - S${String(item.source.season).padStart(2, '0')}`;
                        }
                    }
                    const srcOut = `"${sourceStr.replace(/"/g, '""')}"`;
                    // Zaman formatı
                    let timeStr = '';
                    if (item.source && item.source.time != null) {
                        const totalSec = Math.floor(item.source.time);
                        const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
                        const s = (totalSec % 60).toString().padStart(2, '0');
                        timeStr = `${m}:${s}`;
                    }
                    const timeOut = `"${timeStr}"`;
                    csv += `${w},${t},${c},${h},${a},${srcOut},${timeOut}\n`;
                });
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'prime_vocab_words.csv';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }, "game_btn_continue", "game_btn_cancel");
        });
    });
}
const archiveSearchEl = document.getElementById('archive-search');
if (archiveSearchEl) {
    archiveSearchEl.addEventListener('input', (e) => {
        archiveSearch = e.target.value;
        loadArchive();
    });
}
const archiveFilterSelect = document.getElementById('archive-filter-select');
if (archiveFilterSelect) {
    archiveFilterSelect.addEventListener('change', (e) => {
        archiveFilter = e.target.value;
        loadArchive();
    });
}
const archiveSortEl = document.getElementById('archive-sort');
if (archiveSortEl) {
    archiveSortEl.addEventListener('change', (e) => {
        archiveSort = e.target.value;
        loadArchive();
    });
}
const archiveSourceEl = document.getElementById('archive-source-select');
if (archiveSourceEl) {
    archiveSourceEl.addEventListener('change', (e) => {
        archiveSource = e.target.value;
        loadArchive();
    });
}
const archiveTagEl = document.getElementById('archive-tag-select');
if (archiveTagEl) {
    archiveTagEl.addEventListener('change', (e) => {
        archiveTag = e.target.value;
        loadArchive();
    });
}
