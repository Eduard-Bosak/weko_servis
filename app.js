"use strict";
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbxupdTS_ds3HlbNQ5to9WK70gDzx_qQ-sZRJjhrUww1Il8MTDQIoVwTj-v61U_P3vuuNg/exec";
const HISTORY_KEY = "weko_history";
const SYNC_QUEUE_KEY = "weko_sync_queue";
const MAX_HISTORY = 200;
const defaultPartsDB = [
    { name: "АКБ 60V 22AH", price: 24466 },
    { name: "Зарядное устройство 5A 60V", price: 1282 },
    { name: "Штырь 27,2 30см", price: 423 },
    { name: "Держатель телефона без USB", price: 403 },
    { name: "Кресло Jetson усиленное", price: 1719 },
    { name: "Провод аккумулятора", price: 265 },
    { name: "Крыло переднее", price: 423 },
    { name: "Коннектор АКБ", price: 200 },
    { name: "Корпус АКБ 21AH", price: 1700 },
    { name: "Крышка АКБ нижняя", price: 253 },
    { name: "Провод мотор-колеса R16", price: 636 },
    { name: "Плата датчика холла", price: 235 },
    { name: "Варежки", price: 800 },
    { name: "Задняя подвеска с маятником", price: 1725 },
    { name: "Рама велосипеда", price: 12829 },
    { name: "Держатель телефона с USB", price: 805 },
    { name: "Зарядное устройство 3A 60V", price: 2070 },
    { name: "Внешний корпус АКБ", price: 575 },
    { name: "Бортовой комьютер (Дисплей)", price: 1178 },
    { name: "Поворотники передние", price: 575 },
    { name: "Крышка металлическая под ноги", price: 426 },
    { name: "Педаль металлические", price: 368 },
    { name: "Цепь", price: 157 },
    { name: "Накладка на цепь (Защита)", price: 397 },
    { name: "Ротор", price: 5171 },
    { name: "Диск с магнитами (Статер)", price: 4025 },
    { name: "Гидравлические тормоза", price: 2530 },
    { name: "Крепления гидравлики", price: 252 },
    { name: "Фиксатор шланга гидравлики", price: 133 },
    { name: "Ось переднего колеса", price: 207 },
    { name: "Амортизатор задний (609)", price: 609 },
    { name: "Амортизатор задний (768)", price: 768 },
    { name: "Передняя фара", price: 1587 },
    { name: "Подшипник руля", price: 34 },
    { name: "Руль в сборе", price: 1058 },
    { name: "Вынос руля", price: 529 },
    { name: "Руль", price: 725 },
    { name: "Ручка газа 60V Monster", price: 1125 },
    { name: "Концевик Jetson", price: 199 },
    { name: "Ручка тормоза правая", price: 133 },
    { name: "Ручка тормоза левая", price: 133 },
    { name: "Клемнный зажим", price: 49 },
    { name: "Контроллер 2G", price: 4025 },
    { name: "Трекер 2G", price: 5750 },
    { name: "АКБ 3,7V", price: 365 },
    { name: "Зеркала (комплект)", price: 990 },
    { name: "Подножка", price: 1500 },
    { name: "Крыло заднее", price: 800 },
    { name: "Планка АКБ", price: 800 },
];
let partsDB = [];
async function askMergeOrReplace() {
    if (typeof Swal === 'undefined')
        return 'replace';
    const result = await Swal.fire({
        title: 'Обновление Каталога',
        text: 'Как вы хотите загрузить новые детали и цены?',
        icon: 'question',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: 'Дополнить / Обновить',
        denyButtonText: 'Заменить полностью',
        cancelButtonText: 'Отмена',
        confirmButtonColor: '#4f46e5',
        denyButtonColor: '#ef4444',
    });
    if (result.isConfirmed)
        return 'merge';
    if (result.isDenied)
        return 'replace';
    return 'cancel';
}
function applyPartsUpdate(newParts, strategy) {
    if (strategy === 'replace') {
        partsDB = newParts;
    }
    else if (strategy === 'merge') {
        const partsMap = new Map();
        partsDB.forEach(p => partsMap.set(p.name, p));
        newParts.forEach(p => partsMap.set(p.name, p));
        partsDB = Array.from(partsMap.values());
    }
    localStorage.setItem("weko_parts", JSON.stringify(partsDB));
    renderParts();
}
async function syncData(force = false) {
    const syncBtnIcon = $("syncBtnIcon");
    if (syncBtnIcon)
        syncBtnIcon.classList.add("fa-spin");
    try {
        if (!force) {
            const cachedParts = localStorage.getItem("weko_parts");
            if (cachedParts) {
                partsDB = JSON.parse(cachedParts);
                renderParts();
            }
            else {
                applyPartsUpdate(defaultPartsDB, 'replace');
            }
        }
        if (force) {
            const partsRes = await fetch(`${GOOGLE_SHEET_URL}?action=getParts`);
            const partsData = await partsRes.json();
            if (partsData.success && partsData.parts && partsData.parts.length > 0) {
                const strategy = await askMergeOrReplace();
                if (strategy !== 'cancel') {
                    applyPartsUpdate(partsData.parts, strategy);
                    if (typeof Swal !== 'undefined')
                        Swal.fire('Успех!', 'Прайс-лист из облака загружен.', 'success');
                }
            }
            else {
                if (typeof Swal !== 'undefined')
                    Swal.fire('Ошибка', 'Облачный прайс-лист пуст или недоступен.', 'error');
            }
        }
        const histRes = await fetch(`${GOOGLE_SHEET_URL}?action=getHistory&limit=100`);
        const histData = await histRes.json();
        if (histData.success && histData.history) {
            const localHistory = getHistory();
            const globalHistory = histData.history;
            const mergedMap = new Map();
            localHistory.forEach(item => mergedMap.set(item.id, item));
            globalHistory.forEach(item => mergedMap.set(item.id, item));
            const mergedArray = Array.from(mergedMap.values()).sort((a, b) => {
                const tA = new Date(a.timestamp).getTime();
                const tB = new Date(b.timestamp).getTime();
                return tB - tA;
            });
            setHistory(mergedArray.slice(0, MAX_HISTORY));
            renderHistory(false);
        }
    }
    catch (error) {
        console.error("Sync Data Error:", error);
    }
    finally {
        if (syncBtnIcon)
            syncBtnIcon.classList.remove("fa-spin");
    }
}
let currentDetailId = null;
let currentEditId = null;
let historyDateFilter = "all";
let historyExactDate = "";
let historySearchQuery = "";
let calViewYear = new Date().getFullYear();
let calViewMonth = new Date().getMonth();
let partsFilter = "all";
const $ = (id) => document.getElementById(id);
let _refs = {};
function initRefs() {
    _refs = {
        partsContainer: $("partsContainer"),
        searchInput: $("searchInput"),
        searchClearBtn: $("searchClearBtn"),
        noResults: $("noResults"),
        needDelivery: $("needDelivery"),
        deliverySummaryPrice: $("deliverySummaryPrice"),
        deliveryControls: $("deliveryControls"),
        btnDelivX1: $("btnDelivX1"),
        btnDelivX2: $("btnDelivX2"),
        customDeliveryPrice: $("customDeliveryPrice"),
        clientName: $("clientName"),
        rentNumber: $("rentNumber"),
        bikeNumber: $("bikeNumber"),
        displayDelivery: $("displayDelivery"),
        displayRepair: $("displayRepair"),
        displayTotal: $("displayTotal"),
        displayTotalMobile: $("displayTotalMobile"),
        selectedCount: $("selectedCount"),
        selectedPartsList: $("selectedPartsList"),
        selectedPartsContent: $("selectedPartsContent"),
        sendBtn: $("sendBtn"),
        copyBtn: $("copyBtn"),
        summaryPanel: $("summaryPanel"),
        summaryBackdrop: $("summaryBackdrop"),
        historyList: $("historyList"),
        historyEmpty: $("historyEmpty"),
        historyCount: $("historyCount"),
        clearHistoryBtn: $("clearHistoryBtn"),
        historySearch: $("historySearch"),
        hiddenClipboard: $("hiddenClipboard"),
        offlineStatus: $("offlineStatus"),
        networkStability: $("networkStability"),
    };
}
function formatPrice(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = window.setTimeout(() => func.apply(this, args), wait);
    };
}
function getFavorites() {
    try {
        return JSON.parse(localStorage.getItem('weko_favorites') || '[]');
    }
    catch (_a) {
        return [];
    }
}
function saveFavorites(favs) {
    localStorage.setItem('weko_favorites', JSON.stringify(favs));
    syncFavoritesToSheet(favs);
}
function syncFavoritesToSheet(favs) {
    const payload = { action: "saveSettings", key: "favorites", value: JSON.stringify(favs) };
    try {
        if (!navigator.onLine)
            throw new Error("Offline");
        fetch(GOOGLE_SHEET_URL, {
            method: "POST",
            mode: "no-cors",
            body: JSON.stringify(payload),
            headers: { "Content-Type": "text/plain;charset=utf-8" },
        });
    }
    catch (_a) {
        addToSyncQueue("saveSettings", payload);
    }
}
async function loadFavoritesFromSheet() {
    try {
        const res = await fetch(GOOGLE_SHEET_URL + "?action=getSettings");
        const json = await res.json();
        if (json.success && json.settings && json.settings.favorites) {
            const sheetFavs = JSON.parse(json.settings.favorites);
            const localFavs = getFavorites();
            const merged = [...new Set([...localFavs, ...sheetFavs])];
            localStorage.setItem('weko_favorites', JSON.stringify(merged));
            document.querySelectorAll('.fav-star').forEach(btn => {
                const name = btn.dataset.part;
                const isFav = name ? merged.includes(name) : false;
                btn.classList.toggle('active', isFav);
                const icon = btn.querySelector('i');
                if (icon)
                    icon.className = isFav ? 'fa-solid fa-star' : 'fa-regular fa-star';
            });
            updateFavCount();
        }
    }
    catch (_a) { }
}
function isFavorite(partName) {
    return getFavorites().includes(partName);
}
function toggleFavorite(partName) {
    const favs = getFavorites();
    const idx = favs.indexOf(partName);
    if (idx >= 0)
        favs.splice(idx, 1);
    else
        favs.push(partName);
    saveFavorites(favs);
    return idx < 0;
}
function getSyncQueue() {
    try {
        return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
    }
    catch (_a) {
        return [];
    }
}
function setSyncQueue(queue) {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    updateOfflineStatus();
}
function addToSyncQueue(action, payload) {
    const queue = getSyncQueue();
    if (action === "update" || action === "saveSettings") {
        const existingIdx = queue.findIndex(q => q.action === action && (action === "saveSettings" ? true : q.payload.id === payload.id));
        if (existingIdx !== -1) {
            queue[existingIdx].payload = payload;
            setSyncQueue(queue);
            return;
        }
    }
    queue.push({ id: generateId(), action, payload, timestamp: Date.now() });
    setSyncQueue(queue);
}
function updateOfflineStatus() {
    if (!_refs.offlineStatus)
        return;
    const queue = getSyncQueue();
    if (queue.length > 0) {
        _refs.offlineStatus.classList.remove("hidden");
        _refs.offlineStatus.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i>';
        _refs.offlineStatus.title = `Ожидание сети: ${queue.length} зап.`;
        _refs.offlineStatus.className = "text-amber-500 hint-bounce transition-all duration-300";
    }
    else if (!navigator.onLine) {
        _refs.offlineStatus.classList.remove("hidden");
        _refs.offlineStatus.innerHTML = '<i class="fa-solid fa-cloud-bolt"></i>';
        _refs.offlineStatus.title = "Офлайн-режим";
        _refs.offlineStatus.className = "text-red-400 hint-bounce transition-all duration-300";
    }
    else {
        if (!_refs.offlineStatus.classList.contains("hidden") && _refs.offlineStatus.classList.contains("text-amber-500")) {
            _refs.offlineStatus.innerHTML = '<i class="fa-solid fa-check-circle"></i>';
            _refs.offlineStatus.className = "text-emerald-500 transition-all duration-300";
            setTimeout(() => _refs.offlineStatus.classList.add("hidden"), 2500);
        }
        else {
            _refs.offlineStatus.classList.add("hidden");
        }
    }
}
function updateNetworkStability() {
    const el = _refs.networkStability;
    if (!el)
        return;
    if (!navigator.onLine) {
        el.textContent = "0%";
        el.className = "text-[10px] sm:text-xs font-bold text-red-500 transition-colors";
        return;
    }
    let stability = 100;
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
        if (conn.rtt !== undefined) {
            if (conn.rtt <= 50)
                stability = 100;
            else if (conn.rtt <= 100)
                stability = 100 - Math.floor((conn.rtt - 50) / 5);
            else if (conn.rtt <= 200)
                stability = 90 - Math.floor((conn.rtt - 100) / 10);
            else if (conn.rtt <= 500)
                stability = 80 - Math.floor((conn.rtt - 200) / 10);
            else
                stability = Math.max(5, 50 - Math.floor((conn.rtt - 500) / 20));
        }
        else if (conn.downlink !== undefined) {
            if (conn.downlink >= 5)
                stability = 100;
            else if (conn.downlink >= 2)
                stability = 90;
            else if (conn.downlink >= 1)
                stability = 70;
            else if (conn.downlink >= 0.5)
                stability = 50;
            else
                stability = 20;
        }
    }
    el.textContent = `${stability}%`;
    if (stability >= 80) {
        el.className = "text-[10px] sm:text-xs font-bold text-emerald-500 transition-colors";
    }
    else if (stability >= 40) {
        el.className = "text-[10px] sm:text-xs font-bold text-amber-500 transition-colors";
    }
    else {
        el.className = "text-[10px] sm:text-xs font-bold text-red-500 transition-colors";
    }
}
let isSyncing = false;
async function processSyncQueue() {
    if (!navigator.onLine || isSyncing) {
        updateOfflineStatus();
        return;
    }
    const queue = getSyncQueue();
    if (queue.length === 0) {
        updateOfflineStatus();
        return;
    }
    isSyncing = true;
    if (_refs.offlineStatus) {
        _refs.offlineStatus.innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin"></i>';
    }
    const remainingQueue = [...queue];
    for (const item of queue) {
        try {
            await fetch(GOOGLE_SHEET_URL, {
                method: "POST",
                mode: "no-cors",
                body: JSON.stringify(item.payload),
                headers: { "Content-Type": "text/plain;charset=utf-8" },
            });
            const idx = remainingQueue.findIndex(q => q.id === item.id);
            if (idx !== -1)
                remainingQueue.splice(idx, 1);
        }
        catch (_a) {
            break;
        }
    }
    setSyncQueue(remainingQueue);
    isSyncing = false;
    updateOfflineStatus();
}
function renderParts() {
    const frag = document.createDocumentFragment();
    const favs = getFavorites();
    partsDB.forEach((part) => {
        const label = document.createElement("label");
        label.className =
            "part-card flex items-center p-3 sm:p-3.5 border border-slate-200/80 rounded-xl cursor-pointer bg-white/60";
        const starActive = favs.includes(part.name) ? ' active' : '';
        label.innerHTML = `
            <input type="checkbox" value="${part.price}" data-name="${part.name}" class="part-checkbox custom-check mr-3">
            <div class="flex-grow min-w-0">
                <div class="text-xs sm:text-sm font-semibold text-slate-700 part-title">${part.name}</div>
                <div class="text-xs text-slate-400 font-mono part-price mt-0.5">${formatPrice(part.price)} ₽</div>
            </div>
            <button type="button" class="fav-star${starActive}" data-part="${part.name}" title="В избранное" onclick="event.preventDefault(); event.stopPropagation(); onStarClick(this)">
                <i class="fa-${starActive ? 'solid' : 'regular'} fa-star"></i>
            </button>
        `;
        frag.appendChild(label);
    });
    _refs.partsContainer.appendChild(frag);
}
function onStarClick(btn) {
    const partName = btn.dataset.part;
    if (!partName)
        return;
    const nowFav = toggleFavorite(partName);
    btn.classList.toggle('active', nowFav);
    const icon = btn.querySelector('i');
    if (icon)
        icon.className = nowFav ? 'fa-solid fa-star' : 'fa-regular fa-star';
    if (partsFilter === 'fav')
        filterParts();
    updateFavCount();
}
function updateFavCount() {
    const badge = $('favCount');
    if (!badge)
        return;
    const count = getFavorites().length;
    badge.textContent = count.toString();
    badge.style.opacity = count > 0 ? '1' : '0';
}
function setPartsFilter(filter) {
    partsFilter = filter;
    document.querySelectorAll('.parts-filter-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.partsFilter === filter);
    });
    filterParts();
}
function filterParts() {
    const input = _refs.searchInput.value.toLowerCase();
    const cards = _refs.partsContainer.querySelectorAll(".part-card");
    let visibleCount = 0;
    const favs = partsFilter === 'fav' ? getFavorites() : null;
    _refs.searchClearBtn.classList.toggle("visible", input.length > 0);
    cards.forEach((card) => {
        const titleEl = card.querySelector(".part-title");
        if (!titleEl || !titleEl.textContent)
            return;
        const title = titleEl.textContent;
        const matchSearch = title.toLowerCase().includes(input);
        const matchFav = favs ? favs.includes(title) : true;
        const show = matchSearch && matchFav;
        card.style.display = show ? "flex" : "none";
        if (show)
            visibleCount++;
    });
    _refs.noResults.classList.toggle("hidden", visibleCount > 0);
}
function clearSearch() {
    _refs.searchInput.value = "";
    filterParts();
    _refs.searchInput.focus();
}
let acFocusIdx = -1;
function getClientSuggestions(query) {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    const seen = new Map();
    history.forEach((h) => {
        const raw = h.client || "";
        const name = raw.replace(/\s*\(.*$/, "").trim();
        if (name && name !== "Имя не указано" && !seen.has(name)) {
            seen.set(name, {
                bike: h.bikeNumber || "",
                date: h.timestamp ? new Date(h.timestamp).toLocaleDateString("ru-RU") : ""
            });
        }
    });
    if (!query)
        return [...seen.entries()].slice(0, 8).map(([name, meta]) => (Object.assign({ name }, meta)));
    const q = query.toLowerCase();
    return [...seen.entries()]
        .filter(([name]) => name.toLowerCase().includes(q))
        .slice(0, 8)
        .map(([name, meta]) => (Object.assign({ name }, meta)));
}
function showSuggestions() {
    const input = _refs.clientName;
    const dropdown = $("clientSuggestions");
    const suggestions = getClientSuggestions(input.value.trim());
    if (suggestions.length === 0) {
        dropdown.classList.add("hidden");
        return;
    }
    acFocusIdx = -1;
    dropdown.innerHTML = suggestions.map((s, i) => `<div class="autocomplete-item" data-idx="${i}" data-name="${s.name}">
      ${s.name}${s.bike ? `<span class="ac-meta">РА${s.bike}С</span>` : ""}
    </div>`).join("");
    dropdown.classList.remove("hidden");
    dropdown.querySelectorAll(".autocomplete-item").forEach(item => {
        item.addEventListener("mousedown", (e) => {
            e.preventDefault();
            const name = item.dataset.name;
            if (name)
                selectSuggestion(name);
        });
    });
}
function selectSuggestion(name) {
    _refs.clientName.value = name;
    $("clientSuggestions").classList.add("hidden");
    _refs.rentNumber.focus();
}
function handleAcKeydown(e) {
    const dropdown = $("clientSuggestions");
    const hasItems = !dropdown.classList.contains("hidden") && dropdown.querySelectorAll(".autocomplete-item").length > 0;
    if (e.key === "ArrowDown" && hasItems) {
        e.preventDefault();
        const items = dropdown.querySelectorAll(".autocomplete-item");
        acFocusIdx = Math.min(acFocusIdx + 1, items.length - 1);
        items.forEach((el, i) => el.classList.toggle("focused", i === acFocusIdx));
    }
    else if (e.key === "ArrowUp" && hasItems) {
        e.preventDefault();
        const items = dropdown.querySelectorAll(".autocomplete-item");
        acFocusIdx = Math.max(acFocusIdx - 1, 0);
        items.forEach((el, i) => el.classList.toggle("focused", i === acFocusIdx));
    }
    else if (e.key === "Enter") {
        e.preventDefault();
        if (hasItems && acFocusIdx >= 0) {
            const items = dropdown.querySelectorAll(".autocomplete-item");
            const name = items[acFocusIdx].dataset.name;
            if (name)
                selectSuggestion(name);
        }
        else {
            $("clientSuggestions").classList.add("hidden");
            _refs.rentNumber.focus();
        }
    }
    else if (e.key === "Escape") {
        dropdown.classList.add("hidden");
    }
}
function updateTotals() {
    const needDelivery = _refs.needDelivery.checked;
    const checkboxes = document.querySelectorAll(".part-checkbox:checked");
    let delivery = 0;
    if (needDelivery) {
        const customPriceStr = _refs.customDeliveryPrice.value.trim();
        if (customPriceStr !== "" && !isNaN(Number(customPriceStr))) {
            delivery = Number(customPriceStr);
        }
        else {
            delivery = 900 * deliveryMultiplier;
        }
    }
    _refs.deliverySummaryPrice.textContent = delivery > 0 ? `${formatPrice(delivery)} ₽` : "0 ₽";
    _refs.deliverySummaryPrice.style.opacity = needDelivery ? "1" : "0.5";
    let repair = 0;
    const selectedNames = [];
    checkboxes.forEach((cb) => {
        repair += parseInt(cb.value);
        const name = cb.getAttribute("data-name");
        if (name)
            selectedNames.push(name);
    });
    const total = delivery + repair;
    _refs.displayDelivery.textContent = formatPrice(delivery) + " ₽";
    _refs.displayRepair.textContent = formatPrice(repair) + " ₽";
    const totalEl = _refs.displayTotal;
    totalEl.textContent = formatPrice(total) + " ₽";
    totalEl.classList.add("total-updating");
    setTimeout(() => totalEl.classList.remove("total-updating"), 350);
    if (_refs.displayTotalMobile) {
        _refs.displayTotalMobile.textContent = formatPrice(total) + " ₽";
    }
    _refs.selectedCount.textContent = checkboxes.length.toString();
    _refs.selectedCount.style.opacity = checkboxes.length > 0 ? "1" : "0";
    if (selectedNames.length > 0) {
        _refs.selectedPartsList.classList.remove("hidden");
        _refs.selectedPartsContent.innerHTML = selectedNames
            .map((n) => `<div class="flex items-center gap-1.5"><i class="fa-solid fa-circle text-[4px] text-indigo-400"></i> ${n}</div>`)
            .join("");
    }
    else {
        _refs.selectedPartsList.classList.add("hidden");
    }
}
function toggleSummary() {
    _refs.summaryPanel.classList.toggle("collapsed");
    _refs.summaryBackdrop.classList.toggle("visible", !_refs.summaryPanel.classList.contains("collapsed"));
}
function resetForm() {
    _refs.clientName.value = "";
    _refs.rentNumber.value = "";
    _refs.bikeNumber.value = "";
    _refs.searchInput.value = "";
    _refs.needDelivery.checked = true;
    document
        .querySelectorAll(".part-checkbox")
        .forEach((cb) => (cb.checked = false));
    filterParts();
    updateTotals();
}
function getInvoiceData() {
    const nameRaw = _refs.clientName.value.trim();
    const rentRaw = _refs.rentNumber.value.trim();
    const bikeRaw = _refs.bikeNumber.value.trim();
    let headerText = nameRaw || "Имя не указано";
    const brackets = [];
    if (rentRaw)
        brackets.push(`рента ${rentRaw}`);
    if (bikeRaw)
        brackets.push(`РА${bikeRaw}С`);
    if (brackets.length > 0)
        headerText += ` (${brackets.join(", ")})`;
    const needDelivery = _refs.needDelivery.checked;
    const checkboxes = document.querySelectorAll(".part-checkbox:checked");
    let deliveryCost = 0;
    if (needDelivery) {
        const customPriceStr = _refs.customDeliveryPrice.value.trim();
        if (customPriceStr !== "" && !isNaN(Number(customPriceStr))) {
            deliveryCost = Number(customPriceStr);
        }
        else {
            deliveryCost = 900 * deliveryMultiplier;
        }
    }
    let repairCost = 0;
    const selectedParts = [];
    checkboxes.forEach((cb) => {
        repairCost += parseInt(cb.value);
        const name = cb.getAttribute("data-name");
        if (name)
            selectedParts.push(name);
    });
    const total = deliveryCost + repairCost;
    const partsString = selectedParts.length > 0 ? selectedParts.join(", ") : "Ремонт не требуется";
    let textToCopy = `${headerText}\n\n`;
    if (deliveryCost > 0) {
        textToCopy += `Сумма доставки: ${deliveryCost}\n\n`;
    }
    if (repairCost > 0)
        textToCopy += `Сумма ремонта: ${repairCost}\n\n`;
    textToCopy += `Итого: ${total}\n\n`;
    const tags = [];
    if (deliveryCost > 0)
        tags.push("#Доставка");
    if (repairCost > 0)
        tags.push("#Ремонт");
    textToCopy += tags.join(" ");
    return {
        client: headerText,
        bikeNumber: bikeRaw || "—",
        rentNumber: rentRaw || "",
        delivery: deliveryCost,
        repairTotal: repairCost,
        total,
        selectedParts,
        textToCopy,
    };
}
async function sendToGoogleSheets() {
    const btn = _refs.sendBtn;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Отправляем...';
    btn.disabled = true;
    btn.style.opacity = "0.7";
    const data = getInvoiceData();
    const id = generateId();
    const payload = Object.assign({ action: "create", id }, data);
    try {
        if (!navigator.onLine)
            throw new Error("Offline");
        await fetch(GOOGLE_SHEET_URL, {
            method: "POST",
            mode: "no-cors",
            body: JSON.stringify(payload),
            headers: { "Content-Type": "text/plain;charset=utf-8" },
        });
    }
    catch (error) {
        addToSyncQueue("create", payload);
    }
    saveToHistory(Object.assign({ id }, data));
    const isOfflineSave = !navigator.onLine || getSyncQueue().some(q => q.payload.id === id);
    btn.innerHTML = isOfflineSave ? '<i class="fa-solid fa-cloud-arrow-up"></i> В очереди!' : '<i class="fa-solid fa-check"></i> Успешно!';
    btn.style.opacity = "1";
    btn.className = btn.className
        .replace("from-indigo-600 to-purple-600", isOfflineSave ? "from-amber-500 to-orange-500" : "from-emerald-500 to-emerald-600")
        .replace("hover:from-indigo-500 hover:to-purple-500", isOfflineSave ? "hover:from-amber-400 hover:to-orange-400" : "hover:from-emerald-400 hover:to-emerald-500");
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
        btn.className = btn.className
            .replace("from-emerald-500 to-emerald-600", "from-indigo-600 to-purple-600")
            .replace("from-amber-500 to-orange-500", "from-indigo-600 to-purple-600")
            .replace("hover:from-emerald-400 hover:to-emerald-500", "hover:from-indigo-500 hover:to-purple-500")
            .replace("hover:from-amber-400 hover:to-orange-400", "hover:from-indigo-500 hover:to-purple-500");
    }, 2000);
}
async function updateGoogleSheet(entry) {
    const payload = {
        action: "update",
        id: entry.id,
        client: entry.client,
        delivery: entry.delivery,
        repairTotal: entry.repairTotal,
        total: entry.total,
        partsList: (entry.selectedParts || []).join(", "),
    };
    try {
        if (!navigator.onLine)
            throw new Error("Offline");
        await fetch(GOOGLE_SHEET_URL, {
            method: "POST",
            mode: "no-cors",
            body: JSON.stringify(payload),
            headers: { "Content-Type": "text/plain;charset=utf-8" },
        });
        return true;
    }
    catch (_a) {
        addToSyncQueue("update", payload);
        return true;
    }
}
function copyToClipboard() {
    const data = getInvoiceData();
    if (data.textToCopy) {
        doCopy(data.textToCopy, _refs.copyBtn);
    }
}
function doCopy(text, btn) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
            .writeText(text)
            .then(() => showCopyBtn(btn))
            .catch(() => {
            fallbackCopy(text);
            showCopyBtn(btn);
        });
    }
    else {
        fallbackCopy(text);
        showCopyBtn(btn);
    }
}
function fallbackCopy(text) {
    const ta = _refs.hiddenClipboard;
    ta.value = text;
    ta.select();
    document.execCommand("copy");
}
function showCopyBtn(btn) {
    const orig = btn.innerHTML;
    btn.innerHTML =
        '<i class="fa-solid fa-check text-emerald-400"></i> Скопировано!';
    setTimeout(() => {
        btn.innerHTML = orig;
    }, 1800);
}
function getHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    }
    catch (_a) {
        return [];
    }
}
function setHistory(arr) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
}
function saveToHistory(data) {
    const history = getHistory();
    history.unshift({
        id: data.id || generateId(),
        timestamp: data.timestamp || new Date().toISOString(),
        bikeNumber: data.bikeNumber,
        rentNumber: data.rentNumber,
        client: data.client,
        delivery: data.delivery || 0,
        repairTotal: data.repairTotal || 0,
        total: data.total || 0,
        selectedParts: data.selectedParts || [],
        textToCopy: data.textToCopy || "",
    });
    if (history.length > MAX_HISTORY)
        history.pop();
    setHistory(history);
    renderHistory(true);
}
function deleteHistoryEntry(id) {
    setHistory(getHistory().filter((e) => e.id !== id));
    renderHistory(false);
}
function getFilteredHistory() {
    let history = getHistory();
    if (historyDateFilter !== "all") {
        if (historyDateFilter === "exact" && historyExactDate) {
            const [y, m, d] = historyExactDate.split('-');
            const dayStart = new Date(Number(y), Number(m) - 1, Number(d));
            const dayEnd = new Date(dayStart.getTime());
            dayEnd.setDate(dayEnd.getDate() + 1);
            history = history.filter((e) => {
                const t = new Date(e.timestamp);
                return t >= dayStart && t < dayEnd;
            });
        }
        else {
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            let cutoff;
            if (historyDateFilter === "today") {
                cutoff = startOfDay;
            }
            else if (historyDateFilter === "week") {
                cutoff = new Date(startOfDay.getTime());
                cutoff.setDate(cutoff.getDate() - 7);
            }
            else if (historyDateFilter === "month") {
                cutoff = new Date(startOfDay.getTime());
                cutoff.setMonth(cutoff.getMonth() - 1);
            }
            if (cutoff)
                history = history.filter((e) => new Date(e.timestamp) >= cutoff);
        }
    }
    if (historySearchQuery) {
        const q = historySearchQuery.toLowerCase();
        history = history.filter((e) => {
            const bikeMatch = (e.bikeNumber || "").toLowerCase().includes(q);
            const clientMatch = (e.client || "").toLowerCase().includes(q);
            const partsMatch = (e.selectedParts || []).some((p) => p.toLowerCase().includes(q));
            return bikeMatch || clientMatch || partsMatch;
        });
    }
    return history;
}
function onHistorySearch() {
    historySearchQuery = _refs.historySearch.value.trim();
    renderHistory(false);
}
function setDateFilter(filter) {
    if (filter === "exact" && historyDateFilter === "exact") {
        filter = "all";
    }
    historyDateFilter = filter;
    document.querySelectorAll(".filter-tab").forEach((t) => {
        t.classList.toggle("active", t.dataset.filter === filter);
    });
    const cal = $("calendarWidget");
    if (filter === "exact") {
        cal.classList.remove("hidden");
        if (!historyExactDate) {
            const now = new Date();
            const pad = (n) => n.toString().padStart(2, '0');
            historyExactDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
            calViewYear = now.getFullYear();
            calViewMonth = now.getMonth();
        }
        renderCalendar();
    }
    else {
        cal.classList.add("hidden");
    }
    renderHistory(false);
}
const CAL_MONTHS_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const CAL_DAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
function renderCalendar() {
    const widget = $("calendarWidget");
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    const firstDay = new Date(calViewYear, calViewMonth, 1);
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0)
        startDow = 6;
    const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
    const daysInPrev = new Date(calViewYear, calViewMonth, 0).getDate();
    let html = `<div class="cal-header">`;
    html += `<button onclick="event.stopPropagation(); calPrevMonth()" aria-label="Предыдущий месяц"><i class="fa-solid fa-chevron-left"></i></button>`;
    html += `<span class="cal-title">${CAL_MONTHS_RU[calViewMonth]} ${calViewYear}</span>`;
    html += `<button onclick="event.stopPropagation(); calNextMonth()" aria-label="Следующий месяц"><i class="fa-solid fa-chevron-right"></i></button>`;
    html += `</div>`;
    html += `<div class="cal-dow">`;
    CAL_DAYS_RU.forEach(d => html += `<span>${d}</span>`);
    html += `</div>`;
    html += `<div class="cal-days">`;
    const historyDates = new Set();
    getHistory().forEach((e) => {
        const t = new Date(e.timestamp);
        const dateStr = `${t.getFullYear()}-${(t.getMonth() + 1).toString().padStart(2, '0')}-${t.getDate().toString().padStart(2, '0')}`;
        historyDates.add(dateStr);
    });
    for (let i = startDow - 1; i >= 0; i--) {
        const day = daysInPrev - i;
        const m = calViewMonth === 0 ? 12 : calViewMonth;
        const y = calViewMonth === 0 ? calViewYear - 1 : calViewYear;
        const dateStr = `${y}-${m.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        let cls = 'cal-day other-month';
        if (historyDates.has(dateStr))
            cls += ' has-records';
        html += `<button class="${cls}" onclick="event.stopPropagation(); calSelectDay('${dateStr}')">${day}</button>`;
    }
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${calViewYear}-${(calViewMonth + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
        let cls = 'cal-day';
        if (dateStr === todayStr)
            cls += ' today';
        if (dateStr === historyExactDate)
            cls += ' selected';
        if (historyDates.has(dateStr))
            cls += ' has-records';
        html += `<button class="${cls}" onclick="event.stopPropagation(); calSelectDay('${dateStr}')">${d}</button>`;
    }
    const totalCells = startDow + daysInMonth;
    const remainder = totalCells % 7;
    if (remainder > 0) {
        for (let d = 1; d <= 7 - remainder; d++) {
            const m = calViewMonth === 11 ? 1 : calViewMonth + 2;
            const y = calViewMonth === 11 ? calViewYear + 1 : calViewYear;
            const dateStr = `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
            let cls = 'cal-day other-month';
            if (historyDates.has(dateStr))
                cls += ' has-records';
            html += `<button class="${cls}" onclick="event.stopPropagation(); calSelectDay('${dateStr}')">${d}</button>`;
        }
    }
    html += `</div>`;
    widget.innerHTML = html;
}
function calPrevMonth() {
    calViewMonth--;
    if (calViewMonth < 0) {
        calViewMonth = 11;
        calViewYear--;
    }
    renderCalendar();
}
function calNextMonth() {
    calViewMonth++;
    if (calViewMonth > 11) {
        calViewMonth = 0;
        calViewYear++;
    }
    renderCalendar();
}
function calSelectDay(dateStr) {
    historyExactDate = dateStr;
    renderCalendar();
    renderHistory(false);
}
function renderHistory(isNew) {
    const list = _refs.historyList;
    const empty = _refs.historyEmpty;
    const allHistory = getHistory();
    const filtered = getFilteredHistory();
    const countBadge = _refs.historyCount;
    const clearBtn = _refs.clearHistoryBtn;
    countBadge.textContent = allHistory.length.toString();
    countBadge.style.opacity = allHistory.length > 0 ? "1" : "0";
    clearBtn.classList.toggle("hidden", allHistory.length === 0);
    list.querySelectorAll(".history-item").forEach((el) => el.remove());
    if (filtered.length === 0) {
        empty.classList.remove("hidden");
        if (historyDateFilter === "exact" && historyExactDate) {
            const [y, m, d] = historyExactDate.split('-');
            empty.innerHTML = `
                <div class="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-5 my-2 w-full text-center shadow-inner">
                    <i class="fa-solid fa-calendar-xmark text-4xl text-indigo-400 mb-3 opacity-80"></i>
                    <p class="text-sm font-bold text-indigo-300 mb-1.5">Ничего не найдено</p>
                    <p class="text-xs text-indigo-200/80 leading-relaxed">За <b>${d}.${m}.${y}</b> в данном браузере нет сохранённых генераций.</p>
                </div>
            `;
        }
        else if (allHistory.length > 0 &&
            (historySearchQuery || historyDateFilter !== "all")) {
            empty.innerHTML = `
                <i class="fa-solid fa-filter-circle-xmark text-xl text-slate-600 mb-2"></i>
                <p class="text-[11px] text-slate-500">Ничего не найдено</p>
            `;
        }
        else {
            empty.innerHTML = `
                <i class="fa-solid fa-inbox text-xl text-slate-600 mb-2"></i>
                <p class="text-[11px] text-slate-500">Генерации появятся здесь</p>
            `;
        }
        return;
    }
    empty.classList.add("hidden");
    const frag = document.createDocumentFragment();
    filtered.forEach((entry, idx) => {
        const div = document.createElement("div");
        div.className = `history-item flex items-center gap-2.5 ${isNew && idx === 0 ? "history-item-new" : ""}`;
        div.setAttribute("data-id", entry.id);
        div.onclick = () => openDetail(entry.id);
        const bikeLabel = entry.bikeNumber && entry.bikeNumber !== "—"
            ? `РА${entry.bikeNumber}С`
            : "—";
        const timeStr = formatHistoryTime(entry.timestamp);
        const partsCount = (entry.selectedParts || []).length;
        div.innerHTML = `
            <div class="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
                <i class="fa-solid fa-bicycle text-indigo-400 text-[11px]"></i>
            </div>
            <div class="flex-grow min-w-0">
                <div class="text-xs font-bold text-slate-200 truncate">${bikeLabel}</div>
                <div class="text-[10px] text-slate-500 truncate">${partsCount > 0 ? partsCount + " дет." : "без ремонта"}</div>
            </div>
            <div class="text-right flex-shrink-0">
                <div class="text-xs font-bold text-indigo-400 font-mono">${formatPrice(entry.total)}₽</div>
                <div class="text-[9px] text-slate-500">${timeStr}</div>
            </div>
        `;
        frag.appendChild(div);
    });
    list.appendChild(frag);
}
function formatHistoryTime(iso) {
    const d = new Date(iso);
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, "0");
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    if (d.toDateString() === now.toDateString())
        return time;
    const y = new Date(now.getTime());
    y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString())
        return `вчера ${time}`;
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${time}`;
}
function clearHistory() {
    if (confirm("Удалить всю историю?")) {
        setHistory([]);
        renderHistory(false);
    }
}
function openDetail(id) {
    const entry = getHistory().find((e) => e.id === id);
    if (!entry)
        return;
    currentDetailId = id;
    const bikeLabel = entry.bikeNumber && entry.bikeNumber !== "—"
        ? `РА${entry.bikeNumber}С`
        : "Без номера";
    const d = new Date(entry.timestamp);
    const pad = (n) => n.toString().padStart(2, "0");
    const dateStr = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} в ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    $("detailBikeTitle").textContent = bikeLabel;
    $("detailDate").textContent = dateStr;
    $("detailClient").textContent = entry.client || "Имя не указано";
    $("detailDelivery").textContent = formatPrice(entry.delivery) + " ₽";
    $("detailRepair").textContent = formatPrice(entry.repairTotal) + " ₽";
    $("detailTotal").textContent = formatPrice(entry.total) + " ₽";
    const partsBlock = $("detailPartsBlock");
    const partsEl = $("detailParts");
    if (entry.selectedParts && entry.selectedParts.length > 0) {
        partsBlock.classList.remove("hidden");
        partsEl.innerHTML = entry.selectedParts
            .map((p) => `<div class="flex items-center gap-2"><i class="fa-solid fa-circle text-[4px] text-indigo-400"></i> ${p}</div>`)
            .join("");
    }
    else {
        partsBlock.classList.add("hidden");
    }
    $("detailBackdrop").classList.add("active");
    $("detailModal").classList.add("active");
    document.body.style.overflow = "hidden";
}
function closeDetail() {
    $("detailBackdrop").classList.remove("active");
    $("detailModal").classList.remove("active");
    document.body.style.overflow = "";
    currentDetailId = null;
}
function copyHistoryItem() {
    const entry = getHistory().find((e) => e.id === currentDetailId);
    if (entry && entry.textToCopy)
        doCopy(entry.textToCopy, $("detailCopyBtn"));
}
function deleteHistoryItem() {
    if (!currentDetailId)
        return;
    deleteHistoryEntry(currentDetailId);
    closeDetail();
}
function openEditModal() {
    const entry = getHistory().find((e) => e.id === currentDetailId);
    if (!entry)
        return;
    currentEditId = entry.id;
    closeDetail();
    const editParts = $("editPartsList");
    editParts.innerHTML = "";
    const frag = document.createDocumentFragment();
    partsDB.forEach((part) => {
        const isChecked = (entry.selectedParts || []).includes(part.name);
        const label = document.createElement("label");
        label.className =
            "edit-part-card flex items-center p-2.5 border border-slate-200/80 rounded-xl cursor-pointer bg-white/60";
        label.innerHTML = `
            <input type="checkbox" value="${part.price}" data-name="${part.name}"
                   class="edit-part-checkbox custom-check mr-2.5" ${isChecked ? "checked" : ""}>
            <div class="flex-grow min-w-0">
                <div class="text-xs font-semibold text-slate-700 truncate">${part.name}</div>
                <div class="text-[10px] text-slate-400 font-mono">${formatPrice(part.price)} ₽</div>
            </div>
        `;
        frag.appendChild(label);
    });
    editParts.appendChild(frag);
    updateEditTotals();
    $("editBackdrop").classList.add("active");
    $("editModal").classList.add("active");
    document.body.style.overflow = "hidden";
}
function closeEditModal() {
    $("editBackdrop").classList.remove("active");
    $("editModal").classList.remove("active");
    document.body.style.overflow = "";
    currentEditId = null;
}
function updateEditTotals() {
    const checks = document.querySelectorAll(".edit-part-checkbox:checked");
    let repair = 0;
    checks.forEach((cb) => (repair += parseInt(cb.value)));
    const entry = getHistory().find((e) => e.id === currentEditId);
    const delivery = entry ? entry.delivery : 0;
    const total = delivery + repair;
    $("editRepairTotal").textContent = formatPrice(repair) + " ₽";
    $("editTotal").textContent = formatPrice(total) + " ₽";
    $("editPartsCount").textContent = checks.length + " дет.";
}
async function saveEdit() {
    const entry = getHistory().find((e) => e.id === currentEditId);
    if (!entry)
        return;
    const saveBtn = $("editSaveBtn");
    const origText = saveBtn.innerHTML;
    saveBtn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Сохраняем...';
    saveBtn.disabled = true;
    const checks = document.querySelectorAll(".edit-part-checkbox:checked");
    const newParts = [];
    let newRepair = 0;
    checks.forEach((cb) => {
        const name = cb.getAttribute("data-name");
        if (name)
            newParts.push(name);
        newRepair += parseInt(cb.value);
    });
    entry.selectedParts = newParts;
    entry.repairTotal = newRepair;
    entry.total = entry.delivery + newRepair;
    const partsListString = newParts.length > 0 ? newParts.join(", ") : "Ремонт не требуется";
    let textToCopy = `${entry.client}\n\n`;
    textToCopy += `Сумма доставки: ${entry.delivery}\n\n`;
    if (newRepair > 0)
        textToCopy += `Сумма ремонта: ${newRepair}\n\n`;
    textToCopy += `Итого: ${entry.total}\n\n`;
    const tags = [];
    if (entry.delivery > 0)
        tags.push("#Доставка");
    if (newRepair > 0)
        tags.push("#Ремонт");
    textToCopy += tags.join(" ");
    entry.textToCopy = textToCopy;
    const history = getHistory();
    const idx = history.findIndex((e) => e.id === entry.id);
    if (idx !== -1)
        history[idx] = entry;
    setHistory(history);
    const payloadToSheet = Object.assign(Object.assign({}, entry), { partsList: partsListString });
    await updateGoogleSheet(payloadToSheet);
    renderHistory(false);
    saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Сохранено!';
    setTimeout(() => {
        saveBtn.innerHTML = origText;
        saveBtn.disabled = false;
        closeEditModal();
    }, 1200);
}
let deliveryMultiplier = 1;
function setDeliveryMultiplier(mult) {
    deliveryMultiplier = mult;
    const isX1 = mult === 1;
    _refs.btnDelivX1.className = isX1
        ? "px-3 py-1 text-xs font-bold rounded-md bg-white text-indigo-600 shadow-sm transition-all"
        : "px-3 py-1 text-xs font-bold rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-all";
    _refs.btnDelivX2.className = !isX1
        ? "px-3 py-1 text-xs font-bold rounded-md bg-white text-indigo-600 shadow-sm transition-all"
        : "px-3 py-1 text-xs font-bold rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-all";
    _refs.customDeliveryPrice.value = "";
    updateTotals();
}
window.setDeliveryMultiplier = setDeliveryMultiplier;
function handleCustomDeliveryPrice() {
    updateTotals();
}
function initEvents() {
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (historyDateFilter === "exact") {
                setDateFilter("all");
                return;
            }
            if ($("editModal").classList.contains("active")) {
                closeEditModal();
                return;
            }
            if ($("detailModal").classList.contains("active")) {
                closeDetail();
                return;
            }
            if (!_refs.summaryPanel.classList.contains("collapsed") &&
                window.innerWidth < 1024) {
                toggleSummary();
            }
        }
    });
    document.addEventListener("click", (e) => {
        if (historyDateFilter !== "exact")
            return;
        const cal = $("calendarWidget");
        const exactTab = document.querySelector('.filter-tab[data-filter="exact"]');
        if (!cal || !exactTab)
            return;
        if (!cal.contains(e.target) && !exactTab.contains(e.target)) {
            setDateFilter("all");
        }
    });
    _refs.partsContainer.addEventListener("change", (e) => {
        if (e.target && e.target.classList.contains("part-checkbox")) {
            updateTotals();
        }
    });
    document.addEventListener("change", (e) => {
        if (e.target && e.target.classList.contains("edit-part-checkbox")) {
            updateEditTotals();
        }
    });
    _refs.needDelivery.addEventListener("change", () => {
        if (_refs.needDelivery.checked) {
            _refs.deliveryControls.style.opacity = "1";
            _refs.deliveryControls.style.pointerEvents = "auto";
        }
        else {
            _refs.deliveryControls.style.opacity = "0.3";
            _refs.deliveryControls.style.pointerEvents = "none";
        }
        updateTotals();
    });
    _refs.customDeliveryPrice.addEventListener("input", handleCustomDeliveryPrice);
    document.querySelectorAll(".filter-tab").forEach((tab) => {
        tab.addEventListener("click", () => {
            const filter = tab.dataset.filter;
            if (filter)
                setDateFilter(filter);
        });
    });
    document.querySelectorAll(".parts-filter-tab").forEach((tab) => {
        tab.addEventListener("click", () => {
            const partFilter = tab.dataset.partsFilter;
            if (partFilter)
                setPartsFilter(partFilter);
        });
    });
    const debouncedFilterParts = debounce(filterParts, 150);
    const debouncedHistorySearch = debounce(onHistorySearch, 200);
    _refs.searchInput.addEventListener("input", debouncedFilterParts);
    _refs.historySearch.addEventListener("input", debouncedHistorySearch);
    const debouncedShowSuggestions = debounce(showSuggestions, 150);
    _refs.clientName.addEventListener("input", debouncedShowSuggestions);
    _refs.clientName.addEventListener("focus", showSuggestions);
    _refs.clientName.addEventListener("keydown", handleAcKeydown);
    _refs.clientName.addEventListener("blur", () => {
        setTimeout(() => $("clientSuggestions").classList.add("hidden"), 150);
    });
    _refs.rentNumber.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            _refs.bikeNumber.focus();
        }
    });
    _refs.bikeNumber.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            _refs.bikeNumber.blur();
        }
    });
    window.addEventListener('online', () => {
        processSyncQueue();
        updateNetworkStability();
    });
    window.addEventListener('offline', () => {
        updateOfflineStatus();
        updateNetworkStability();
    });
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
        conn.addEventListener("change", updateNetworkStability);
    }
    setInterval(updateNetworkStability, 1000);
}
function initServiceWorker() {
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("sw.js").catch(() => { });
    }
}
async function importLocalParts(event) {
    const input = event.target;
    if (!input.files || input.files.length === 0)
        return;
    const file = input.files[0];
    const strategy = await askMergeOrReplace();
    if (strategy === 'cancel') {
        input.value = "";
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        var _a;
        try {
            const data = new Uint8Array((_a = e.target) === null || _a === void 0 ? void 0 : _a.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            if (!json || json.length < 2) {
                if (typeof Swal !== 'undefined')
                    Swal.fire('Ошибка', 'Файл пуст или имеет неверный формат Excel.', 'error');
                return;
            }
            const newParts = [];
            for (let i = 1; i < json.length; i++) {
                const row = json[i];
                if (!row || row.length < 2)
                    continue;
                const name = String(row[0] || "").trim();
                const priceStr = String(row[1] || "").replace(/[^0-9.]/g, "");
                const price = parseInt(priceStr);
                if (name && !isNaN(price)) {
                    newParts.push({ name, price });
                }
            }
            if (newParts.length > 0) {
                applyPartsUpdate(newParts, strategy);
                if (typeof Swal !== 'undefined')
                    Swal.fire('Готово!', `Загружено деталей: ${newParts.length}`, 'success');
            }
            else {
                if (typeof Swal !== 'undefined')
                    Swal.fire('Ошибка', 'Не удалось извлечь детали. Столбец A должен быть текстом (Название), а B - числом (Цена).', 'error');
            }
        }
        catch (err) {
            if (typeof Swal !== 'undefined')
                Swal.fire('Ошибка файлов', 'Excel файл повреждён или не читается.', 'error');
            console.error(err);
        }
    };
    reader.readAsArrayBuffer(file);
    input.value = "";
}
document.addEventListener("DOMContentLoaded", () => {
    initRefs();
    renderHistory(false);
    initEvents();
    initServiceWorker();
    updateFavCount();
    updateOfflineStatus();
    updateNetworkStability();
    processSyncQueue();
    loadFavoritesFromSheet();
    syncData(false);
});
